-- ============================================================
-- IMPROVEMENT: ler papel de raw_app_meta_data (atómico)
-- ============================================================
--
-- A migration anterior (20260617000001) fechou a vulnerabilidade
-- forçando SEMPRE `papel = 'aluno'`. A criação de professor/admin
-- passou a fazer-se em dois passos (createUser → UPDATE) no painel
-- admin, o que abriu uma janela pequena de inconsistência:
--
--   createUser sucesso (trigger cria como aluno)
--             ↓
--   ┌─── servidor crasha aqui ───┐
--             ↓
--   UPDATE perfis SET papel = ?  ← nunca acontece
--             ↓
--   Resultado: utilizador fica como aluno com email correcto.
--
-- Solução: o trigger passa a ler `papel` (e `escola_id`) de
-- `raw_app_meta_data`. Este campo é settable APENAS via service-role
-- (auth.admin.createUser / auth.admin.updateUserById). O endpoint
-- público `/auth/v1/signup` NUNCA aceita `app_metadata` — esta é uma
-- garantia do Supabase Auth, não da nossa lógica. Portanto:
--
--   - Signup público: `raw_app_meta_data->>'papel'` vem NULL,
--     COALESCE devolve 'aluno'. ✅ Seguro.
--   - Admin createUser({ app_metadata: { papel, escola_id } }):
--     trigger lê os valores e insere atomicamente. ✅ Sem janela.
--
-- A vulnerabilidade original (papel via user_metadata) continua
-- fechada — esta migration NÃO consulta raw_user_meta_data->>'papel'.
--
-- Backwards-compatibility:
--   - Utilizadores existentes intactos.
--   - admin/utilizadores/actions.ts foi actualizado para passar
--     papel e escola_id via app_metadata (single call, sem UPDATE
--     posterior).
--   - O trigger continua a ler nome_completo e numero_aluno de
--     user_metadata — campos não-sensíveis cuja origem cliente
--     é apropriada.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_novo_utilizador()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_papel     public.papel_utilizador;
  v_escola_id UUID;
BEGIN
  -- ── PAPEL ─────────────────────────────────────────────────────
  -- Lemos apenas de raw_app_meta_data, que o cliente não consegue
  -- setar via signUp. user_metadata é deliberadamente ignorado.
  --
  -- Se app_metadata não existir ou não tiver `papel`, default 'aluno'.
  -- Se tiver um valor inválido para o enum, o cast lança e o
  -- createUser falha inteiro (fail-closed — admin vê erro, repete).
  v_papel := COALESCE(
    (NEW.raw_app_meta_data->>'papel')::public.papel_utilizador,
    'aluno'::public.papel_utilizador
  );

  -- ── ESCOLA_ID ─────────────────────────────────────────────────
  -- Idem app_metadata. NULLIF para tratar string vazia ('') como NULL
  -- antes do cast a UUID (caso contrário lança).
  v_escola_id := NULLIF(NEW.raw_app_meta_data->>'escola_id', '')::UUID;

  -- ── INSERT ────────────────────────────────────────────────────
  -- nome_completo e numero_aluno vêm de user_metadata (campos não
  -- sensíveis cuja origem cliente é apropriada; o admin sempre os
  -- pode editar depois).
  INSERT INTO public.perfis (id, nome_completo, email, papel, numero_aluno, escola_id)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'nome_completo',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    v_papel,
    NEW.raw_user_meta_data->>'numero_aluno',
    v_escola_id
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_novo_utilizador IS
'Trigger AFTER INSERT em auth.users. Lê papel e escola_id de '
'raw_app_meta_data (settable apenas via service-role). '
'raw_user_meta_data NUNCA é consultado para papel — previne '
'escalada de privilégios via signup público.';
