'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, Check, X, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordStrength } from '@/components/auth/password-strength'
import { validatePassword, MIN_PASSWORD_LENGTH } from '@/lib/auth/password'

type CodigoStatus = 'idle' | 'validando' | 'valido' | 'invalido'

export default function RegistoPage() {
  const router = useRouter()
  const supabase = createClient()

  const [nomeCompleto, setNomeCompleto] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [codigoTurma, setCodigoTurma] = useState('')
  const [codigoStatus, setCodigoStatus] = useState<CodigoStatus>('idle')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estado de validação em tempo real para o botão de submit ficar
  // desativado enquanto a password não cumprir todas as regras.
  const passwordValid = validatePassword(password).valid

  // ── Live class code validation (debounced 600 ms) ─────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const code = codigoTurma.trim()

    if (!code) {
      setCodigoStatus('idle')
      return
    }

    setCodigoStatus('validando')

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('fn_validar_codigo_turma', {
        p_codigo: code,
      })
      if (error || !data) {
        setCodigoStatus('invalido')
      } else {
        setCodigoStatus('valido')
      }
    }, 600)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoTurma])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    // ── Password validation (regras em lib/auth/password.ts) ──────────────
    const passwordCheck = validatePassword(password)
    if (!passwordCheck.valid) {
      // Mostra o primeiro erro — os restantes já aparecem em tempo real
      // através do componente <PasswordStrength>.
      setError(passwordCheck.errors[0])
      return
    }
    if (password !== confirmarPassword) {
      setError('As palavras-passe não coincidem.')
      return
    }

    // ── Class code validation (if provided) ───────────────────────────────
    const codigoFinal = codigoTurma.trim()
    if (codigoFinal) {
      if (codigoStatus === 'validando') {
        setError('Aguarda a validação do código de turma.')
        return
      }
      if (codigoStatus === 'invalido') {
        setError('O código de turma é inválido. Verifica com o teu professor.')
        return
      }
    }

    setLoading(true)

    try {
      // ── 1. Create account ────────────────────────────────────────────────
      // O frontend NÃO decide o papel. A decisão é exclusivamente do
      // trigger fn_novo_utilizador, que força sempre 'aluno' no signup
      // público (papel só é settable via raw_app_meta_data, e este
      // endpoint não aceita app_metadata). Ver migration
      // 20260617000002_use_app_metadata_for_papel.sql.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome_completo: nomeCompleto,
          },
        },
      })

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          setError('Já existe uma conta com este email.')
        } else if (signUpError.message.includes('Password should be')) {
          setError('A palavra-passe não cumpre os requisitos mínimos.')
        } else {
          setError(`Erro: ${signUpError.message}`)
        }
        return
      }

      if (!data.user) return

      // ── 2. Enroll in turma (if code provided) ────────────────────────────
      if (codigoFinal) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).rpc('fn_inscrever_por_codigo', {
          p_codigo: codigoFinal,
        })
        // If enrollment fails (race condition / code deactivated between validation and signup),
        // we still proceed — the user has an account and can be added to a class later.
      }

      router.push('/aluno')
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
        {/* Nome */}
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

        {/* Email */}
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

        {/* Class code — optional */}
        <div className="space-y-1.5">
          <Label htmlFor="codigoTurma">
            Código de turma <span className="text-slate-400 font-normal">(opcional)</span>
          </Label>
          <div className="relative">
            <Input
              id="codigoTurma"
              type="text"
              placeholder="Ex: ABC123"
              value={codigoTurma}
              onChange={(e) => setCodigoTurma(e.target.value.toUpperCase())}
              autoComplete="off"
              className={`pr-9 font-mono tracking-wider ${
                codigoStatus === 'valido'
                  ? 'border-green-400 focus-visible:ring-green-400'
                  : codigoStatus === 'invalido'
                    ? 'border-red-400   focus-visible:ring-red-400'
                    : ''
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {codigoStatus === 'validando' && (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              )}
              {codigoStatus === 'valido' && <Check className="h-4 w-4 text-green-600" />}
              {codigoStatus === 'invalido' && <X className="h-4 w-4 text-red-500" />}
            </div>
          </div>

          {codigoStatus === 'idle' && (
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Users className="h-3 w-3 flex-shrink-0" />
              Se o teu professor te deu um código, introduz aqui para entrares na turma.
            </p>
          )}
          {codigoStatus === 'valido' && (
            <p className="text-xs text-green-700">
              Código válido — serás inscrito na turma ao criar a conta.
            </p>
          )}
          {codigoStatus === 'invalido' && (
            <p className="text-xs text-red-600">
              Código não encontrado. Verifica com o teu professor.
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Palavra-passe</Label>
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
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <PasswordStrength password={password} />
        </div>

        {/* Confirm password */}
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
          {confirmarPassword && password !== confirmarPassword && (
            <p className="text-xs text-red-600">As palavras-passe não coincidem.</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={
            loading ||
            !passwordValid ||
            password !== confirmarPassword ||
            codigoStatus === 'validando' ||
            codigoStatus === 'invalido'
          }
        >
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
