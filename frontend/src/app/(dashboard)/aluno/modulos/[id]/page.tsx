import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BookOpen, Clock, CheckCircle, FileQuestion } from 'lucide-react'
import { requireUser } from '@/lib/auth/require-role'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type NivelDificuldade } from '@/lib/types/database.types'

const nivelLabels: Record<NivelDificuldade, string> = {
  basico: 'Básico',
  intermedio: 'Intermédio',
  avancado: 'Avançado',
}

export default async function ModuloDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user, supabase } = await requireUser()

  const { data: moduloRaw } = await supabase
    .from('modulos')
    .select('id, titulo, descricao, dificuldade, estado, pontos_conclusao, duracao_minutos')
    .eq('id', id)
    .eq('estado', 'publicado')
    .single()

  if (!moduloRaw) notFound()

  const modulo = moduloRaw as {
    id: string
    titulo: string
    descricao: string | null
    dificuldade: NivelDificuldade
    estado: string
    pontos_conclusao: number
    duracao_minutos: number | null
  }

  const { data: aulasRaw } = await supabase
    .from('aulas')
    .select('id, titulo, ordem, duracao_minutos')
    .eq('modulo_id', id)
    .order('ordem')

  const aulas = (aulasRaw as {
    id: string
    titulo: string
    ordem: number
    duracao_minutos: number | null
  }[]) ?? []

  const { data: progressoRaw } = await supabase
    .from('progresso_modulo')
    .select('aulas_concluidas, percentagem, concluido')
    .eq('aluno_id', user.id)
    .eq('modulo_id', id)
    .maybeSingle()

  const progresso = progressoRaw as {
    aulas_concluidas: string[]
    percentagem: number
    concluido: boolean
  } | null

  const { data: quizRaw } = await supabase
    .from('quizzes')
    .select('id, titulo, pontos_conclusao, tempo_limite')
    .eq('modulo_id', id)
    .eq('ativo', true)
    .maybeSingle()

  const quiz = quizRaw as {
    id: string
    titulo: string
    pontos_conclusao: number
    tempo_limite: number | null
  } | null

  const aulasConcluidas = progresso?.aulas_concluidas ?? []
  const percentagem = progresso?.percentagem ?? 0
  const totalAulas = aulas.length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/aluno/modulos"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos módulos
      </Link>

      {/* Module header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={modulo.dificuldade}>
                  {nivelLabels[modulo.dificuldade]}
                </Badge>
                {progresso?.concluido && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    <CheckCircle className="h-3 w-3" />
                    Concluído
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{modulo.titulo}</h1>
              {modulo.descricao && (
                <p className="mt-2 text-slate-500">{modulo.descricao}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                {modulo.duracao_minutos && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {modulo.duracao_minutos} min
                  </span>
                )}
                <span>{modulo.pontos_conclusao} pts ao concluir</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-3xl font-bold text-slate-900">{Math.round(percentagem)}%</p>
              <p className="text-sm text-slate-500">concluído</p>
            </div>
          </div>

          {totalAulas > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{aulasConcluidas.length} de {totalAulas} aulas</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all"
                  style={{ width: `${percentagem}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lessons */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Aulas ({totalAulas})
        </h2>

        {aulas.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhuma aula disponível neste módulo.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {aulas.map((aula) => {
              const concluida = aulasConcluidas.includes(aula.id)
              return (
                <Link
                  key={aula.id}
                  href={`/aluno/modulos/${id}/aulas/${aula.id}`}
                  className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50 hover:border-slate-300 transition-all group"
                >
                  <div className="flex-shrink-0">
                    {concluida ? (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 group-hover:bg-blue-50 transition-colors">
                        <span className="text-sm font-semibold text-slate-600 group-hover:text-blue-600">
                          {aula.ordem}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                      {aula.titulo}
                    </p>
                    {aula.duracao_minutos && (
                      <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {aula.duracao_minutos} min
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Quiz */}
      {quiz && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <FileQuestion className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">{quiz.titulo}</CardTitle>
                <CardDescription>
                  {quiz.pontos_conclusao} pontos
                  {quiz.tempo_limite && ` · ${quiz.tempo_limite} min`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Link href={`/aluno/quizzes/${quiz.id}`}>
              <Button size="sm">Fazer quiz</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
