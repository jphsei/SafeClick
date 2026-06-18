import { type NextRequest } from 'next/server'

/**
 * Extrai o IP real do cliente, com prioridade para headers confiáveis.
 *
 * Ordem de precedência (mais confiável → menos confiável):
 *   1. `cf-connecting-ip`        — Cloudflare (não-spoofable, setado pela CF)
 *   2. `x-vercel-forwarded-for`  — Vercel (não-spoofable, setado pela edge)
 *   3. `x-real-ip`               — proxies tipo nginx (geralmente trusted)
 *   4. primeiro IP de `x-forwarded-for` — generic, **spoofable** se não houver
 *      proxy de confiança a reescrever o header. Aceitável para LOGS apenas.
 *   5. `'unknown'`               — fallback (dev sem proxy, alguns hosts)
 *
 * NOTA: este IP é usado para:
 *   - Rate limiting (chave parcial)
 *   - LOGS forenses (correlacionar ataques)
 *
 * NÃO é usado para enforcement de sessão (foi substituído por challenge
 * cookie em `lib/auth/otp-challenge.ts`).
 */
export function getClientIp(req: NextRequest): string {
  // 1) Cloudflare — setado pela CF, atacante não pode override
  const cfIp = req.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp

  // 2) Vercel — setado pela edge da Vercel, atacante não pode override
  const vercelIp = req.headers.get('x-vercel-forwarded-for')
  if (vercelIp) return vercelIp.split(',')[0]?.trim() ?? 'unknown'

  // 3) Proxy nginx-style (auto-hosted)
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp

  // 4) Generic — spoofable, mas único restante
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() ?? 'unknown'

  return 'unknown'
}
