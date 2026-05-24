-- ============================================================
-- Migração: fn_submeter_quiz
-- ============================================================
-- Move o cálculo de pontuação e validação de respostas do cliente
-- para o servidor. Resolve a vulnerabilidade crítica em que o
-- campo `correta` de opcoes_resposta era enviado ao browser e os
-- alunos podiam inspecionar respostas no DevTools, e também o facto
-- de o cliente submeter pontos arbitrários para tentativas_quiz.
--
-- Esta função:
--   - Verifica que o utilizador está autenticado
--   - Verifica que o quiz existe e está ativo
--   - Aplica o limite de tentativas_max
--   - Calcula corretas, nota e pontos no servidor
--   - Insere tentativa + respostas numa única transação
--   - Atualiza pontos do utilizador
--   - Dispara verificação de badges
--   - Devolve o resultado para o cliente mostrar (sem expor o
--     gabarito de outras perguntas)
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_submeter_quiz(
    p_quiz_id UUID,
    p_respostas JSONB
) RETURNS JSONB AS $$
DECLARE
    v_aluno_id            UUID := auth.uid();
    v_quiz                RECORD;
    v_tentativas_feitas   INTEGER;
    v_total_perguntas     INTEGER;
    v_corretas            INTEGER := 0;
    v_pontos_ganhos       INTEGER := 0;
    v_nota                NUMERIC(5,2);
    v_tentativa_id        UUID;
    v_pergunta            RECORD;
    v_opcao_dada_id       UUID;
    v_opcao_correta_id    UUID;
    v_opcao_correta_texto TEXT;
    v_acertou             BOOLEAN;
    v_detalhes            JSONB := '[]'::JSONB;
BEGIN
    -- ── Autenticação ─────────────────────────────────────────
    IF v_aluno_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'erro', 'Não autenticado');
    END IF;

    -- ── Quiz válido e ativo ──────────────────────────────────
    SELECT id, tentativas_max, pontos_conclusao
      INTO v_quiz
      FROM public.quizzes
     WHERE id = p_quiz_id AND ativo = TRUE;

    IF v_quiz.id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'erro', 'Quiz não encontrado');
    END IF;

    -- ── Limite de tentativas ─────────────────────────────────
    SELECT COUNT(*) INTO v_tentativas_feitas
      FROM public.tentativas_quiz
     WHERE quiz_id = p_quiz_id
       AND aluno_id = v_aluno_id
       AND concluido = TRUE;

    IF v_tentativas_feitas >= v_quiz.tentativas_max THEN
        RETURN jsonb_build_object(
            'ok', false,
            'erro', 'Atingiste o limite de tentativas para este quiz'
        );
    END IF;

    -- ── Validar input ────────────────────────────────────────
    IF p_respostas IS NULL OR jsonb_typeof(p_respostas) <> 'object' THEN
        RETURN jsonb_build_object('ok', false, 'erro', 'Respostas inválidas');
    END IF;

    -- ── Criar tentativa (placeholder, vai ser atualizada no fim) ──
    INSERT INTO public.tentativas_quiz (
        quiz_id, aluno_id, nota, pontos_ganhos,
        concluido, iniciado_em, concluido_em
    ) VALUES (
        p_quiz_id, v_aluno_id, 0, 0,
        FALSE, NOW(), NULL
    )
    RETURNING id INTO v_tentativa_id;

    -- ── Iterar perguntas do quiz ─────────────────────────────
    SELECT COUNT(*) INTO v_total_perguntas
      FROM public.perguntas
     WHERE quiz_id = p_quiz_id;

    FOR v_pergunta IN
        SELECT id, pontos
          FROM public.perguntas
         WHERE quiz_id = p_quiz_id
         ORDER BY ordem
    LOOP
        -- Opção dada pelo aluno (NULL se não respondeu)
        v_opcao_dada_id := NULLIF(p_respostas->>v_pergunta.id::TEXT, '')::UUID;

        -- Opção correta no servidor
        SELECT id, texto
          INTO v_opcao_correta_id, v_opcao_correta_texto
          FROM public.opcoes_resposta
         WHERE pergunta_id = v_pergunta.id AND correta = TRUE
         LIMIT 1;

        v_acertou := (v_opcao_dada_id IS NOT NULL
                      AND v_opcao_dada_id = v_opcao_correta_id);

        IF v_acertou THEN
            v_corretas      := v_corretas + 1;
            v_pontos_ganhos := v_pontos_ganhos + v_pergunta.pontos;
        END IF;

        -- Gravar resposta
        INSERT INTO public.respostas_tentativa (
            tentativa_id, pergunta_id, opcao_id, correta
        ) VALUES (
            v_tentativa_id, v_pergunta.id, v_opcao_dada_id, v_acertou
        );

        -- Acumular detalhes para devolver ao cliente
        v_detalhes := v_detalhes || jsonb_build_object(
            'pergunta_id',         v_pergunta.id,
            'opcao_dada_id',       v_opcao_dada_id,
            'correta',             v_acertou,
            'opcao_correta_id',    v_opcao_correta_id,
            'opcao_correta_texto', v_opcao_correta_texto
        );
    END LOOP;

    -- ── Calcular nota e fechar tentativa ─────────────────────
    v_nota := CASE
        WHEN v_total_perguntas > 0
        THEN (v_corretas::NUMERIC / v_total_perguntas) * 100
        ELSE 0
    END;

    UPDATE public.tentativas_quiz
       SET nota          = v_nota,
           pontos_ganhos = v_pontos_ganhos,
           concluido     = TRUE,
           concluido_em  = NOW()
     WHERE id = v_tentativa_id;

    -- ── Atualizar pontos do utilizador ───────────────────────
    IF v_pontos_ganhos > 0 THEN
        PERFORM public.fn_atualizar_pontos(v_aluno_id, v_pontos_ganhos);
    END IF;

    -- ── Verificar badges (silencioso em caso de erro) ────────
    BEGIN
        PERFORM public.fn_verificar_badges(v_aluno_id);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- ── Resposta para o cliente ──────────────────────────────
    RETURN jsonb_build_object(
        'ok',                   true,
        'tentativa_id',         v_tentativa_id,
        'nota',                 v_nota,
        'pontos_ganhos',        v_pontos_ganhos,
        'corretas',             v_corretas,
        'total',                v_total_perguntas,
        'tentativas_restantes', GREATEST(0, v_quiz.tentativas_max - v_tentativas_feitas - 1),
        'detalhes',             v_detalhes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_submeter_quiz IS
'Submete uma tentativa de quiz e calcula a nota no servidor. '
'Validação de respostas e atribuição de pontos são feitas aqui '
'para evitar que o cliente manipule o resultado.';

-- ── Permissões ───────────────────────────────────────────────
-- Authenticated users podem invocar a função; o SECURITY DEFINER
-- garante que pode ler opcoes_resposta.correta apesar do RLS.
REVOKE ALL ON FUNCTION public.fn_submeter_quiz(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_submeter_quiz(UUID, JSONB) TO authenticated;
