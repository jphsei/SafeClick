import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

// Geist é a font da Vercel — Carrega via `next/font/google` (auto-host,
// sem pedidos a Google Fonts em runtime). As variáveis CSS são depois
// usadas pelo Tailwind (`--font-sans` e `--font-mono` em globals.css).
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SafeClick - Cibersegurança para Escolas',
  description:
    'Plataforma de sensibilização em cibersegurança para escolas portuguesas. Aprende a navegar em segurança com módulos interativos, quizzes e simulações.',
  keywords: ['cibersegurança', 'segurança online', 'escolas', 'Portugal', 'e-learning'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased bg-slate-50 text-slate-900 font-sans">{children}</body>
    </html>
  )
}

// CSP nonce do middleware so funciona em pages dynamic.
// Sem isto, scripts inline gerados em build-time tem nonce diferente do runtime,
// e o browser bloqueia todos (sintoma: forms desabilitados em producao).
export const dynamic = 'force-dynamic'
