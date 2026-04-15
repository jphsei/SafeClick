import { redirect } from 'next/navigation'
import { BookOpen, Clock, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type NivelDificuldade, type EstadoModulo } from '@/lib/types/database.types'

const nivelLabels: Record<NivelDificuldade, string> = {
  basico: 'Básico',
  intermedio: 'Intermédio',
  avancado: 'Avançado',
}

const estadoColors: Record<EstadoModulo, string> = {
  publicado: 'bg-green-100 text-green-700',
  rascunho: 'bg-yellow-100 text-yellow-700',
  arquivado: 'bg-slate-100 text-slate-500',
}

const estadoLabels: Record<EstadoModulo, string> = {
  publicado: 'Publicado',
  rascunho: 'Rascunho',
  arquivado: 'Arquivado',
}

export default async function AdminModulosPage() {
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

  if ((perfilRaw as { papel: string } | null)?.papel !== 'administrador') redirect('/aluno')

  const { data: modulosRaw } = await supabase
    .from('modulos')
    .select('id, titulo, descricao, dificuldade, estado, ordem, pontos_conclusao, duracao_minutos')
    .order('ordem')

  const modulos =
    (modulosRaw as {
      id: string
      titulo: string
      descricao: string | null
      dificuldade: NivelDificuldade
      estado: EstadoModulo
      ordem: number
      pontos_conclusao: number
      duracao_minutos: number | null
    }[]) ?? []

  const publicados = modulos.filter((m) => m.estado === 'publicado').length
  const rascunhos = modulos.filter((m) => m.estado === 'rascunho').length

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Módulos</h1>
        <p className="text-slate-500 mt-1">
          {publicados} publicado{publicados !== 1 ? 's' : ''}
          {rascunhos > 0 && ` · ${rascunhos} rascunho${rascunhos !== 1 ? 's' : ''}`}
        </p>
      </div>

      {modulos.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nenhum módulo criado.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              Todos os módulos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {modulos.map((modulo) => (
                <div key={modulo.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <span className="text-sm font-bold text-blue-600">{modulo.ordem}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{modulo.titulo}</p>
                    {modulo.descricao && (
                      <p className="text-xs text-slate-400 truncate">{modulo.descricao}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {modulo.duracao_minutos && (
                      <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        {modulo.duracao_minutos} min
                      </span>
                    )}
                    <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
                      <Star className="h-3 w-3" />
                      {modulo.pontos_conclusao} pts
                    </span>
                    <Badge variant={modulo.dificuldade}>
                      {nivelLabels[modulo.dificuldade]}
                    </Badge>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoColors[modulo.estado]}`}>
                      {estadoLabels[modulo.estado]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
