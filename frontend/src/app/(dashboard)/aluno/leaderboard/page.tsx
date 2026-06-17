import { Trophy, Medal } from 'lucide-react'
import { requireUser } from '@/lib/auth/require-role'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function LeaderboardPage() {
  const { user, supabase } = await requireUser()

  const { data: rankingRaw } = await supabase
    .from('v_leaderboard')
    .select('id, nome_completo, pontos_total, escola, posicao_global, total_badges')
    .order('posicao_global')
    .limit(50)

  const ranking =
    (rankingRaw as {
      id: string
      nome_completo: string
      pontos_total: number
      escola: string | null
      posicao_global: number
      total_badges: number
    }[]) ?? []

  const posicaoAtual = ranking.find((r) => r.id === user.id)

  const medalColors: Record<number, string> = {
    1: 'text-yellow-500',
    2: 'text-slate-400',
    3: 'text-amber-600',
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Leaderboard</h1>
        <p className="text-slate-500 mt-1">Ranking global de alunos por pontuação.</p>
      </div>

      {/* Current user position */}
      {posicaoAtual && (
        <Card className="bg-gradient-to-r from-blue-600 to-cyan-600 border-0 text-white">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">A tua posição</p>
              <p className="text-sm text-blue-100">
                {posicaoAtual.pontos_total} pontos · {posicaoAtual.total_badges} badges
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">#{posicaoAtual.posicao_global}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top 3 podium */}
      {ranking.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {[ranking[1], ranking[0], ranking[2]].map((entry, idx) => {
            const pos = idx === 0 ? 2 : idx === 1 ? 1 : 3
            const isUser = entry.id === user.id
            return (
              <Card
                key={entry.id}
                className={`text-center ${isUser ? 'ring-2 ring-blue-500' : ''} ${pos === 1 ? 'mt-0' : 'mt-4'}`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className={`text-3xl mb-1 ${medalColors[pos]}`}>
                    {pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉'}
                  </div>
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {entry.nome_completo.split(' ')[0]}
                  </p>
                  <p className="text-xs font-bold text-blue-600 mt-1">{entry.pontos_total} pts</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Full ranking */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Classificação completa</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ranking.length === 0 ? (
            <div className="text-center py-10">
              <Trophy className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhum aluno no leaderboard ainda.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {ranking.map((entry) => {
                const isUser = entry.id === user.id
                const pos = entry.posicao_global
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-4 px-6 py-3 ${
                      isUser ? 'bg-blue-50' : 'hover:bg-slate-50'
                    } transition-colors`}
                  >
                    <div className="w-8 flex-shrink-0 text-center">
                      {pos <= 3 ? (
                        <Medal className={`h-5 w-5 mx-auto ${medalColors[pos]}`} />
                      ) : (
                        <span className="text-sm font-semibold text-slate-400">{pos}</span>
                      )}
                    </div>

                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                      {entry.nome_completo
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${isUser ? 'text-blue-700' : 'text-slate-900'}`}
                      >
                        {entry.nome_completo}
                        {isUser && (
                          <span className="ml-2 text-xs font-normal text-blue-500">(tu)</span>
                        )}
                      </p>
                      {entry.escola && (
                        <p className="text-xs text-slate-400 truncate">{entry.escola}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {entry.total_badges > 0 && (
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <span>🏅</span>
                          {entry.total_badges}
                        </span>
                      )}
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{entry.pontos_total}</p>
                        <p className="text-xs text-slate-400">pts</p>
                      </div>
                    </div>
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
