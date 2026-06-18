import 'server-only'
import { getEnv, isCaptchaEnabled } from '@/lib/env'

/**
 * Verifica um token Cloudflare Turnstile contra a API da Cloudflare.
 *
 * Modelo:
 *   - Frontend renderiza o widget Turnstile (script de cloudflare)
 *     com o sitekey público. Widget devolve um token de uso único.
 *   - Frontend envia o token nas requests sensíveis (signup, login,
 *     recovery).
 *   - Backend chama esta função com o token. Cloudflare valida e
 *     devolve { success: true|false }.
 *
 * Trade-off:
 *   - Se `TURNSTILE_SECRET` ou `NEXT_PUBLIC_TURNSTILE_SITEKEY` não
 *     estão configurados (dev), a verificação devolve `true` com
 *     warning. Isto permite que devs corram localmente sem ter de
 *     criar um sitekey Cloudflare. Em produção, AMBAS as vars têm
 *     de estar setadas — verificadas em `lib/env.ts`.
 *
 * Por que Turnstile e não hCaptcha:
 *   - Sem CAPTCHAs visuais (não há "selecciona os semáforos")
 *   - Gratuito, sem limites
 *   - Sem tracking publicitário (vs reCAPTCHA Google)
 *   - Privacy-preserving (não passa fingerprint para terceiros)
 *
 * Setup em produção:
 *   1. Criar widget em https://dash.cloudflare.com/?to=/:account/turnstile
 *   2. Adicionar domínio do site (safeclick.pt e/ou .vercel.app)
 *   3. Copiar sitekey → NEXT_PUBLIC_TURNSTILE_SITEKEY
 *   4. Copiar secret → TURNSTILE_SECRET (no Vercel: server-only env)
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export interface CaptchaResult {
  ok: boolean
  /** Razão do falhanço, útil para debug e logs */
  errorCode?: string
}

/**
 * Verifica um token Turnstile. Em dev sem secret, devolve sucesso
 * (com warning visível no log).
 *
 * @param token  O `cf-turnstile-response` enviado pelo cliente
 * @param ip     IP do cliente (recomendado pela Cloudflare)
 */
export async function verifyCaptcha(
  token: string | undefined | null,
  ip?: string,
): Promise<CaptchaResult> {
  if (!isCaptchaEnabled()) {
    console.warn('[captcha] desactivado (sem TURNSTILE_SECRET) — request permitida em modo dev')
    return { ok: true }
  }

  if (!token) {
    return { ok: false, errorCode: 'missing-input-response' }
  }

  const env = getEnv()
  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET!,
    response: token,
  })
  if (ip && ip !== 'unknown') body.set('remoteip', ip)

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      body,
      // 5s suficiente — endpoint da Cloudflare é rápido
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      console.error(`[captcha] HTTP ${res.status} ao verificar token`)
      // Fail-closed: se Cloudflare está em baixo, rejeitamos
      return { ok: false, errorCode: 'verify-http-error' }
    }

    const data = (await res.json()) as {
      success: boolean
      'error-codes'?: string[]
    }

    if (!data.success) {
      return {
        ok: false,
        errorCode: data['error-codes']?.[0] ?? 'unknown',
      }
    }
    return { ok: true }
  } catch (err) {
    console.error('[captcha] erro de rede:', err instanceof Error ? err.message : err)
    // Fail-closed em erros de rede também
    return { ok: false, errorCode: 'network-error' }
  }
}
