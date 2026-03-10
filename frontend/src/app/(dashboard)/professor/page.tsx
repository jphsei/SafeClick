import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, BookOpen, TrendingUp, ArrowRight, GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default async function ProfessorDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfilRaw } = await supabase
    .from('perfis')
    .select('nome_completo, papel')
    .eq('id', user.id)
    .single()

  const perfil = perfilRaw as { nome_completo: string; papel: string } | null

  if (perfil?.papel !== 'professor') {
    if (perfil?.papel === 'aluno') redirect('/aluno')
    if (perfil?.papel === 'administrador') redirect('/admin')
  }

  const primeiroNome = (perfil?.nome_completo ?? 'Professor').split(' ')[0]

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

  // TODO: Fetch real student count per turma (requires turma_alunos join)
  // TODO: Fetch real completion rate (requires progresso_modulo aggregation)

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

        {/* TODO: Replace with real data */}
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">—</p>
              <p className="text-sm text-slate-500">Total de alunos</p>
              {/* TODO: Sum of alunos across all turmas */}
            </div>
          </CardContent>
        </Card>

        {/* TODO: Replace with real completion rate */}
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">—</p>
              <p className="text-sm text-slate-500">Taxa de conclusão média</p>
              {/* TODO: Calculate from progresso_modulo */}
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
                  {/* TODO: Show real student count */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm text-slate-400">— alunos</p>
                    {/* TODO: fetch turma_alunos count */}
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
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
            <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              {/* TODO: Implement module assignment to turmas */}
              Funcionalidade de atribuição de módulos a turmas em desenvolvimento.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
