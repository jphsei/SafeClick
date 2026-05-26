/**
 * Tempo relativo em pt-PT — "há 2 minutos", "há 3 horas", "há 5 dias".
 *
 * Usa `Intl.RelativeTimeFormat` nativo do browser/Node (sem dep extra).
 *
 * @param input  Data (objecto Date ou string ISO 8601)
 * @returns       Texto formatado em pt-PT, ex: "há 2 horas"
 */
export function tempoRelativo(input: string | Date): string {
  const now = Date.now()
  const target = typeof input === 'string' ? new Date(input).getTime() : input.getTime()
  const diffSeconds = Math.round((target - now) / 1000)

  const formatter = new Intl.RelativeTimeFormat('pt-PT', { numeric: 'auto' })

  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year',    60 * 60 * 24 * 365],
    ['month',   60 * 60 * 24 * 30],
    ['week',    60 * 60 * 24 * 7],
    ['day',     60 * 60 * 24],
    ['hour',    60 * 60],
    ['minute',  60],
    ['second',  1],
  ]

  for (const [unit, secondsInUnit] of ranges) {
    const value = Math.abs(diffSeconds) / secondsInUnit
    if (value >= 1 || unit === 'second') {
      return formatter.format(Math.round(diffSeconds / secondsInUnit), unit)
    }
  }

  return formatter.format(0, 'second')
}
