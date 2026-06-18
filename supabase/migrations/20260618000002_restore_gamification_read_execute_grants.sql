-- ============================================================
-- SECURITY: restaurar grants legítimos pós-hardening
-- ============================================================
--
-- Contexto:
--   Depois de aplicar a migration 20260618000001 (REVOKE de INSERT/
--   UPDATE/DELETE directos nas tabelas de gamificação) os testes
--   começaram a falhar com:
--
--     - permission denied for function fn_submeter_quiz
--     - permission denied for function fn_concluir_aula
--     - permission denied for table progresso_modulo
--
--   Estes erros NÃO vêm da migration 20260618000001 (que toca
--   exclusivamente em INSERT/UPDATE/DELETE) mas sim do estado
--   acumulado de migrations anteriores que recriaram funções e/ou
--   revogaram permissões default sem reaplicar os GRANTs necessários
--   para o caminho legítimo.
--
-- Esta migration NÃO altera as migrations anteriores. Apenas garante,
-- de forma idempotente e explícita, as permissões que o caminho
-- legítimo (cliente authenticated) precisa:
--
--   1. EXECUTE nas 3 RPCs públicas de gamificação
--   2. SELECT nas 4 tabelas de gamificação (escritas continuam
--      bloqueadas pela 20260618000001)
--
-- Porque isto NÃO reabre a vulnerabilidade auditada em
-- 20260618000001:
--
--   ┌──────────────────────────────────────────────────────────┐
--   │ Vector de ataque              │ Continua bloqueado?      │
--   ├───────────────────────────────┼──────────────────────────┤
--   │ INSERT directo progresso_*    │ ✅ REVOKE em 000001      │
--   │ UPDATE directo tentativas_*   │ ✅ REVOKE em 000001      │
--   │ DELETE directo respostas_*    │ ✅ REVOKE em 000001      │
--   │ INSERT directo utilizador_*   │ ✅ Sem policy INSERT     │
--   │ fn_atualizar_pontos arbitrary │ ✅ REVOKE em 000006      │
--   │ fn_verificar_badges p_aluno   │ ✅ DROP+REVOKE em 000005 │
--   │ fn_calcular_progresso_modulo  │ ✅ REVOKE em 000004      │
--   │ SELECT pontos_total alheios   │ ⚠️ via v_leaderboard,    │
--   │                               │    intencional (público) │
--   │ SELECT progresso alheio       │ ✅ RLS filtra            │
--   │ UPDATE perfis.pontos_total    │ ✅ column REVOKE em 000012│
--   │ UPDATE perfis.papel           │ ✅ idem                   │
--   └──────────────────────────────────────────────────────────┘
--
--   - SELECT nas tabelas alvo é filtrado por RLS já existente:
--       progresso_select_proprio (aluno_id = auth.uid())
--       tentativas_select_proprio (aluno_id = auth.uid())
--       tent_sim_select_proprio  (aluno_id = auth.uid())
--       respostas_select_proprio (via JOIN tentativas_quiz)
--     Sem RLS bypass, sem leak para outros utilizadores.
--
--   - EXECUTE nas 3 RPCs é o vector legítimo de escrita.
--     Cada RPC é SECURITY DEFINER e usa auth.uid() internamente
--     (sem aceitar user_id do cliente). Calcula pontos server-side.
--     Não há forma de inflacionar pontos via estas RPCs.
--
--   - Funções "raw" continuam REVOKED para o cliente:
--       fn_atualizar_pontos      → 20260617000006
--       fn_verificar_badges      → 20260617000005
--       fn_calcular_progresso_*  → 20260617000004
--     Apenas as 3 RPCs SECURITY DEFINER as invocam internamente
--     (correm como owner postgres, bypassam o REVOKE).
-- ============================================================

-- ── 1. EXECUTE nas RPCs públicas de gamificação ──────────────────
-- Idempotente: se já tiver, GRANT é no-op.
GRANT EXECUTE ON FUNCTION public.fn_submeter_quiz(UUID, JSONB)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.fn_concluir_aula(UUID)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.fn_submeter_simulacao(UUID, TEXT, INTEGER)
  TO authenticated;

COMMENT ON FUNCTION public.fn_submeter_quiz(UUID, JSONB) IS
'RPC pública de submissão de quiz. SECURITY DEFINER + auth.uid() interno. '
'Authenticated tem EXECUTE; cálculo de nota/pontos é server-side.';

COMMENT ON FUNCTION public.fn_concluir_aula(UUID) IS
'RPC pública de conclusão de aula. SECURITY DEFINER + auth.uid() interno. '
'Authenticated tem EXECUTE; idempotente; só atribui pontos uma vez por módulo.';

COMMENT ON FUNCTION public.fn_submeter_simulacao(UUID, TEXT, INTEGER) IS
'RPC pública de submissão de simulação de phishing. SECURITY DEFINER + '
'auth.uid() interno. Authenticated tem EXECUTE; cálculo de pontos server-side; '
'só "reportou" pela 1ª vez ganha pontos.';

-- ── 2. SELECT nas tabelas de gamificação (RLS filtra) ────────────
GRANT SELECT ON public.progresso_modulo    TO authenticated;
GRANT SELECT ON public.tentativas_quiz     TO authenticated;
GRANT SELECT ON public.tentativas_simulacao TO authenticated;
GRANT SELECT ON public.respostas_tentativa  TO authenticated;

-- ── 3. O que esta migration EXPLICITAMENTE NÃO faz ───────────────
-- ⛔ NÃO restaura INSERT/UPDATE/DELETE para authenticated em nenhuma
--    das 4 tabelas — o REVOKE da 20260618000001 mantém-se.
--
-- ⛔ NÃO restaura EXECUTE de:
--      - public.fn_atualizar_pontos(UUID, INTEGER)     (mig 000006)
--      - public.fn_verificar_badges()                  (mig 000005)
--      - public.fn_calcular_progresso_modulo(UUID, UUID) (mig 000004)
--    Estas continuam só invocáveis a partir de SECURITY DEFINER
--    chains internas, nunca pelo cliente.
--
-- ⛔ NÃO toca em utilizador_badges, badges, notificacoes
--    (já têm RLS apertada; sem policy INSERT/UPDATE/DELETE para
--    authenticated → nega por defeito).
--
-- ⛔ NÃO toca em perfis (column-level perms da 20260617000012
--    mantêm-se: authenticated só pode UPDATE nome_completo,
--    numero_aluno, avatar_url, atualizado_em).
