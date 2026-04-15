-- ============================================================
-- Corrigir recursão infinita entre turmas ↔ turma_alunos
--
-- Problema:
--   turmas_select_aluno  → SELECT turma_alunos (dispara RLS ta_professor_select)
--   ta_professor_select  → SELECT turmas       (dispara RLS turmas_select_aluno)
--   → ciclo infinito
--
-- Solução: funções SECURITY DEFINER que executam sem RLS,
-- substituindo as políticas que causam a recursão.
-- ============================================================

-- ── Função auxiliar: verifica se o utilizador é professor de uma turma ───────
CREATE OR REPLACE FUNCTION public.fn_is_professor_da_turma(p_turma_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.turmas
    WHERE id = p_turma_id AND professor_id = auth.uid()
  );
$$;

-- ── Função auxiliar: verifica se o utilizador é aluno inscrito numa turma ────
CREATE OR REPLACE FUNCTION public.fn_is_aluno_da_turma(p_turma_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.turma_alunos
    WHERE turma_id = p_turma_id AND aluno_id = auth.uid() AND ativo = TRUE
  );
$$;

-- ── Substituir políticas que causam recursão ─────────────────────────────────

-- turmas: remover a política que consulta turma_alunos directamente
DROP POLICY IF EXISTS "turmas_select_aluno" ON public.turmas;

CREATE POLICY "turmas_select_aluno" ON public.turmas
    FOR SELECT USING (fn_is_aluno_da_turma(id));

-- turma_alunos: remover a política que consulta turmas directamente
DROP POLICY IF EXISTS "ta_professor_select" ON public.turma_alunos;

CREATE POLICY "ta_professor_select" ON public.turma_alunos
    FOR SELECT USING (fn_is_professor_da_turma(turma_id));

-- turma_alunos: gestão (insert/update/delete) pelo professor — mesma correção
DROP POLICY IF EXISTS "ta_professor_gerir" ON public.turma_alunos;

CREATE POLICY "ta_professor_gerir" ON public.turma_alunos
    FOR ALL USING (fn_is_professor_da_turma(turma_id));
