/**
 * Testes unitários para `lib/csp.ts`.
 *
 * Verificam as garantias críticas da CSP:
 *   - Nonce está presente em script-src
 *   - Directivas anti-clickjacking, anti-base-hijack, anti-form-hijack
 *   - Dev mode adiciona unsafe-eval
 *   - Prod inclui upgrade-insecure-requests
 *   - connect-src cobre Supabase (REST + WS)
 */

import { describe, it, expect } from 'vitest'
import { buildCsp, generateNonce } from '@/lib/csp'

const TEST_NONCE = 'abc123XYZ=='
const SUPABASE_URL = 'http://127.0.0.1:54321'

describe('buildCsp', () => {
  describe('script-src', () => {
    it('inclui o nonce', () => {
      const csp = buildCsp({ nonce: TEST_NONCE, isDev: false, supabaseOrigin: SUPABASE_URL })
      expect(csp).toContain(`'nonce-${TEST_NONCE}'`)
    })

    it('inclui strict-dynamic', () => {
      const csp = buildCsp({ nonce: TEST_NONCE, isDev: false, supabaseOrigin: SUPABASE_URL })
      expect(csp).toContain("'strict-dynamic'")
    })

    it('em prod NÃO inclui unsafe-eval', () => {
      const csp = buildCsp({ nonce: TEST_NONCE, isDev: false, supabaseOrigin: SUPABASE_URL })
      expect(csp).not.toContain("'unsafe-eval'")
    })

    it('em dev INCLUI unsafe-eval (necessário para HMR/Turbopack)', () => {
      const csp = buildCsp({ nonce: TEST_NONCE, isDev: true, supabaseOrigin: SUPABASE_URL })
      expect(csp).toContain("'unsafe-eval'")
    })

    it('NÃO inclui unsafe-inline em script-src', () => {
      const csp = buildCsp({ nonce: TEST_NONCE, isDev: false, supabaseOrigin: SUPABASE_URL })
      // unsafe-inline pode estar em style-src mas NÃO em script-src
      const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src'))
      expect(scriptSrc).toBeDefined()
      expect(scriptSrc).not.toContain("'unsafe-inline'")
    })
  })

  describe('directivas anti-injecção', () => {
    it('frame-ancestors none (anti-clickjacking)', () => {
      const csp = buildCsp({ nonce: TEST_NONCE, isDev: false, supabaseOrigin: SUPABASE_URL })
      expect(csp).toContain("frame-ancestors 'none'")
    })

    it('base-uri self (anti-base-tag-hijack)', () => {
      const csp = buildCsp({ nonce: TEST_NONCE, isDev: false, supabaseOrigin: SUPABASE_URL })
      expect(csp).toContain("base-uri 'self'")
    })

    it('object-src none (anti-flash/embed)', () => {
      const csp = buildCsp({ nonce: TEST_NONCE, isDev: false, supabaseOrigin: SUPABASE_URL })
      expect(csp).toContain("object-src 'none'")
    })

    it('form-action self (anti-form-hijack)', () => {
      const csp = buildCsp({ nonce: TEST_NONCE, isDev: false, supabaseOrigin: SUPABASE_URL })
      expect(csp).toContain("form-action 'self'")
    })
  })

  describe('connect-src', () => {
    it('inclui self', () => {
      const csp = buildCsp({ nonce: TEST_NONCE, isDev: false, supabaseOrigin: SUPABASE_URL })
      const connect = csp.split(';').find((d) => d.trim().startsWith('connect-src'))
      expect(connect).toContain("'self'")
    })

    it('inclui wildcard Supabase para REST e WS', () => {
      const csp = buildCsp({ nonce: TEST_NONCE, isDev: false, supabaseOrigin: SUPABASE_URL })
      expect(csp).toContain('https://*.supabase.co')
      expect(csp).toContain('wss://*.supabase.co')
    })

    it('inclui supabaseOrigin explícito (para dev local 127.0.0.1)', () => {
      const csp = buildCsp({ nonce: TEST_NONCE, isDev: true, supabaseOrigin: SUPABASE_URL })
      expect(csp).toContain(SUPABASE_URL)
    })

    it('omite supabaseOrigin se vazio', () => {
      const csp = buildCsp({ nonce: TEST_NONCE, isDev: false, supabaseOrigin: '' })
      const connect = csp.split(';').find((d) => d.trim().startsWith('connect-src'))
      // não deve ter ' ;' a meio
      expect(connect).not.toMatch(/\s{2,}/)
    })
  })

  describe('upgrade-insecure-requests', () => {
    it('PRESENTE em prod', () => {
      const csp = buildCsp({ nonce: TEST_NONCE, isDev: false, supabaseOrigin: SUPABASE_URL })
      expect(csp).toContain('upgrade-insecure-requests')
    })

    it('AUSENTE em dev (browsers ignoram em HTTP localhost)', () => {
      const csp = buildCsp({ nonce: TEST_NONCE, isDev: true, supabaseOrigin: SUPABASE_URL })
      expect(csp).not.toContain('upgrade-insecure-requests')
    })
  })

  it('todas as directivas obrigatórias estão presentes', () => {
    const csp = buildCsp({ nonce: TEST_NONCE, isDev: false, supabaseOrigin: SUPABASE_URL })
    const required = [
      'default-src',
      'script-src',
      'style-src',
      'img-src',
      'font-src',
      'connect-src',
      'frame-ancestors',
      'frame-src',
      'object-src',
      'base-uri',
      'form-action',
      'worker-src',
      'manifest-src',
    ]
    for (const directive of required) {
      expect(csp).toContain(directive)
    }
  })

  describe('Turnstile (CAPTCHA)', () => {
    it('quando desactivado: frame-src none e nenhum domínio CF', () => {
      const csp = buildCsp({ nonce: TEST_NONCE, isDev: false, supabaseOrigin: SUPABASE_URL })
      expect(csp).toContain("frame-src 'none'")
      expect(csp).not.toContain('challenges.cloudflare.com')
    })

    it('quando activado: script-src inclui CF e frame-src também', () => {
      const csp = buildCsp({
        nonce: TEST_NONCE,
        isDev: false,
        supabaseOrigin: SUPABASE_URL,
        turnstileEnabled: true,
      })
      const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src'))
      const frameSrc = csp.split(';').find((d) => d.trim().startsWith('frame-src'))
      expect(scriptSrc).toContain('https://challenges.cloudflare.com')
      expect(frameSrc).toContain('https://challenges.cloudflare.com')
      expect(frameSrc).not.toContain("'none'")
    })
  })
})

describe('generateNonce', () => {
  it('gera nonces diferentes em chamadas consecutivas', () => {
    const a = generateNonce()
    const b = generateNonce()
    expect(a).not.toBe(b)
  })

  it('produz string base64 (>=22 chars para 16 bytes)', () => {
    const n = generateNonce()
    expect(n).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
    expect(n.length).toBeGreaterThanOrEqual(22)
  })
})
