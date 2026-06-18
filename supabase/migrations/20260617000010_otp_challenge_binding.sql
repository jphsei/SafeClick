-- ============================================================
-- SECURITY: substituir IP binding por challenge cookie binding
-- ============================================================
--
-- Auditoria da migration 20260617000009 (IP binding) identificou
-- vários casos onde o enforcement de IP iguais bloquearia
-- utilizadores legítimos:
--
--   - IPv6 privacy extensions (RFC 4941) — sufixo IPv6 muda a cada
--     poucas horas em routers domésticos modernos
--   - Dual-stack — browser alterna IPv4/IPv6 por request (Happy
--     Eyeballs)
--   - Mobile/CGNAT — handover de torre muda IP público; Wi-Fi ↔
--     mobile entre login e verify
--   - VPNs com múltiplos egress nodes
--   - Vercel/Cloudflare chains com proxies múltiplos
--
-- Modelo de ataque real: mesmo que um atacante adivinhe o
-- otp_session_id E o código de 6 dígitos (rate-limited a 5/5min),
-- não consegue tokens — esses estão em memória React no browser
-- original. O pior caso é invalidar a sessão OTP do utilizador,
-- que re-faz login. Custo: baixo. Mitigação: rate-limit já cobre.
--
-- Fix: substituir IP binding por challenge cookie binding.
--   - challenge_hash (TEXT) — SHA-256 de um secret de 32 bytes
--   - secret gravado em HttpOnly Secure SameSite=Strict cookie
--     do utilizador
--   - verify-otp exige cookie correcto + código OTP correcto
--   - independente de IP, robusto contra qualquer mudança de rede
--
-- ip_address mantida para investigação forense (correlacionar
-- ataques, detectar padrões) mas NÃO usada para enforcement.
-- ============================================================

ALTER TABLE public.email_otp_sessions
  ADD COLUMN IF NOT EXISTS challenge_hash TEXT;

COMMENT ON COLUMN public.email_otp_sessions.challenge_hash IS
'SHA-256 hex de um secret de 32 bytes (challenge). O secret em '
'claro vive num cookie HttpOnly + Secure + SameSite=Strict no '
'browser do utilizador, com Max-Age igual à expiração do OTP. '
'verify-otp recusa se o hash não match.';

-- Sessões antigas (criadas pela migration anterior) ficam com
-- challenge_hash = NULL — o verify-otp aceita NULL como "sem
-- binding" durante a janela de transição (15 min do TTL do OTP).
-- Após esse período, todas as sessões terão challenge_hash.

-- Atualizamos o comentário da coluna ip_address para reflectir o
-- novo uso (forense apenas).
COMMENT ON COLUMN public.email_otp_sessions.ip_address IS
'IP do request que criou a sessão OTP. Guardado APENAS para '
'investigação forense (correlacionar tentativas, detectar padrões '
'de ataque). NÃO usado para enforcement — ver challenge_hash.';
