/**
 * Testes de `lib/auth/otp-challenge.ts` — challenge binding que
 * substituiu a IP binding (incompatível com mobile/IPv6/VPN/proxies).
 */

import { describe, it, expect } from 'vitest'
import {
  generateChallenge,
  verifyChallenge,
  OTP_CHALLENGE_COOKIE,
  OTP_CHALLENGE_MAX_AGE,
} from '@/lib/auth/otp-challenge'

describe('generateChallenge', () => {
  it('devolve challenge base64url e hash hex SHA-256', () => {
    const { challenge, challengeHash } = generateChallenge()
    // base64url: a-z A-Z 0-9 - _ (sem +/=)
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/)
    // 32 bytes em base64url ≈ 43 chars sem padding
    expect(challenge.length).toBe(43)
    // SHA-256 hex = 64 chars
    expect(challengeHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('gera valores distintos em chamadas consecutivas', () => {
    const a = generateChallenge()
    const b = generateChallenge()
    expect(a.challenge).not.toBe(b.challenge)
    expect(a.challengeHash).not.toBe(b.challengeHash)
  })
})

describe('verifyChallenge', () => {
  it('aceita o par gerado em conjunto', () => {
    const { challenge, challengeHash } = generateChallenge()
    expect(verifyChallenge(challenge, challengeHash)).toBe(true)
  })

  it('rejeita challenge correcto contra hash diferente', () => {
    const a = generateChallenge()
    const b = generateChallenge()
    expect(verifyChallenge(a.challenge, b.challengeHash)).toBe(false)
  })

  it('rejeita challenge inválido contra hash correcto', () => {
    const { challengeHash } = generateChallenge()
    expect(verifyChallenge('fake-challenge', challengeHash)).toBe(false)
  })

  it('rejeita null/undefined/empty', () => {
    const { challenge, challengeHash } = generateChallenge()
    expect(verifyChallenge(null, challengeHash)).toBe(false)
    expect(verifyChallenge(undefined, challengeHash)).toBe(false)
    expect(verifyChallenge('', challengeHash)).toBe(false)
    expect(verifyChallenge(challenge, null)).toBe(false)
    expect(verifyChallenge(challenge, undefined)).toBe(false)
    expect(verifyChallenge(challenge, '')).toBe(false)
  })

  it('rejeita challenge com tamanho de hash diferente (defesa contra timing oracle)', () => {
    const { challenge } = generateChallenge()
    // Hash truncado → length não bate → false sem timingSafeEqual
    expect(verifyChallenge(challenge, 'abc123')).toBe(false)
  })

  it('rejeita strings com chars não-base64url sem lançar', () => {
    const { challengeHash } = generateChallenge()
    expect(verifyChallenge('not!valid@base64', challengeHash)).toBe(false)
  })
})

describe('constantes exportadas', () => {
  it('cookie tem nome namespaced', () => {
    expect(OTP_CHALLENGE_COOKIE).toBe('safeclick.otp.ch')
  })

  it('TTL é 15 min em segundos (igual ao TTL do OTP)', () => {
    expect(OTP_CHALLENGE_MAX_AGE).toBe(900)
  })
})
