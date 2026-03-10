'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type PapelUtilizador } from '@/lib/types/database.types'

export default function RegistoPage() {
  const router = useRouter()
  const supabase = createClient()

  const [nomeCompleto, setNomeCompleto] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [papel, setPapel] = useState<PapelUtilizador>('aluno')
  const [numeroAluno, setNumeroAluno] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    // Validation
    if (password !== confirmarPassword) {
      setError('As palavras-passe não coincidem.')
      return
    }

    if (password.length < 6) {
      setError('A palavra-passe deve ter pelo menos 6 caracteres.')
      return
    }

    if (papel === 'aluno' && !numeroAluno.trim()) {
      setError('O número de aluno é obrigatório.')
      return
    }

    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome_completo: nomeCompleto,
            papel,
            numero_aluno: papel === 'aluno' ? numeroAluno : null,
          },
        },
      })

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          setError('Já existe uma conta com este email.')
        } else if (signUpError.message.includes('Password should be')) {
          setError('A palavra-passe deve ter pelo menos 6 caracteres.')
        } else {
          setError(`Erro: ${signUpError.message}`)
        }
        return
      }

      if (data.user) {
        setSuccess(true)
      }
    } catch {
      setError('Ocorreu um erro inesperado. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Conta criada com sucesso!
        </h2>
        <p className="text-slate-600 mb-6">
          A tua conta foi criada. Já podes entrar na plataforma.
        </p>
        <Button onClick={() => router.push('/login')} className="w-full">
          Ir para o login
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Criar conta</h1>
        <p className="text-sm text-slate-500 mt-1">
          Regista-te para aceder à plataforma SafeClick.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="nomeCompleto">Nome completo</Label>
          <Input
            id="nomeCompleto"
            type="text"
            placeholder="O teu nome completo"
            value={nomeCompleto}
            onChange={(e) => setNomeCompleto(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

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
          <Label htmlFor="papel">Tipo de conta</Label>
          <select
            id="papel"
            value={papel}
            onChange={(e) => setPapel(e.target.value as PapelUtilizador)}
            className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
          >
            <option value="aluno">Aluno</option>
            <option value="professor">Professor</option>
          </select>
        </div>

        {papel === 'aluno' && (
          <div className="space-y-1.5">
            <Label htmlFor="numeroAluno">Número de aluno</Label>
            <Input
              id="numeroAluno"
              type="text"
              placeholder="Ex: 22405828"
              value={numeroAluno}
              onChange={(e) => setNumeroAluno(e.target.value)}
              required={papel === 'aluno'}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="password">Palavra-passe</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
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
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmarPassword">Confirmar palavra-passe</Label>
          <Input
            id="confirmarPassword"
            type="password"
            placeholder="Repete a palavra-passe"
            value={confirmarPassword}
            onChange={(e) => setConfirmarPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'A criar conta...' : 'Criar conta'}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-600">
        Já tens conta?{' '}
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          Entrar
        </Link>
      </div>
    </>
  )
}
