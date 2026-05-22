-- ============================================================
-- Fix: fn_gerar_codigo_turma não depende de gen_random_bytes
--
-- Problema: a função guardada no DB usa encode(gen_random_bytes(6), 'base64')
-- que requer a extensão pgcrypto. Se pgcrypto não estiver activo o insert
-- numa turma falha com "function gen_random_bytes(integer) does not exist".
--
-- Solução: substituir por gen_random_uuid() que é nativo no PostgreSQL 13+
-- e não precisa de nenhuma extensão.
-- ============================================================

-- Garantir pgcrypto activo (necessário para outras partes do schema)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Recriar a função sem depender de gen_random_bytes
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
  -- Só gerar se o código ainda não foi definido
  IF NEW.codigo_acesso IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Gerar código único: 6 caracteres alfanuméricos maiúsculos
  -- Usa gen_random_uuid() — nativo no PostgreSQL 13+, sem extensões
  LOOP
    -- Extrai 8 hex chars do UUID, remove o hífen e fica com os 6 primeiros
    v_codigo := UPPER(REPLACE(LEFT(gen_random_uuid()::TEXT, 8), '-', ''));

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.turmas WHERE codigo_acesso = v_codigo
    );

    v_tentativas := v_tentativas + 1;
    IF v_tentativas >= 10 THEN
      EXIT;
    END IF;
  END LOOP;

  NEW.codigo_acesso := v_codigo;
  RETURN NEW;
END;
$$;
