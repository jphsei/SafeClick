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
import { criarEscola, atualizarEscola } from './actions'

interface Escola {
  id: string
  nome: string
  morada: string | null
  cidade: string | null
  codigo_postal: string | null
  telefone: string | null
  email: string | null
}

interface EscolaFormProps {
  /** Se passado, o form abre em modo "editar". Caso contrário, modo "criar". */
  escola?: Escola
  /** Renderiza o trigger pequeno (ícone só) para uso em tabelas. */
  triggerVariant?: 'default' | 'icon'
}

export function EscolaForm({ escola, triggerVariant = 'default' }: EscolaFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  // Estado controlado dos campos (pré-preenchidos no modo editar)
  const [nome, setNome]                 = useState(escola?.nome ?? '')
  const [morada, setMorada]             = useState(escola?.morada ?? '')
  const [cidade, setCidade]             = useState(escola?.cidade ?? '')
  const [codigoPostal, setCodigoPostal] = useState(escola?.codigo_postal ?? '')
  const [telefone, setTelefone]         = useState(escola?.telefone ?? '')
  const [email, setEmail]               = useState(escola?.email ?? '')

  const modoEditar = !!escola

  // Cada vez que o modal abre, ressincronizar os campos com os props
  // originais. Sem isto, alterações locais não-guardadas persistiriam
  // entre aberturas do mesmo modal (UX confusa).
  useEffect(() => {
    if (!open) return
    setErro(null)
    setNome(escola?.nome ?? '')
    setMorada(escola?.morada ?? '')
    setCidade(escola?.cidade ?? '')
    setCodigoPostal(escola?.codigo_postal ?? '')
    setTelefone(escola?.telefone ?? '')
    setEmail(escola?.email ?? '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    startTransition(async () => {
      const payload = {
        nome,
        morada,
        cidade,
        codigo_postal: codigoPostal,
        telefone,
        email,
      }

      const res = modoEditar
        ? await atualizarEscola({ id: escola.id, ...payload })
        : await criarEscola(payload)

      if (!res.ok) {
        setErro(res.erro)
        return
      }

      setOpen(false)
      router.refresh()

      // Reset do estado se foi criação
      if (!modoEditar) {
        setNome(''); setMorada(''); setCidade('')
        setCodigoPostal(''); setTelefone(''); setEmail('')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {modoEditar ? (
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Editar escola"
          >
            <Pencil className="h-4 w-4" />
          </button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Nova escola
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{modoEditar ? 'Editar escola' : 'Nova escola'}</DialogTitle>
          <DialogDescription>
            {modoEditar
              ? 'Atualiza os dados da escola. Só o nome é obrigatório.'
              : 'Adiciona uma nova escola à plataforma. Só o nome é obrigatório.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {erro && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {erro}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                maxLength={200}
                autoFocus
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="Ex: 219 999 999"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="morada">Morada</Label>
              <Input
                id="morada"
                value={morada}
                onChange={(e) => setMorada(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="codigoPostal">Código postal</Label>
              <Input
                id="codigoPostal"
                value={codigoPostal}
                onChange={(e) => setCodigoPostal(e.target.value)}
                placeholder="0000-000"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="escola@example.pt"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={pending || !nome.trim()}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending
                ? (modoEditar ? 'A guardar...' : 'A criar...')
                : (modoEditar ? 'Guardar' : 'Criar escola')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
