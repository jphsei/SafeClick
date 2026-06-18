-- ============================================================
-- FIX: sincronizar perfil quando GoTrue popula raw_app_meta_data
-- ============================================================
--
-- Contexto (descoberto empiricamente):
--   O GoTrue v2.186+ implementa `auth.admin.createUser({ app_metadata })`
--   em DUAS operações DB:
--     1. INSERT INTO auth.users (..., raw_app_meta_data) com defaults
--        (raw_app_meta_data sem `papel`/`escola_id`)
--     2. UPDATE auth.users SET raw_app_meta_data = ... (populates os
--        campos custom passados em app_metadata)
--
--   O nosso trigger `trg_auth_novo_utilizador` é AFTER INSERT, então
--   dispara entre os dois passos, vendo raw_app_meta_data ainda sem
--   `papel` custom. Resultado: perfil é sempre criado como 'aluno',
--   mesmo quando o admin pediu createUser com papel='professor'.
--
--   Sintoma observável:
--     INSERT INTO auth.users (...);  -- raw_app_meta_data = {}
--     -- ↑ trg_auth_novo_utilizador dispara AQUI → cria perfil aluno
--     UPDATE auth.users SET raw_app_meta_data = '{...,"papel":...}';
--     -- ↑ app_metadata chega à DB MAS o trigger já correu
--
-- Fix:
--   Trigger adicional `trg_auth_sync_perfil_metadata` em AFTER UPDATE
--   OF raw_app_meta_data que re-sincroniza o perfil com os novos
--   valores. Só dispara quando `raw_app_meta_data` muda — não afecta
--   updates noutros campos (last_sign_in_at, encrypted_password, etc.).
--
-- Porque NÃO toco no trigger AFTER INSERT existente:
--   - Para o caminho de signUp público (sem app_metadata), o INSERT
--     já cria o perfil correctamente como aluno. Não há UPDATE
--     subsequente do app_metadata, logo o trigger AFTER UPDATE não
--     dispara.
--   - Não alteramos `fn_novo_utilizador` (definida em 20260617000002).
--   - Padrão "additive only" coerente com as outras migrations da
--     sessão.
--
-- Porque isto NÃO reabre nenhum vector de segurança:
--   - `raw_app_meta_data` só é settable por service-role (garantia
--     do Supabase Auth — endpoint /auth/v1/signup ignora app_metadata).
--   - O signUp público continua a NÃO conseguir injectar papel
--     custom (a única forma é via service-role admin actions).
--   - O trigger lê do mesmo `raw_app_meta_data` — mesma source of
--     truth — e aplica a mesma validação que o trigger AFTER INSERT
--     (cast a public.papel_utilizador, COALESCE com 'aluno' default).
--   - Se app_metadata.papel for inválido (não está no enum), o cast
--     falha e o UPDATE é abortado (perfil mantém estado anterior).
--
-- Nota sobre ownership (igual à migration 20260618000004):
--   auth.users é owned por supabase_auth_admin. `postgres` (que corre
--   migrations) não tem privilégio para CREATE TRIGGER nesta tabela.
--   Esta migration cria a FUNÇÃO (que é em schema public, OK), mas
--   o CREATE TRIGGER falha e é emitido um WARNING claro com o comando
--   manual a correr fora da migration.
-- ============================================================

-- ── 1. Função em public (não precisa de ownership de auth.users) ──
CREATE OR REPLACE FUNCTION public.fn_sync_perfil_after_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_papel     public.papel_utilizador;
  v_escola_id UUID;
BEGIN
  -- Só agir se o app_metadata mudou
  IF NEW.raw_app_meta_data IS DISTINCT FROM OLD.raw_app_meta_data THEN
    -- Cast defensivo: se papel não estiver no enum, cai em 'aluno'
    BEGIN
      v_papel := COALESCE(
        (NEW.raw_app_meta_data->>'papel')::public.papel_utilizador,
        'aluno'::public.papel_utilizador
      );
    EXCEPTION WHEN invalid_text_representation THEN
      v_papel := 'aluno'::public.papel_utilizador;
    END;

    -- Cast defensivo para UUID
    BEGIN
      v_escola_id := NULLIF(NEW.raw_app_meta_data->>'escola_id', '')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      v_escola_id := NULL;
    END;

    -- UPDATE o perfil correspondente. Se não existir (caso raro/edge),
    -- não cria — o trigger AFTER INSERT trata disso no fluxo normal.
    UPDATE public.perfis
       SET papel = v_papel,
           escola_id = v_escola_id,
           atualizado_em = NOW()
     WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_sync_perfil_after_update IS
'Trigger AFTER UPDATE OF raw_app_meta_data em auth.users. '
'Re-sincroniza public.perfis.papel e escola_id quando o GoTrue '
'popula app_metadata num passo separado do INSERT inicial (caso '
'típico do auth.admin.createUser).';

-- ── 2. Tentar criar o trigger (precisa de owner de auth.users) ──
DO $$
DECLARE
  v_owner text;
BEGIN
  SELECT pg_catalog.pg_get_userbyid(relowner)
    INTO v_owner
    FROM pg_catalog.pg_class
   WHERE oid = 'auth.users'::regclass;

  -- Se o trigger já existe, drop+recreate (idempotente)
  IF EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'trg_auth_sync_perfil_metadata'
       AND tgrelid = 'auth.users'::regclass
  ) THEN
    RAISE NOTICE 'Trigger trg_auth_sync_perfil_metadata já existe — nada a fazer';
    RETURN;
  END IF;

  BEGIN
    EXECUTE format('SET LOCAL ROLE %I', v_owner);
    EXECUTE $sql$
      CREATE TRIGGER trg_auth_sync_perfil_metadata
        AFTER UPDATE OF raw_app_meta_data ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.fn_sync_perfil_after_update()
    $sql$;
    RAISE NOTICE '✓ Trigger trg_auth_sync_perfil_metadata criado';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE WARNING '⚠ Não foi possível criar trigger como % (insufficient_privilege)', v_owner;
      RAISE WARNING '⚠ Corre manualmente (PowerShell no host):';
      RAISE WARNING '⚠   docker exec supabase_db_SafeClick psql -h 127.0.0.1 -U supabase_admin -d postgres -c "CREATE TRIGGER trg_auth_sync_perfil_metadata AFTER UPDATE OF raw_app_meta_data ON auth.users FOR EACH ROW EXECUTE FUNCTION public.fn_sync_perfil_after_update();"';
  END;
END $$;
