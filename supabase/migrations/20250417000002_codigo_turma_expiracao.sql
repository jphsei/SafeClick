-- ============================================================
-- Código de acesso à turma com expiração de 30 minutos
--
-- O código gerado é válido apenas por 30 minutos.
-- O professor pode regenerar o código a qualquer momento.
-- ============================================================

-- 1. Adicionar coluna de expiração à tabela turmas
ALTER TABLE public.turmas
  ADD COLUMN IF NOT EXISTS codigo_expira_em TIMESTAMPTZ;

-- 2. Recriar fn_gerar_codigo_turma — define expiração ao criar o código
CREATE OR REPLACE FUNCTION public.fn_gerar_codigo_turma()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo     TEXT;
  v_tentativas INT := 0;
BEGIN
  IF NEW.codigo_acesso IS NOT NULL THEN
    RETURN NEW;
  END IF;

  LOOP
    v_codigo := UPPER(REPLACE(LEFT(gen_random_uuid()::TEXT, 8), '-', ''));

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.turmas WHERE codigo_acesso = v_codigo
    );

    v_tentativas := v_tentativas + 1;
    IF v_tentativas >= 10 THEN EXIT; END IF;
  END LOOP;

  NEW.codigo_acesso    := v_codigo;
  NEW.codigo_expira_em := NOW() + INTERVAL '30 minutes';
  RETURN NEW;
END;
$$;

-- 3. Atualizar fn_validar_codigo_turma — rejeita códigos expirados
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
      AND (codigo_expira_em IS NULL OR codigo_expira_em > NOW())
  );
$$;

-- 4. Atualizar fn_inscrever_por_codigo — rejeita códigos expirados
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
  SELECT id, nome
  INTO   v_turma_id, v_turma_nome
  FROM   public.turmas
  WHERE  UPPER(codigo_acesso) = UPPER(TRIM(p_codigo))
    AND  ativo = TRUE
    AND  (codigo_expira_em IS NULL OR codigo_expira_em > NOW());

  IF v_turma_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Código inválido ou expirado. Pede um novo ao teu professor.');
  END IF;

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

-- 5. Nova função: o professor regenera o código da sua turma
CREATE OR REPLACE FUNCTION public.fn_regenerar_codigo_turma(p_turma_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo     TEXT;
  v_tentativas INT := 0;
  v_expira_em  TIMESTAMPTZ;
BEGIN
  -- Verificar que o utilizador autenticado é o professor da turma
  IF NOT EXISTS (
    SELECT 1 FROM public.turmas
    WHERE id = p_turma_id AND professor_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Sem permissão.');
  END IF;

  -- Gerar novo código único
  LOOP
    v_codigo := UPPER(REPLACE(LEFT(gen_random_uuid()::TEXT, 8), '-', ''));

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.turmas WHERE codigo_acesso = v_codigo AND id != p_turma_id
    );

    v_tentativas := v_tentativas + 1;
    IF v_tentativas >= 10 THEN EXIT; END IF;
  END LOOP;

  v_expira_em := NOW() + INTERVAL '30 minutes';

  UPDATE public.turmas
  SET codigo_acesso    = v_codigo,
      codigo_expira_em = v_expira_em
  WHERE id = p_turma_id;

  RETURN jsonb_build_object(
    'ok',             true,
    'codigo',         v_codigo,
    'expira_em',      v_expira_em
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_regenerar_codigo_turma(UUID) TO authenticated;
