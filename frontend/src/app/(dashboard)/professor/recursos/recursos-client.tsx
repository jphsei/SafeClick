'use client'

import { useState, useMemo } from 'react'
import { FolderOpen, FileText, Video, Presentation, Download, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { NovoRecursoForm } from './novo-recurso-form'
import { ApagarRecursoButton } from './apagar-recurso-button'
import { type TipoRecurso } from '@/lib/types/database.types'

const TIPO_LABELS: Record<TipoRecurso, string> = {
  plano_aula:   'Plano de Aula',
  apresentacao: 'Apresentação',
  guia:         'Guia',
  video:        'Vídeo',
  documento:    'Documento',
}

const TIPO_ICONS: Record<TipoRecurso, React.ReactNode> = {
  plano_aula:   <FileText    className="h-5 w-5 text-blue-600" />,
  apresentacao: <Presentation className="h-5 w-5 text-purple-600" />,
  guia:         <FileText    className="h-5 w-5 text-green-600" />,
  video:        <Video       className="h-5 w-5 text-red-600" />,
  documento:    <FileText    className="h-5 w-5 text-slate-600" />,
}

const TIPO_COLORS: Record<TipoRecurso, string> = {
  plano_aula:   'bg-blue-50',
  apresentacao: 'bg-purple-50',
  guia:         'bg-green-50',
  video:        'bg-red-50',
  documento:    'bg-slate-50',
}

export type RecursoRow = {
  id: string
  titulo: string
  descricao: string | null
  tipo: TipoRecurso
  url_ficheiro: string | null
  modulo_id: string | null
  criado_por: string | null
}

interface Props {
  recursos: RecursoRow[]
  modulos: { id: string; titulo: string }[]
  professorId: string
}

export function RecursosClient({ recursos, modulos, professorId }: Props) {
  const [tipoFiltro, setTipoFiltro]     = useState<TipoRecurso | 'todos'>('todos')
  const [moduloFiltro, setModuloFiltro] = useState<string>('todos')
  const [pesquisa, setPesquisa]         = useState('')

  const moduloMap = useMemo(
    () => Object.fromEntries(modulos.map((m) => [m.id, m.titulo])),
    [modulos]
  )

  const tiposPresentes = useMemo(
    () => [...new Set(recursos.map((r) => r.tipo))] as TipoRecurso[],
    [recursos]
  )

  const modulosPresentes = useMemo(() => {
    const ids = [...new Set(recursos.map((r) => r.modulo_id).filter(Boolean))] as string[]
    return ids.map((id) => ({ id, titulo: moduloMap[id] ?? id }))
  }, [recursos, moduloMap])

  const filtrados = useMemo(() => {
    const q = pesquisa.toLowerCase()
    return recursos.filter((r) => {
      if (tipoFiltro !== 'todos' && r.tipo !== tipoFiltro) return false
      if (moduloFiltro !== 'todos' && r.modulo_id !== moduloFiltro) return false
      if (q && !r.titulo.toLowerCase().includes(q) && !(r.descricao ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [recursos, tipoFiltro, moduloFiltro, pesquisa])

  const agrupados = useMemo(() => {
    const grupos: Record<string, RecursoRow[]> = {}
    filtrados.forEach((r) => {
      if (!grupos[r.tipo]) grupos[r.tipo] = []
      grupos[r.tipo].push(r)
    })
    return grupos
  }, [filtrados])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recursos pedagógicos</h1>
          <p className="text-slate-500 mt-1">
            {recursos.length === 0
              ? 'Ainda não há recursos. Adiciona o primeiro.'
              : `${recursos.length} recurso${recursos.length !== 1 ? 's' : ''} disponível${recursos.length !== 1 ? 'eis' : ''}`}
          </p>
        </div>
        <NovoRecursoForm professorId={professorId} modulos={modulos} />
      </div>

      {/* Novo recurso form expande aqui (dentro do componente) */}

      {recursos.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center">
          {/* Pesquisa */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar recursos..."
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtro módulo */}
          {modulosPresentes.length > 0 && (
            <select
              value={moduloFiltro}
              onChange={(e) => setModuloFiltro(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos os módulos</option>
              {modulosPresentes.map((m) => (
                <option key={m.id} value={m.id}>{m.titulo}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Filtro por tipo (pills) */}
      {tiposPresentes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTipoFiltro('todos')}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              tipoFiltro === 'todos'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos
          </button>
          {tiposPresentes.map((tipo) => (
            <button
              key={tipo}
              onClick={() => setTipoFiltro(tipo)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                tipoFiltro === tipo
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {TIPO_LABELS[tipo]}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      {filtrados.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">
              {recursos.length === 0 ? 'Nenhum recurso disponível.' : 'Nenhum recurso corresponde aos filtros.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(Object.keys(TIPO_LABELS) as TipoRecurso[])
            .filter((tipo) => agrupados[tipo]?.length > 0)
            .map((tipo) => (
              <div key={tipo}>
                <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  {TIPO_ICONS[tipo]}
                  {TIPO_LABELS[tipo]}
                  <span className="text-sm font-normal text-slate-400">
                    ({agrupados[tipo].length})
                  </span>
                </h2>
                <div className="space-y-2">
                  {agrupados[tipo].map((recurso) => (
                    <div
                      key={recurso.id}
                      className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${TIPO_COLORS[tipo]}`}>
                        {TIPO_ICONS[tipo]}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{recurso.titulo}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {recurso.descricao && (
                            <p className="text-sm text-slate-500 truncate">{recurso.descricao}</p>
                          )}
                          {recurso.modulo_id && moduloMap[recurso.modulo_id] && (
                            <span className="flex-shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                              {moduloMap[recurso.modulo_id]}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {recurso.url_ficheiro ? (
                          <a
                            href={recurso.url_ficheiro}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            Abrir
                          </a>
                        ) : (
                          <span className="rounded-lg border border-dashed border-slate-200 px-3 py-1.5 text-sm text-slate-400">
                            Sem link
                          </span>
                        )}

                        {recurso.criado_por === professorId && (
                          <ApagarRecursoButton
                            recursoId={recurso.id}
                            tituloRecurso={recurso.titulo}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
