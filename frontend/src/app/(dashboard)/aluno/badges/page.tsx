import { Award } from 'lucide-react'
import { requireUser } from '@/lib/auth/require-role'
import { Card, CardContent } from '@/components/ui/card'

type BadgeWithDetails = {
  badge_id: string
  ganho_em: string
  badges: {
    nome: string
    descricao: string
    icone_url: string | null
    pontos_bonus: number
  } | null
}

export default async function BadgesPage() {
  const { user, supabase } = await requireUser()

  const { data: badgesGanhosRaw } = await supabase
    .from('utilizador_badges')
    .select('badge_id, ganho_em, badges(nome, descricao, icone_url, pontos_bonus)')
    .eq('utilizador_id', user.id)
    .order('ganho_em', { ascending: false })

  const badgesGanhos = (badgesGanhosRaw as BadgeWithDetails[]) ?? []

  const { data: todosBadgesRaw } = await supabase
    .from('badges')
    .select('id, nome, descricao, icone_url, pontos_bonus')
    .order('pontos_bonus')

  const todosBadges =
    (todosBadgesRaw as {
      id: string
      nome: string
      descricao: string
      icone_url: string | null
      pontos_bonus: number
    }[]) ?? []

  const badgesGanhosMap = new Map(badgesGanhos.map((b) => [b.badge_id, b.ganho_em]))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Os meus badges</h1>
        <p className="text-slate-500 mt-1">
          {badgesGanhos.length} de {todosBadges.length} badges desbloqueados
        </p>
      </div>

      {todosBadges.length > 0 && (
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{badgesGanhos.length} desbloqueados</span>
            <span>{todosBadges.length} total</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-yellow-500 transition-all"
              style={{
                width: `${(badgesGanhos.length / todosBadges.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {todosBadges.length === 0 ? (
        <div className="text-center py-16">
          <Award className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Nenhum badge disponível.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {todosBadges.map((badge) => {
            const ganho = badgesGanhosMap.has(badge.id)
            const ganhoEm = badgesGanhosMap.get(badge.id)

            return (
              <Card key={badge.id} className={ganho ? '' : 'opacity-50 grayscale'}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl ${
                        ganho ? 'bg-yellow-100' : 'bg-slate-100'
                      }`}
                    >
                      {badge.icone_url ?? '🏅'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{badge.nome}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {badge.descricao}
                      </p>
                      <p className="text-xs mt-1.5">
                        {ganho ? (
                          <span className="text-green-600 font-medium">
                            Ganho em {new Date(ganhoEm!).toLocaleDateString('pt-PT')}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            +{badge.pontos_bonus} pontos bónus
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
