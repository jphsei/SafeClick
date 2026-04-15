-- ============================================================
-- Geração automática de código de acesso para turmas
--
-- Quando uma turma é criada sem código, o trigger gera
-- automaticamente um código alfanumérico único de 6 caracteres
-- (ex: AB3X9K). O professor pode partilhá-lo com os alunos.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_gerar_codigo_turma()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo TEXT;
  v_tentativas INT := 0;
BEGIN
  -- Só gerar se o código ainda não foi definido
  IF NEW.codigo_acesso IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Gerar código único (até 10 tentativas para evitar colisões)
  -- Usa gen_random_uuid() e extrai 6 caracteres hex em maiúsculas
  LOOP
    v_codigo := UPPER(REPLACE(LEFT(gen_random_uuid()::TEXT, 8), '-', ''));

    -- Verificar se o código já existe
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.turmas WHERE codigo_acesso = v_codigo
    );

    v_tentativas := v_tentativas + 1;
    IF v_tentativas >= 10 THEN
      EXIT; -- sair com o último código gerado
    END IF;
  END LOOP;

  NEW.codigo_acesso := v_codigo;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_gerar_codigo_turma
  BEFORE INSERT ON public.turmas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_gerar_codigo_turma();
