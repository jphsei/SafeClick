import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Vitest config — testes de código puro/lógica + testes de integração
 * contra Supabase local.
 *
 * - `happy-dom` é mais leve que jsdom (suficiente para a maioria dos
 *   testes que não envolvem rendering completo)
 * - `include` limita os testes à pasta `tests/` (estrutura espelha src/)
 * - `exclude` evita correr testes em outputs do Next.js e node_modules
 *
 * IMPORTANTE — carregamento de .env.local:
 *   Ao contrário do Next.js, o Vitest NÃO carrega `.env.local`
 *   automaticamente. Sem isto, os testes de integração em
 *   tests/security/* viam `process.env.NEXT_PUBLIC_SUPABASE_URL`
 *   como `undefined` e eram silenciosamente saltados via
 *   `describe.skipIf(!envOk)`. Usamos `loadEnv('', cwd, '')` para
 *   importar TODAS as variáveis (prefixo '' = todas) do .env/.env.local
 *   e promovê-las a `process.env` antes da suite arrancar.
 */
export default defineConfig(({ mode }) => {
  // Carrega .env, .env.local, .env.<mode>, .env.<mode>.local
  // Prefixo '' significa "todas as variáveis", não só VITE_*.
  const env = loadEnv(mode ?? 'test', process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined && typeof value === 'string') {
      process.env[key] = value
    }
  }

  return {
    plugins: [react()],
    test: {
      environment: 'happy-dom',
      globals: true,
      include: ['tests/**/*.test.{ts,tsx}'],
      exclude: ['node_modules', '.next'],

      // Higiene de mocks — preparado para quando começarmos a usar `vi.mock`
      // ou `vi.spyOn` em testes de componentes/server actions. Para os
      // testes puros actuais é inofensivo.
      clearMocks: true,
      restoreMocks: true,
      mockReset: true,
    },
    resolve: {
      alias: {
        // Redirige `import 'server-only'` para um stub vazio em testes.
        // O package real lança erro em contextos não-Next-server (o que
        // Vitest é), o que tornaria impossível testar lib/log.ts,
        // lib/auth/otp-challenge.ts, lib/env.ts, etc.
        //
        // Em produção, Next.js continua a resolver `server-only` para
        // o package real — o guard server/client mantém-se.
        'server-only': path.resolve(__dirname, './tests/__mocks__/server-only.ts'),
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
