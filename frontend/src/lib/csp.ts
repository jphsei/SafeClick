/**
 * Construção da Content-Security-Policy.
 *
 * Extraído de `proxy.ts` para ser testável sem mock do NextRequest.
 * As decisões de design estão documentadas no proxy.ts.
 */

export interface CspContext {
  nonce: string
  isDev: boolean
  /** Origem do Supabase (NEXT_PUBLIC_SUPABASE_URL). String vazia se não setada. */
  supabaseOrigin: string
  /** Se Turnstile está activo (sitekey configurado), abrir CSP para o script CF. */
  turnstileEnabled?: boolean
}

// Cloudflare Turnstile precisa de carregar challenges.cloudflare.com
// (api.js + chunks) e fazer requests para o domínio. Frame é usado
// para renderizar o widget invisível.
const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com'
const TURNSTILE_FRAME = 'https://challenges.cloudflare.com'

export function buildCsp({
  nonce,
  isDev,
  supabaseOrigin,
  turnstileEnabled = false,
}: CspContext): string {
  const connectSrc = [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    supabaseOrigin,
  ]
    .filter(Boolean)
    .join(' ')

  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    `'strict-dynamic'`,
    ...(isDev ? [`'unsafe-eval'`] : []),
    // Turnstile: o script da Cloudflare é injectado dinamicamente
    // por `components/auth/turnstile.tsx`. Listado explicitamente
    // porque 'strict-dynamic' cobre scripts carregados por scripts
    // COM nonce — o nosso é injectado por JS sem nonce explícito.
    ...(turnstileEnabled ? [TURNSTILE_SCRIPT] : []),
  ]

  const frameSources = turnstileEnabled ? [TURNSTILE_FRAME] : [`'none'`]

  const directives = [
    `default-src 'self'`,
    `script-src ${scriptSources.join(' ')}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    `connect-src ${connectSrc}`,
    `frame-ancestors 'none'`,
    `frame-src ${frameSources.join(' ')}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ]
  return directives.join('; ')
}

/** Gera um nonce de 16 bytes em base64 (compatível Edge runtime). */
export function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}
