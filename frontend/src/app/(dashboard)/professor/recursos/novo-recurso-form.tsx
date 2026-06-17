'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type TipoRecurso } from '@/lib/types/database.types'

const TIPOS: { value: TipoRecurso; label: string }[] = [
  { value: 'plano_aula', label: 'Plano de Aula' },
  { value: 'apresentacao', label: 'Apresentação' },
  { value: 'guia', label: 'Guia' },
  { value: 'video', label: 'Vídeo' },
  { value: 'documento', label: 'Documento' },
]

interface Props {
  professorId: string
  modulos: { id: string; titulo: string }[]
}

export function NovoRecursoForm({ professorId, modulos }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState<TipoRecurso>('documento')
  const [url, setUrl] = useState('')
  const [moduloId, setModuloId] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return

    setLoading(true)
    setError(null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase.from('recursos_pedagogicos') as any).insert({
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      tipo,
      url_ficheiro: url.trim() || null,
      modulo_id: moduloId || null,
      criado_por: professorId,
      visivel: true,
    })

    setLoading(false)

    if (err) {
      setError(`Erro: ${err.message}`)
      return
    }

    setTitulo('')
    setDescricao('')
    setTipo('documento')
    setUrl('')
    setModuloId('')
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Novo recurso
      </Button>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Novo recurso</h3>
        <button
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Plano de Aula: Phishing"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tipo">Tipo *</Label>
            <select
              id="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoRecurso)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="descricao">Descrição (opcional)</Label>
          <Input
            id="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Breve descrição do recurso"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="url">URL / Link (opcional)</Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="modulo">Módulo associado (opcional)</Label>
            <select
              id="modulo"
              value={moduloId}
              onChange={(e) => setModuloId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Nenhum —</option>
              {modulos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.titulo}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={loading || !titulo.trim()}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'A guardar...' : 'Guardar'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false)
              setError(null)
            }}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
