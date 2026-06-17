import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-lg group-hover:bg-blue-700 transition-colors">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <div className="text-2xl font-extrabold text-white">SafeClick</div>
              <div className="text-xs text-slate-400">Cibersegurança para Escolas</div>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white shadow-2xl p-8">{children}</div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          &copy; {new Date().getFullYear()} SafeClick &mdash; Universidade Lusófona CUP
        </p>
      </div>
    </div>
  )
}
