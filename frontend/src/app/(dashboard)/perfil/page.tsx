import { User, Mail, School, Hash, Star, BookOpen, Award, Calendar } from 'lucide-react'
import { requireProfile } from '@/lib/auth/require-role'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type PapelUtilizador } from '@/lib/types/database.types'

const papelLabels: Record<PapelUtilizador, string> = {
  aluno: 'Aluno',
  professor: 'Professor',
  administrador: 'Administrador',
}

const papelColors: Record<PapelUtilizador, string> = {
  aluno: 'bg-blue-100 text-blue-700',
  professor: 'bg-green-100 text-green-700',
  administrador: 'bg-purple-100 text-purple-700',
}

export default async function PerfilPage() {
  // Página partilhada entre papéis — sem check de `papel`, mas precisamos
  // de um perfil completo (com `escolas` join) para mostrar a info.
  const { user, perfil, supabase } = await requireProfile<{
    nome_completo: string
    email: string
    papel: PapelUtilizador
    pontos_total: number
    numero_aluno: string | null
    criado_em: string
    escolas: { nome: string } | null
  }>('nome_completo, email, papel, pontos_total, numero_aluno, criado_em, escolas(nome)')

  // Stats
  const { data: progressoRaw } = await supabase
    .from('progresso_modulo')
    .select('concluido, percentagem')
    .eq('aluno_id', user.id)

  const progresso = (progressoRaw as { concluido: boolean; percentagem: number }[]) ?? []
  const modulosConcluidos = progresso.filter((p) => p.concluido).length
  const modulosIniciados = progresso.filter((p) => !p.concluido && p.percentagem > 0).length

  const { data: badgesRaw } = await supabase
    .from('utilizador_badges')
    .select('badge_id, ganho_em, badges(nome, icone_url, descricao)')
    .eq('utilizador_id', user.id)
    .order('ganho_em', { ascending: false })

  const badges = (badgesRaw as {
    badge_id: string
    ganho_em: string
    badges: { nome: string; icone_url: string | null; descricao: string } | null
  }[]) ?? []

  const { data: tentativasRaw } = await supabase
    .from('tentativas_quiz')
    .select('pontos_ganhos')
    .eq('aluno_id', user.id)
    .eq('concluido', true)

  const totalQuizzes = tentativasRaw?.length ?? 0

  const initials = perfil.nome_completo
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const membroDesde = new Date(perfil.criado_em).toLocaleDateString('pt-PT', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">O meu perfil</h1>
        <p className="text-slate-500 mt-1">As tuas informações e estatísticas.</p>
      </div>

      {/* Profile card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-5 flex-wrap">
            {/* Avatar */}
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{perfil.nome_completo}</h2>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${papelColors[perfil.papel]}`}>
                  {papelLabels[perfil.papel]}
                </span>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{perfil.email}</span>
                </div>

                {perfil.escolas?.nome && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <School className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{perfil.escolas.nome}</span>
                  </div>
                )}

                {perfil.numero_aluno && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Hash className="h-4 w-4 flex-shrink-0" />
                    <span>Nº {perfil.numero_aluno}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>Membro desde {membroDesde}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats (aluno only) */}
      {perfil.papel === 'aluno' && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-5 text-center">
              <div className="flex justify-center mb-2">
                <Star className="h-6 w-6 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{perfil.pontos_total}</p>
              <p className="text-xs text-slate-500 mt-0.5">Pontos</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 text-center">
              <div className="flex justify-center mb-2">
                <BookOpen className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{modulosConcluidos}</p>
              <p className="text-xs text-slate-500 mt-0.5">Módulos concluídos</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 text-center">
              <div className="flex justify-center mb-2">
                <Award className="h-6 w-6 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{badges.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Badges</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 text-center">
              <div className="flex justify-center mb-2">
                <span className="text-2xl">📝</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{totalQuizzes}</p>
              <p className="text-xs text-slate-500 mt-0.5">Quizzes feitos</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Badges earned */}
      {perfil.papel === 'aluno' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-500" />
              Badges conquistados
              <span className="text-sm font-normal text-slate-400">({badges.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {badges.length === 0 ? (
              <div className="text-center py-6">
                <Award className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Ainda não tens badges. Completa módulos para ganhar!</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {badges.map((ub) => (
                  <div key={ub.badge_id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-xl">
                      {ub.badges?.icone_url ?? '🏅'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {ub.badges?.nome ?? 'Badge'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(ub.ganho_em).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Progress summary (aluno) */}
      {perfil.papel === 'aluno' && (modulosConcluidos > 0 || modulosIniciados > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              Progresso nos módulos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-3xl font-bold text-green-700">{modulosConcluidos}</p>
                <p className="text-sm text-green-600 mt-1">Concluídos</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-3xl font-bold text-blue-700">{modulosIniciados}</p>
                <p className="text-sm text-blue-600 mt-1">Em progresso</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
