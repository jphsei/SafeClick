export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Users, BookOpen, TrendingUp, ArrowRight, GraduationCap } from 'lucide-react'
import { requireRole } from '@/lib/auth/require-role'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default async function ProfessorDashboardPage() {
  const { user, perfil, supabase } = await requireRole('professor')

  const primeiroNome = perfil.nome_completo.split(' ')[0]

  // Fetch professor's turmas
  // TODO: Implement real turma stats once class management is built
  const { data: turmasRaw } = await supabase
    .from('turmas')
    .select('id, nome, descricao, ano_letivo')
    .eq('professor_id', user.id)
    .eq('ativo', true)
    .order('criado_em', { ascending: false })

  const turmas = turmasRaw as { id: string; nome: string; descricao: string | null; ano_letivo: string | null }[] | null

  const totalTurmas = turmas?.length ?? 0

  // Fetch real stats from view
  const turmaIds = turmas?.map((t) => t.id) ?? []
  let totalAlunos = 0
  let taxaConclusaoMedia = 0
  const statsMap = new Map<string, { total_alunos: number; media_progresso: number }>()

  if (turmaIds.length > 0) {
    const { data: statsRaw } = await supabase
      .from('v_stats_turma')
      .select('turma_id, total_alunos, media_progresso')
      .in('turma_id', turmaIds)

    const stats = statsRaw as { turma_id: string; total_alunos: number; media_progresso: number }[] | null
    if (stats && stats.length > 0) {
      totalAlunos = stats.reduce((sum, s) => sum + s.total_alunos, 0)
      taxaConclusaoMedia = Math.round(
        stats.reduce((sum, s) => sum + (s.media_progresso ?? 0), 0) / stats.length
      )
      stats.forEach((s) => statsMap.set(s.turma_id, s))
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Olá, Prof. {primeiroNome}! 👋
        </h1>
        <p className="text-slate-500 mt-1">
          Aqui tens uma visão geral das tuas turmas.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
              <GraduationCap className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalTurmas}</p>
              <p className="text-sm text-slate-500">Turmas ativas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalAlunos}</p>
              <p className="text-sm text-slate-500">Total de alunos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {totalTurmas > 0 ? `${taxaConclusaoMedia}%` : '—'}
              </p>
              <p className="text-sm text-slate-500">Taxa de conclusão média</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Turmas list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base">As minhas turmas</CardTitle>
            <CardDescription>Turmas que estão sob a tua gestão</CardDescription>
          </div>
          <Link
            href="/professor/turmas"
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Gerir turmas
            <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {turmas && turmas.length > 0 ? (
            <div className="space-y-3">
              {turmas.map((turma) => (
                <div
                  key={turma.id}
                  className="flex items-center gap-4 rounded-lg border border-slate-100 p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{turma.nome}</p>
                    <p className="text-sm text-slate-500">
                      {turma.ano_letivo && `Ano letivo: ${turma.ano_letivo}`}
                      {turma.descricao && ` · ${turma.descricao}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-900">
                      {statsMap.get(turma.id)?.total_alunos ?? 0}
                    </p>
                    <p className="text-xs text-slate-400">alunos</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-medium text-slate-700">Ainda não tens turmas</p>
              <p className="text-sm text-slate-500 mt-1">
                Cria a tua primeira turma para começar.
              </p>
              <Link
                href="/professor/turmas"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Criar turma
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modules section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base">Módulos disponíveis</CardTitle>
            <CardDescription>Módulos que podes atribuir às tuas turmas</CardDescription>
          </div>
          <Link
            href="/professor/modulos"
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Ver módulos
            <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          <Link
            href="/professor/modulos"
            className="flex items-center gap-4 rounded-lg border border-slate-100 p-4 hover:bg-slate-50 transition-colors group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">Gerir e atribuir módulos</p>
              <p className="text-sm text-slate-500">Atribui módulos às tuas turmas e acompanha o progresso</p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
