export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, BookOpen, TrendingUp, ShieldAlert, Key } from 'lucide-react'
import { requireRole } from '@/lib/auth/require-role'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AdicionarAlunoForm } from './adicionar-aluno-form'
import { RemoverAlunoButton } from './remover-aluno-button'
import { CodigoAcessoCard } from './codigo-acesso-card'

export default async function TurmaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user, supabase } = await requireRole('professor')

  const { data: turmaRaw } = await supabase
    .from('turmas')
    .select('id, nome, descricao, ano_letivo, professor_id, codigo_acesso')
    .eq('id', id)
    .single()

  if (!turmaRaw) notFound()

  const turma = turmaRaw as {
    id: string
    nome: string
    descricao: string | null
    ano_letivo: string | null
    professor_id: string
    codigo_acesso: string | null
  }

  // Only the professor who owns the turma can manage it
  if (turma.professor_id !== user.id) redirect('/professor/turmas')

  // Fetch enrolled students with their profiles and progress
  const { data: alunosRaw } = await supabase
    .from('turma_alunos')
    .select('id, aluno_id, inscrito_em, perfis(nome_completo, email, numero_aluno, pontos_total)')
    .eq('turma_id', id)
    .eq('ativo', true)
    .order('inscrito_em')

  const alunos = (alunosRaw as {
    id: string
    aluno_id: string
    inscrito_em: string
    perfis: {
      nome_completo: string
      email: string
      numero_aluno: string | null
      pontos_total: number
    } | null
  }[]) ?? []

  // Fetch progress for each student from view
  const alunoIds = alunos.map((a) => a.aluno_id)
  let progressoMap = new Map<string, { modulos_concluidos: number; media_progresso: number }>()

  if (alunoIds.length > 0) {
    const { data: progRaw } = await supabase
      .from('v_progresso_aluno')
      .select('aluno_id, percentagem, concluido')
      .in('aluno_id', alunoIds)

    const prog = progRaw as { aluno_id: string; percentagem: number; concluido: boolean }[] ?? []

    // Group by aluno_id
    const grouped = prog.reduce<Record<string, { total: number; concluidos: number; soma: number }>>(
      (acc, p) => {
        if (!acc[p.aluno_id]) acc[p.aluno_id] = { total: 0, concluidos: 0, soma: 0 }
        acc[p.aluno_id].total++
        if (p.concluido) acc[p.aluno_id].concluidos++
        acc[p.aluno_id].soma += p.percentagem
        return acc
      }, {}
    )

    Object.entries(grouped).forEach(([alunoId, g]) => {
      progressoMap.set(alunoId, {
        modulos_concluidos: g.concluidos,
        media_progresso: g.total > 0 ? Math.round(g.soma / g.total) : 0,
      })
    })
  }

  // Fetch simulation stats
  let simMap = new Map<string, { taxa_deteccao: number; total: number }>()
  if (alunoIds.length > 0) {
    const { data: simRaw } = await supabase
      .from('v_stats_simulacoes')
      .select('aluno_id, total_simulacoes, taxa_deteccao')
      .in('aluno_id', alunoIds)

    const sims = simRaw as { aluno_id: string; total_simulacoes: number; taxa_deteccao: number }[] ?? []
    sims.forEach((s) => {
      simMap.set(s.aluno_id, { taxa_deteccao: Math.round(s.taxa_deteccao), total: s.total_simulacoes })
    })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/professor/turmas"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar às turmas
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{turma.nome}</h1>
          <p className="text-slate-500 mt-1">
            {turma.ano_letivo && <span>{turma.ano_letivo} · </span>}
            {alunos.length} aluno{alunos.length !== 1 ? 's' : ''}
            {turma.descricao && ` · ${turma.descricao}`}
          </p>
        </div>
        <AdicionarAlunoForm turmaId={id} />
      </div>

      {/* Código de acesso */}
      {turma.codigo_acesso && (
        <CodigoAcessoCard codigo={turma.codigo_acesso} nomeTurma={turma.nome} />
      )}

      {/* Students */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            Alunos inscritos
          </CardTitle>
          <CardDescription>
            Progresso e desempenho de cada aluno nesta turma
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {alunos.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-medium text-slate-700">Nenhum aluno inscrito</p>
              <p className="text-sm text-slate-500 mt-1">
                Adiciona alunos pelo email ou número de aluno.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alunos.map((aluno) => {
                const prog = progressoMap.get(aluno.aluno_id)
                const sim = simMap.get(aluno.aluno_id)
                const initials = (aluno.perfis?.nome_completo ?? '?')
                  .split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

                return (
                  <div key={aluno.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                    {/* Avatar */}
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {aluno.perfis?.nome_completo ?? 'Sem nome'}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {aluno.perfis?.email}
                        {aluno.perfis?.numero_aluno && ` · Nº ${aluno.perfis.numero_aluno}`}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-900">
                          {aluno.perfis?.pontos_total ?? 0}
                        </p>
                        <p className="text-xs text-slate-400">pontos</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-900 flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                          {prog?.modulos_concluidos ?? 0}
                        </p>
                        <p className="text-xs text-slate-400">módulos</p>
                      </div>
                      {sim && sim.total > 0 && (
                        <div className="text-center">
                          <p className={`text-sm font-bold ${
                            sim.taxa_deteccao >= 70
                              ? 'text-green-600'
                              : sim.taxa_deteccao >= 40
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}>
                            {sim.taxa_deteccao}%
                          </p>
                          <p className="text-xs text-slate-400">phishing</p>
                        </div>
                      )}
                    </div>

                    {/* Progress bar */}
                    {prog && prog.media_progresso > 0 && (
                      <div className="hidden lg:block w-24 flex-shrink-0">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>{prog.media_progresso}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100">
                          <div
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{ width: `${prog.media_progresso}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <RemoverAlunoButton
                      turmaAlunoId={aluno.id}
                      nomeAluno={aluno.perfis?.nome_completo ?? undefined}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
