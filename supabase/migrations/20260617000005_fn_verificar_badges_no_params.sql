-- ============================================================
-- SECURITY FIX: fn_verificar_badges sem parâmetros
-- ============================================================
--
-- Vulnerabilidade:
--   A função fn_verificar_badges(p_aluno_id UUID) aceitava um ID
--   passado pelo cliente. Como era SECURITY DEFINER e tinha
--   EXECUTE para anon/authenticated por defeito, qualquer aluno
--   podia chamar:
--
--     await supabase.rpc('fn_verificar_badges', {
--       p_aluno_id: 'outro-aluno-id'
--     })
--
--   e disparar lógica em nome de outro utilizador (inserir badges
--   na conta dele, atribuir-lhe pontos, criar notificações falsas).
--
-- Correção:
--   - Nova assinatura: fn_verificar_badges() sem parâmetros.
--   - Internamente usa auth.uid() — único utilizador alvo possível.
--   - REVOKE EXECUTE de todos os papéis públicos. Só callers
--     SECURITY DEFINER internos (fn_submeter_quiz, fn_concluir_aula,
--     fn_submeter_simulacao) conseguem invocar.
--   - Drop da assinatura antiga (UUID) — não existe mais.
--
-- Atualiza os internal callers (fn_submeter_quiz, fn_concluir_aula)
-- para chamar a nova assinatura — antes passavam v_aluno_id, agora
-- a função descobre sozinha via auth.uid().
-- ============================================================

-- ── 1. Nova fn_verificar_badges() — sem parâmetros ──────────────
CREATE OR REPLACE FUNCTION public.fn_verificar_badges()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_aluno_id UUID := auth.uid();
    v_count    INTEGER;
    v_awarded  INTEGER := 0;
    v_badge_id UUID;
BEGIN
    -- Sem sessão activa, nada a fazer. Retornamos 0 em silêncio
    -- para não quebrar callers internos que possam invocar em
    -- contexto sem auth (defesa em profundidade).
    IF v_aluno_id IS NULL THEN
        RETURN 0;
    END IF;

    -- ── Badge 1: "Primeiro Passo" ──────────────────────────────
    v_badge_id := 'b1000001-0000-0000-0000-000000000001';
    IF NOT EXISTS (
        SELECT 1 FROM public.utilizador_badges
        WHERE utilizador_id = v_aluno_id AND badge_id = v_badge_id
    ) THEN
        SELECT COUNT(*) INTO v_count
        FROM public.progresso_modulo
        WHERE aluno_id = v_aluno_id AND concluido = TRUE;
        IF v_count >= 1 THEN
            INSERT INTO public.utilizador_badges (utilizador_id, badge_id)
            VALUES (v_aluno_id, v_badge_id);
            PERFORM public.fn_atualizar_pontos(v_aluno_id, 10);
            INSERT INTO public.notificacoes (utilizador_id, titulo, mensagem)
            VALUES (v_aluno_id, '🏅 Badge desbloqueado!',
                    'Conquistaste o badge "Primeiro Passo". +10 pontos bónus!');
            v_awarded := v_awarded + 1;
        END IF;
    END IF;

    -- ── Badge 2: "Detetive Digital" ────────────────────────────
    v_badge_id := 'b1000001-0000-0000-0000-000000000002';
    IF NOT EXISTS (
        SELECT 1 FROM public.utilizador_badges
        WHERE utilizador_id = v_aluno_id AND badge_id = v_badge_id
    ) THEN
        SELECT COUNT(*) INTO v_count
        FROM public.tentativas_simulacao
        WHERE aluno_id = v_aluno_id AND estado = 'reportou';
        IF v_count >= 5 THEN
            INSERT INTO public.utilizador_badges (utilizador_id, badge_id)
            VALUES (v_aluno_id, v_badge_id);
            PERFORM public.fn_atualizar_pontos(v_aluno_id, 25);
            INSERT INTO public.notificacoes (utilizador_id, titulo, mensagem)
            VALUES (v_aluno_id, '🏅 Badge desbloqueado!',
                    'Conquistaste o badge "Detetive Digital". +25 pontos bónus!');
            v_awarded := v_awarded + 1;
        END IF;
    END IF;

    -- ── Badge 3: "Mestre das Passwords" ────────────────────────
    v_badge_id := 'b1000001-0000-0000-0000-000000000003';
    IF NOT EXISTS (
        SELECT 1 FROM public.utilizador_badges
        WHERE utilizador_id = v_aluno_id AND badge_id = v_badge_id
    ) THEN
        SELECT COUNT(*) INTO v_count
        FROM public.tentativas_quiz
        WHERE aluno_id = v_aluno_id AND concluido = TRUE AND nota >= 100;
        IF v_count >= 1 THEN
            INSERT INTO public.utilizador_badges (utilizador_id, badge_id)
            VALUES (v_aluno_id, v_badge_id);
            PERFORM public.fn_atualizar_pontos(v_aluno_id, 20);
            INSERT INTO public.notificacoes (utilizador_id, titulo, mensagem)
            VALUES (v_aluno_id, '🏅 Badge desbloqueado!',
                    'Conquistaste o badge "Mestre das Passwords". +20 pontos bónus!');
            v_awarded := v_awarded + 1;
        END IF;
    END IF;

    -- ── Badge 4: "Estudante Dedicado" ──────────────────────────
    v_badge_id := 'b1000001-0000-0000-0000-000000000004';
    IF NOT EXISTS (
        SELECT 1 FROM public.utilizador_badges
        WHERE utilizador_id = v_aluno_id AND badge_id = v_badge_id
    ) THEN
        SELECT COUNT(*) INTO v_count
        FROM public.progresso_modulo
        WHERE aluno_id = v_aluno_id AND concluido = TRUE;
        IF v_count >= 5 THEN
            INSERT INTO public.utilizador_badges (utilizador_id, badge_id)
            VALUES (v_aluno_id, v_badge_id);
            PERFORM public.fn_atualizar_pontos(v_aluno_id, 50);
            INSERT INTO public.notificacoes (utilizador_id, titulo, mensagem)
            VALUES (v_aluno_id, '🏅 Badge desbloqueado!',
                    'Conquistaste o badge "Estudante Dedicado". +50 pontos bónus!');
            v_awarded := v_awarded + 1;
        END IF;
    END IF;

    -- ── Badge 5: "Especialista em Cibersegurança" ──────────────
    v_badge_id := 'b1000001-0000-0000-0000-000000000005';
    IF NOT EXISTS (
        SELECT 1 FROM public.utilizador_badges
        WHERE utilizador_id = v_aluno_id AND badge_id = v_badge_id
    ) THEN
        SELECT COUNT(*) INTO v_count
        FROM public.progresso_modulo
        WHERE aluno_id = v_aluno_id AND concluido = TRUE;
        IF v_count > 0 AND v_count >= (
            SELECT COUNT(*) FROM public.modulos WHERE estado = 'publicado'
        ) THEN
            INSERT INTO public.utilizador_badges (utilizador_id, badge_id)
            VALUES (v_aluno_id, v_badge_id);
            PERFORM public.fn_atualizar_pontos(v_aluno_id, 100);
            INSERT INTO public.notificacoes (utilizador_id, titulo, mensagem)
            VALUES (v_aluno_id, '🏅 Badge desbloqueado!',
                    'Conquistaste o badge "Especialista em Cibersegurança". +100 pontos bónus!');
            v_awarded := v_awarded + 1;
        END IF;
    END IF;

    -- ── Badge 6: "Quiz Master" ─────────────────────────────────
    v_badge_id := 'b1000001-0000-0000-0000-000000000006';
    IF NOT EXISTS (
        SELECT 1 FROM public.utilizador_badges
        WHERE utilizador_id = v_aluno_id AND badge_id = v_badge_id
    ) THEN
        SELECT COUNT(*) INTO v_count
        FROM public.tentativas_quiz
        WHERE aluno_id = v_aluno_id AND concluido = TRUE AND nota >= 100;
        IF v_count >= 3 THEN
            INSERT INTO public.utilizador_badges (utilizador_id, badge_id)
            VALUES (v_aluno_id, v_badge_id);
            PERFORM public.fn_atualizar_pontos(v_aluno_id, 30);
            INSERT INTO public.notificacoes (utilizador_id, titulo, mensagem)
            VALUES (v_aluno_id, '🏅 Badge desbloqueado!',
                    'Conquistaste o badge "Quiz Master". +30 pontos bónus!');
            v_awarded := v_awarded + 1;
        END IF;
    END IF;

    -- ── Badge 7: "Alerta Máximo" ───────────────────────────────
    v_badge_id := 'b1000001-0000-0000-0000-000000000007';
    IF NOT EXISTS (
        SELECT 1 FROM public.utilizador_badges
        WHERE utilizador_id = v_aluno_id AND badge_id = v_badge_id
    ) THEN
        SELECT COUNT(*) INTO v_count
        FROM public.tentativas_simulacao
        WHERE aluno_id = v_aluno_id AND estado = 'clicou';
        IF v_count = 0 THEN
            SELECT COUNT(*) INTO v_count
            FROM public.tentativas_simulacao
            WHERE aluno_id = v_aluno_id;
            IF v_count >= 10 THEN
                INSERT INTO public.utilizador_badges (utilizador_id, badge_id)
                VALUES (v_aluno_id, v_badge_id);
                PERFORM public.fn_atualizar_pontos(v_aluno_id, 40);
                INSERT INTO public.notificacoes (utilizador_id, titulo, mensagem)
                VALUES (v_aluno_id, '🏅 Badge desbloqueado!',
                        'Conquistaste o badge "Alerta Máximo". +40 pontos bónus!');
                v_awarded := v_awarded + 1;
            END IF;
        END IF;
    END IF;

    RETURN v_awarded;
END;
$$;

COMMENT ON FUNCTION public.fn_verificar_badges() IS
'Verifica e atribui badges ao utilizador autenticado (auth.uid()). '
'NÃO aceita parâmetros — impossível operar em nome de outro user. '
'Chamada apenas internamente por outras RPCs SECURITY DEFINER.';

-- ── 2. Recriar fn_submeter_quiz com a nova chamada ──────────────
CREATE OR REPLACE FUNCTION public.fn_submeter_quiz(
    p_quiz_id UUID,
    p_respostas JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    IF v_aluno_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'erro', 'Não autenticado');
    END IF;

    SELECT id, tentativas_max, pontos_conclusao
      INTO v_quiz
      FROM public.quizzes
     WHERE id = p_quiz_id AND ativo = TRUE;

    IF v_quiz.id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'erro', 'Quiz não encontrado');
    END IF;

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

    IF p_respostas IS NULL OR jsonb_typeof(p_respostas) <> 'object' THEN
        RETURN jsonb_build_object('ok', false, 'erro', 'Respostas inválidas');
    END IF;

    INSERT INTO public.tentativas_quiz (
        quiz_id, aluno_id, nota, pontos_ganhos,
        concluido, iniciado_em, concluido_em
    ) VALUES (
        p_quiz_id, v_aluno_id, 0, 0,
        FALSE, NOW(), NULL
    )
    RETURNING id INTO v_tentativa_id;

    SELECT COUNT(*) INTO v_total_perguntas
      FROM public.perguntas
     WHERE quiz_id = p_quiz_id;

    FOR v_pergunta IN
        SELECT id, pontos
          FROM public.perguntas
         WHERE quiz_id = p_quiz_id
         ORDER BY ordem
    LOOP
        v_opcao_dada_id := NULLIF(p_respostas->>v_pergunta.id::TEXT, '')::UUID;

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

        INSERT INTO public.respostas_tentativa (
            tentativa_id, pergunta_id, opcao_id, correta
        ) VALUES (
            v_tentativa_id, v_pergunta.id, v_opcao_dada_id, v_acertou
        );

        v_detalhes := v_detalhes || jsonb_build_object(
            'pergunta_id',         v_pergunta.id,
            'opcao_dada_id',       v_opcao_dada_id,
            'correta',             v_acertou,
            'opcao_correta_id',    v_opcao_correta_id,
            'opcao_correta_texto', v_opcao_correta_texto
        );
    END LOOP;

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

    IF v_pontos_ganhos > 0 THEN
        PERFORM public.fn_atualizar_pontos(v_aluno_id, v_pontos_ganhos);
    END IF;

    -- CHANGED: agora chama sem parâmetros (auth.uid() interno)
    BEGIN
        PERFORM public.fn_verificar_badges();
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

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
$$;

-- ── 3. Recriar fn_concluir_aula com a nova chamada ──────────────
CREATE OR REPLACE FUNCTION public.fn_concluir_aula(
    p_aula_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_aluno_id           UUID := auth.uid();
    v_modulo_id          UUID;
    v_pontos_modulo      INTEGER;
    v_total_aulas        INTEGER;
    v_aulas_concluidas   UUID[];
    v_ja_concluida_modulo BOOLEAN;
    v_nova_lista         UUID[];
    v_nova_percentagem   NUMERIC(5,2);
    v_modulo_concluido   BOOLEAN;
    v_pontos_ganhos      INTEGER := 0;
BEGIN
    IF v_aluno_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'erro', 'Não autenticado');
    END IF;

    SELECT modulo_id
      INTO v_modulo_id
      FROM public.aulas
     WHERE id = p_aula_id;

    IF v_modulo_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'erro', 'Aula não encontrada');
    END IF;

    SELECT pontos_conclusao
      INTO v_pontos_modulo
      FROM public.modulos
     WHERE id = v_modulo_id;

    SELECT COUNT(*)
      INTO v_total_aulas
      FROM public.aulas
     WHERE modulo_id = v_modulo_id;

    IF v_total_aulas = 0 THEN
        RETURN jsonb_build_object('ok', false, 'erro', 'Módulo sem aulas');
    END IF;

    SELECT aulas_concluidas, concluido
      INTO v_aulas_concluidas, v_ja_concluida_modulo
      FROM public.progresso_modulo
     WHERE aluno_id = v_aluno_id AND modulo_id = v_modulo_id;

    v_aulas_concluidas := COALESCE(v_aulas_concluidas, '{}'::UUID[]);
    v_ja_concluida_modulo := COALESCE(v_ja_concluida_modulo, FALSE);

    IF p_aula_id = ANY(v_aulas_concluidas) THEN
        RETURN jsonb_build_object(
            'ok',              true,
            'ja_concluida',    true,
            'pontos_ganhos',   0,
            'modulo_concluido', v_ja_concluida_modulo,
            'percentagem',     ROUND((array_length(v_aulas_concluidas, 1)::NUMERIC / v_total_aulas) * 100, 2)
        );
    END IF;

    v_nova_lista := ARRAY(
        SELECT DISTINCT a FROM UNNEST(v_aulas_concluidas || p_aula_id) AS a
    );

    v_nova_percentagem := ROUND((array_length(v_nova_lista, 1)::NUMERIC / v_total_aulas) * 100, 2);
    v_modulo_concluido := v_nova_percentagem >= 100;

    INSERT INTO public.progresso_modulo (
        aluno_id, modulo_id, aulas_concluidas, percentagem,
        concluido, iniciado_em, concluido_em, atualizado_em
    )
    VALUES (
        v_aluno_id, v_modulo_id, v_nova_lista, v_nova_percentagem,
        v_modulo_concluido, NOW(),
        CASE WHEN v_modulo_concluido THEN NOW() ELSE NULL END,
        NOW()
    )
    ON CONFLICT (aluno_id, modulo_id) DO UPDATE SET
        aulas_concluidas = EXCLUDED.aulas_concluidas,
        percentagem      = EXCLUDED.percentagem,
        concluido        = EXCLUDED.concluido,
        concluido_em     = COALESCE(public.progresso_modulo.concluido_em, EXCLUDED.concluido_em),
        atualizado_em    = NOW();

    IF v_modulo_concluido AND NOT v_ja_concluida_modulo AND v_pontos_modulo > 0 THEN
        PERFORM public.fn_atualizar_pontos(v_aluno_id, v_pontos_modulo);
        v_pontos_ganhos := v_pontos_modulo;
    END IF;

    -- CHANGED: agora chama sem parâmetros (auth.uid() interno)
    BEGIN
        PERFORM public.fn_verificar_badges();
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'ok',               true,
        'ja_concluida',     false,
        'pontos_ganhos',    v_pontos_ganhos,
        'modulo_concluido', v_modulo_concluido,
        'percentagem',      v_nova_percentagem
    );
END;
$$;

-- ── 4. Apagar a assinatura antiga (com p_aluno_id) ──────────────
DROP FUNCTION IF EXISTS public.fn_verificar_badges(UUID);

-- ── 5. REVOKE EXECUTE da nova fn_verificar_badges ───────────────
-- Só callers SECURITY DEFINER internos a invocam (fn_submeter_quiz,
-- fn_concluir_aula, fn_submeter_simulacao). Não há razão para
-- exposição pública.
REVOKE EXECUTE ON FUNCTION public.fn_verificar_badges() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_verificar_badges() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_verificar_badges() FROM authenticated;
