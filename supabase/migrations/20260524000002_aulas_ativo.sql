-- ============================================================
-- Migração: adicionar coluna `ativo` à tabela `aulas`
-- ============================================================
-- Permite soft delete de aulas (em vez de hard delete + CASCADE para
-- quizzes/tentativas, que perderia o histórico de alunos).
--
-- Default TRUE para preservar comportamento das aulas existentes.
-- ============================================================

ALTER TABLE public.aulas
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_aulas_modulo_ativo
    ON public.aulas (modulo_id, ativo);

COMMENT ON COLUMN public.aulas.ativo IS
'Soft delete: FALSE significa aula desativada (esconde da UI dos alunos '
'mas preserva o histórico de quizzes e tentativas associadas).';
