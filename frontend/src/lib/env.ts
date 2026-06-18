/**
 * Validação centralizada de env vars.
 *
 * Razão: padrão actual `process.env.X!` mente ao TypeScript — se X
 * estiver indefinido, o valor passa como `undefined` mas o tipo
 * promete `string`. Em produção isto leva a:
 *   - Supabase client com URL "undefined" → 404 errors confusos
 *   - SMTP_FROM cair em default `noreply@safeclick.pt` que pode não
 *     ter SPF/DKIM configurado no domínio real
 *   - Service-role key vazia → operações admin falham silenciosamente
 *     OU criam um cliente que cai em comportamento anon (pior)
 *
 * Esta validação é feita em `instrumentation.ts` ao boot do Next.js,
 * de modo que o servidor não arranca se houver env vars em falta.
 *
 * Cliente vs servidor:
 *   - Vars `NEXT_PUBLIC_*` ficam expostas ao cliente (intencional).
 *   - Vars sem `NEXT_PUBLIC_` (SUPABASE_SERVICE_ROLE_KEY, SMTP_*,
 *     TURNSTILE_SECRET) são server-only — o Next.js apaga-as do
 *     bundle. Importar este ficheiro num client component só
 *     funciona para a metade pública.
 */

import { z } from 'zod'

const envSchema = z.object({
  // ── Públicas (vão para o cliente) ─────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL tem de ser URL válido'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20, 'NEXT_PUBLIC_SUPABASE_ANON_KEY parece vazio'),

  // ── Server-only (NUNCA com NEXT_PUBLIC_) ──────────────────────
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(20, 'SUPABASE_SERVICE_ROLE_KEY é obrigatória; nunca expor ao cliente'),
  SMTP_HOST: z.string().min(1, 'SMTP_HOST é obrigatório (Mailpit em dev, SMTP real em prod)'),
  SMTP_PORT: z
    .string()
    .regex(/^\d+$/, 'SMTP_PORT tem de ser numérico')
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535)),
  SMTP_FROM: z.string().email('SMTP_FROM tem de ser um email válido'),

  // ── Opcionais — protecção anti-bot (Turnstile) ────────────────
  // Se não setadas, captcha desactivado (modo dev). Em produção,
  // ambas devem estar presentes para enforcement.
  NEXT_PUBLIC_TURNSTILE_SITEKEY: z.string().optional(),
  TURNSTILE_SECRET: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

/**
 * Valida e devolve a config. Lança no boot se algo falta.
 * Cache no module-scope para ser barato chamar em qualquer lado.
 */
let cached: Env | null = null

export function getEnv(): Env {
  if (cached) return cached
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(
      `[env] Configuração inválida — corrige .env.local ou variáveis de ambiente:\n${issues}`,
    )
  }
  cached = parsed.data
  return cached
}

/**
 * Indica se o captcha (Turnstile) está configurado.
 * Em dev sem secret, o captcha é skipped com aviso.
 */
export function isCaptchaEnabled(): boolean {
  const e = getEnv()
  return Boolean(e.TURNSTILE_SECRET && e.NEXT_PUBLIC_TURNSTILE_SITEKEY)
}
