'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, ChevronRight, Loader2, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Opcao = { id: string; texto: string; correta: boolean; ordem: number }
type Pergunta = {
  id: string
  enunciado: string
  tipo: string
  pontos: number
  ordem: number
  opcoes: Opcao[]
}

interface QuizClientProps {
  quizId: string
  titulo: string
  descricao: string | null
  pontuacaoMaxima: number
  tempoLimiteMinutos: number | null
  tentativasMax: number
  tentativasFeitas: number
  tentativasRestantes: number
  perguntas: Pergunta[]
  tentativaAnterior: { nota: number | null; pontos_ganhos: number } | null
}

type Fase = 'intro' | 'quiz' | 'resultado'

export function QuizClient({
  quizId,
  titulo,
  descricao,
  pontuacaoMaxima,
  tempoLimiteMinutos,
  tentativasMax,
  tentativasFeitas,
  tentativasRestantes,
  perguntas,
  tentativaAnterior,
}: QuizClientProps) {
  const router = useRouter()
  const supabase = createClient()

  const [fase, setFase] = useState<Fase>('intro')
  const [respostas, setRespostas] = useState<Record<string, string>>({}) // perguntaId -> opcaoId
  const [submitting, setSubmitting] = useState(false)
  const [tentativasUsadas, setTentativasUsadas] = useState(tentativasFeitas)
  const [resultado, setResultado] = useState<{
    nota: number
    pontosGanhos: number
    corretas: number
    total: number
    detalhes: { perguntaId: string; correta: boolean }[]
  } | null>(null)

  const [tempoRestante, setTempoRestante] = useState<number | null>(
    tempoLimiteMinutos ? tempoLimiteMinutos * 60 : null
  )

  const handleSubmit = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }

    // Calculate results
    let corretas = 0
    let pontosGanhos = 0
    const detalhes: { perguntaId: string; correta: boolean }[] = []

    for (const pergunta of perguntas) {
      const opcaoSelecionadaId = respostas[pergunta.id]
      const opcaoCorreta = pergunta.opcoes.find((o) => o.correta)
      const acertou = opcaoSelecionadaId === opcaoCorreta?.id

      if (acertou) {
        corretas++
        pontosGanhos += pergunta.pontos
      }
      detalhes.push({ perguntaId: pergunta.id, correta: acertou })
    }

    const nota = perguntas.length > 0 ? (corretas / perguntas.length) * 100 : 0

    // Save tentativa (type cast needed for supabase-js v2.99 compatibility)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tentativa } = await (supabase.from('tentativas_quiz') as any)
      .insert({
        quiz_id: quizId,
        aluno_id: user.id,
        nota,
        pontos_ganhos: pontosGanhos,
        concluido: true,
        concluido_em: new Date().toISOString(),
      })
      .select('id')
      .single()

    // Save respostas
    if (tentativa?.id) {
      const respostasInsert = perguntas
        .filter((p) => respostas[p.id])
        .map((p) => {
          const opcaoSelecionadaId = respostas[p.id]
          const opcaoCorreta = p.opcoes.find((o) => o.correta)
          return {
            tentativa_id: tentativa.id,
            pergunta_id: p.id,
            opcao_id: opcaoSelecionadaId,
            correta: opcaoSelecionadaId === opcaoCorreta?.id,
          }
        })

      if (respostasInsert.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('respostas_tentativa') as any).insert(respostasInsert)
      }

      // Update user points
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
    }

    // Check and award badges
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('fn_verificar_badges', { p_aluno_id: user.id })
    } catch {
      // silently ignore
    }

    setTentativasUsadas((prev) => prev + 1)
    setResultado({ nota, pontosGanhos, corretas, total: perguntas.length, detalhes })
    setFase('resultado')
    setSubmitting(false)
    router.refresh()
  }, [supabase, quizId, perguntas, respostas, submitting, router])

  // Timer countdown
  useEffect(() => {
    if (fase !== 'quiz' || tempoRestante === null) return
    if (tempoRestante <= 0) {
      handleSubmit()
      return
    }
    const timer = setTimeout(() => setTempoRestante((t) => (t !== null ? t - 1 : null)), 1000)
    return () => clearTimeout(timer)
  }, [fase, tempoRestante, handleSubmit])

  const formatTempo = (segundos: number) => {
    const m = Math.floor(segundos / 60)
    const s = segundos % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const todasRespondidas = perguntas.every((p) => respostas[p.id])

  // ─── INTRO ───────────────────────────────────────────────────────────────
  if (fase === 'intro') {
    const restantes = Math.max(0, tentativasMax - tentativasUsadas)
    const esgotado = restantes === 0

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl mx-auto ${esgotado ? 'bg-slate-100' : 'bg-blue-100'}`}>
              {esgotado ? <Lock className="h-8 w-8 text-slate-400" /> : <span className="text-3xl">📝</span>}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{titulo}</h2>
              {descricao && <p className="text-slate-500 mt-1">{descricao}</p>}
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-slate-500 flex-wrap">
              <span>{perguntas.length} perguntas</span>
              <span>·</span>
              <span>{pontuacaoMaxima} pontos máx.</span>
              {tempoLimiteMinutos && (
                <>
                  <span>·</span>
                  <span>{tempoLimiteMinutos} min</span>
                </>
              )}
              <span>·</span>
              <span className={restantes === 0 ? 'text-red-500 font-medium' : ''}>
                {tentativasUsadas}/{tentativasMax} tentativas usadas
              </span>
            </div>
            {tentativaAnterior && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
                <span className="text-slate-500">Melhor resultado: </span>
                <span className="font-semibold text-slate-900">
                  {Math.round(tentativaAnterior.nota ?? 0)}% · {tentativaAnterior.pontos_ganhos} pts
                </span>
              </div>
            )}
            {esgotado ? (
              <p className="text-sm text-slate-500">
                Atingiste o limite de {tentativasMax} tentativas para este quiz.
              </p>
            ) : (
              <Button onClick={() => setFase('quiz')} size="lg" className="w-full sm:w-auto">
                {tentativaAnterior ? `Tentar novamente (${restantes} restante${restantes !== 1 ? 's' : ''})` : 'Começar quiz'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── RESULTADO ───────────────────────────────────────────────────────────
  if (fase === 'resultado' && resultado) {
    const aprovado = resultado.nota >= 50
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className={aprovado ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="text-5xl">{aprovado ? '🎉' : '💪'}</div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {aprovado ? 'Parabéns!' : 'Continua a tentar!'}
              </h2>
              <p className="text-slate-500 mt-1">
                {resultado.corretas} de {resultado.total} respostas corretas
              </p>
            </div>
            <div className="flex items-center justify-center gap-8">
              <div>
                <p className="text-3xl font-bold text-slate-900">
                  {Math.round(resultado.nota)}%
                </p>
                <p className="text-sm text-slate-500">nota</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600">
                  +{resultado.pontosGanhos}
                </p>
                <p className="text-sm text-slate-500">pontos</p>
              </div>
            </div>
            <div className="flex gap-2 justify-center">
              {tentativasUsadas < tentativasMax && (
                <Button onClick={() => { setFase('intro'); setRespostas({}) }} variant="outline">
                  Tentar novamente
                </Button>
              )}
              <Button onClick={() => router.push('/aluno/quizzes')}>
                Ver todos os quizzes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Respostas detalhadas */}
        <div className="space-y-3">
          {perguntas.map((pergunta) => {
            const detalhe = resultado.detalhes.find((d) => d.perguntaId === pergunta.id)
            const opcaoSelecionada = pergunta.opcoes.find((o) => o.id === respostas[pergunta.id])
            const opcaoCorreta = pergunta.opcoes.find((o) => o.correta)

            return (
              <Card key={pergunta.id} className={detalhe?.correta ? 'border-green-200' : 'border-red-200'}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    {detalhe?.correta ? (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm">{pergunta.enunciado}</p>
                      {!detalhe?.correta && (
                        <div className="mt-2 space-y-1 text-xs">
                          {opcaoSelecionada && opcaoSelecionada.id !== opcaoCorreta?.id && (
                            <p className="text-red-600">
                              A tua resposta: {opcaoSelecionada.texto}
                            </p>
                          )}
                          <p className="text-green-600 font-medium">
                            Resposta correta: {opcaoCorreta?.texto ?? '—'}
                          </p>
                        </div>
                      )}
                    </div>
                    <span className="flex-shrink-0 text-xs font-medium text-slate-400">
                      {pergunta.pontos} pts
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── QUIZ ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {Object.keys(respostas).length} de {perguntas.length} respondidas
        </p>
        {tempoRestante !== null && (
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
              tempoRestante < 60 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}
          >
            <Clock className="h-4 w-4" />
            {formatTempo(tempoRestante)}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-blue-600 transition-all"
          style={{
            width: `${(Object.keys(respostas).length / perguntas.length) * 100}%`,
          }}
        />
      </div>

      {/* Questions */}
      <div className="space-y-5">
        {perguntas.map((pergunta, idx) => (
          <Card key={pergunta.id}>
            <CardContent className="pt-5">
              <div className="flex items-start gap-3 mb-4">
                <span className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {idx + 1}
                </span>
                <p className="font-medium text-slate-900 leading-relaxed">{pergunta.enunciado}</p>
              </div>

              <div className="space-y-2 ml-10">
                {pergunta.opcoes.map((opcao) => {
                  const selecionada = respostas[pergunta.id] === opcao.id
                  return (
                    <button
                      key={opcao.id}
                      onClick={() =>
                        setRespostas((prev) => ({ ...prev, [pergunta.id]: opcao.id }))
                      }
                      className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-all ${
                        selecionada
                          ? 'border-blue-500 bg-blue-50 text-blue-900 font-medium'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {opcao.texto}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <p className="text-sm text-slate-500">
          {!todasRespondidas && `Faltam ${perguntas.length - Object.keys(respostas).length} respostas`}
        </p>
        <Button
          onClick={handleSubmit}
          disabled={!todasRespondidas || submitting}
          size="lg"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          {submitting ? 'A submeter...' : 'Submeter quiz'}
        </Button>
      </div>
    </div>
  )
}
