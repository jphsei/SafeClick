-- ============================================================
-- SECURITY FIX: signup público não pode escolher o papel
-- ============================================================
--
-- Vulnerabilidade (CRITICAL):
--   A versão anterior de `fn_novo_utilizador` lia o papel
--   directamente de `raw_user_meta_data->>'papel'`:
--
--     COALESCE(
--       (NEW.raw_user_meta_data->>'papel')::papel_utilizador,
--       'aluno'::papel_utilizador
--     )
--
--   Como o `raw_user_meta_data` vem do `options.data` do
--   `supabase.auth.signUp` no cliente, qualquer atacante podia
--   fazer:
--
--     await supabase.auth.signUp({
--       email: 'attacker@evil.com',
--       password: 'Password@1234',
--       options: { data: { papel: 'administrador' } }
--     })
--
--   e ficar imediatamente com uma conta de administrador.
--
-- Correção:
--   O trigger passa a IGNORAR completamente o `papel` do metadata
--   e força sempre `'aluno'`. Não há forma de criar professor ou
--   administrador via signup público.
--
-- Criação de professor/administrador:
--   Faz-se em duas etapas no painel admin (já implementado em
--   `frontend/src/app/(dashboard)/admin/utilizadores/actions.ts`):
--
--     1. `auth.admin.createUser(...)`  — trigger cria como aluno
--     2. `UPDATE perfis SET papel = ?` — escala via service-role
--
--   O passo 2 só é possível através da service-role key (que
--   bypassa RLS) ou via RLS policy `perfis_admin_tudo` que exige
--   que o caller já seja administrador. Não há outro caminho.
--
-- Backwards-compatibility:
--   - Utilizadores existentes mantêm o seu papel actual.
--     Esta migration NÃO toca em `public.perfis` — apenas
--     substitui o trigger para futuros INSERT em `auth.users`.
--   - O frontend `registo/page.tsx` pode continuar a enviar
--     `papel: 'aluno'` no metadata; o trigger ignora-o, mas é
--     inofensivo (e serve de defesa em profundidade).
--   - As RLS existentes continuam válidas. Nenhuma policy foi
--     alterada.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_novo_utilizador()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.perfis (id, nome_completo, email, papel, numero_aluno)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'nome_completo',
            split_part(NEW.email, '@', 1)
        ),
        NEW.email,
        -- ⚠ IGNORAR `raw_user_meta_data->>'papel'` por design.
        -- Signup público SEMPRE cria conta como aluno. Escalada para
        -- professor/administrador faz-se via UPDATE separado, fora
        -- do caminho do signup (ver admin/utilizadores/actions.ts).
        'aluno'::public.papel_utilizador,
        NEW.raw_user_meta_data->>'numero_aluno'
    );
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_novo_utilizador IS
'Trigger AFTER INSERT em auth.users. Cria entrada em public.perfis '
'SEMPRE como aluno, ignorando qualquer papel passado em '
'raw_user_meta_data. Para criar professor/administrador, fazer '
'UPDATE explícito a perfis após auth.admin.createUser (apenas '
'possível com service-role ou caller já administrador via RLS '
'perfis_admin_tudo).';
