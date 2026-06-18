-- ============================================================
-- DEFENSE IN DEPTH: revogar acesso público a fn_calcular_progresso_modulo
-- ============================================================
--
-- A função aceita `p_aluno_id` e `p_modulo_id` como parâmetros e
-- retorna a percentagem de progresso de qualquer aluno em qualquer
-- módulo. Está exposta como RPC pública desde a migration inicial,
-- o que significa que qualquer authenticated user a podia chamar
-- via `supabase.rpc('fn_calcular_progresso_modulo', { p_aluno_id, p_modulo_id })`
-- para descobrir o progresso de qualquer outro aluno.
--
-- Não há callers no código TypeScript (verificado durante a auditoria
-- pós-fix). É um candidato seguro para REVOKE EXECUTE: nada quebra
-- e fechamos um vector de information disclosure menor.
--
-- Funções `SECURITY DEFINER` internas que precisassem desta
-- continuariam a executar (correm como owner), mas neste momento
-- nada interno a invoca.
--
-- Notas sobre as outras funções suspeitas (referidas no audit):
--   - `fn_atualizar_pontos(p_utilizador_id, p_pontos)`: tem caller
--     cliente em `simulacao-client.tsx:78`. REVOKE quebraria a UI.
--     Fix coordenado (substituir por RPC server-side
--     fn_submeter_simulacao) fica para PR separado.
--   - `fn_verificar_badges(p_aluno_id)`: idem, caller em
--     `simulacao-client.tsx:90`. Mesmo PR.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.fn_calcular_progresso_modulo(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_calcular_progresso_modulo(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_calcular_progresso_modulo(UUID, UUID) FROM authenticated;
