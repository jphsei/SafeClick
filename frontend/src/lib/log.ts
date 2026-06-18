import 'server-only'
import { createHash } from 'crypto'

/**
 * Utilitários de log com redaction de PII.
 *
 * Razão: o RGPD trata logs como processamento de dados pessoais. Logs com
 * emails em texto claro são problemáticos em vários cenários:
 *   - export para SIEM/CloudWatch/Logtail (terceiros)
 *   - retenção indefinida (logs ficam para "sempre")
 *   - acesso de operadores não-DPO
 *
 * Mantemos logs úteis para debug e investigação de incidentes, mas
 * substituímos PII por formas redacted/hashed.
 */

/**
 * Mascara um email no formato `jo***@gmail.com`.
 * Útil em logs de troubleshooting onde queremos saber que provider
 * é mas não a identidade exacta.
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '<empty>'
  const at = email.indexOf('@')
  if (at < 1) return '<malformed>'
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  const visible = local.slice(0, Math.min(2, local.length))
  const stars = '*'.repeat(Math.max(1, local.length - visible.length))
  return `${visible}${stars}@${domain}`
}

/**
 * Hash determinístico de um identificador para correlacionar
 * eventos sem expor o valor original. Usado para emails, IPs, IDs
 * de sessão OTP. Mesma entrada → mesmo hash → permite correlacionar
 * tentativas, sem revelar a quem pertencem.
 *
 * SHA-256 truncado a 12 chars (48 bits): probabilidade de colisão
 * desprezável para o nosso volume e os 48 bits são suficientes
 * para procurar nos logs.
 */
export function hashId(value: string | null | undefined): string {
  if (!value) return '<empty>'
  return createHash('sha256').update(value).digest('hex').slice(0, 12)
}

/**
 * Mascara um IP preservando a rede /24 (IPv4) ou /64 (IPv6).
 * Útil para detectar padrões de ataque (múltiplas tentativas da
 * mesma rede) sem identificar o utilizador exacto.
 */
export function maskIp(ip: string | null | undefined): string {
  if (!ip || ip === 'unknown') return '<unknown>'
  if (ip.includes(':')) {
    // IPv6 — preserva os primeiros 4 grupos (/64)
    const parts = ip.split(':')
    return parts.slice(0, 4).join(':') + ':***'
  }
  // IPv4 — preserva primeiros 3 octetos (/24)
  const parts = ip.split('.')
  if (parts.length !== 4) return '<malformed>'
  return `${parts[0]}.${parts[1]}.${parts[2]}.***`
}

/**
 * Mascara um session ID (UUID típico). Mostra só os primeiros e
 * últimos 4 chars para correlacionar nos logs sem revelar o token.
 */
export function maskSessionId(id: string | null | undefined): string {
  if (!id) return '<empty>'
  if (id.length < 12) return '***'
  return `${id.slice(0, 4)}...${id.slice(-4)}`
}
