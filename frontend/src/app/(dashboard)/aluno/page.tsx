import Link from 'next/link'
import { BookOpen, Award, Star, ArrowRight, TrendingUp } from 'lucide-react'
import { requireRole } from '@/lib/auth/require-role'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type NivelDificuldade } from '@/lib/types/database.types'
import { EntrarTurmaForm } from './entrar-turma-form'

const nivelLabel: Record<NivelDificuldade, string> = {
  basico: 'Básico',
  intermedio: 'Intermédio',
  avancado: 'Avançado',
}

export default async function AlunoDashboardPage() {
  const { user, perfil, supabase } = await requireRole('aluno')

  // `requireRole` devolve o perfil mínimo (papel, nome_completo, email).
  // Buscamos `pontos_total` à parte para esta page.
  const { data: extra } = await supabase
    .from('perfis')
    .select('pontos_total')
    .eq('id', user.id)
    .single()

  const primeiroNome = perfil.nome_completo.split(' ')[0]
  const pontosTotal = extra?.pontos_total ?? 0

  // Verificar se o aluno já está inscrito em alguma turma. Decide se o
  // widget "Entrar em turma" aparece em destaque (sem turmas) ou
  // discretamente (já tem turma).
  const { count: turmaCount } = await supabase
    .from('turma_alunos')
    .select('id', { count: 'exact', head: true })
    .eq('aluno_id', user.id)
    .eq('ativo', true)

  const temTurma = (turmaCount ?? 0) > 0

  const { data: progressoDataRaw } = await supabase
    .from('progresso_modulo')
    .select('concluido')
    .eq('aluno_id', user.id)

  const progressoData = progressoDataRaw as { concluido: boolean }[] | null
  const modulosConcluidos = progressoData?.filter((p) => p.concluido).length ?? 0

  const { data: badgesDataRaw } = await supabase
    .from('utilizador_badges')
    .select('badge_id')
    .eq('utilizador_id', user.id)

  const badgesGanhos = badgesDataRaw?.length ?? 0

  const { data: modulosRaw } = await supabase
    .from('modulos')
    .select('id, titulo, descricao, dificuldade')
    .eq('estado', 'publicado')
    .order('ordem')
    .limit(4)

  const modulos = modulosRaw as {
    id: string
    titulo: string
    descricao: string | null
    dificuldade: NivelDificuldade
  }[] | null

  const { data: badgesRaw } = await supabase
    .from('utilizador_badges')
    .select('badge_id, ganho_em, badges(nome, icone_url)')
    .eq('utilizador_id', user.id)
    .order('ganho_em', { ascending: false })
    .limit(3)

  const badges = badgesRaw as {
    badge_id: string
    ganho_em: string
    badges: { nome: string; icone_url: string | null } | null
  }[] | null

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Olá, {primeiroNome}! 👋
        </h1>
        <p className="text-slate-500 mt-1">
          Bem-vindo de volta à tua área de aprendizagem.
        </p>
      </div>

      {/* Entrar em turma — em destaque se ainda não tem turma */}
      <EntrarTurmaForm temTurma={temTurma} />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{pontosTotal}</p>
              <p className="text-sm text-slate-500">Pontos totais</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{modulosConcluidos}</p>
              <p className="text-sm text-slate-500">Módulos concluídos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{badgesGanhos}</p>
              <p className="text-sm text-slate-500">Badges ganhos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Modules */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Módulos disponíveis</CardTitle>
              <CardDescription>Continua a aprender</CardDescription>
            </div>
            <Link
              href="/aluno/modulos"
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Ver todos
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {modulos && modulos.length > 0 ? (
              modulos.map((modulo) => (
                <Link
                  key={modulo.id}
                  href={`/aluno/modulos/${modulo.id}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {modulo.titulo}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{modulo.descricao}</p>
                  </div>
                  <Badge variant={modulo.dificuldade}>
                    {nivelLabel[modulo.dificuldade]}
                  </Badge>
                </Link>
              ))
            ) : (
              <div className="text-center py-6">
                <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Nenhum módulo disponível</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Os meus badges</CardTitle>
              <CardDescription>Conquistas desbloqueadas</CardDescription>
            </div>
            <Link
              href="/aluno/badges"
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Ver todos
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {badges && badges.length > 0 ? (
              <div className="space-y-3">
                {badges.map((ub) => (
                  <div
                    key={ub.badge_id}
                    className="flex items-center gap-3 rounded-lg border border-slate-100 p-3"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-50 text-lg">
                      {ub.badges?.icone_url ?? '🏅'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {ub.badges?.nome ?? 'Badge desbloqueado'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        Ganho em {new Date(ub.ganho_em).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Award className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Ainda não tens badges</p>
                <p className="text-xs text-slate-400 mt-1">
                  Completa módulos para ganhar os teus primeiros badges!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress tip */}
      <Card className="bg-gradient-to-r from-blue-600 to-cyan-600 border-0 text-white">
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Continua assim!</p>
            <p className="text-sm text-blue-100">
              Completa módulos para ganhar pontos e subir no leaderboard.
            </p>
          </div>
          <Link
            href="/aluno/modulos"
            className="flex-shrink-0 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors"
          >
            Explorar
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
