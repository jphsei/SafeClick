import { type NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/auth/rate-limiter'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyOtpCode } from '@/lib/auth/otp-email'
import { maskIp, maskSessionId } from '@/lib/log'
import { getClientIp as getRealClientIp } from '@/lib/client-ip'
import {
  verifyChallenge,
  OTP_CHALLENGE_COOKIE,
} from '@/lib/auth/otp-challenge'

/** Wrapper sobre o helper centralizado (em lib/client-ip.ts). */
function getClientIp(req: NextRequest): string {
  return getRealClientIp(req)
}

export async function POST(request: NextRequest) {
  // ── 1. Parse body ─────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  const { otp_session_id, code } = (body ?? {}) as Record<string, unknown>

  if (typeof otp_session_id !== 'string' || !otp_session_id) {
    return NextResponse.json({ error: 'Sessão inválida.' }, { status: 400 })
  }
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Código inválido.' }, { status: 400 })
  }

  // ── 2. Rate limiting (por sessão OTP) ─────────────────────────────────────
  const ip = getClientIp(request)
  const rateLimitKey = `otp:${ip}:${otp_session_id}`
  const limit = await checkRateLimit(rateLimitKey)

  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas tentativas. Volta a fazer login para obter um novo código.' },
      { status: 429 },
    )
  }

  // ── 3. Buscar sessão OTP na BD ────────────────────────────────────────────
  const admin = createAdminClient()
  const { data: session, error: fetchError } = await admin
    .from('email_otp_sessions')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select('id, code_hash, expires_at, used, ip_address, challenge_hash' as any)
    .eq('id', otp_session_id)
    .single()

  if (fetchError || !session) {
    return NextResponse.json(
      { error: 'Código expirado ou inválido. Volta a fazer login.' },
      { status: 401 },
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sess = session as any as {
    code_hash: string
    expires_at: string
    used: boolean
    ip_address: string | null
    challenge_hash: string | null
  }

  // ── 4. Verificar validade ─────────────────────────────────────────────────
  if (sess.used) {
    return NextResponse.json(
      { error: 'Este código já foi utilizado. Volta a fazer login.' },
      { status: 401 },
    )
  }

  if (new Date(sess.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'O código expirou. Volta a fazer login para obter um novo código.' },
      { status: 401 },
    )
  }

  // ── 5. Challenge cookie binding ───────────────────────────────────────────
  // Substituiu a antiga IP binding (ver 20260617000010_otp_challenge_binding.sql).
  // Garantia: a sessão OTP só é verificada pelo mesmo browser que iniciou
  // o login. Robusto contra mudanças de IP (mobile handover, dual-stack,
  // VPNs, etc.).
  //
  // `challenge_hash = NULL` significa sessão pré-migration — aceitamos por
  // compatibilidade transitória. Após 15 min, todas as sessões têm hash.
  if (sess.challenge_hash) {
    const cookieChallenge = request.cookies.get(OTP_CHALLENGE_COOKIE)?.value
    if (!verifyChallenge(cookieChallenge, sess.challenge_hash)) {
      console.warn(
        `[OTP] challenge mismatch — ip=${maskIp(ip)} session=${maskSessionId(otp_session_id)}`,
      )
      return NextResponse.json(
        { error: 'Sessão inválida ou expirada. Refaz o login.' },
        { status: 401 },
      )
    }
  }

  // ── 6. Verificar código ───────────────────────────────────────────────────
  if (!verifyOtpCode(code, sess.code_hash)) {
    console.warn(
      `[OTP] código incorreto — ip=${maskIp(ip)} session=${maskSessionId(otp_session_id)}`,
    )
    return NextResponse.json(
      { error: 'Código incorreto. Verifica o teu email e tenta novamente.' },
      { status: 401 },
    )
  }

  // ── 7. Marcar como usado ──────────────────────────────────────────────────
  await admin.from('email_otp_sessions').update({ used: true }).eq('id', otp_session_id)

  console.info(
    `[OTP] verificação bem-sucedida — ip=${maskIp(ip)} session=${maskSessionId(otp_session_id)}`,
  )

  // ── 8. Limpar o challenge cookie ──────────────────────────────────────────
  // Single-use: depois de verificado, o cookie deixa de fazer sentido.
  // Defesa em profundidade contra reuso acidental.
  const res = NextResponse.json({ success: true })
  res.cookies.set({
    name: OTP_CHALLENGE_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 0,
  })
  return res
}
