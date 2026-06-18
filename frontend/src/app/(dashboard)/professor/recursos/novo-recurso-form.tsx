'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type TipoRecurso } from '@/lib/types/database.types'
import { isSafeUrl } from '@/lib/sanitize'
import { criarRecurso } from './actions'

const TIPOS: { value: TipoRecurso; label: string }[] = [
  { value: 'plano_aula', label: 'Plano de Aula' },
  { value: 'apresentacao', label: 'Apresentação' },
  { value: 'guia', label: 'Guia' },
  { value: 'video', label: 'Vídeo' },
  { value: 'documento', label: 'Documento' },
]

interface Props {
  // Prop preservado para compatibilidade com o caller (page.tsx). A
  // server action `criarRecurso` usa o auth.uid() do session do
  // professor, por isso `professorId` deixou de ser necessário aqui.
  professorId?: string
  modulos: { id: string; titulo: string }[]
}

export function NovoRecursoForm({ modulos }: Props) {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState<TipoRecurso>('documento')
  const [url, setUrl] = useState('')
  const [moduloId, setModuloId] = useState('')

  // Validação client-side em tempo real (UX). A defesa real está no
  // servidor — esta validação é só para mostrar erro antes de submeter.
  const urlInvalido = url.trim() !== '' && !isSafeUrl(url)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    if (urlInvalido) {
      setError('URL não permitido. Usa apenas http://, https:// ou mailto:.')
      return
    }

    setLoading(true)
    setError(null)

    const res = await criarRecurso({
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      tipo,
      url_ficheiro: url.trim() || null,
      modulo_id: moduloId || null,
    })

    setLoading(false)

    if (!res.ok) {
      setError(res.erro)
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
              className={urlInvalido ? 'border-red-300 focus-visible:ring-red-400' : ''}
            />
            {urlInvalido && (
              <p className="text-xs text-red-600">
                Apenas http://, https:// ou mailto: são permitidos.
              </p>
            )}
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
