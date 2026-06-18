import 'server-only'
import { randomBytes, createHash, timingSafeEqual } from 'crypto'

/**
 * Challenge binding para OTP sessions.
 *
 * Substitui o IP binding (que tinha falsos positivos em IPv6
 * privacy extensions, dual-stack, mobile handover, VPNs, etc.).
 *
 * Modelo:
 *   - Login gera `challenge` (32 bytes random, base64url)
 *   - Hash SHA-256 guardado em email_otp_sessions.challenge_hash
 *   - Challenge em claro vai num cookie HttpOnly Secure SameSite=Strict
 *     (Max-Age = 15 min, igual ao TTL do OTP)
 *   - verify-otp lê o cookie, hash, compara com timing-safe equal
 *
 * Garantias:
 *   - 32 bytes = 256 bits de entropia (não brute-forceable)
 *   - HttpOnly = não acessível a JS (resiste a XSS)
 *   - Secure = só HTTPS em prod
 *   - SameSite=Strict = não é enviado em requests cross-site
 *   - timingSafeEqual = não vaza info via tempo de comparação
 */

/** Nome do cookie — namespaced para não conflituar com outros */
export const OTP_CHALLENGE_COOKIE = 'safeclick.otp.ch'

/** TTL do cookie em segundos = TTL do OTP (15 min) */
export const OTP_CHALLENGE_MAX_AGE = 15 * 60

export interface ChallengePair {
  /** Valor em claro para guardar no cookie do cliente */
  challenge: string
  /** Hash SHA-256 hex para guardar em email_otp_sessions */
  challengeHash: string
}

/**
 * Gera um par challenge/hash novo.
 * Chamar uma vez por sessão OTP (no /api/auth/login).
 */
export function generateChallenge(): ChallengePair {
  // 32 bytes = 256 bits de entropia. base64url para ser cookie-safe
  // (sem + / = que precisariam de URL-encoding).
  const buf = randomBytes(32)
  const challenge = buf.toString('base64url')
  const challengeHash = createHash('sha256').update(buf).digest('hex')
  return { challenge, challengeHash }
}

/**
 * Verifica se um challenge (do cookie) corresponde ao hash guardado.
 * Devolve `false` se inputs inválidos ou hash diferente.
 *
 * Usa `timingSafeEqual` para evitar timing attacks (importante quando
 * o hash é segredo do lado do servidor — defesa em profundidade).
 */
export function verifyChallenge(
  challenge: string | null | undefined,
  storedHash: string | null | undefined,
): boolean {
  if (!challenge || !storedHash) return false

  let receivedHash: string
  try {
    const buf = Buffer.from(challenge, 'base64url')
    receivedHash = createHash('sha256').update(buf).digest('hex')
  } catch {
    return false
  }

  // timingSafeEqual exige buffers do mesmo length
  if (receivedHash.length !== storedHash.length) return false

  try {
    return timingSafeEqual(Buffer.from(receivedHash), Buffer.from(storedHash))
  } catch {
    return false
  }
}
