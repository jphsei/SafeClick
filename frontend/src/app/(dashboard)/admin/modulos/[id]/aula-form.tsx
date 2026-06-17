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
import { criarAula, atualizarAula } from './actions'

interface Aula {
  id: string
  titulo: string
  conteudo: string | null
  video_url: string | null
  ordem: number
  duracao_minutos: number | null
  pontos: number
}

interface Props {
  moduloId: string
  aula?: Aula
  /** Próxima `ordem` sugerida (último + 1) — só usada em modo "criar". */
  proximaOrdem?: number
}

export function AulaForm({ moduloId, aula, proximaOrdem }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const modoEditar = !!aula

  const [titulo, setTitulo] = useState(aula?.titulo ?? '')
  const [conteudo, setConteudo] = useState(aula?.conteudo ?? '')
  const [videoUrl, setVideoUrl] = useState(aula?.video_url ?? '')
  const [ordem, setOrdem] = useState<string>(String(aula?.ordem ?? proximaOrdem ?? 0))
  const [duracaoMinutos, setDuracaoMinutos] = useState<string>(
    aula?.duracao_minutos != null ? String(aula.duracao_minutos) : '',
  )
  const [pontos, setPontos] = useState<string>(String(aula?.pontos ?? 5))

  useEffect(() => {
    if (!open) return
    setErro(null)
    setTitulo(aula?.titulo ?? '')
    setConteudo(aula?.conteudo ?? '')
    setVideoUrl(aula?.video_url ?? '')
    setOrdem(String(aula?.ordem ?? proximaOrdem ?? 0))
    setDuracaoMinutos(aula?.duracao_minutos != null ? String(aula.duracao_minutos) : '')
    setPontos(String(aula?.pontos ?? 5))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    startTransition(async () => {
      const payload = {
        titulo,
        conteudo,
        video_url: videoUrl,
        ordem,
        duracao_minutos: duracaoMinutos,
        pontos,
      }

      const res = modoEditar
        ? await atualizarAula({ id: aula.id, ...payload })
        : await criarAula({ modulo_id: moduloId, ...payload })

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
            title="Editar aula"
          >
            <Pencil className="h-4 w-4" />
          </button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Nova aula
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{modoEditar ? 'Editar aula' : 'Nova aula'}</DialogTitle>
          <DialogDescription>
            {modoEditar
              ? 'Atualiza os campos da aula. Conteúdo aceita HTML/Markdown.'
              : 'Cria uma aula dentro deste módulo. A ordem decide a sequência apresentada aos alunos.'}
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
            <Label htmlFor="conteudo">Conteúdo</Label>
            <textarea
              id="conteudo"
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              maxLength={50000}
              rows={6}
              placeholder="Conteúdo em HTML ou Markdown..."
              className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="videoUrl">URL do vídeo</Label>
            <Input
              id="videoUrl"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/..."
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
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
            <div className="space-y-1.5">
              <Label htmlFor="pontos">Pontos</Label>
              <Input
                id="pontos"
                type="number"
                min={0}
                value={pontos}
                onChange={(e) => setPontos(e.target.value)}
              />
            </div>
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
                  : 'Criar aula'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
