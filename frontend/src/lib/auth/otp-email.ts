import nodemailer from 'nodemailer'
import { createHash, randomInt } from 'crypto'

/** Gera um código numérico de 6 dígitos com zeros à esquerda. */
export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/** SHA-256 do código — guardado na BD em vez do código em claro. */
export function hashOtpCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

/** Verifica se o código fornecido corresponde ao hash guardado. */
export function verifyOtpCode(code: string, storedHash: string): boolean {
  return hashOtpCode(code) === storedHash
}

/** Envia o email com o código OTP via SMTP (Mailpit em dev, SMTP real em prod). */
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? '127.0.0.1',
    port: Number(process.env.SMTP_PORT ?? 54325),
    secure: false,
    // Mailpit não requer autenticação em dev
    ignoreTLS: true,
  })

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? 'noreply@safeclick.pt',
    to,
    subject: `${code} — Código de verificação SafeClick`,
    text: `O teu código de verificação SafeClick é: ${code}\n\nEste código expira em 15 minutos.\nSe não foste tu a iniciar sessão, ignora este email.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1e293b;margin-bottom:8px">Verificação em dois passos</h2>
        <p style="color:#475569;margin-bottom:24px">Usa o código abaixo para concluir o teu login na plataforma SafeClick.</p>
        <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
          <span style="font-size:36px;font-weight:700;letter-spacing:0.3em;color:#0f172a;font-family:monospace">${code}</span>
        </div>
        <p style="color:#64748b;font-size:13px">Este código expira em <strong>15 minutos</strong>.<br>Se não foste tu a iniciar sessão, ignora este email.</p>
      </div>
    `,
  })
}
