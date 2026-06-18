'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Turnstile } from '@/components/auth/turnstile'
import { type PapelUtilizador } from '@/lib/types/database.types'

type Fase = 'credenciais' | 'otp_email'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [fase, setFase] = useState<Fase>('credenciais')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Estado da fase OTP
  const [otpCode, setOtpCode] = useState('')
  const [otpSessionId, setOtpSessionId] = useState('')
  const [pendingTokens, setPendingTokens] = useState<{ access: string; refresh: string } | null>(
    null,
  )
  const [otpFailures, setOtpFailures] = useState(0)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Token do Turnstile (CAPTCHA). Em dev sem sitekey configurado o
  // widget não renderiza e o token fica vazio — o backend aceita.
  const [captchaToken, setCaptchaToken] = useState('')

  function redirectToDashboard(papel: PapelUtilizador | undefined) {
    if (papel === 'professor') router.push('/professor')
    else if (papel === 'administrador') router.push('/admin')
    else router.push('/aluno')
    router.refresh()
  }

  // ── Fase 1: credenciais ───────────────────────────────────────────────────
  async function handleCredenciais(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, captcha_token: captchaToken }),
      })

      const body = await res.json()

      if (!res.ok) {
        setError(body.error ?? 'Erro ao entrar. Tenta novamente.')
        return
      }

      if (body.requires_otp) {
        // Professor/admin — guardar tokens em memória, mostrar ecrã OTP
        setOtpSessionId(body.otp_session_id)
        setPendingTokens({ access: body.access_token, refresh: body.refresh_token })
        setFase('otp_email')
        return
      }

      // Aluno — ativar sessão diretamente
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
      })

      if (sessionError) {
        setError('Erro ao iniciar sessão. Tenta novamente.')
        return
      }

      redirectToDashboard(body.user_metadata?.papel as PapelUtilizador | undefined)
    } catch {
      setError('Ocorreu um erro inesperado. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  // ── Fase 2: verificação OTP por email ─────────────────────────────────────
  async function handleOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp_session_id: otpSessionId, code: otpCode.trim() }),
      })

      const body = await res.json()

      if (!res.ok) {
        const failures = otpFailures + 1
        setOtpFailures(failures)
        setOtpCode('')

        if (res.status === 429) {
          setError(body.error)
        } else if (failures >= 3) {
          setError('Código incorreto repetidamente. Volta a fazer login para obter um novo código.')
        } else {
          setError(body.error ?? 'Código incorreto. Verifica o teu email.')
        }
        return
      }

      // OTP verificado — ativar sessão no browser
      if (!pendingTokens) {
        setError('Sessão expirada. Volta a fazer login.')
        setFase('credenciais')
        return
      }

      const { error: sessionError, data: sessionData } = await supabase.auth.setSession({
        access_token: pendingTokens.access,
        refresh_token: pendingTokens.refresh,
      })

      if (sessionError || !sessionData.user) {
        setError('Sessão expirada. Volta a fazer login.')
        setFase('credenciais')
        return
      }

      const papel = sessionData.user.user_metadata?.papel as PapelUtilizador | undefined
      redirectToDashboard(papel)
    } catch {
      setError('Ocorreu um erro inesperado. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  // ── Ecrã OTP ──────────────────────────────────────────────────────────────
  if (fase === 'otp_email') {
    return (
      <>
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="h-5 w-5 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">Verificação por email</h1>
          </div>
          <p className="text-sm text-slate-500">
            Enviámos um código de 6 dígitos para{' '}
            <span className="font-medium text-slate-700">{email}</span>. Insere-o abaixo para
            concluir o login.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleOtp} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="otpCode">Código de verificação</Label>
            <Input
              id="otpCode"
              type="text"
              inputMode="numeric"
              placeholder="000000"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              autoComplete="one-time-code"
              className="text-center text-2xl tracking-[0.4em] font-mono"
              maxLength={6}
              autoFocus
            />
            <p className="text-xs text-slate-500">
              O código é válido durante 15 minutos. Verifica também a pasta de spam.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading || otpCode.length !== 6}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'A verificar...' : 'Verificar e entrar'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setFase('credenciais')
              setError(null)
              setOtpCode('')
              setOtpFailures(0)
              setPendingTokens(null)
            }}
            className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
          >
            Voltar ao login
          </button>
        </div>
      </>
    )
  }

  // ── Ecrã de credenciais ───────────────────────────────────────────────────
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bem-vindo de volta!</h1>
        <p className="text-sm text-slate-500 mt-1">Entra na tua conta para continuar a aprender.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleCredenciais} className="space-y-4">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Palavra-passe</Label>
            <Link
              href="/recuperar-palavra-passe"
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
            >
              Esqueci a palavra-passe
            </Link>
          </div>
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
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Cloudflare Turnstile — anti-bot. Renderiza só se sitekey
            estiver configurado (NEXT_PUBLIC_TURNSTILE_SITEKEY). */}
        <Turnstile onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} action="login" />

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
