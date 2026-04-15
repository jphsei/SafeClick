'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RecuperarPalavraPassePage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=/redefinir-palavra-passe`
        : '/redefinir-palavra-passe'

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    setLoading(false)

    if (resetError) {
      setError('Ocorreu um erro. Verifica o email e tenta novamente.')
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center py-2 space-y-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Email enviado!</h2>
          <p className="text-slate-600 mt-2 text-sm">
            Se existir uma conta com o email <strong>{email}</strong>, receberás um
            link para redefinir a palavra-passe.
          </p>
          <p className="text-slate-400 text-xs mt-2">
            Não encontras o email? Verifica a pasta de spam.
          </p>
        </div>
        <Link href="/login">
          <Button variant="outline" className="w-full mt-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao login
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Recuperar palavra-passe</h1>
        <p className="text-sm text-slate-500 mt-1">
          Indica o teu email e enviaremos um link para redefinires a palavra-passe.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="o.teu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'A enviar...' : 'Enviar link de recuperação'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao login
        </Link>
      </div>
    </>
  )
}
