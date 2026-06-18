-- ============================================================
-- FIX: restaurar GRANT ALL ao service_role nas tabelas public
-- ============================================================
--
-- Contexto:
--   Diagnóstico empírico mostra que `service_role` no Supabase
--   local CLI 2.75 não tem `SELECT/INSERT/UPDATE/DELETE` em
--   `public.perfis` (e provavelmente noutras tabelas). Verificado via:
--
--     SELECT grantee, privilege_type
--       FROM information_schema.role_table_grants
--      WHERE table_schema='public' AND table_name='perfis';
--
--   service_role apenas aparece com REFERENCES/TRIGGER/TRUNCATE.
--
--   Em Supabase Cloud, `service_role` tem ALL em todas as tabelas
--   do schema public por defeito — é o role usado server-side com
--   a `SUPABASE_SERVICE_ROLE_KEY` para operações administrativas
--   que precisam de bypass de RLS. A CLI 2.75 local não aplica
--   esses defaults consistentemente.
--
--   Sintoma cascateado: qualquer `admin.from(...).insert/select/...`
--   nos testes (ou em server actions com createAdminClient) falha
--   silenciosamente. Os tests faziam:
--
--     await admin.from('progresso_modulo').insert(...)  // setup
--     // service_role sem INSERT → silently fails
--     await admin.from('...').select(...).single()
--     // 0 rows → TypeError de null
--
-- Esta migration NÃO altera as migrations anteriores. Apenas
-- restaura o GRANT ALL que o ambiente Cloud já tem.
--
-- Porque isto NÃO reabre nenhum vector de segurança:
--
--   - `service_role` é deliberadamente um role de bypass: serve
--     para operações server-side que precisam de ignorar RLS
--     (criar utilizadores, gerir escolas, etc.). É a forma como
--     o Supabase distingue "admin trusted code" de "client code".
--
--   - A `SUPABASE_SERVICE_ROLE_KEY` NUNCA é exposta ao browser.
--     Está apenas em:
--       • frontend/.env.local (gitignored)
--       • Vercel env vars (server-side only, never NEXT_PUBLIC_)
--       • createAdminClient() — só usado em server actions e route
--         handlers que correm em Node, nunca no client bundle.
--
--   - O guard `import 'server-only'` em lib/supabase/admin.ts
--     garante que se algum dia alguém importar createAdminClient
--     num client component, o build do Next.js falha.
--
--   - O cliente browser usa apenas a anon key (`role=anon` antes
--     de signIn, `role=authenticated` depois). Esses roles
--     mantêm o REVOKE da 20260618000001 e da 20260617000012.
--
-- Padrão consistente com a 20260618000003 (que restaurou GRANT
-- SELECT a authenticated/anon que a CLI local também não aplicava).
-- ============================================================

-- Tabelas core da gamificação e auth
GRANT ALL ON public.perfis              TO service_role;
GRANT ALL ON public.escolas             TO service_role;
GRANT ALL ON public.turmas              TO service_role;
GRANT ALL ON public.turma_alunos        TO service_role;
GRANT ALL ON public.turma_modulos       TO service_role;
GRANT ALL ON public.modulos             TO service_role;
GRANT ALL ON public.aulas               TO service_role;
GRANT ALL ON public.quizzes             TO service_role;
GRANT ALL ON public.perguntas           TO service_role;
GRANT ALL ON public.opcoes_resposta     TO service_role;
GRANT ALL ON public.tentativas_quiz     TO service_role;
GRANT ALL ON public.respostas_tentativa TO service_role;
GRANT ALL ON public.progresso_modulo    TO service_role;
GRANT ALL ON public.simulacoes_phishing TO service_role;
GRANT ALL ON public.tentativas_simulacao TO service_role;
GRANT ALL ON public.badges              TO service_role;
GRANT ALL ON public.utilizador_badges   TO service_role;
GRANT ALL ON public.notificacoes        TO service_role;
GRANT ALL ON public.recursos_pedagogicos TO service_role;

-- Tabelas auxiliares (rate limiting, OTP)
GRANT ALL ON public.auth_rate_limits    TO service_role;
GRANT ALL ON public.email_otp_sessions  TO service_role;

-- Views (server-side actions podem precisar de leitura)
GRANT ALL ON public.v_leaderboard       TO service_role;
GRANT ALL ON public.v_progresso_aluno   TO service_role;
GRANT ALL ON public.v_stats_turma       TO service_role;

-- Sequences (necessárias para INSERTs com SERIAL/IDENTITY se aplicável)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Default privileges para tabelas/sequences criadas no futuro neste schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO service_role;
