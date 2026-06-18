-- ============================================================
-- SECURITY FIX (corrige bug crítico em 20260617000003)
-- ============================================================
--
-- A migration 20260617000003 criou um trigger BEFORE UPDATE em
-- perfis para impedir escalada de papel/escola_id/etc. Auditoria
-- subsequente detectou um BUG CRÍTICO:
--
--   O trigger bloqueia TODAS as alterações a pontos_total para
--   não-admins, INCLUINDO as feitas pelas RPCs SECURITY DEFINER
--   legítimas (fn_atualizar_pontos chamada por fn_submeter_quiz,
--   fn_concluir_aula, fn_submeter_simulacao, fn_verificar_badges).
--
--   Razão: auth.uid() preserva-se em chains SECURITY DEFINER. O
--   trigger não consegue distinguir "aluno faz UPDATE directo" vs
--   "aluno chama RPC trusted que faz UPDATE". Tentativas via
--   set_config (bypassável pelo cliente) e via current_user (sempre
--   postgres dentro do trigger SECURITY DEFINER) falharam.
--
--   Consequência: alunos completam quizzes/aulas/simulações mas
--   NÃO recebem pontos. Gamification quebrada.
--
-- Correção:
--   Substituir o trigger por COLUMN-LEVEL UPDATE permissions
--   nativas do PostgreSQL. SECURITY DEFINER bypassa column-perms
--   automaticamente (executa como owner postgres com privilégios
--   plenos). authenticated role tem UPDATE apenas nas colunas que
--   o utilizador pode legitimamente modificar.
--
-- Matriz final de UPDATE em public.perfis:
--   ┌─────────────────┬──────────────────────────────────────────┐
--   │ Coluna          │ Quem pode UPDATE                         │
--   ├─────────────────┼──────────────────────────────────────────┤
--   │ nome_completo   │ authenticated (próprio), service_role,   │
--   │                 │ SECURITY DEFINER chains                  │
--   │ numero_aluno    │ idem                                     │
--   │ avatar_url      │ idem                                     │
--   │ atualizado_em   │ idem                                     │
--   ├─────────────────┼──────────────────────────────────────────┤
--   │ papel           │ SÓ service_role + SECURITY DEFINER       │
--   │ escola_id       │ idem                                     │
--   │ ativo           │ idem                                     │
--   │ pontos_total    │ idem (atribuição via fn_atualizar_pontos)│
--   │ email           │ idem (fluxo via Supabase Auth)           │
--   │ id              │ ninguém (PK imutável)                    │
--   │ criado_em       │ idem                                     │
--   └─────────────────┴──────────────────────────────────────────┘
--
-- Vantagens vs trigger:
--   - Não bloqueia SECURITY DEFINER chains legítimas
--   - Verificação nativa PG (mais rápida e à prova de bugs)
--   - REVOKE não é bypassável por SET session variables
--   - Erros claros ("permission denied for column X")
--
-- Impacto nas server actions:
--   - atualizarMeuPerfil (perfil/actions.ts) — actualiza apenas
--     nome_completo, numero_aluno, atualizado_em → permitido ✓
--   - criarUtilizador (admin/utilizadores/actions.ts) — já usa
--     service-role (createAdminClient) → bypassa ✓
--   - atualizarUtilizador, desativarUtilizador, reativarUtilizador —
--     usavam authenticated client. PRECISAM de ser actualizadas para
--     usar service-role (createAdminClient). Feito no mesmo PR.
-- ============================================================

-- ── 1. Remover o trigger problemático e a função ────────────────
DROP TRIGGER IF EXISTS trg_prevenir_escalada_perfil ON public.perfis;
DROP FUNCTION IF EXISTS public.fn_prevenir_escalada_perfil();

-- ── 2. Tighten column-level UPDATE permissions ──────────────────
-- Revogamos UPDATE em todas as colunas para authenticated/anon.
-- Depois GRANT seletivo apenas nas colunas user-editable.
REVOKE UPDATE ON public.perfis FROM authenticated;
REVOKE UPDATE ON public.perfis FROM anon;

-- Colunas user-editable:
--   - nome_completo  (utilizador pode mudar)
--   - numero_aluno   (utilizador pode mudar)
--   - avatar_url     (utilizador pode mudar, quando upload existir)
--   - atualizado_em  (trigger fn_atualizar_timestamp mexe; permitir
--                     para que o UPDATE com SET nome_completo... não
--                     falhe por causa do trigger AFTER setar atualizado_em)
GRANT UPDATE (nome_completo, numero_aluno, avatar_url, atualizado_em)
  ON public.perfis TO authenticated;

-- anon nunca actualiza perfis (RLS bloqueia já). Sem GRANT.

-- ── 3. Tighten INSERT/DELETE ────────────────────────────────────
-- INSERT em perfis acontece via trigger fn_novo_utilizador (SECURITY
-- DEFINER, owner postgres). authenticated não devia poder INSERT
-- directamente — RLS já bloqueia mas defesa em profundidade:
REVOKE INSERT, DELETE ON public.perfis FROM authenticated;
REVOKE INSERT, DELETE ON public.perfis FROM anon;

-- ── 4. SELECT continua aberto (filtrado por RLS) ────────────────
-- perfis_select_proprio + perfis_select_professor_alunos +
-- perfis_admin_tudo cobrem o controlo de acesso para leitura.
-- Nenhuma alteração necessária para SELECT.

COMMENT ON TABLE public.perfis IS
'Perfis de utilizadores. UPDATE protegido por COLUMN PERMISSIONS: '
'authenticated tem UPDATE apenas em (nome_completo, numero_aluno, '
'avatar_url, atualizado_em). Campos sensíveis (papel, escola_id, '
'ativo, pontos_total, email, id) só via service_role ou SECURITY '
'DEFINER functions (fn_atualizar_pontos, etc.).';
