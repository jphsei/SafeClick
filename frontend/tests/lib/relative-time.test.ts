import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { tempoRelativo } from '@/lib/relative-time'

describe('tempoRelativo', () => {
  // Fixar "now" para os testes serem determinísticos
  const NOW = new Date('2025-06-15T12:00:00.000Z').getTime()

  beforeAll(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  it('aceita string ISO 8601', () => {
    const past = new Date(NOW - 60 * 1000).toISOString() // 1 min atrás
    expect(typeof tempoRelativo(past)).toBe('string')
  })

  it('aceita objecto Date', () => {
    const past = new Date(NOW - 60 * 1000)
    expect(typeof tempoRelativo(past)).toBe('string')
  })

  it('"há 5 minutos" para 5 min no passado', () => {
    const past = new Date(NOW - 5 * 60 * 1000)
    const txt = tempoRelativo(past)
    expect(txt).toMatch(/há\s+5\s+minutos/i)
  })

  it('"há 1 minuto" para 1 min no passado (singular)', () => {
    const past = new Date(NOW - 60 * 1000)
    const txt = tempoRelativo(past)
    expect(txt).toMatch(/há\s+1\s+minuto/i)
    expect(txt).not.toMatch(/minutos/i)
  })

  it('"há 2 horas" para 2h no passado', () => {
    const past = new Date(NOW - 2 * 60 * 60 * 1000)
    const txt = tempoRelativo(past)
    expect(txt).toMatch(/há\s+2\s+horas/i)
  })

  it('"há 1 hora" para 1h no passado (singular)', () => {
    const past = new Date(NOW - 60 * 60 * 1000)
    const txt = tempoRelativo(past)
    expect(txt).toMatch(/há\s+1\s+hora/i)
    expect(txt).not.toMatch(/horas/i)
  })

  it('"há 3 dias" para 3 dias no passado', () => {
    const past = new Date(NOW - 3 * 24 * 60 * 60 * 1000)
    const txt = tempoRelativo(past)
    expect(txt).toMatch(/há\s+3\s+dias/i)
  })

  it('"há 1 dia" para 1 dia no passado (singular)', () => {
    const past = new Date(NOW - 24 * 60 * 60 * 1000)
    const txt = tempoRelativo(past)
    // pt-PT pode usar "ontem" (numeric: 'auto') OU "há 1 dia". Aceitar ambos.
    expect(txt).toMatch(/há\s+1\s+dia|ontem/i)
    expect(txt).not.toMatch(/\bdias\b/i)
  })

  it('escolhe a unidade maior apropriada (não diz "há 120 minutos" para 2h)', () => {
    const past = new Date(NOW - 2 * 60 * 60 * 1000)
    const txt = tempoRelativo(past)
    // Deve usar "horas", não "minutos"
    expect(txt).toMatch(/hora/i)
    expect(txt).not.toMatch(/minuto/i)
  })

  it('produz texto em pt-PT (não inglês)', () => {
    const past = new Date(NOW - 5 * 60 * 1000)
    const txt = tempoRelativo(past)
    expect(txt).not.toMatch(/ago/i)
    expect(txt).toMatch(/há/i)
  })

  it('lida com tempo no futuro (não rebenta)', () => {
    const future = new Date(NOW + 60 * 1000)
    expect(() => tempoRelativo(future)).not.toThrow()
    const txt = tempoRelativo(future)
    expect(typeof txt).toBe('string')
  })

  it('contrato: input inválido devolve string vazia (não rebenta)', () => {
    // Contrato definido em relative-time.ts: caller decide o fallback.
    expect(() => tempoRelativo('banana')).not.toThrow()
    expect(tempoRelativo('banana')).toBe('')
    expect(tempoRelativo('')).toBe('')
    expect(tempoRelativo(new Date(NaN))).toBe('')
  })
})
