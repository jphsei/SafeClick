/**
 * Testes unitários para `lib/log.ts` — redaction de PII em logs.
 */

import { describe, it, expect } from 'vitest'
import { maskEmail, maskIp, maskSessionId, hashId } from '@/lib/log'

describe('maskEmail', () => {
  it('mascara local part preservando domínio', () => {
    expect(maskEmail('joao@gmail.com')).toBe('jo**@gmail.com')
    expect(maskEmail('a@b.pt')).toBe('a*@b.pt')
    expect(maskEmail('professor.teste@escola.edu.pt')).toBe('pr*************@escola.edu.pt')
  })

  it('trata casos malformados defensivamente', () => {
    expect(maskEmail(null)).toBe('<empty>')
    expect(maskEmail(undefined)).toBe('<empty>')
    expect(maskEmail('')).toBe('<empty>')
    expect(maskEmail('no-at-sign')).toBe('<malformed>')
    expect(maskEmail('@no-local')).toBe('<malformed>')
  })
})

describe('maskIp', () => {
  it('preserva /24 em IPv4', () => {
    expect(maskIp('192.168.1.42')).toBe('192.168.1.***')
    expect(maskIp('10.0.0.255')).toBe('10.0.0.***')
  })

  it('preserva /64 em IPv6', () => {
    expect(maskIp('2001:db8:85a3:8a2e:0370:7334:abcd:1234')).toBe('2001:db8:85a3:8a2e:***')
  })

  it('trata casos especiais', () => {
    expect(maskIp(null)).toBe('<unknown>')
    expect(maskIp(undefined)).toBe('<unknown>')
    expect(maskIp('unknown')).toBe('<unknown>')
    expect(maskIp('not-an-ip')).toBe('<malformed>')
  })
})

describe('maskSessionId', () => {
  it('mostra primeiros e últimos 4 chars', () => {
    expect(maskSessionId('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe('a1b2...7890')
  })

  it('trata IDs muito curtos', () => {
    expect(maskSessionId('short')).toBe('***')
    expect(maskSessionId('')).toBe('<empty>')
    expect(maskSessionId(null)).toBe('<empty>')
  })
})

describe('hashId', () => {
  it('é determinístico (mesma entrada → mesmo hash)', () => {
    const a = hashId('joao@gmail.com')
    const b = hashId('joao@gmail.com')
    expect(a).toBe(b)
  })

  it('diferente entrada → diferente hash', () => {
    expect(hashId('joao@gmail.com')).not.toBe(hashId('maria@gmail.com'))
  })

  it('devolve hex de 12 chars', () => {
    expect(hashId('test')).toMatch(/^[a-f0-9]{12}$/)
  })

  it('trata empty', () => {
    expect(hashId(null)).toBe('<empty>')
    expect(hashId(undefined)).toBe('<empty>')
    expect(hashId('')).toBe('<empty>')
  })
})
