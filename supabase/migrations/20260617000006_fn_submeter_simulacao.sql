-- ============================================================
-- SECURITY FIX: simulações de phishing com scoring server-side
-- ============================================================
--
-- Vulnerabilidade:
--   simulacao-client.tsx fazia 3 chamadas que aceitavam input
--   arbitrário do cliente:
--
--     1) supabase.from('tentativas_simulacao').insert({
--          aluno_id: user.id,
--          estado,                   -- ← podia mentir
--          pontos_ganhos: pontosGanhos,  -- ← podia inflacionar
--          tempo_decisao: ...,
--        })
--     2) supabase.rpc('fn_atualizar_pontos', {
--          p_utilizador_id: user.id,
--          p_pontos: pontosGanhos,   -- ← podia ser 999999
--        })
--     3) supabase.rpc('fn_verificar_badges', {
--          p_aluno_id: user.id,      -- ← podia ser outro user
--        })
--
--   Combinadas, davam scoring arbitrário e ataque indirecto a
--   outros utilizadores. Manipulável no DevTools em segundos.
--
-- Correção:
--   Uma única RPC fn_submeter_simulacao(p_simulacao_id, p_estado,
--   p_tempo_decisao) que:
--     - usa auth.uid() internamente (nunca aceita user_id)
--     - valida que o caller é aluno
--     - valida que a simulação existe e está activa
--     - valida o estado contra os valores permitidos
--     - calcula pontos no servidor a partir de simulacoes_phishing.pontos_sucesso
--     - garante que só a PRIMEIRA tentativa correcta atribui pontos
--       (impede ataque "spam reportou para acumular pontos")
--     - insere tentativa, atualiza pontos, verifica badges, tudo
--       atomicamente
--
-- REVOKE EXECUTE de fn_atualizar_pontos para todos os papéis
-- públicos. A função continua a ser usada internamente por
-- fn_submeter_quiz, fn_concluir_aula, fn_submeter_simulacao e
-- fn_verificar_badges (que executam como owner e bypassam a
-- restrição). O cliente perde toda a capacidade de a invocar.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_submeter_simulacao(
    p_simulacao_id  UUID,
    p_estado        TEXT,
    p_tempo_decisao INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_aluno_id      UUID := auth.uid();
    v_papel         public.papel_utilizador;
    v_simulacao     RECORD;
    v_estado        public.estado_simulacao;
    v_pontos_ganhos INTEGER := 0;
    v_ja_pontuou    BOOLEAN;
BEGIN
    -- ── Autenticação ─────────────────────────────────────────
    IF v_aluno_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'erro', 'Não autenticado');
    END IF;

    -- ── Validar que o caller é aluno ─────────────────────────
    -- Outros papéis (professor/admin) podem não querer "registar"
    -- tentativas. Mantemos restrito a aluno.
    SELECT papel INTO v_papel
      FROM public.perfis
     WHERE id = v_aluno_id;

    IF v_papel IS NULL OR v_papel <> 'aluno' THEN
        RETURN jsonb_build_object(
            'ok', false,
            'erro', 'Apenas alunos podem submeter simulações.'
        );
    END IF;

    -- ── Validar input p_estado ───────────────────────────────
    -- Cast lança se p_estado não corresponde a um valor do enum.
    BEGIN
        v_estado := p_estado::public.estado_simulacao;
    EXCEPTION WHEN invalid_text_representation OR others THEN
        RETURN jsonb_build_object('ok', false, 'erro', 'Estado inválido.');
    END;

    -- Só estes 3 são submissões legítimas (pendente é o default
    -- antes de o aluno decidir).
    IF v_estado NOT IN ('clicou', 'ignorou', 'reportou') THEN
        RETURN jsonb_build_object('ok', false, 'erro', 'Estado não permitido.');
    END IF;

    -- ── Validar tempo de decisão ─────────────────────────────
    -- Defensivo: rejeitar negativos e valores absurdos
    -- (24h = 86400s; uma decisão de phishing nunca passa disto).
    IF p_tempo_decisao IS NULL OR p_tempo_decisao < 0 OR p_tempo_decisao > 86400 THEN
        RETURN jsonb_build_object('ok', false, 'erro', 'Tempo de decisão inválido.');
    END IF;

    -- ── Validar simulação ────────────────────────────────────
    SELECT id, pontos_sucesso, ativo
      INTO v_simulacao
      FROM public.simulacoes_phishing
     WHERE id = p_simulacao_id;

    IF v_simulacao.id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'erro', 'Simulação não encontrada.');
    END IF;

    IF NOT v_simulacao.ativo THEN
        RETURN jsonb_build_object('ok', false, 'erro', 'Simulação desactivada.');
    END IF;

    -- ── Calcular pontos no servidor ──────────────────────────
    -- Só ganha pontos quem reporta correctamente E ainda não tinha
    -- pontuado nesta simulação (impede acumulação por retry).
    IF v_estado = 'reportou' THEN
        SELECT EXISTS (
            SELECT 1 FROM public.tentativas_simulacao
             WHERE simulacao_id = p_simulacao_id
               AND aluno_id    = v_aluno_id
               AND pontos_ganhos > 0
        ) INTO v_ja_pontuou;

        IF NOT v_ja_pontuou THEN
            v_pontos_ganhos := v_simulacao.pontos_sucesso;
        END IF;
    END IF;

    -- ── Inserir tentativa ────────────────────────────────────
    INSERT INTO public.tentativas_simulacao (
        simulacao_id, aluno_id, estado, pontos_ganhos, tempo_decisao
    ) VALUES (
        p_simulacao_id, v_aluno_id, v_estado, v_pontos_ganhos, p_tempo_decisao
    );

    -- ── Actualizar pontos do utilizador ──────────────────────
    IF v_pontos_ganhos > 0 THEN
        PERFORM public.fn_atualizar_pontos(v_aluno_id, v_pontos_ganhos);
    END IF;

    -- ── Verificar badges (silencioso em caso de erro) ────────
    BEGIN
        PERFORM public.fn_verificar_badges();
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- ── Resposta ─────────────────────────────────────────────
    RETURN jsonb_build_object(
        'ok',            true,
        'estado',        v_estado::TEXT,
        'pontos_ganhos', v_pontos_ganhos
    );
END;
$$;

COMMENT ON FUNCTION public.fn_submeter_simulacao IS
'Submete o resultado de uma simulação de phishing. Toda a lógica de '
'scoring corre no servidor — cliente não controla pontos. Idempotente '
'em pontos: retries não acumulam.';

GRANT EXECUTE ON FUNCTION public.fn_submeter_simulacao(UUID, TEXT, INTEGER) TO authenticated;

-- ============================================================
-- REVOKE EXECUTE de fn_atualizar_pontos
-- ============================================================
-- Internal callers (fn_submeter_quiz, fn_concluir_aula,
-- fn_submeter_simulacao, fn_verificar_badges) executam como owner
-- e mantêm acesso. O cliente perde a possibilidade de inflacionar
-- pontos arbitrariamente.
REVOKE EXECUTE ON FUNCTION public.fn_atualizar_pontos(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_atualizar_pontos(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_atualizar_pontos(UUID, INTEGER) FROM authenticated;
