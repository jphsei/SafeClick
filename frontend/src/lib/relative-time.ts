/**
 * Tempo relativo em pt-PT — "há 2 minutos", "há 3 horas", "há 5 dias".
 *
 * Usa `Intl.RelativeTimeFormat` nativo do browser/Node (sem dep extra).
 *
 * Contrato:
 *   - Inputs válidos (Date ou string ISO 8601) → texto formatado pt-PT
 *   - Inputs inválidos (string lixo, NaN, Date inválido) → **string vazia**
 *     (caller decide o fallback — ex: "—", esconder o elemento, etc.)
 *
 * @param input  Data (objecto Date ou string ISO 8601)
 * @returns       Texto formatado em pt-PT, ex: "há 2 horas", OU "" se inválido
 */
export function tempoRelativo(input: string | Date): string {
  const target = typeof input === 'string' ? new Date(input).getTime() : input.getTime()

  // Defensive: se a data for inválida, devolver string vazia em vez de
  // lançar erro ou produzir output absurdo ("Invalid Date").
  if (!Number.isFinite(target)) return ''

  const now = Date.now()
  const diffSeconds = Math.round((target - now) / 1000)

  const formatter = new Intl.RelativeTimeFormat('pt-PT', { numeric: 'auto' })

  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ]

  for (const [unit, secondsInUnit] of ranges) {
    const value = Math.abs(diffSeconds) / secondsInUnit
    if (value >= 1 || unit === 'second') {
      return formatter.format(Math.round(diffSeconds / secondsInUnit), unit)
    }
  }

  return formatter.format(0, 'second')
}
