import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SafeClick - Cibersegurança para Escolas',
  description:
    'Plataforma de sensibilização em cibersegurança para escolas portuguesas. Aprende a navegar em segurança com módulos interativos, quizzes e simulações.',
  keywords: ['cibersegurança', 'segurança online', 'escolas', 'Portugal', 'e-learning'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt">
      <body className="antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  )
}
