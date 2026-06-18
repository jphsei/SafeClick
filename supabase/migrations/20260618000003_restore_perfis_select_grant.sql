-- ============================================================
-- SECURITY: restaurar GRANT SELECT em public.perfis
-- ============================================================
--
-- Contexto:
--   Em ambientes locais com versões recentes da Supabase CLI, o
--   GRANT SELECT default em `public.perfis` para `authenticated` e
--   `anon` deixou de ser aplicado automaticamente (consequência das
--   migrations correrem como `supabase_admin` em vez de `postgres`,
--   com ALTER DEFAULT PRIVILEGES mais restritivos).
--
--   Sintoma observável: ao fazer `SELECT … FROM progresso_modulo`
--   como `authenticated`, o PostgreSQL avalia TODAS as policies
--   SELECT da tabela (combinadas com OR). A policy
--   `progresso_professor_select` faz uma subquery a `perfis`:
--
--     EXISTS (SELECT 1 FROM public.perfis WHERE ...)
--
--   Sem GRANT SELECT em perfis, o PostgREST devolve:
--     "permission denied for table perfis"
--
-- Esta migration NÃO altera nenhuma migration anterior. Apenas
-- restaura, explicitamente e de forma idempotente, o GRANT SELECT
-- que produção (Supabase Cloud) tem por defeito.
--
-- Porque isto NÃO reabre nenhum vector de ataque:
--
--   - SELECT em perfis está totalmente filtrado por RLS:
--       perfis_select_proprio              (auth.uid() = id)
--       perfis_select_professor_alunos     (professor → seus alunos)
--       perfis_admin_tudo                  (admin)
--
--     Sem RLS bypass possível. Authenticated só vê o próprio perfil
--     (e, se for professor, os seus alunos). Anon nunca casa com
--     nenhuma policy → vê 0 linhas.
--
--   - INSERT/UPDATE/DELETE em perfis CONTINUAM revogados pela
--     20260617000012:
--       REVOKE UPDATE ON public.perfis FROM authenticated;
--       GRANT UPDATE (nome_completo, numero_aluno, avatar_url,
--                     atualizado_em) ON public.perfis TO authenticated;
--       REVOKE INSERT, DELETE ON public.perfis FROM authenticated;
--
--     Logo nenhum aluno pode escrever em perfis directamente.
--
--   - pontos_total, papel, escola_id, ativo continuam não-editáveis
--     por authenticated (column REVOKE da 20260617000012).
-- ============================================================

GRANT SELECT ON public.perfis TO authenticated;
GRANT SELECT ON public.perfis TO anon;

-- Defense in depth: garantir SELECT também nas restantes tabelas
-- envolvidas no fluxo de RLS subqueries para evitar cascade de
-- permission denied. Cada uma tem RLS estrita que filtra o que se vê.

GRANT SELECT ON public.escolas       TO authenticated;
GRANT SELECT ON public.turmas        TO authenticated;
GRANT SELECT ON public.turma_alunos  TO authenticated;
GRANT SELECT ON public.turma_modulos TO authenticated;
GRANT SELECT ON public.modulos       TO authenticated;
GRANT SELECT ON public.aulas         TO authenticated;
GRANT SELECT ON public.quizzes       TO authenticated;
GRANT SELECT ON public.perguntas     TO authenticated;
GRANT SELECT ON public.opcoes_resposta TO authenticated;
GRANT SELECT ON public.simulacoes_phishing TO authenticated;
GRANT SELECT ON public.recursos_pedagogicos TO authenticated;
GRANT SELECT ON public.badges        TO authenticated;
GRANT SELECT ON public.utilizador_badges TO authenticated;
GRANT SELECT ON public.notificacoes  TO authenticated;

-- v_leaderboard é uma VIEW sobre perfis + escolas + utilizador_badges.
-- Sem SELECT na view, o cliente não consegue ler o leaderboard.
GRANT SELECT ON public.v_leaderboard    TO authenticated;
GRANT SELECT ON public.v_progresso_aluno TO authenticated;
GRANT SELECT ON public.v_stats_turma    TO authenticated;
