/**
 * Helper para testes de integração que precisam de Supabase local.
 *
 * Verifica as 3 variáveis de ambiente obrigatórias e devolve um objecto
 * com:
 *   - envOk: todas presentes
 *   - missing: lista das em falta (string[])
 *   - reason: mensagem human-readable para mostrar no output
 *   - explicitSkip: o user setou `SKIP_INTEGRATION_TESTS=1` para silenciar
 *
 * Política:
 *   - Se envOk → testes correm normalmente
 *   - Se !envOk e !explicitSkip → o teste DEVE falhar (não passar
 *     silenciosamente como "skipped"); use `requireIntegrationEnv()`
 *     dentro de `beforeAll` ou um sentinel test
 *   - Se !envOk e explicitSkip → skip com console.warn visível
 */

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

export interface IntegrationEnvStatus {
  envOk: boolean
  missing: string[]
  explicitSkip: boolean
  reason: string | null
}

export function checkIntegrationEnv(): IntegrationEnvStatus {
  const missing = REQUIRED_VARS.filter((k) => !process.env[k])
  const envOk = missing.length === 0
  const explicitSkip = process.env.SKIP_INTEGRATION_TESTS === '1'

  const reason = envOk
    ? null
    : `Missing env vars: ${missing.join(', ')}.\n` +
      `   1) Start Supabase local:  supabase start\n` +
      `   2) Copy values from \`supabase status\` into frontend/.env.local:\n` +
      `        NEXT_PUBLIC_SUPABASE_URL=...\n` +
      `        NEXT_PUBLIC_SUPABASE_ANON_KEY=...\n` +
      `        SUPABASE_SERVICE_ROLE_KEY=...\n` +
      `   3) Re-run:  npm test\n` +
      `   To skip these integration tests explicitly (e.g. in CI without\n` +
      `   Supabase), set SKIP_INTEGRATION_TESTS=1.`

  return { envOk, missing: [...missing], explicitSkip, reason }
}

/**
 * Imprime warning visível no output do Vitest quando as envs faltam.
 * Chamar uma vez no topo do ficheiro de teste, fora do describe.
 */
export function warnIfMissingIntegrationEnv(suiteName: string): IntegrationEnvStatus {
  const status = checkIntegrationEnv()
  if (status.envOk) return status

  const banner = `\n` + '━'.repeat(72) + `\n`
  const label = status.explicitSkip ? '⏭️  SKIPPED' : '❌  WILL FAIL'

  // stderr (console.warn) — sempre visível no output do Vitest,
  // mesmo em modo `--reporter=default`
  console.warn(
    banner +
      `${label}: ${suiteName}\n` +
      banner +
      status.reason +
      `\n` +
      banner,
  )
  return status
}
