/**
 * Next.js instrumentation hook — corre uma vez por processo, no boot
 * do servidor (antes de qualquer request). Único sítio onde podemos
 * fazer side effects que devem acontecer "globalmente".
 *
 * Aqui validamos as env vars: se algo crítico falta, queremos que
 * o servidor recuse arrancar — em vez de servir 500s ou (pior)
 * comportamento inseguro silencioso.
 *
 * Ver https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register(): Promise<void> {
  // Só corre no servidor Node, não no Edge runtime — o `crypto`
  // node-builtin e o `server-only` do env.ts não funcionam no Edge.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  // Importação dinâmica para que o bundle do Edge não puxe env.ts.
  const { getEnv } = await import('@/lib/env')
  try {
    const env = getEnv()
    // eslint-disable-next-line no-console
    console.info(
      `[boot] env ok — supabase=${env.NEXT_PUBLIC_SUPABASE_URL} smtp=${env.SMTP_HOST}:${env.SMTP_PORT} captcha=${env.TURNSTILE_SECRET ? 'on' : 'off'}`,
    )
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err instanceof Error ? err.message : err)
    // Falha o boot — Next.js termina o processo
    throw err
  }
}
