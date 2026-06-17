import { describe, it, expect } from 'vitest'
import { generateOtpCode, hashOtpCode, verifyOtpCode } from '@/lib/auth/otp-email'

describe('generateOtpCode', () => {
  it('devolve uma string', () => {
    expect(typeof generateOtpCode()).toBe('string')
  })

  it('tem exatamente 6 caracteres', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateOtpCode().length).toBe(6)
    }
  })

  it('contém apenas dígitos', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/)
    }
  })

  it('pad com zeros à esquerda para números pequenos', () => {
    // Não é determinístico, mas em 1000 gerações deve apanhar alguns
    // códigos com zeros à esquerda. Confirma só que o formato é
    // sempre 6 dígitos.
    const codes = Array.from({ length: 1000 }, () => generateOtpCode())
    expect(codes.every((c) => c.length === 6 && /^\d+$/.test(c))).toBe(true)
  })

  // Nota: não testamos "valores diferentes em chamadas consecutivas"
  // porque depende de aleatoriedade — pode falhar sem haver bug real.
  // A garantia de unicidade vem do `randomInt(0, 1_000_000)` que devolve
  // um espaço de 1M valores, e cada sessão OTP é única na BD pela UNIQUE
  // constraint no schema.
})

describe('hashOtpCode', () => {
  it('devolve uma string hexadecimal de 64 chars (SHA-256)', () => {
    const hash = hashOtpCode('123456')
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('é determinístico — mesma input → mesmo hash', () => {
    expect(hashOtpCode('123456')).toBe(hashOtpCode('123456'))
  })

  it('inputs diferentes geram hashes diferentes', () => {
    expect(hashOtpCode('123456')).not.toBe(hashOtpCode('654321'))
    expect(hashOtpCode('000000')).not.toBe(hashOtpCode('000001'))
  })

  it('hash correto para um vector conhecido (SHA-256 de "123456")', () => {
    // Hash SHA-256 publicamente conhecido — confirma que estamos a usar
    // o algoritmo certo e não outro (ex: MD5, SHA-1).
    expect(hashOtpCode('123456')).toBe(
      '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
    )
  })
})

describe('verifyOtpCode', () => {
  it('devolve true quando o código corresponde ao hash', () => {
    const code = '987654'
    const hash = hashOtpCode(code)
    expect(verifyOtpCode(code, hash)).toBe(true)
  })

  it('devolve false quando o código está errado', () => {
    const hash = hashOtpCode('987654')
    expect(verifyOtpCode('987655', hash)).toBe(false)
    expect(verifyOtpCode('000000', hash)).toBe(false)
  })

  it('devolve false para hash vazio', () => {
    expect(verifyOtpCode('123456', '')).toBe(false)
  })

  it('é case-sensitive (mas códigos são só dígitos, irrelevante)', () => {
    const hash = hashOtpCode('123456')
    expect(verifyOtpCode('123456', hash)).toBe(true)
  })
})
