import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BookOpen, Clock, CheckCircle } from 'lucide-react'
import { requireUser } from '@/lib/auth/require-role'
import { Card, CardContent } from '@/components/ui/card'
import { ConcluirAulaButton } from './concluir-aula-button'

export default async function AulaPage({
  params,
}: {
  params: Promise<{ id: string; aulaId: string }>
}) {
  const { id, aulaId } = await params
  const { user, supabase } = await requireUser()

  const { data: aulaRaw } = await supabase
    .from('aulas')
    .select('id, titulo, conteudo, ordem, duracao_minutos, modulo_id')
    .eq('id', aulaId)
    .eq('modulo_id', id)
    .eq('ativo', true)
    .single()

  if (!aulaRaw) notFound()

  const aula = aulaRaw as {
    id: string
    titulo: string
    conteudo: string | null
    ordem: number
    duracao_minutos: number | null
    modulo_id: string
  }

  const { data: todasAulasRaw } = await supabase
    .from('aulas')
    .select('id, titulo, ordem')
    .eq('modulo_id', id)
    .eq('ativo', true)
    .order('ordem')

  const todasAulas =
    (todasAulasRaw as { id: string; titulo: string; ordem: number }[]) ?? []
  const currentIndex = todasAulas.findIndex((a) => a.id === aulaId)
  const prevAula = currentIndex > 0 ? todasAulas[currentIndex - 1] : null
  const nextAula =
    currentIndex < todasAulas.length - 1 ? todasAulas[currentIndex + 1] : null

  const { data: moduloRaw } = await supabase
    .from('modulos')
    .select('titulo, pontos_conclusao')
    .eq('id', id)
    .single()

  const moduloTitulo = (moduloRaw as { titulo: string; pontos_conclusao: number } | null)?.titulo ?? 'Módulo'
  const pontosConclusao = (moduloRaw as { titulo: string; pontos_conclusao: number } | null)?.pontos_conclusao ?? 0

  // Check if lesson is already completed
  const { data: progressoRaw } = await supabase
    .from('progresso_modulo')
    .select('aulas_concluidas')
    .eq('aluno_id', user.id)
    .eq('modulo_id', id)
    .maybeSingle()

  const aulasConcluidas = (progressoRaw as { aulas_concluidas: string[] } | null)?.aulas_concluidas ?? []
  const jaConcluida = aulasConcluidas.includes(aulaId)
  const totalAulas = todasAulas.length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
        <Link href="/aluno/modulos" className="hover:text-slate-700 transition-colors">
          Módulos
        </Link>
        <span>/</span>
        <Link
          href={`/aluno/modulos/${id}`}
          className="hover:text-slate-700 transition-colors max-w-[160px] truncate"
        >
          {moduloTitulo}
        </Link>
        <span>/</span>
        <span className="text-slate-700 max-w-[160px] truncate">{aula.titulo}</span>
      </div>

      {/* Lesson header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <BookOpen className="h-4 w-4" />
            <span>Aula {aula.ordem} de {totalAulas}</span>
            {aula.duracao_minutos && (
              <>
                <span>·</span>
                <Clock className="h-4 w-4" />
                <span>{aula.duracao_minutos} min</span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{aula.titulo}</h1>
        </div>
        {jaConcluida && (
          <span className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700">
            <CheckCircle className="h-4 w-4" />
            Concluída
          </span>
        )}
      </div>

      {/* Content */}
      <Card>
        <CardContent className="pt-6">
          {aula.conteudo ? (
            <div className="prose prose-slate max-w-none">
              <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                {aula.conteudo}
              </p>
            </div>
          ) : (
            <div className="text-center py-10">
              <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">
                O conteúdo desta aula ainda não está disponível.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mark complete */}
      {!jaConcluida && (
        <ConcluirAulaButton
          aulaId={aulaId}
          totalAulas={totalAulas}
          aulasConcluidas={aulasConcluidas}
          pontosConclusao={pontosConclusao}
          nextAulaHref={nextAula ? `/aluno/modulos/${id}/aulas/${nextAula.id}` : `/aluno/modulos/${id}`}
        />
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 pt-2">
        {prevAula ? (
          <Link
            href={`/aluno/modulos/${id}/aulas/${prevAula.id}`}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 flex-shrink-0" />
            <span className="max-w-[160px] truncate">{prevAula.titulo}</span>
          </Link>
        ) : (
          <Link
            href={`/aluno/modulos/${id}`}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 flex-shrink-0" />
            Voltar ao módulo
          </Link>
        )}

        {nextAula ? (
          <Link
            href={`/aluno/modulos/${id}/aulas/${nextAula.id}`}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <span className="max-w-[160px] truncate">{nextAula.titulo}</span>
            <ArrowRight className="h-4 w-4 flex-shrink-0" />
          </Link>
        ) : (
          <Link
            href={`/aluno/modulos/${id}`}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Concluir módulo
            <ArrowRight className="h-4 w-4 flex-shrink-0" />
          </Link>
        )}
      </div>
    </div>
  )
}
