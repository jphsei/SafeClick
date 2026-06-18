import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Vitest config — testes de código puro/lógica.
 *
 * - `happy-dom` é mais leve que jsdom (suficiente para a maioria dos
 *   testes que não envolvem rendering completo)
 * - `include` limita os testes à pasta `tests/` (estrutura espelha src/)
 * - `exclude` evita correr testes em outputs do Next.js e node_modules
 */
export default defineConfig({
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
})
