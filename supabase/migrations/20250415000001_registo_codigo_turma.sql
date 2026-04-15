-- ============================================================
-- Registo por código de turma
--
-- Removes role self-selection from public registration.
-- Users register as 'aluno' by default.
-- Optionally they provide a class access code which enrolls
-- them in the corresponding turma.
-- ============================================================

-- ── fn_validar_codigo_turma ──────────────────────────────────────────────────
-- Checks whether a turma access code exists and is active.
-- Called BEFORE signup so it must be accessible to anonymous users.
-- Only returns a boolean — no sensitive data is exposed.

CREATE OR REPLACE FUNCTION public.fn_validar_codigo_turma(p_codigo TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.turmas
    WHERE UPPER(codigo_acesso) = UPPER(TRIM(p_codigo))
      AND ativo = TRUE
  );
$$;

-- Allow unauthenticated callers (for pre-signup validation on the register page)
GRANT EXECUTE ON FUNCTION public.fn_validar_codigo_turma(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_validar_codigo_turma(TEXT) TO authenticated;


-- ── fn_inscrever_por_codigo ──────────────────────────────────────────────────
-- Enrolls the currently-authenticated user in the turma identified by the
-- given access code.  Called immediately after signUp succeeds.
--
-- Returns JSONB:
--   { ok: true,  turma_id: uuid, turma_nome: text }   on success
--   { ok: false, erro: text }                          on failure

CREATE OR REPLACE FUNCTION public.fn_inscrever_por_codigo(p_codigo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turma_id   UUID;
  v_turma_nome TEXT;
BEGIN
  -- Locate turma (case-insensitive match)
  SELECT id, nome
  INTO   v_turma_id, v_turma_nome
  FROM   public.turmas
  WHERE  UPPER(codigo_acesso) = UPPER(TRIM(p_codigo))
    AND  ativo = TRUE;

  IF v_turma_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Código de turma inválido ou expirado.');
  END IF;

  -- Upsert enrollment — idempotent if the student is already in the class
  INSERT INTO public.turma_alunos (turma_id, aluno_id, ativo)
  VALUES (v_turma_id, auth.uid(), TRUE)
  ON CONFLICT (turma_id, aluno_id)
  DO UPDATE SET ativo = TRUE;

  RETURN jsonb_build_object(
    'ok',         true,
    'turma_id',   v_turma_id,
    'turma_nome', v_turma_nome
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_inscrever_por_codigo(TEXT) TO authenticated;
