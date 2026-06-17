'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { type NivelDificuldade } from '@/lib/types/database.types'
import { criarModulo, atualizarModulo } from './actions'

interface Modulo {
  id: string
  titulo: string
  descricao: string | null
  dificuldade: NivelDificuldade
  pontos_conclusao: number
  duracao_minutos: number | null
  ordem: number
  thumbnail_url: string | null
}

const DIFICULDADE_LABELS: Record<NivelDificuldade, string> = {
  basico: 'Básico',
  intermedio: 'Intermédio',
  avancado: 'Avançado',
}

interface Props {
  modulo?: Modulo
}

export function ModuloForm({ modulo }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const modoEditar = !!modulo

  const [titulo, setTitulo] = useState(modulo?.titulo ?? '')
  const [descricao, setDescricao] = useState(modulo?.descricao ?? '')
  const [dificuldade, setDificuldade] = useState<NivelDificuldade>(modulo?.dificuldade ?? 'basico')
  const [pontosConclusao, setPontosConclusao] = useState<string>(
    String(modulo?.pontos_conclusao ?? 10),
  )
  const [duracaoMinutos, setDuracaoMinutos] = useState<string>(
    modulo?.duracao_minutos != null ? String(modulo.duracao_minutos) : '',
  )
  const [ordem, setOrdem] = useState<string>(String(modulo?.ordem ?? 0))
  const [thumbnailUrl, setThumbnailUrl] = useState(modulo?.thumbnail_url ?? '')

  useEffect(() => {
    if (!open) return
    setErro(null)
    setTitulo(modulo?.titulo ?? '')
    setDescricao(modulo?.descricao ?? '')
    setDificuldade(modulo?.dificuldade ?? 'basico')
    setPontosConclusao(String(modulo?.pontos_conclusao ?? 10))
    setDuracaoMinutos(modulo?.duracao_minutos != null ? String(modulo.duracao_minutos) : '')
    setOrdem(String(modulo?.ordem ?? 0))
    setThumbnailUrl(modulo?.thumbnail_url ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    startTransition(async () => {
      const payload = {
        titulo,
        descricao,
        dificuldade,
        pontos_conclusao: pontosConclusao,
        duracao_minutos: duracaoMinutos,
        ordem,
        thumbnail_url: thumbnailUrl,
      }

      const res = modoEditar
        ? await atualizarModulo({ id: modulo.id, ...payload })
        : await criarModulo(payload)

      if (!res.ok) {
        setErro(res.erro)
        return
      }

      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {modoEditar ? (
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Editar módulo"
          >
            <Pencil className="h-4 w-4" />
          </button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Novo módulo
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{modoEditar ? 'Editar módulo' : 'Novo módulo'}</DialogTitle>
          <DialogDescription>
            {modoEditar
              ? 'Atualiza os campos do módulo. As aulas geram-se em /admin/modulos/{id}.'
              : 'Cria um módulo novo. Começa em estado "rascunho" — publica quando estiver pronto.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {erro && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {erro}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descricao">Descrição</Label>
            <textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={2000}
              rows={3}
              className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dificuldade">Dificuldade *</Label>
              <select
                id="dificuldade"
                value={dificuldade}
                onChange={(e) => setDificuldade(e.target.value as NivelDificuldade)}
                className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(Object.keys(DIFICULDADE_LABELS) as NivelDificuldade[]).map((d) => (
                  <option key={d} value={d}>
                    {DIFICULDADE_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ordem">Ordem</Label>
              <Input
                id="ordem"
                type="number"
                min={0}
                value={ordem}
                onChange={(e) => setOrdem(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pontosConclusao">Pontos ao concluir</Label>
              <Input
                id="pontosConclusao"
                type="number"
                min={0}
                value={pontosConclusao}
                onChange={(e) => setPontosConclusao(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="duracaoMinutos">Duração (min)</Label>
              <Input
                id="duracaoMinutos"
                type="number"
                min={0}
                value={duracaoMinutos}
                onChange={(e) => setDuracaoMinutos(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="thumbnailUrl">Thumbnail (URL)</Label>
            <Input
              id="thumbnailUrl"
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending || !titulo.trim()}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending
                ? modoEditar
                  ? 'A guardar...'
                  : 'A criar...'
                : modoEditar
                  ? 'Guardar'
                  : 'Criar módulo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
