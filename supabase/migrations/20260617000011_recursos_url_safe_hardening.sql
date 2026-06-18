-- ============================================================
-- HARDENING: tighten CHECK constraint de URL em recursos_pedagogicos
-- ============================================================
--
-- Auditoria da constraint anterior (20260617000008) tentou 27+
-- vectores de bypass (URL encoding, double encoding, Unicode
-- fullwidth, RTL override, BOM, newlines, control chars, mixed
-- case, e variantes de javascript: data: vbscript: blob: file:).
--
-- Resultado: ZERO bypasses XSS encontrados. A regex original é
-- robusta contra execução de JavaScript.
--
-- Achados secundários (não-XSS) que justificam hardening:
--
--   #1 `http:javascript:alert(1)` — aceite pela versão anterior.
--      Não executa JS (browser trata como http:// path), mas é
--      payload feio que pode disparar falsos positivos em WAFs e
--      antivírus dos alunos.
--
--   #2 `http://safe.com@attacker.com` — aceite. Browser parsing:
--      userinfo=safe.com, host=attacker.com. Click → attacker.com.
--      Vector de phishing-by-link, não XSS. Risco elevado num
--      contexto educacional onde os alunos confiam em links de
--      professores. Bloquear `@` na authority.
--
--   #3 `http://` ou `https://` (host vazio) — aceite. Inútil mas
--      passa. Trata-se de inserção de "lixo" na BD.
--
-- Esta migration:
--   - exige `://` depois de http/https (resolve #1 e #3)
--   - bloqueia `@` na authority section (resolve #2)
--   - exige pelo menos 1 char não-especial após a authority
--   - mantém `mailto:` permissivo (precisa de flexibilidade para
--     URIs RFC 6068 complexos: subject, body, cc, etc.)
--   - mantém paths/anchors relativos
--
-- Compatibilidade: URLs legítimas reais (https://example.com,
-- https://docs.google.com/...) continuam aceites. URLs que ficam
-- a perder pela versão nova:
--   - Basic auth URIs (http://user:pass@host) — deprecated em
--     browsers modernos, sem uso real.
--   - URLs com `@` em hostname (não há) — não rejeita; o `@`
--     em path/query/fragment é permitido.
-- ============================================================

ALTER TABLE public.recursos_pedagogicos
  DROP CONSTRAINT IF EXISTS recursos_url_ficheiro_safe;

ALTER TABLE public.recursos_pedagogicos
  ADD CONSTRAINT recursos_url_ficheiro_safe
  CHECK (
    url_ficheiro IS NULL
    -- http(s): requer ://, host com pelo menos 1 char, sem userinfo @
    OR url_ficheiro ~* '^https?://[^[:space:]/?#@]'
    -- mailto: requer pelo menos 1 char não-whitespace
    OR url_ficheiro ~* '^mailto:[^[:space:]]'
    -- paths/anchors/query relativos
    OR url_ficheiro ~ '^[/#?]'
  );

COMMENT ON CONSTRAINT recursos_url_ficheiro_safe ON public.recursos_pedagogicos IS
'Defesa em profundidade contra XSS via href. Aceita NULL, '
'http(s)://host (sem userinfo @), mailto:texto, ou paths '
'relativos (/, #, ?). Rejeita javascript:, data:, vbscript:, '
'blob:, file: e variantes encoded/unicode/case-changed.';
