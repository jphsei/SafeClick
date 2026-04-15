-- ============================================================
-- Email OTP — sessões de verificação em dois passos
--
-- Após o login com password bem-sucedido, professores e admins
-- recebem um código de 6 dígitos por email.
-- Esta tabela guarda o hash do código + expiração.
-- Os tokens de sessão NUNCA são guardados aqui (ficam em memória
-- no cliente React entre os dois passos do login).
-- ============================================================

CREATE TABLE public.email_otp_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash   TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  used        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_otp_sessions_user_id ON public.email_otp_sessions(user_id);

-- Acesso exclusivo via service-role key nas API routes — sem RLS necessário.
-- A tabela não é exposta via anon/authenticated porque não há políticas definidas.
ALTER TABLE public.email_otp_sessions ENABLE ROW LEVEL SECURITY;
