'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type PapelUtilizador } from '@/lib/types/database.types'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Email ou palavra-passe incorretos.')
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Por favor, confirma o teu email antes de entrar.')
        } else {
          setError('Ocorreu um erro ao entrar. Tenta novamente.')
        }
        return
      }

      if (!data.user) {
        setError('Ocorreu um erro ao entrar. Tenta novamente.')
        return
      }

      // Fetch user role from perfis
      const { data: perfilData, error: perfilError } = await supabase
        .from('perfis')
        .select('papel')
        .eq('id', data.user.id)
        .single()

      if (perfilError || !perfilData) {
        // Default to aluno if no profile found
        router.push('/aluno')
        router.refresh()
        return
      }

      const papel = (perfilData as { papel: PapelUtilizador }).papel
      if (papel === 'professor') {
        router.push('/professor')
      } else if (papel === 'administrador') {
        router.push('/admin')
      } else {
        router.push('/aluno')
      }
      router.refresh()
    } catch {
      setError('Ocorreu um erro inesperado. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bem-vindo de volta!</h1>
        <p className="text-sm text-slate-500 mt-1">
          Entra na tua conta para continuar a aprender.
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

        <div className="space-y-1.5">
          <Label htmlFor="password">Palavra-passe</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="A tua palavra-passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'A entrar...' : 'Entrar'}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-600">
        Ainda não tens conta?{' '}
        <Link
          href="/registo"
          className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          Registar
        </Link>
      </div>
    </>
  )
}
