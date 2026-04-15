export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { BarChart3, Users, TrendingUp, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default async function RelatoriosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfilRaw } = await supabase
    .from('perfis')
    .select('papel')
    .eq('id', user.id)
    .single()

  const perfil = perfilRaw as { papel: string } | null
  if (perfil?.papel !== 'professor') redirect('/aluno')

  // Fetch professor's turmas
  const { data: turmasRaw } = await supabase
    .from('turmas')
    .select('id, nome')
    .eq('professor_id', user.id)
    .eq('ativo', true)

  const turmaIds = (turmasRaw as { id: string; nome: string }[] ?? []).map((t) => t.id)

  // Fetch turma stats
  const { data: statsRaw } = await supabase
    .from('v_stats_turma')
    .select('turma_id, turma, total_alunos, media_progresso, modulos_em_progresso')
    .in('turma_id', turmaIds)

  const statsTurmas =
    (statsRaw as {
      turma_id: string
      turma: string
      total_alunos: number
      media_progresso: number
      modulos_em_progresso: number
    }[]) ?? []

  // Fetch students in professor's turmas
  const { data: alunosRaw } = await supabase
    .from('turma_alunos')
    .select('aluno_id, turma_id')
    .in('turma_id', turmaIds)
    .eq('ativo', true)

  const alunoIds = [...new Set((alunosRaw as { aluno_id: string; turma_id: string }[] ?? [])
    .map((a) => a.aluno_id))]

  // Fetch simulation stats for those students
  const { data: simStatsRaw } = await supabase
    .from('v_stats_simulacoes')
    .select('aluno_id, nome_completo, total_simulacoes, detectadas, clicadas, taxa_deteccao')
    .in('aluno_id', alunoIds)
    .order('taxa_deteccao', { ascending: false })
    .limit(10)

  const simStats =
    (simStatsRaw as {
      aluno_id: string
      nome_completo: string
      total_simulacoes: number
      detectadas: number
      clicadas: number
      taxa_deteccao: number
    }[]) ?? []

  // Progress per student
  const { data: progressoRaw } = await supabase
    .from('v_progresso_aluno')
    .select('aluno_id, nome_completo, modulo, percentagem, concluido')
    .in('aluno_id', alunoIds)
    .order('percentagem', { ascending: false })
    .limit(20)

  const progressoAlunos =
    (progressoRaw as {
      aluno_id: string
      nome_completo: string
      modulo: string
      percentagem: number
      concluido: boolean
    }[]) ?? []

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
        <p className="text-slate-500 mt-1">Estatísticas detalhadas das tuas turmas.</p>
      </div>

      {/* Turmas overview */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          Resumo por turma
        </h2>
        {statsTurmas.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-slate-500">
              Ainda não tens turmas com dados.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {statsTurmas.map((t) => (
              <Card key={t.turma_id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.turma}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xl font-bold text-slate-900">{t.total_alunos}</p>
                      <p className="text-xs text-slate-400">alunos</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-slate-900">{t.modulos_em_progresso}</p>
                      <p className="text-xs text-slate-400">módulos ativos</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-blue-600">
                        {Math.round(t.media_progresso)}%
                      </p>
                      <p className="text-xs text-slate-400">progresso</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full bg-blue-600"
                      style={{ width: `${t.media_progresso}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Module progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Progresso nos módulos
            </CardTitle>
            <CardDescription>Top 20 entradas recentes</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {progressoAlunos.length === 0 ? (
              <p className="text-sm text-slate-500 px-6 py-4">Nenhum progresso registado.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {progressoAlunos.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 px-6 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {p.nome_completo}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{p.modulo}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-16 h-1.5 rounded-full bg-slate-100">
                        <div
                          className={`h-1.5 rounded-full ${p.concluido ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${p.percentagem}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600 w-8 text-right">
                        {Math.round(p.percentagem)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Simulation stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-orange-500" />
              Desempenho nas simulações
            </CardTitle>
            <CardDescription>Taxa de deteção de phishing</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {simStats.length === 0 ? (
              <p className="text-sm text-slate-500 px-6 py-4">
                Nenhuma simulação realizada pelos alunos.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {simStats.map((s) => (
                  <div key={s.aluno_id} className="flex items-center gap-3 px-6 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {s.nome_completo}
                      </p>
                      <p className="text-xs text-slate-400">
                        {s.detectadas}/{s.total_simulacoes} detetadas
                        {s.clicadas > 0 && ` · ${s.clicadas} cliques`}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold flex-shrink-0 ${
                        s.taxa_deteccao >= 70
                          ? 'text-green-600'
                          : s.taxa_deteccao >= 40
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {Math.round(s.taxa_deteccao)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
