/**
 * Política de palavras-passe — uma única fonte de verdade.
 *
 * Antes deste módulo, o registo exigia 10+ caracteres com letra, número
 * e caractere especial; o reset apenas exigia 6+ caracteres. Isto deixava
 * a porta aberta a contornar a política forte via "esqueci a password".
 *
 * Agora ambos os fluxos usam `validatePassword` para garantir as mesmas
 * regras, e podem partilhar `getPasswordChecks` + `passwordStrength` para
 * o feedback visual em tempo real.
 */

/** Caracteres aceites como "especiais" para fins da política. */
export const SPECIAL_CHAR_RE = /[!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|`~]/

/** Comprimento mínimo da palavra-passe. */
export const MIN_PASSWORD_LENGTH = 10

/** Estado individual de cada regra (para feedback visual). */
export interface PasswordChecks {
  length:  { ok: boolean; label: string }
  letter:  { ok: boolean; label: string }
  number:  { ok: boolean; label: string }
  special: { ok: boolean; label: string }
}

/**
 * Avalia uma palavra-passe contra cada regra individualmente.
 * Útil para UIs em tempo real (barra de força, lista de checkmarks).
 */
export function getPasswordChecks(pw: string): PasswordChecks {
  return {
    length:  { ok: pw.length >= MIN_PASSWORD_LENGTH, label: `Mínimo ${MIN_PASSWORD_LENGTH} caracteres` },
    // `\p{L}` (Unicode letter) em vez de `[a-zA-Z]` para aceitar
    // letras acentuadas pt-PT (á, é, í, ó, ú, ç, ã, õ, ...).
    letter:  { ok: /\p{L}/u.test(pw),                label: 'Pelo menos uma letra' },
    number:  { ok: /[0-9]/.test(pw),                 label: 'Pelo menos um número' },
    special: { ok: SPECIAL_CHAR_RE.test(pw),         label: 'Pelo menos um carácter especial (!@#$…)' },
  }
}

/** Força da palavra-passe: 0 (fraca) a 3 (forte). */
export type PasswordStrength = 0 | 1 | 2 | 3

export const STRENGTH_LABELS: readonly string[] = ['Fraca', 'Razoável', 'Boa', 'Forte']
export const STRENGTH_COLORS: readonly string[] = ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500']

/** Calcula a força com base no número de regras cumpridas. */
export function passwordStrength(checks: PasswordChecks): PasswordStrength {
  const n = Object.values(checks).filter((c) => c.ok).length
  if (n <= 1) return 0
  if (n === 2) return 1
  if (n === 3) return 2
  return 3
}

/** Resultado da validação completa. */
export interface PasswordValidationResult {
  valid: boolean
  /** Mensagens de erro em pt-PT, prontas para apresentar ao utilizador. */
  errors: string[]
}

/**
 * Valida uma palavra-passe contra TODAS as regras da política.
 * Devolve `{ valid: true }` se cumpre tudo, ou `{ valid: false, errors: [...] }`
 * com a lista de regras falhadas.
 *
 * Esta função é a única que decide se uma palavra-passe é aceite — usar
 * em `signUp`, `reset`, e qualquer outro fluxo que defina nova password.
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`A palavra-passe deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
  }
  if (!/\p{L}/u.test(password)) {
    errors.push('A palavra-passe deve conter pelo menos uma letra.')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('A palavra-passe deve conter pelo menos um número.')
  }
  if (!SPECIAL_CHAR_RE.test(password)) {
    errors.push('A palavra-passe deve conter pelo menos um carácter especial (!@#$%…).')
  }

  return { valid: errors.length === 0, errors }
}
