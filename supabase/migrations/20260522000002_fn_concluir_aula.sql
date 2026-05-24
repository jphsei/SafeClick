-- ============================================================
-- Migração: fn_concluir_aula
-- ============================================================
-- Move a lógica de "marcar aula como concluída" do cliente para o
-- servidor. Resolve a vulnerabilidade em que o cliente chamava
-- diretamente `fn_atualizar_pontos` com um valor de pontos arbitrário
-- (manipulável no DevTools) e atualizava `progresso_modulo` sem
-- validação server-side.
--
-- Esta função:
--   - Verifica que o utilizador está autenticado
--   - Verifica que a aula existe
--   - Idempotente: se a aula já estava concluída, devolve sem alterar
--     nada e sem atribuir pontos
--   - Adiciona a aula ao array `aulas_concluidas` (com dedup)
--   - Recalcula `percentagem` e marca `concluido = true` se 100%
--   - Atribui os pontos de conclusão do módulo APENAS quando o módulo
--     passa de incompleto para completo (impede ganhar pontos múltiplas
--     vezes pelo mesmo módulo)
--   - Atualiza `perfis.pontos_total` via `fn_atualizar_pontos`
--   - Dispara verificação de badges
--   - Devolve resultado para o cliente actualizar UI
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_concluir_aula(
    p_aula_id UUID
) RETURNS JSONB AS $$
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
    -- ── Autenticação ─────────────────────────────────────────
    IF v_aluno_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'erro', 'Não autenticado');
    END IF;

    -- ── Validar aula ─────────────────────────────────────────
    SELECT modulo_id
      INTO v_modulo_id
      FROM public.aulas
     WHERE id = p_aula_id;

    IF v_modulo_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'erro', 'Aula não encontrada');
    END IF;

    -- ── Buscar pontos do módulo ──────────────────────────────
    SELECT pontos_conclusao
      INTO v_pontos_modulo
      FROM public.modulos
     WHERE id = v_modulo_id;

    -- ── Contar total de aulas do módulo ──────────────────────
    SELECT COUNT(*)
      INTO v_total_aulas
      FROM public.aulas
     WHERE modulo_id = v_modulo_id;

    -- Defesa: módulo sem aulas (improvável mas seguro)
    IF v_total_aulas = 0 THEN
        RETURN jsonb_build_object('ok', false, 'erro', 'Módulo sem aulas');
    END IF;

    -- ── Buscar progresso atual (pode não existir) ────────────
    SELECT aulas_concluidas, concluido
      INTO v_aulas_concluidas, v_ja_concluida_modulo
      FROM public.progresso_modulo
     WHERE aluno_id = v_aluno_id AND modulo_id = v_modulo_id;

    v_aulas_concluidas := COALESCE(v_aulas_concluidas, '{}'::UUID[]);
    v_ja_concluida_modulo := COALESCE(v_ja_concluida_modulo, FALSE);

    -- ── Idempotência: aula já concluída? ─────────────────────
    IF p_aula_id = ANY(v_aulas_concluidas) THEN
        RETURN jsonb_build_object(
            'ok',              true,
            'ja_concluida',    true,
            'pontos_ganhos',   0,
            'modulo_concluido', v_ja_concluida_modulo,
            'percentagem',     ROUND((array_length(v_aulas_concluidas, 1)::NUMERIC / v_total_aulas) * 100, 2)
        );
    END IF;

    -- ── Adicionar aula à lista (com dedup defensivo) ─────────
    v_nova_lista := ARRAY(
        SELECT DISTINCT a FROM UNNEST(v_aulas_concluidas || p_aula_id) AS a
    );

    v_nova_percentagem := ROUND((array_length(v_nova_lista, 1)::NUMERIC / v_total_aulas) * 100, 2);
    v_modulo_concluido := v_nova_percentagem >= 100;

    -- ── Upsert progresso_modulo ──────────────────────────────
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

    -- ── Atribuir pontos do módulo só na primeira conclusão ───
    -- (impede ganhar pontos repetidos se algum bug fizer com que
    --  o módulo entre/saia do estado concluído)
    IF v_modulo_concluido AND NOT v_ja_concluida_modulo AND v_pontos_modulo > 0 THEN
        PERFORM public.fn_atualizar_pontos(v_aluno_id, v_pontos_modulo);
        v_pontos_ganhos := v_pontos_modulo;
    END IF;

    -- ── Verificar badges (silencioso em caso de erro) ────────
    BEGIN
        PERFORM public.fn_verificar_badges(v_aluno_id);
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- ── Resposta para o cliente ──────────────────────────────
    RETURN jsonb_build_object(
        'ok',               true,
        'ja_concluida',     false,
        'pontos_ganhos',    v_pontos_ganhos,
        'modulo_concluido', v_modulo_concluido,
        'percentagem',      v_nova_percentagem
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_concluir_aula IS
'Marca uma aula como concluída para o utilizador autenticado, '
'atualiza o progresso do módulo, e atribui os pontos de conclusão '
'do módulo apenas quando este passa de incompleto para completo.';

-- ── Permissões ───────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.fn_concluir_aula(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_concluir_aula(UUID) TO authenticated;
