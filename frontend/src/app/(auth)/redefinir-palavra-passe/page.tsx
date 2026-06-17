'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordStrength } from '@/components/auth/password-strength'
import { validatePassword, MIN_PASSWORD_LENGTH } from '@/lib/auth/password'
import { clearPasswordResetCookie } from './actions'

export default function RedefinirPalavraPassePage() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const passwordValid = validatePassword(password).valid

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password !== confirmar) {
      setError('As palavras-passe não coincidem.')
      return
    }

    // Mesma política que no registo — usar `validatePassword` para
    // impedir que o reset crie passwords mais fracas do que o signup.
    const passwordCheck = validatePassword(password)
    if (!passwordCheck.valid) {
      setError(passwordCheck.errors[0])
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setLoading(false)
      setError('Não foi possível redefinir a palavra-passe. O link pode ter expirado.')
      return
    }

    // Boa prática de segurança: terminar a sessão criada pelo link de
    // recovery e forçar re-login com a nova password. Garante que a
    // nova password funciona e invalida quaisquer sessões paralelas
    // (ex: se a conta tiver sido comprometida).
    await supabase.auth.signOut()

    // Limpar o cookie sentinel que estava a forçar redirect para esta
    // página (não esquecer, senão o middleware fica em loop redirect).
    await clearPasswordResetCookie()

    setLoading(false)
    setDone(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  if (done) {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Palavra-passe atualizada!</h2>
          <p className="text-slate-500 text-sm mt-2">
            A tua palavra-passe foi alterada com sucesso. A redirecionar para o login...
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nova palavra-passe</h1>
        <p className="text-sm text-slate-500 mt-1">
          Escolhe uma nova palavra-passe para a tua conta.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">Nova palavra-passe</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <PasswordStrength password={password} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmar">Confirmar palavra-passe</Label>
          <Input
            id="confirmar"
            type="password"
            placeholder="Repete a palavra-passe"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            required
            autoComplete="new-password"
          />
          {confirmar && password !== confirmar && (
            <p className="text-xs text-red-600">As palavras-passe não coincidem.</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !passwordValid || password !== confirmar}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'A guardar...' : 'Guardar nova palavra-passe'}
        </Button>
      </form>
    </>
  )
}
