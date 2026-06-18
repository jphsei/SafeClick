-- ============================================================
-- SECURITY FIX: revogar INSERT/UPDATE/DELETE directos nas
-- tabelas de gamificação que servem de input ao scoring/badges
-- ============================================================
--
-- Contexto:
--   Auditoria de gamificação (2026-06-18) detectou que as RLS
--   policies actuais permitem ao aluno autenticado fazer:
--     - INSERT em progresso_modulo com concluido=true e
--       aulas_concluidas=[] (sem CHECK constraint)
--     - INSERT em tentativas_quiz com nota=100, concluido=true
--     - INSERT em tentativas_simulacao com estado='reportou'
--     - INSERT em respostas_tentativa em qualquer tentativa sua
--
--   Estas tabelas são lidas pela fn_verificar_badges() como
--   source-of-truth para decidir badges:
--     - Badge 1 ("Primeiro Passo"): progresso_modulo concluido >= 1
--     - Badge 2 ("Detetive Digital"): tentativas_simulacao reportou >= 5
--     - Badge 3 ("Mestre das Passwords"): tentativas_quiz nota=100 >= 1
--     - Badge 4 ("Estudante Dedicado"): progresso_modulo concluido >= 5
--     - Badge 5 ("Especialista"): progresso completo de todos os módulos
--     - Badge 6 ("Quiz Master"): tentativas_quiz nota=100 >= 3
--     - Badge 7 ("Alerta Máximo"): tentativas_simulacao >= 10 sem 'clicou'
--
--   Cada badge atribuído chama fn_atualizar_pontos internamente.
--   Resultado: um aluno pode inflacionar até +275 pts injectando
--   rows falsas e disparando depois uma das RPCs SECURITY DEFINER
--   (fn_concluir_aula com uma aula real, p.ex.) — a RPC corre
--   fn_verificar_badges() que lê os dados falsos e atribui badges.
--
-- Vector verificado em auditoria. Não há CHECK constraints que
-- impeçam concluido=TRUE com aulas_concluidas vazias, ou
-- pontos_ganhos arbitrários nas tentativas.
--
-- Correção:
--   REVOKE INSERT, UPDATE, DELETE em authenticated/anon nas 4
--   tabelas. SELECT mantém-se (RLS continua a filtrar leitura).
--
--   As 3 RPCs SECURITY DEFINER (fn_submeter_quiz, fn_concluir_aula,
--   fn_submeter_simulacao) correm como owner postgres e bypassam
--   o REVOKE automaticamente — o caminho legítimo continua intacto.
--
-- Auditoria de impacto no frontend (provas no PR):
--   - 5 callers de progresso_modulo → todos .select() (zero escritas)
--   - 3 callers de tentativas_quiz → todos .select() (zero escritas)
--   - 2 callers de tentativas_simulacao → todos .select() (zero escritas)
--   - 0 callers de respostas_tentativa (zero referências fora de tipos)
--   - 0 construções dinâmicas do nome da tabela
--   - As únicas escritas ocorrem nas 3 RPCs SECURITY DEFINER acima
--
-- Padrão consistente com 20260617000012_perfis_column_perms.sql,
-- que aplicou a mesma estratégia (REVOKE writes + manter SELECT) à
-- tabela perfis depois de mover toda a escrita para SECURITY DEFINER.
-- ============================================================

-- ── 1. progresso_modulo ─────────────────────────────────────────
REVOKE INSERT, UPDATE, DELETE ON public.progresso_modulo FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.progresso_modulo FROM anon;

COMMENT ON TABLE public.progresso_modulo IS
'Progresso de cada aluno em cada módulo. ESCRITA exclusiva via '
'fn_concluir_aula (SECURITY DEFINER). authenticated/anon revogados '
'em INSERT/UPDATE/DELETE para impedir injecção de progresso falso '
'que seria depois lido como source-of-truth por fn_verificar_badges.';

-- ── 2. tentativas_quiz ──────────────────────────────────────────
REVOKE INSERT, UPDATE, DELETE ON public.tentativas_quiz FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.tentativas_quiz FROM anon;

COMMENT ON TABLE public.tentativas_quiz IS
'Tentativas de alunos em quizzes. ESCRITA exclusiva via fn_submeter_quiz '
'(SECURITY DEFINER) — calcula nota e pontos server-side a partir de '
'opcoes_resposta. REVOKE impede injecção de tentativas falsas com '
'nota=100, que seriam lidas por fn_verificar_badges.';

-- ── 3. tentativas_simulacao ─────────────────────────────────────
REVOKE INSERT, UPDATE, DELETE ON public.tentativas_simulacao FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.tentativas_simulacao FROM anon;

COMMENT ON TABLE public.tentativas_simulacao IS
'Resultados de simulações de phishing. ESCRITA exclusiva via '
'fn_submeter_simulacao (SECURITY DEFINER) — valida estado, calcula '
'pontos server-side, idempotente em retries. REVOKE impede injecção '
'de tentativas falsas com estado=''reportou''.';

-- ── 4. respostas_tentativa ──────────────────────────────────────
-- Tabela escrita apenas dentro de fn_submeter_quiz. Não há callers
-- directos no frontend (verificado por grep exaustivo). REVOKE
-- defensivo para alinhar com a invariante "respostas só via RPC".
REVOKE INSERT, UPDATE, DELETE ON public.respostas_tentativa FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.respostas_tentativa FROM anon;

COMMENT ON TABLE public.respostas_tentativa IS
'Respostas individuais de uma tentativa de quiz. ESCRITA exclusiva '
'via fn_submeter_quiz (SECURITY DEFINER) — chama INSERT como owner. '
'REVOKE impede que cliente crie/edite respostas fora do fluxo legítimo.';

-- ── 5. Notas sobre o que NÃO é alterado ─────────────────────────
-- - SELECT continua disponível para authenticated em todas as tabelas
--   (filtrado por RLS existente: aluno_id = auth.uid()).
-- - utilizador_badges já tem RLS ON sem policy de INSERT/UPDATE/DELETE
--   para authenticated → INSERT directo já bloqueado por defeito.
--   Sem alterações necessárias.
-- - badges já só permite ALL ao administrador. Sem alterações.
-- - perfis.pontos_total já tem column-level REVOKE em 000012. Sem
--   alterações.
