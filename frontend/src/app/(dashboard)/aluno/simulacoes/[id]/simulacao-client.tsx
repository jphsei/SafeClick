'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Mail,
  AlertTriangle,
  ShieldCheck,
  ShieldX,
  Loader2,
  ExternalLink,
  Info,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { type EstadoSimulacao } from '@/lib/types/database.types'

interface SimulacaoClientProps {
  simulacaoId: string
  titulo: string
  assuntoEmail: string
  corpoEmail: string
  remetenteFalso: string
  urlFalso: string | null
  pistas: string[] | null
  pontosSucesso: number
  tentativaAnterior: { estado: EstadoSimulacao; pontos_ganhos: number } | null
}

type Fase = 'email' | 'resultado'

export function SimulacaoClient({
  simulacaoId,
  assuntoEmail,
  corpoEmail,
  remetenteFalso,
  urlFalso,
  pistas,
  pontosSucesso,
  tentativaAnterior,
}: SimulacaoClientProps) {
  const router = useRouter()
  const supabase = createClient()

  const [fase, setFase] = useState<Fase>(tentativaAnterior ? 'resultado' : 'email')
  const [decisao, setDecisao] = useState<EstadoSimulacao | null>(tentativaAnterior?.estado ?? null)
  const [loading, setLoading] = useState(false)

  // `inicio` mede quanto tempo o aluno demorou a decidir.
  // Em ref (não state) porque é só usado em event handlers — não precisa de
  // re-render. Inicializado num useEffect para não chamar Date.now() durante
  // o render (React 19 purity rule).
  const inicioRef = useRef<number>(0)
  useEffect(() => {
    inicioRef.current = Date.now()
  }, [])

  async function handleDecisao(estado: EstadoSimulacao) {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const tempoDecisao = Math.round((Date.now() - inicioRef.current) / 1000)
    const pontosGanhos = estado === 'reportou' ? pontosSucesso : 0

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('tentativas_simulacao') as any).insert({
      simulacao_id: simulacaoId,
      aluno_id: user.id,
      estado,
      pontos_ganhos: pontosGanhos,
      tempo_decisao: tempoDecisao,
    })

    if (pontosGanhos > 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).rpc('fn_atualizar_pontos', {
          p_utilizador_id: user.id,
          p_pontos: pontosGanhos,
        })
      } catch {
        // silently ignore
      }
    }

    // Check and award badges
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('fn_verificar_badges', { p_aluno_id: user.id })
    } catch {
      // silently ignore
    }

    setDecisao(estado)
    setFase('resultado')
    setLoading(false)
    router.refresh()
  }

  // ─── EMAIL VIEW ──────────────────────────────────────────────────────────
  if (fase === 'email') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Warning */}
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Simulação de segurança.</span> Analisa o email abaixo e
            decide como reagires.
          </p>
        </div>

        {/* Fake email */}
        <Card className="overflow-hidden">
          {/* Email header */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-200">
                <Mail className="h-5 w-5 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{remetenteFalso}</p>
                    <p className="text-xs text-slate-500">Para: mim</p>
                  </div>
                  <p className="text-xs text-slate-400 flex-shrink-0">Agora</p>
                </div>
                <p className="font-semibold text-slate-800 mt-2">{assuntoEmail}</p>
              </div>
            </div>
          </div>

          {/* Email body */}
          <CardContent className="pt-6">
            <div
              className="text-slate-700 leading-relaxed text-sm [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-2 [&_p]:mb-3 [&_a]:text-blue-600 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1 [&_strong]:font-semibold [&_b]:font-semibold"
              dangerouslySetInnerHTML={{ __html: corpoEmail }}
            />

            {urlFalso && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                <ExternalLink className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span className="text-sm text-blue-800 font-mono break-all">{urlFalso}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action buttons */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-700 mb-4 text-center">
              O que fazes com este email?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                onClick={() => handleDecisao('reportou')}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 flex-col h-auto py-4"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-5 w-5" />
                )}
                <span className="mt-1 text-xs">Reportar como phishing</span>
              </Button>
              <Button
                onClick={() => handleDecisao('ignorou')}
                disabled={loading}
                variant="outline"
                className="flex-col h-auto py-4"
              >
                <span className="text-lg">🗑️</span>
                <span className="mt-1 text-xs">Ignorar / Apagar</span>
              </Button>
              <Button
                onClick={() => handleDecisao('clicou')}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 flex-col h-auto py-4"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ExternalLink className="h-5 w-5" />
                )}
                <span className="mt-1 text-xs">Clicar no link</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── RESULTADO ───────────────────────────────────────────────────────────
  const resultadoInfo = {
    reportou: {
      titulo: 'Correto! Identificaste o phishing!',
      desc: 'Excelente! Reportaste este email como phishing. Na vida real, isto protege-te e ajuda a alertar outros utilizadores.',
      icon: <ShieldCheck className="h-8 w-8 text-green-600" />,
      bg: 'bg-green-50 border-green-200',
      pontos: pontosSucesso,
    },
    ignorou: {
      titulo: 'Quase! Ignorar é melhor que clicar.',
      desc: 'Fizeste bem em não clicar, mas o ideal seria reportar o email como phishing para alertar o teu provedor de email.',
      icon: <AlertTriangle className="h-8 w-8 text-yellow-600" />,
      bg: 'bg-yellow-50 border-yellow-200',
      pontos: 0,
    },
    clicou: {
      titulo: 'Cuidado! Clicaste num link perigoso.',
      desc: 'Num cenário real, clicar neste link poderia comprometer os teus dados. Aprende as pistas abaixo para estares mais preparado.',
      icon: <ShieldX className="h-8 w-8 text-red-600" />,
      bg: 'bg-red-50 border-red-200',
      pontos: 0,
    },
  }

  const infoKey =
    decisao === 'reportou' || decisao === 'ignorou' || decisao === 'clicou'
      ? decisao
      : ('ignorou' as const)
  const info = resultadoInfo[infoKey]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Result card */}
      <Card className={`border ${info.bg}`}>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">{info.icon}</div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-lg">{info.titulo}</h3>
              <p className="text-slate-600 mt-1 text-sm leading-relaxed">{info.desc}</p>
              {info.pontos > 0 && (
                <p className="mt-3 text-green-700 font-semibold">+{info.pontos} pontos ganhos!</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pistas */}
      {pistas && pistas.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-blue-600" />
              <p className="font-semibold text-slate-900 text-sm">
                Como identificar que era phishing
              </p>
            </div>
            <ul className="space-y-2">
              {pistas.map((pista, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 mt-0.5">
                    {i + 1}
                  </span>
                  {pista}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Email original para revisão */}
      <details className="group">
        <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 font-medium list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
          Ver email original
        </summary>
        <Card className="mt-3">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
            <p className="font-semibold text-slate-800 text-sm">{assuntoEmail}</p>
            <p className="text-xs text-slate-500">De: {remetenteFalso}</p>
          </div>
          <CardContent className="pt-4">
            <div
              className="text-slate-700 leading-relaxed text-sm [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_p]:mb-2 [&_strong]:font-semibold [&_b]:font-semibold"
              dangerouslySetInnerHTML={{ __html: corpoEmail }}
            />
            {urlFalso && (
              <p className="mt-3 text-xs font-mono text-slate-500 bg-slate-50 px-3 py-2 rounded border border-slate-200 break-all">
                {urlFalso}
              </p>
            )}
          </CardContent>
        </Card>
      </details>

      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={() => {
            setFase('email')
            setDecisao(null)
            inicioRef.current = Date.now()
          }}
        >
          Tentar novamente
        </Button>
        <Button onClick={() => router.push('/aluno/simulacoes')}>Ver simulações</Button>
      </div>
    </div>
  )
}
