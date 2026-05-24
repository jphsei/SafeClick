import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireUser } from '@/lib/auth/require-role'
import { QuizClient } from './quiz-client'

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user, supabase } = await requireUser()

  const { data: quizRaw } = await supabase
    .from('quizzes')
    .select('id, titulo, descricao, pontos_conclusao, tempo_limite, tentativas_max, modulo_id')
    .eq('id', id)
    .eq('ativo', true)
    .single()

  if (!quizRaw) notFound()

  const quiz = quizRaw as {
    id: string
    titulo: string
    descricao: string | null
    pontos_conclusao: number
    tempo_limite: number | null
    tentativas_max: number
    modulo_id: string | null
  }

  // Fetch perguntas with opcoes (sem o campo `correta` — o gabarito
  // nunca pode chegar ao cliente; a validação acontece na RPC
  // fn_submeter_quiz quando o aluno submete o quiz)
  const { data: perguntasRaw } = await supabase
    .from('perguntas')
    .select('id, enunciado, tipo, pontos, ordem, opcoes_resposta(id, texto, ordem)')
    .eq('quiz_id', id)
    .order('ordem')

  const perguntas = (perguntasRaw as {
    id: string
    enunciado: string
    tipo: string
    pontos: number
    ordem: number
    opcoes_resposta: { id: string; texto: string; ordem: number }[]
  }[])?.map((p) => ({
    ...p,
    opcoes: [...p.opcoes_resposta].sort((a, b) => a.ordem - b.ordem),
  })) ?? []

  // Fetch all completed attempts to count them and get the last one
  const { data: tentativasRaw } = await supabase
    .from('tentativas_quiz')
    .select('nota, pontos_ganhos, concluido_em')
    .eq('quiz_id', id)
    .eq('aluno_id', user.id)
    .eq('concluido', true)
    .order('concluido_em', { ascending: false })

  const tentativas = (tentativasRaw as { nota: number | null; pontos_ganhos: number; concluido_em: string }[]) ?? []
  const tentativaAnterior = tentativas[0] ?? null
  const tentativasFeitas = tentativas.length
  const tentativasRestantes = Math.max(0, quiz.tentativas_max - tentativasFeitas)

  return (
    <div className="space-y-6">
      <Link
        href="/aluno/quizzes"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos quizzes
      </Link>

      <QuizClient
        quizId={quiz.id}
        titulo={quiz.titulo}
        descricao={quiz.descricao}
        pontuacaoMaxima={quiz.pontos_conclusao}
        tempoLimiteMinutos={quiz.tempo_limite}
        tentativasMax={quiz.tentativas_max}
        tentativasFeitas={tentativasFeitas}
        tentativasRestantes={tentativasRestantes}
        perguntas={perguntas}
        tentativaAnterior={tentativaAnterior}
      />
    </div>
  )
}
