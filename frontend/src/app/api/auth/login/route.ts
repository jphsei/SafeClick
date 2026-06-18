import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { checkRateLimit, resetRateLimit } from '@/lib/auth/rate-limiter'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOtpCode, hashOtpCode, sendOtpEmail } from '@/lib/auth/otp-email'
import { type Database } from '@/lib/types/database.types'
import { type PapelUtilizador } from '@/lib/types/database.types'
import { maskEmail, maskIp, maskSessionId } from '@/lib/log'
import { verifyCaptcha } from '@/lib/auth/captcha'
import { getClientIp as getRealClientIp } from '@/lib/client-ip'
import {
  generateChallenge,
  OTP_CHALLENGE_COOKIE,
  OTP_CHALLENGE_MAX_AGE,
} from '@/lib/auth/otp-challenge'

// Papéis que exigem verificação OTP por email após a password.
// Decisão: 2FA universal — todos os utilizadores (incluindo alunos)
// confirmam o login com código enviado por email. Mais lento mas mais
// uniforme; protege também os alunos em ambientes escolares partilhados.
const OTP_REQUIRED_ROLES: PapelUtilizador[] = ['aluno', 'professor', 'administrador']

/** Wrapper sobre o helper centralizado (em lib/client-ip.ts). */
function getClientIp(req: NextRequest): string {
  return getRealClientIp(req)
}

export async function POST(request: NextRequest) {
  // ── 1. Parse e validação do body ─────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  const { email, password, captcha_token } = (body ?? {}) as Record<string, unknown>

  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'Email obrigatório.' }, { status: 400 })
  }
  if (typeof password !== 'string' || !password) {
    return NextResponse.json({ error: 'Palavra-passe obrigatória.' }, { status: 400 })
  }

  // ── 2. Verificação Turnstile (CAPTCHA) ───────────────────────────────────
  // Em dev sem TURNSTILE_SECRET, verifyCaptcha devolve true com warning.
  const ip = getClientIp(request)
  const captcha = await verifyCaptcha(
    typeof captcha_token === 'string' ? captcha_token : null,
    ip,
  )
  if (!captcha.ok) {
    console.warn(`[AUTH] captcha falhou — ip=${maskIp(ip)} reason=${captcha.errorCode}`)
    return NextResponse.json(
      { error: 'Verificação anti-bot falhou. Refresca a página e tenta novamente.' },
      { status: 400 },
    )
  }

  // ── 3. Rate limiting ──────────────────────────────────────────────────────
  const rateLimitKey = `${ip}:${email.toLowerCase().trim()}`
  const limit = await checkRateLimit(rateLimitKey)

  if (!limit.allowed) {
    const minutes = Math.ceil((limit.retryAfterSeconds ?? 900) / 60)
    console.warn(`[AUTH] Rate limit — ip=${maskIp(ip)} email=${maskEmail(email)}`)
    return NextResponse.json(
      {
        error: `Demasiadas tentativas falhadas. Tenta novamente em ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(limit.retryAfterSeconds ?? 900) },
      },
    )
  }

  // ── 3. Autenticação com password (server-side para definir cookies) ───────
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })

  // ── 4. Tratar erros de autenticação ───────────────────────────────────────
  if (error) {
    console.warn(
      `[AUTH] Login falhado — ip=${maskIp(ip)} email=${maskEmail(email)} motivo=${error.message}`,
    )

    if (
      error.message.includes('Invalid login credentials') ||
      error.message.includes('invalid_credentials')
    ) {
      return NextResponse.json({ error: 'Email ou palavra-passe incorretos.' }, { status: 401 })
    }
    if (error.message.includes('Email not confirmed')) {
      return NextResponse.json({ error: 'Confirma o teu email antes de entrar.' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro ao entrar. Tenta novamente.' }, { status: 400 })
  }

  if (!data.user || !data.session) {
    return NextResponse.json({ error: 'Erro ao entrar. Tenta novamente.' }, { status: 400 })
  }

  await resetRateLimit(rateLimitKey)
  console.info(`[AUTH] Login bem-sucedido — ip=${maskIp(ip)} email=${maskEmail(email)}`)

  // ── 5. Verificar se o papel exige OTP por email ───────────────────────────
  const papel = data.user.user_metadata?.papel as PapelUtilizador | undefined
  const requiresOtp = papel && OTP_REQUIRED_ROLES.includes(papel)

  if (!requiresOtp) {
    // Aluno — devolve a sessão diretamente
    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user_metadata: data.user.user_metadata,
    })
  }

  // ── 6. Gerar e guardar código OTP ─────────────────────────────────────────
  const code = generateOtpCode()
  const codeHash = hashOtpCode(code)
  const admin = createAdminClient()

  // Apagar sessões OTP antigas do mesmo utilizador (evitar acumulação)
  await admin.from('email_otp_sessions').delete().eq('user_id', data.user.id)

  // Gerar challenge para binding ao browser (não ao IP — ver
  // 20260617000010_otp_challenge_binding.sql para o porquê).
  const { challenge, challengeHash } = generateChallenge()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: otpSession, error: otpError } = await (admin
    .from('email_otp_sessions') as any)
    .insert({
      user_id: data.user.id,
      code_hash: codeHash,
      // IP guardado para forense (correlacionar ataques nos logs).
      // NÃO usado para enforcement — challenge_hash trata disso.
      ip_address: ip === 'unknown' ? null : ip,
      challenge_hash: challengeHash,
    })
    .select('id')
    .single()

  if (otpError || !otpSession) {
    console.error('[AUTH] Erro ao criar sessão OTP:', otpError)
    return NextResponse.json(
      { error: 'Erro ao iniciar verificação. Tenta novamente.' },
      { status: 500 },
    )
  }

  // ── 7. Enviar email com o código ──────────────────────────────────────────
  try {
    await sendOtpEmail(data.user.email!, code)
    console.info(
      `[AUTH] OTP enviado — email=${maskEmail(email)} session=${maskSessionId(otpSession.id)}`,
    )
  } catch (mailError) {
    console.error('[AUTH] Erro ao enviar email OTP:', mailError)
    return NextResponse.json(
      { error: 'Não foi possível enviar o email de verificação. Tenta novamente.' },
      { status: 500 },
    )
  }

  // ── 8. Devolver tokens + ID da sessão OTP (sem revelar o código) ──────────
  // Os tokens ficam em memória no React — só são ativados no browser
  // após verificação OTP bem-sucedida (ver /api/auth/verify-otp).
  //
  // O challenge cookie liga esta sessão OTP a ESTE browser. Sem o
  // cookie no /verify-otp, a verificação falha — atacante com o
  // session_id (de logs leaked) não consegue completar.
  const res = NextResponse.json({
    requires_otp: true,
    otp_session_id: otpSession.id,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user_metadata: data.user.user_metadata,
  })

  res.cookies.set({
    name: OTP_CHALLENGE_COOKIE,
    value: challenge,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: OTP_CHALLENGE_MAX_AGE,
  })

  return res
}
