-- ============================================================
-- FIX: trigger trg_auth_novo_utilizador deve ser ENABLE ALWAYS
-- ============================================================
--
-- Contexto:
--   O Supabase GoTrue (serviço de auth) faz INSERT em `auth.users`
--   com `session_replication_role = 'replica'`. Em PostgreSQL,
--   triggers criados com `CREATE TRIGGER ...` por defeito ficam com
--   `tgenabled = 'O'` (Origin) — só disparam em sessões com
--   `session_replication_role = 'origin'` (default em psql/Studio,
--   mas não no fluxo GoTrue).
--
--   Resultado observável:
--     - INSERT directo em auth.users via SQL Editor → trigger dispara
--     - auth.signUp() via API pública → GoTrue insere em modo
--       replica → trigger NÃO dispara → perfil NÃO é criado
--
-- Fix:
--   `ALTER TABLE … ENABLE ALWAYS TRIGGER` muda `tgenabled` para 'A',
--   fazendo o trigger disparar também em sessões `replica`.
--
-- Nota sobre permissões:
--   `auth.users` é owned por `supabase_auth_admin`. Para mudar o
--   tgenabled é preciso ser owner. Na CLI Supabase >= 2.45+, o role
--   `postgres` (que corre as migrations) deixou de ser membro de
--   `supabase_auth_admin` por defeito — apertamento de privilégios.
--
--   Esta migration TENTA aplicar via `SET LOCAL ROLE`. Se falhar
--   por insufficient_privilege, NÃO aborta o `supabase db reset` —
--   apenas emite WARNING com o comando manual a correr fora.
--
--   Para forçar manualmente (necessário se a migration emitiu o
--   warning), corre no host (PowerShell):
--
--     docker exec supabase_db_SafeClick psql -U supabase_auth_admin \
--       -d postgres \
--       -c "ALTER TABLE auth.users ENABLE ALWAYS TRIGGER trg_auth_novo_utilizador;"
--
--   Ou via Studio SQL Editor (que normalmente corre como
--   supabase_admin, com mais privs):
--
--     ALTER TABLE auth.users
--       ENABLE ALWAYS TRIGGER trg_auth_novo_utilizador;
--
-- Esta migration é idempotente: pode ser corrida várias vezes sem
-- efeitos colaterais.
-- ============================================================

DO $$
DECLARE
  v_owner text;
  v_current_enabled char;
BEGIN
  -- Descobrir o owner real de auth.users em runtime
  SELECT pg_catalog.pg_get_userbyid(relowner)
    INTO v_owner
    FROM pg_catalog.pg_class
   WHERE oid = 'auth.users'::regclass;

  -- Verificar o estado actual do trigger
  SELECT tgenabled
    INTO v_current_enabled
    FROM pg_catalog.pg_trigger
   WHERE tgname = 'trg_auth_novo_utilizador'
     AND tgrelid = 'auth.users'::regclass;

  IF v_current_enabled = 'A' THEN
    RAISE NOTICE 'Trigger trg_auth_novo_utilizador já está ENABLE ALWAYS — nada a fazer';
    RETURN;
  END IF;

  RAISE NOTICE 'auth.users owner = %, current tgenabled = %, switching role to apply ALTER',
    v_owner, v_current_enabled;

  BEGIN
    EXECUTE format('SET LOCAL ROLE %I', v_owner);
    ALTER TABLE auth.users
      ENABLE ALWAYS TRIGGER trg_auth_novo_utilizador;
    RAISE NOTICE '✓ Trigger trg_auth_novo_utilizador agora é ENABLE ALWAYS';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE WARNING '⚠ Não foi possível mudar role para %. A migration NÃO foi aplicada.', v_owner;
      RAISE WARNING '⚠ Corre manualmente (PowerShell no host):';
      RAISE WARNING '⚠   docker exec supabase_db_SafeClick psql -U % -d postgres -c "ALTER TABLE auth.users ENABLE ALWAYS TRIGGER trg_auth_novo_utilizador;"', v_owner;
      RAISE WARNING '⚠ Ou via Studio SQL Editor:';
      RAISE WARNING '⚠   ALTER TABLE auth.users ENABLE ALWAYS TRIGGER trg_auth_novo_utilizador;';
  END;
END $$;
