-- ============================================================
-- SECURITY: bind email_otp_sessions ao IP que iniciou o login
-- ============================================================
--
-- Vulnerabilidade:
--   `email_otp_sessions` guardava { user_id, code_hash, expires_at,
--   used } — sem qualquer vínculo à origem do pedido. Um atacante
--   que conseguisse o `otp_session_id` (via logs, network sniffing,
--   ou tentativa cega) podia tentar adivinhar o código de 6 dígitos.
--
--   Mitigações existentes: rate-limit por `otp:ip:otp_session_id`
--   (5 tentativas / 5 min) + 1/10⁶ probabilidade por tentativa.
--   Mas: o rate-limit é reset se o atacante mudar de IP, e o
--   espaço de 1M códigos é finito dado tempo suficiente.
--
-- Fix:
--   Coluna nova `ip_address` em email_otp_sessions, populada pelo
--   /api/auth/login no momento da criação. O /api/auth/verify-otp
--   compara o IP do request com o IP guardado — se diferentes,
--   recusa. Atacante de outro IP não consegue burlar o OTP de
--   alguém mesmo conhecendo o session_id.
--
-- Limitação conhecida (documentada):
--   Utilizador em rede móvel pode mudar de IP entre login e
--   verify-otp (handover de torre, mudança WiFi↔móvel). Nesse caso
--   recebe erro "código inválido, refaz login". Trade-off aceitável.
-- ============================================================

ALTER TABLE public.email_otp_sessions
  ADD COLUMN IF NOT EXISTS ip_address INET;

COMMENT ON COLUMN public.email_otp_sessions.ip_address IS
'IP do request que criou a sessão OTP. Verificado em /verify-otp '
'para impedir uso da sessão por um atacante de IP diferente.';

-- Índice opcional para investigação forense (procurar sessões por IP)
CREATE INDEX IF NOT EXISTS idx_email_otp_sessions_ip
  ON public.email_otp_sessions (ip_address)
  WHERE ip_address IS NOT NULL;

-- Sessões pré-existentes ficam com NULL — o /verify-otp tratará
-- esses casos como "sem binding" (compatibilidade transitória).
-- Após a próxima rotação completa de OTPs (15 min de expiry), todas
-- terão IP. Não vale a pena migrar dados antigos.
