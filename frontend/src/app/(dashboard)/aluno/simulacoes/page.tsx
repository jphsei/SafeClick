import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShieldAlert, ShieldCheck, ShieldX, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type NivelDificuldade } from '@/lib/types/database.types'

const nivelLabels: Record<NivelDificuldade, string> = {
  basico: 'Básico',
  intermedio: 'Intermédio',
  avancado: 'Avançado',
}

const estadoLabels: Record<string, { label: string; color: string }> = {
  reportou: { label: 'Detetado ✓', color: 'text-green-600' },
  ignorou: { label: 'Ignorado', color: 'text-yellow-600' },
  clicou: { label: 'Falhou ✗', color: 'text-red-600' },
}

export default async function SimulacoesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: simulacoesRaw } = await supabase
    .from('simulacoes_phishing')
    .select('id, titulo, descricao, dificuldade, pontos_sucesso')
    .eq('ativo', true)
    .order('criado_em')

  const simulacoes =
    (simulacoesRaw as {
      id: string
      titulo: string
      descricao: string | null
      dificuldade: NivelDificuldade
      pontos_sucesso: number
    }[]) ?? []

  const { data: tentativasRaw } = await supabase
    .from('tentativas_simulacao')
    .select('simulacao_id, estado, pontos_ganhos')
    .eq('aluno_id', user.id)

  const tentativasMap = new Map(
    (tentativasRaw as { simulacao_id: string; estado: string; pontos_ganhos: number }[] ?? [])
      .map((t) => [t.simulacao_id, t])
  )

  const detetadas = [...tentativasMap.values()].filter((t) => t.estado === 'reportou').length
  const tentadas = tentativasMap.size

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Simulações de Phishing</h1>
        <p className="text-slate-500 mt-1">
          Aprende a identificar emails fraudulentos em situações reais.
        </p>
      </div>

      {/* Stats */}
      {tentadas > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-5">
              <ShieldCheck className="h-8 w-8 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-xl font-bold text-slate-900">{detetadas}</p>
                <p className="text-xs text-slate-500">detetadas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-5">
              <ShieldX className="h-8 w-8 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-xl font-bold text-slate-900">
                  {[...tentativasMap.values()].filter((t) => t.estado === 'clicou').length}
                </p>
                <p className="text-xs text-slate-500">falhadas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-5">
              <ShieldAlert className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-xl font-bold text-slate-900">
                  {tentadas > 0 ? Math.round((detetadas / tentadas) * 100) : 0}%
                </p>
                <p className="text-xs text-slate-500">taxa de deteção</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {simulacoes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ShieldAlert className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nenhuma simulação disponível.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {simulacoes.map((sim) => {
            const tentativa = tentativasMap.get(sim.id)
            const feita = !!tentativa
            const estadoInfo = tentativa ? estadoLabels[tentativa.estado] : null

            return (
              <Card key={sim.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 py-4">
                    <div
                      className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
                        !feita
                          ? 'bg-orange-100'
                          : tentativa?.estado === 'reportou'
                          ? 'bg-green-100'
                          : tentativa?.estado === 'clicou'
                          ? 'bg-red-100'
                          : 'bg-yellow-100'
                      }`}
                    >
                      <ShieldAlert
                        className={`h-6 w-6 ${
                          !feita
                            ? 'text-orange-600'
                            : tentativa?.estado === 'reportou'
                            ? 'text-green-600'
                            : tentativa?.estado === 'clicou'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{sim.titulo}</p>
                      {sim.descricao && (
                        <p className="text-sm text-slate-500 truncate mt-0.5">
                          {sim.descricao}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <Badge variant={sim.dificuldade}>{nivelLabels[sim.dificuldade]}</Badge>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Star className="h-3 w-3" />
                          {sim.pontos_sucesso} pts
                        </span>
                        {estadoInfo && (
                          <span className={`text-xs font-medium ${estadoInfo.color}`}>
                            {estadoInfo.label}
                          </span>
                        )}
                      </div>
                    </div>

                    <Link href={`/aluno/simulacoes/${sim.id}`} className="flex-shrink-0">
                      <Button size="sm" variant={feita ? 'outline' : 'default'}>
                        {feita ? 'Rever' : 'Iniciar'}
                      </Button>
                    </Link>
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
