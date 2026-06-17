export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Users, GraduationCap, ArrowRight } from 'lucide-react'
import { requireRole } from '@/lib/auth/require-role'
import { Card, CardContent } from '@/components/ui/card'
import { NovaTurmaForm } from './nova-turma-form'

type TurmaComStats = {
  id: string
  nome: string
  descricao: string | null
  ano_letivo: string | null
  total_alunos: number
  media_progresso: number
  modulos_em_progresso: number
}

export default async function TurmasPage() {
  const { user, supabase } = await requireRole('professor')

  // Para a NovaTurmaForm precisamos do `escola_id` do professor.
  // O perfil mínimo do helper não inclui esse campo — buscamos separadamente.
  const { data: extra } = await supabase
    .from('perfis')
    .select('escola_id')
    .eq('id', user.id)
    .single()

  const escolaId = extra?.escola_id ?? null

  const { data: turmasRaw } = await supabase
    .from('turmas')
    .select('id, nome, descricao, ano_letivo')
    .eq('professor_id', user.id)
    .eq('ativo', true)
    .order('criado_em', { ascending: false })

  const turmas =
    (turmasRaw as {
      id: string
      nome: string
      descricao: string | null
      ano_letivo: string | null
    }[]) ?? []

  // Fetch stats from view for each turma
  const turmaIds = turmas.map((t) => t.id)
  const statsMap = new Map<
    string,
    { total_alunos: number; media_progresso: number; modulos_em_progresso: number }
  >()

  if (turmaIds.length > 0) {
    const { data: statsRaw } = await supabase
      .from('v_stats_turma')
      .select('turma_id, total_alunos, media_progresso, modulos_em_progresso')
      .in('turma_id', turmaIds)

    const stats = statsRaw as
      | {
          turma_id: string
          total_alunos: number
          media_progresso: number
          modulos_em_progresso: number
        }[]
      | null

    stats?.forEach((s) => {
      statsMap.set(s.turma_id, {
        total_alunos: s.total_alunos,
        media_progresso: s.media_progresso,
        modulos_em_progresso: s.modulos_em_progresso,
      })
    })
  }

  const turmasComStats: TurmaComStats[] = turmas.map((t) => ({
    ...t,
    total_alunos: statsMap.get(t.id)?.total_alunos ?? 0,
    media_progresso: statsMap.get(t.id)?.media_progresso ?? 0,
    modulos_em_progresso: statsMap.get(t.id)?.modulos_em_progresso ?? 0,
  }))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">As minhas turmas</h1>
          <p className="text-slate-500 mt-1">
            {turmas.length === 0
              ? 'Ainda não tens turmas. Cria a tua primeira turma.'
              : `${turmas.length} turma${turmas.length !== 1 ? 's' : ''} ativa${turmas.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <NovaTurmaForm professorId={user.id} escolaId={escolaId} />
      </div>

      {turmasComStats.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-medium text-slate-700 mb-1">Nenhuma turma criada</h3>
            <p className="text-sm text-slate-500">Clica em &quot;Nova turma&quot; para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {turmasComStats.map((turma) => (
            <Link key={turma.id} href={`/professor/turmas/${turma.id}`}>
              <Card className="hover:shadow-sm transition-shadow hover:border-blue-200 cursor-pointer">
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 py-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{turma.nome}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-sm text-slate-500 flex-wrap">
                        {turma.ano_letivo && <span>{turma.ano_letivo}</span>}
                        {turma.descricao && (
                          <>
                            {turma.ano_letivo && <span>·</span>}
                            <span className="truncate">{turma.descricao}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 grid grid-cols-3 gap-6 text-center">
                      <div>
                        <p className="text-xl font-bold text-slate-900">{turma.total_alunos}</p>
                        <p className="text-xs text-slate-400">alunos</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-slate-900">
                          {turma.modulos_em_progresso}
                        </p>
                        <p className="text-xs text-slate-400">módulos ativos</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-slate-900">
                          {Math.round(turma.media_progresso)}%
                        </p>
                        <p className="text-xs text-slate-400">progresso médio</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
