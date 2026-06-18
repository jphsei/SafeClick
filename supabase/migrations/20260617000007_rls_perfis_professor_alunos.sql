-- ============================================================
-- RGPD FIX: professor só vê alunos das suas turmas
-- ============================================================
--
-- Vulnerabilidade (HIGH — RGPD):
--   A policy `perfis_select_escola` (criada em
--   20250414000003_fix_perfis_rls_recursion.sql) permite a qualquer
--   professor da escola X ver TODOS os perfis (email, número de
--   aluno, pontos, etc.) de TODOS os alunos da escola — não apenas
--   das suas turmas.
--
--   Exemplo concreto: professor de Matemática do 8º ano consegue
--   ler emails e números de aluno do 12º ano de Português. Não há
--   base legal RGPD para esse acesso. Falha auditoria CNPD.
--
-- Correção:
--   Substituir a policy por uma que restringe professores aos
--   alunos das suas turmas. Mantemos a admin policy intacta
--   (perfis_admin_tudo) — admins continuam a ver tudo.
--
-- Implementação:
--   Função SECURITY DEFINER `fn_aluno_pertence_ao_professor` que
--   verifica a pertença atravessando turma_alunos × turmas. Bypassa
--   RLS nessas tabelas (evita potencial recursão e simplifica a
--   policy a uma única condição booleana).
--
-- Matriz de acesso final a `perfis` (SELECT):
--   ┌─────────────┬─────────────────────────────────────────────┐
--   │ Caller      │ Lê                                          │
--   ├─────────────┼─────────────────────────────────────────────┤
--   │ aluno       │ próprio perfil (perfis_select_proprio)      │
--   │ professor   │ próprio + alunos das suas turmas activas    │
--   │ administrador│ todos os perfis (perfis_admin_tudo)        │
--   │ service_role│ tudo (bypass RLS)                           │
--   └─────────────┴─────────────────────────────────────────────┘
-- ============================================================

-- ── 1. Helper SECURITY DEFINER ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_aluno_pertence_ao_professor(p_aluno_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.turma_alunos ta
      JOIN public.turmas t ON t.id = ta.turma_id
     WHERE ta.aluno_id    = p_aluno_id
       AND ta.ativo       = TRUE
       AND t.professor_id = auth.uid()
       AND t.ativo        = TRUE
  );
$$;

COMMENT ON FUNCTION public.fn_aluno_pertence_ao_professor IS
'Retorna TRUE se o aluno indicado está inscrito (ativo) numa turma '
'(ativa) cujo professor é o utilizador autenticado. Usada em RLS '
'para restringir leitura de perfis aos alunos das próprias turmas.';

-- ── 2. Remover policy demasiado permissiva ──────────────────────
DROP POLICY IF EXISTS "perfis_select_escola" ON public.perfis;

-- ── 3. Nova policy restrita ─────────────────────────────────────
-- Só professores. Admins continuam cobertos por perfis_admin_tudo.
-- Alunos continuam cobertos por perfis_select_proprio.
CREATE POLICY "perfis_select_professor_alunos" ON public.perfis
  FOR SELECT
  USING (
    public.fn_get_user_papel() = 'professor'
    AND public.fn_aluno_pertence_ao_professor(id)
  );

COMMENT ON POLICY "perfis_select_professor_alunos" ON public.perfis IS
'Professor lê perfis dos alunos inscritos nas suas turmas. Não vê '
'alunos de outras turmas/professores. Admin continua a ver tudo via '
'perfis_admin_tudo. Aluno vê próprio perfil via perfis_select_proprio.';
