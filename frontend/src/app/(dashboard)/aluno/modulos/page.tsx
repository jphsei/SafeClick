'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BookOpen, Filter, Loader2, Clock, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type Modulo, type NivelDificuldade } from '@/lib/types/database.types'

const nivelLabels: Record<NivelDificuldade, string> = {
  basico: 'Básico',
  intermedio: 'Intermédio',
  avancado: 'Avançado',
}

type FilterType = 'todos' | NivelDificuldade

type ProgressoMap = Record<string, { percentagem: number; concluido: boolean }>

export default function ModulosPage() {
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [progresso, setProgresso] = useState<ProgressoMap>({})
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<FilterType>('todos')
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const [modulosRes, progressoRes] = await Promise.all([
        supabase
          .from('modulos')
          .select('*')
          .eq('estado', 'publicado')
          .order('ordem'),
        user
          ? supabase
              .from('progresso_modulo')
              .select('modulo_id, percentagem, concluido')
              .eq('aluno_id', user.id)
          : Promise.resolve({ data: [] }),
      ])

      if (!modulosRes.error && modulosRes.data) {
        setModulos(modulosRes.data as Modulo[])
      }

      if (progressoRes.data) {
        const map: ProgressoMap = {}
        ;(progressoRes.data as { modulo_id: string; percentagem: number; concluido: boolean }[]).forEach(
          (p) => { map[p.modulo_id] = { percentagem: p.percentagem, concluido: p.concluido } }
        )
        setProgresso(map)
      }

      setLoading(false)
    }

    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const modulosFiltrados =
    filtro === 'todos'
      ? modulos
      : modulos.filter((m) => m.dificuldade === filtro)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Módulos de aprendizagem</h1>
        <p className="text-slate-500 mt-1">
          Explora os conteúdos de cibersegurança disponíveis.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-slate-500 mr-2">
          <Filter className="h-4 w-4" />
          <span>Filtrar:</span>
        </div>
        {(['todos', 'basico', 'intermedio', 'avancado'] as const).map((nivel) => (
          <button
            key={nivel}
            onClick={() => setFiltro(nivel)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filtro === nivel
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {nivel === 'todos' ? 'Todos' : nivelLabels[nivel as NivelDificuldade]}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      )}

      {!loading && modulosFiltrados.length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-700 mb-1">
            Nenhum módulo encontrado
          </h3>
          <p className="text-slate-500 text-sm">
            {filtro !== 'todos'
              ? `Não há módulos de nível ${nivelLabels[filtro as NivelDificuldade].toLowerCase()} disponíveis.`
              : 'Ainda não há módulos publicados.'}
          </p>
        </div>
      )}

      {!loading && modulosFiltrados.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modulosFiltrados.map((modulo) => {
            const p = progresso[modulo.id]
            const percentagem = p?.percentagem ?? 0
            const concluido = p?.concluido ?? false
            const iniciado = percentagem > 0

            return (
              <Card key={modulo.id} className="flex flex-col hover:shadow-md transition-shadow">
                {/* Thumbnail */}
                <div className="relative h-40 rounded-t-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center overflow-hidden">
                  <BookOpen className="h-12 w-12 text-white/60" />
                  {concluido && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-1 text-xs font-semibold text-white shadow">
                      <CheckCircle className="h-3 w-3" />
                      Concluído
                    </div>
                  )}
                </div>

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

                <CardContent className="flex-1 space-y-2">
                  {modulo.duracao_minutos && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{modulo.duracao_minutos} min</span>
                    </div>
                  )}

                  {/* Progress bar */}
                  {iniciado && (
                    <div>
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>{concluido ? 'Concluído' : 'Em progresso'}</span>
                        <span>{Math.round(percentagem)}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            concluido ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${percentagem}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-0">
                  <Link href={`/aluno/modulos/${modulo.id}`} className="w-full">
                    <Button
                      className="w-full"
                      size="sm"
                      variant={concluido ? 'outline' : 'default'}
                    >
                      {concluido ? 'Rever módulo' : iniciado ? 'Continuar' : 'Começar módulo'}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
