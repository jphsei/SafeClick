'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Filter, Loader2 } from 'lucide-react'
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

const nivelColors: Record<NivelDificuldade, string> = {
  basico: 'bg-green-50 text-green-700',
  intermedio: 'bg-yellow-50 text-yellow-700',
  avancado: 'bg-red-50 text-red-700',
}

type FilterType = 'todos' | NivelDificuldade

export default function ModulosPage() {
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<FilterType>('todos')
  const supabase = createClient()

  useEffect(() => {
    async function fetchModulos() {
      setLoading(true)
      const query = supabase
        .from('modulos')
        .select('*')
        .eq('estado', 'publicado')
        .order('ordem')

      const { data, error } = await query

      if (!error && data) {
        setModulos(data as Modulo[])
      }
      setLoading(false)
    }

    fetchModulos()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const modulosFiltrados =
    filtro === 'todos'
      ? modulos
      : modulos.filter((m) => m.nivel_dificuldade === filtro)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
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
            {nivel === 'todos'
              ? 'Todos'
              : nivelLabels[nivel as NivelDificuldade]}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Empty state */}
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

      {/* Modules grid */}
      {!loading && modulosFiltrados.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modulosFiltrados.map((modulo) => (
            <Card
              key={modulo.id}
              className="flex flex-col hover:shadow-md transition-shadow"
            >
              {/* Image placeholder */}
              <div className="h-40 rounded-t-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-white/60" />
              </div>

              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">
                    {modulo.titulo}
                  </CardTitle>
                  <Badge
                    variant={modulo.nivel_dificuldade as NivelDificuldade}
                    className="flex-shrink-0"
                  >
                    {nivelLabels[modulo.nivel_dificuldade]}
                  </Badge>
                </div>
                {modulo.descricao && (
                  <CardDescription className="line-clamp-2 text-xs">
                    {modulo.descricao}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="flex-1">
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    nivelColors[modulo.nivel_dificuldade]
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  Nível {nivelLabels[modulo.nivel_dificuldade]}
                </div>
              </CardContent>

              <CardFooter className="pt-0">
                <Button className="w-full" size="sm">
                  Começar módulo
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
