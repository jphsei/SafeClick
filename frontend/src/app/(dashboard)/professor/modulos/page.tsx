export const dynamic = 'force-dynamic'

import { BookOpen, Clock, Users } from 'lucide-react'
import { requireRole } from '@/lib/auth/require-role'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type NivelDificuldade } from '@/lib/types/database.types'
import { AtribuirModulo } from './atribuir-modulo'

const nivelLabels: Record<NivelDificuldade, string> = {
  basico: 'Básico',
  intermedio: 'Intermédio',
  avancado: 'Avançado',
}

export default async function ProfessorModulosPage() {
  const { user, supabase } = await requireRole('professor')

  const { data: modulosRaw } = await supabase
    .from('modulos')
    .select('id, titulo, descricao, dificuldade, pontos_conclusao, duracao_minutos, ordem')
    .eq('estado', 'publicado')
    .order('ordem')

  const modulos =
    (modulosRaw as {
      id: string
      titulo: string
      descricao: string | null
      dificuldade: NivelDificuldade
      pontos_conclusao: number
      duracao_minutos: number | null
      ordem: number
    }[]) ?? []

  // Fetch professor's turmas for assignment
  const { data: turmasRaw } = await supabase
    .from('turmas')
    .select('id, nome')
    .eq('professor_id', user.id)
    .eq('ativo', true)

  const turmas = (turmasRaw as { id: string; nome: string }[]) ?? []

  // Fetch already assigned modules
  const turmaIds = turmas.map((t) => t.id)
  const { data: atribuidosRaw } = turmaIds.length > 0
    ? await supabase
        .from('turma_modulos')
        .select('turma_id, modulo_id')
        .in('turma_id', turmaIds)
    : { data: [] }

  const atribuidos = new Set(
    (atribuidosRaw as { turma_id: string; modulo_id: string }[] ?? [])
      .map((a) => `${a.turma_id}:${a.modulo_id}`)
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Módulos disponíveis</h1>
        <p className="text-slate-500 mt-1">
          {modulos.length} módulo{modulos.length !== 1 ? 's' : ''} publicado{modulos.length !== 1 ? 's' : ''}.
          {turmas.length === 0 && ' Cria uma turma para poder atribuir módulos.'}
        </p>
      </div>

      {modulos.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nenhum módulo publicado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {modulos.map((modulo) => {
            const turmasAtribuidas = turmas.filter((t) =>
              atribuidos.has(`${t.id}:${modulo.id}`)
            )

            return (
              <Card key={modulo.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{modulo.titulo}</CardTitle>
                    <Badge variant={modulo.dificuldade} className="flex-shrink-0">
                      {nivelLabels[modulo.dificuldade]}
                    </Badge>
                  </div>
                  {modulo.descricao && (
                    <CardDescription className="line-clamp-2 text-xs">
                      {modulo.descricao}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                    <span>{modulo.pontos_conclusao} pts</span>
                    {modulo.duracao_minutos && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {modulo.duracao_minutos} min
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      {turmasAtribuidas.length > 0 ? (
                        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                          <Users className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">
                            {turmasAtribuidas.map((t) => t.nome).join(', ')}
                          </span>
                        </div>
                      ) : turmas.length > 0 ? (
                        <p className="text-xs text-slate-400">Não atribuído a nenhuma turma</p>
                      ) : null}
                    </div>
                    {turmas.length > 0 && (
                      <AtribuirModulo
                        moduloId={modulo.id}
                        turmas={turmas}
                        turmasAtribuidas={turmasAtribuidas.map((t) => t.id)}
                      />
                    )}
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
