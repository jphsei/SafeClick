-- ============================================================
-- SECURITY: fn_atualizar_pontos com SET search_path = public
-- ============================================================
--
-- Contexto:
--   A função `fn_atualizar_pontos` foi originalmente criada na
--   migration 20250309000001 como SECURITY DEFINER mas sem
--   `SET search_path = public`. Auditoria pós-deploy identificou
--   isto como dívida de segurança consolidada:
--
--     CREATE OR REPLACE FUNCTION public.fn_atualizar_pontos(...)
--     RETURNS VOID AS $$
--     BEGIN
--         UPDATE public.perfis SET pontos_total = ...;
--     END;
--     $$ LANGUAGE plpgsql SECURITY DEFINER;
--                              ^^^^^^^^^^^^^^^^
--                              sem SET search_path
--
-- Vector teórico:
--   Em PostgreSQL, SECURITY DEFINER sem `SET search_path` herda o
--   search_path do caller. Se um atacker conseguir manipular o
--   search_path da sua sessão antes de chamar a função (ou via uma
--   chain de RPCs), pode injectar tabelas/operadores maliciosos
--   num schema de prioridade superior que sobreescreva
--   `public.perfis` ou `pontos_total`.
--
--   Em prática para SafeClick o vector é muito baixo:
--     - `fn_atualizar_pontos` está REVOKE'd para anon/authenticated
--       (mig 20260617000006) — só callers SECURITY DEFINER internos.
--     - Esses callers (fn_submeter_quiz, fn_concluir_aula,
--       fn_submeter_simulacao, fn_verificar_badges) TÊM
--       `SET search_path = public` e mantêm-no na sub-chamada.
--
--   Ainda assim, é defesa em profundidade: garantir que mesmo num
--   cenário inesperado (e.g. nova chamada introduzida sem o SET),
--   a função não pode ser desviada por search_path manipulation.
--
-- Esta migration recria a função com a mesma assinatura, corpo e
-- security profile — só adiciona `SET search_path = public`.
-- Não altera comportamento funcional.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_atualizar_pontos(
    p_utilizador_id UUID,
    p_pontos INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.perfis
    SET pontos_total = pontos_total + p_pontos
    WHERE id = p_utilizador_id;
END;
$$;

COMMENT ON FUNCTION public.fn_atualizar_pontos(UUID, INTEGER) IS
'Adiciona pontos a um utilizador. SECURITY DEFINER + SET search_path '
'(audit 2026-06-19). REVOKE'' d para authenticated/anon — só callers '
'internos SECURITY DEFINER (fn_submeter_quiz, fn_concluir_aula, '
'fn_submeter_simulacao, fn_verificar_badges) a invocam.';
