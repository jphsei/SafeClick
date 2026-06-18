-- ============================================================
-- SECURITY FIX: prevenir escalada de privilégios via UPDATE perfis
-- ============================================================
--
-- Vulnerabilidade adicional descoberta durante os testes de segurança
-- do fix anterior:
--
--   A policy `perfis_update_proprio` permite ao utilizador atualizar
--   QUALQUER coluna da sua própria linha — incluindo `papel` e
--   `escola_id`. Isto significa que qualquer aluno autenticado pode
--   contornar o trigger `fn_novo_utilizador` fazendo:
--
--     await supabase
--       .from('perfis')
--       .update({ papel: 'administrador' })
--       .eq('id', user.id)
--
--   A policy passa (auth.uid() = id), o UPDATE aplica-se, escalada
--   feita.
--
-- Correção:
--   Trigger BEFORE UPDATE em `perfis` que rejeita mudanças aos campos
--   sensíveis (`papel`, `escola_id`, `id`, `email`) quando o caller
--   não é administrador. Service-role bypassa porque `auth.uid()`
--   é NULL nesse contexto.
--
-- Porquê trigger e não policy WITH CHECK:
--   Uma policy WITH CHECK precisava de comparar o NEW.papel ao
--   papel actual do user, o que exige sub-query a `perfis` e cria
--   recursão. Trigger é mais limpo e dá mensagens de erro claras.
--
-- Backwards-compatibility:
--   - `atualizarMeuPerfil` (perfil/actions.ts) só altera
--     `nome_completo` e `numero_aluno` — ambos permitidos.
--   - `atualizarUtilizador` (admin/utilizadores/actions.ts) corre
--     com service-role (createAdminClient) — auth.uid() é NULL,
--     bypassa. Funciona normalmente.
--   - O caminho "admin authenticated muda papel de outro user" via
--     supabase normal client é raro (todas as actions admin usam
--     service-role), mas se acontecer, o trigger reconhece via
--     check do papel do caller.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_prevenir_escalada_perfil()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_papel_caller public.papel_utilizador;
BEGIN
  -- ── Service-role bypass ──────────────────────────────────────
  -- auth.uid() retorna NULL quando o cliente usa a service-role
  -- key. Nesse caso confiamos no caller (actions de admin).
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- ── Admin authenticated bypass ───────────────────────────────
  -- Caller com papel administrador pode mudar tudo (necessário
  -- caso algum admin venha a usar o supabase client normal em
  -- vez de service-role).
  SELECT papel INTO v_papel_caller
    FROM public.perfis
   WHERE id = auth.uid();

  IF v_papel_caller = 'administrador' THEN
    RETURN NEW;
  END IF;

  -- ── Não-admin: campos sensíveis são imutáveis ────────────────
  IF NEW.papel IS DISTINCT FROM OLD.papel THEN
    RAISE EXCEPTION 'Não tens permissão para alterar o teu papel.'
      USING ERRCODE = 'insufficient_privilege',
            HINT = 'Apenas administradores podem alterar papéis.';
  END IF;

  IF NEW.escola_id IS DISTINCT FROM OLD.escola_id THEN
    RAISE EXCEPTION 'Não tens permissão para alterar a tua escola.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Email tem fluxo próprio via Supabase Auth (`auth.users.email`
  -- com confirmação dupla). Mudança directa em `perfis.email`
  -- causaria dessincronização — bloquear.
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Email só pode ser alterado via fluxo de Supabase Auth.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- ID nunca muda (PK), mas defesa em profundidade
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Não podes alterar o id do perfil.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- pontos_total e ativo também são sensíveis — não devem ser
  -- alteráveis pelo próprio (atribuição de pontos via RPCs
  -- SECURITY DEFINER; ativo via admin actions).
  IF NEW.pontos_total IS DISTINCT FROM OLD.pontos_total THEN
    RAISE EXCEPTION 'Os pontos são atribuídos pelo sistema.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.ativo IS DISTINCT FROM OLD.ativo THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar o estado activo.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_prevenir_escalada_perfil IS
'Trigger BEFORE UPDATE em perfis. Impede que utilizadores não-admin '
'alterem campos sensíveis (papel, escola_id, email, id, pontos_total, '
'ativo). Bypassa service-role e admins authenticated.';

DROP TRIGGER IF EXISTS trg_prevenir_escalada_perfil ON public.perfis;

CREATE TRIGGER trg_prevenir_escalada_perfil
  BEFORE UPDATE ON public.perfis
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevenir_escalada_perfil();
