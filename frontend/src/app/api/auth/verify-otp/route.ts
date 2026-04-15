import { type NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/auth/rate-limiter'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyOtpCode } from '@/lib/auth/otp-email'

/** Extrai o IP real do cliente. */
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
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
  const limit = checkRateLimit(rateLimitKey)

  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas tentativas. Volta a fazer login para obter um novo código.' },
      { status: 429 }
    )
  }

  // ── 3. Buscar sessão OTP na BD ────────────────────────────────────────────
  const admin = createAdminClient()
  const { data: session, error: fetchError } = await admin
    .from('email_otp_sessions')
    .select('id, code_hash, expires_at, used')
    .eq('id', otp_session_id)
    .single()

  if (fetchError || !session) {
    return NextResponse.json(
      { error: 'Código expirado ou inválido. Volta a fazer login.' },
      { status: 401 }
    )
  }

  // ── 4. Verificar validade ─────────────────────────────────────────────────
  if (session.used) {
    return NextResponse.json(
      { error: 'Este código já foi utilizado. Volta a fazer login.' },
      { status: 401 }
    )
  }

  if (new Date(session.expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'O código expirou. Volta a fazer login para obter um novo código.' },
      { status: 401 }
    )
  }

  if (!verifyOtpCode(code, session.code_hash)) {
    console.warn(`[OTP] Código incorreto — ip=${ip} session=${otp_session_id}`)
    return NextResponse.json(
      { error: 'Código incorreto. Verifica o teu email e tenta novamente.' },
      { status: 401 }
    )
  }

  // ── 5. Marcar como usado ──────────────────────────────────────────────────
  await admin
    .from('email_otp_sessions')
    .update({ used: true })
    .eq('id', otp_session_id)

  console.info(`[OTP] Verificação bem-sucedida — ip=${ip} session=${otp_session_id}`)

  return NextResponse.json({ success: true })
}
