/**
 * Stub para o package `server-only` durante testes Vitest.
 *
 * Em produção:
 *   - Next.js resolve `server-only` para um módulo vazio em build
 *     server-side e para um módulo que lança erro em build client-side.
 *   - Resultado: o build falha se algum client component importar
 *     um módulo com `import 'server-only'`. É o nosso guard contra
 *     fugas acidentais de service-role keys, PII de logs, etc.
 *
 * Em testes Vitest:
 *   - Vitest não tem o split server/client do Next.js. Sem o alias
 *     definido em `vitest.config.ts`, o ficheiro original do package
 *     é resolvido → lança erro → impossível testar módulos que o
 *     importam (lib/log.ts, lib/auth/otp-challenge.ts, etc).
 *   - Este stub é silencioso: o `import 'server-only'` torna-se um
 *     no-op em testes, sem afectar produção.
 *
 * NÃO importar este ficheiro directamente em código de produção.
 * É APENAS para testes via alias em vitest.config.ts.
 */
export {}
