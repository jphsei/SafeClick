import { describe, it, expect } from 'vitest'
import {
  validatePassword,
  getPasswordChecks,
  passwordStrength,
  MIN_PASSWORD_LENGTH,
} from '@/lib/auth/password'

describe('validatePassword', () => {
  it('rejeita password vazia', () => {
    const res = validatePassword('')
    expect(res.valid).toBe(false)
    expect(res.errors.length).toBeGreaterThan(0)
  })

  it('rejeita password com menos de MIN_PASSWORD_LENGTH caracteres', () => {
    const short = 'A1!a'
    const res = validatePassword(short)
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.includes(`${MIN_PASSWORD_LENGTH} caracteres`))).toBe(true)
  })

  it('rejeita password sem letra', () => {
    const res = validatePassword('1234567890!')
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.toLowerCase().includes('letra'))).toBe(true)
  })

  it('rejeita password sem número', () => {
    const res = validatePassword('abcdefghij!')
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.toLowerCase().includes('número'))).toBe(true)
  })

  it('rejeita password sem caractere especial', () => {
    const res = validatePassword('abcdefgh12')
    expect(res.valid).toBe(false)
    expect(res.errors.some((e) => e.toLowerCase().includes('especial'))).toBe(true)
  })

  it('aceita password com 10+ chars, letra, número e especial', () => {
    const res = validatePassword('MinhaPass1!')
    expect(res.valid).toBe(true)
    expect(res.errors).toEqual([])
  })

  it('aceita exatamente MIN_PASSWORD_LENGTH chars válidos', () => {
    const pw = 'Abc123456!' // 10 chars
    expect(pw.length).toBe(MIN_PASSWORD_LENGTH)
    expect(validatePassword(pw).valid).toBe(true)
  })

  it('acumula todos os erros, não pára no primeiro', () => {
    const res = validatePassword('aaa') // curta, sem número, sem especial
    expect(res.valid).toBe(false)
    expect(res.errors.length).toBeGreaterThanOrEqual(3)
  })

  it('mensagens estão em pt-PT', () => {
    const res = validatePassword('')
    expect(res.errors.every((e) => /palavra-passe|letra|número|especial/i.test(e))).toBe(true)
  })
})

describe('getPasswordChecks', () => {
  it('devolve 4 checks (length, letter, number, special)', () => {
    const checks = getPasswordChecks('abc')
    expect(Object.keys(checks).sort()).toEqual(['length', 'letter', 'number', 'special'])
  })

  it('marca length=true quando >= MIN_PASSWORD_LENGTH', () => {
    expect(getPasswordChecks('a'.repeat(MIN_PASSWORD_LENGTH)).length.ok).toBe(true)
    expect(getPasswordChecks('a'.repeat(MIN_PASSWORD_LENGTH - 1)).length.ok).toBe(false)
  })

  it('marca letter=true para qualquer letra ASCII', () => {
    expect(getPasswordChecks('aaa').letter.ok).toBe(true)
    expect(getPasswordChecks('AAA').letter.ok).toBe(true)
    expect(getPasswordChecks('123').letter.ok).toBe(false)
  })

  it('reconhece letras acentuadas pt-PT como letras válidas', () => {
    // Bug histórico: o regex era `/[a-zA-Z]/` que rejeitava letras
    // acentuadas. Para um sistema pt-PT, "José", "ção" etc. são letras.
    expect(getPasswordChecks('á').letter.ok).toBe(true)
    expect(getPasswordChecks('ç').letter.ok).toBe(true)
    expect(getPasswordChecks('É').letter.ok).toBe(true)
    expect(getPasswordChecks('ñ').letter.ok).toBe(true)
    expect(getPasswordChecks('ã').letter.ok).toBe(true)
  })

  it('aceita password só com letras acentuadas + número + especial', () => {
    // Cenário real: utilizador português que evita teclas ASCII puras.
    const res = validatePassword('Çãoção123!') // 10 chars, sem letras a-z
    expect(res.valid).toBe(true)
  })

  it('marca number=true para qualquer dígito', () => {
    expect(getPasswordChecks('abc5').number.ok).toBe(true)
    expect(getPasswordChecks('abcdef').number.ok).toBe(false)
  })

  it('marca special=true para caracteres especiais comuns', () => {
    const especiais = '!@#$%^&*()-_=+[]{}'
    for (const c of especiais) {
      expect(getPasswordChecks(`abc${c}`).special.ok).toBe(true)
    }
  })

  it('marca special=false para apenas letras/números', () => {
    expect(getPasswordChecks('abcdef123').special.ok).toBe(false)
  })
})

describe('passwordStrength', () => {
  it('devolve 0 quando 0 ou 1 regras passam', () => {
    expect(passwordStrength(getPasswordChecks(''))).toBe(0)
    expect(passwordStrength(getPasswordChecks('a'))).toBe(0)
  })

  it('devolve 1 quando exatamente 2 regras passam', () => {
    // letra + número (sem especial, sem length)
    expect(passwordStrength(getPasswordChecks('abc1'))).toBe(1)
  })

  it('devolve 2 quando exatamente 3 regras passam', () => {
    // letra + número + especial (sem length)
    expect(passwordStrength(getPasswordChecks('abc1!'))).toBe(2)
  })

  it('devolve 3 quando todas as 4 regras passam', () => {
    expect(passwordStrength(getPasswordChecks('MinhaPass1!'))).toBe(3)
  })
})
