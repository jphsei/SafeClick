'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil } from 'lucide-react'
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
import { type PapelUtilizador } from '@/lib/types/database.types'
import { atualizarMeuPerfil } from './actions'

interface Props {
  perfil: {
    nome_completo: string
    email: string
    papel: PapelUtilizador
    numero_aluno: string | null
  }
}

export function EditPerfilForm({ perfil }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const [nomeCompleto, setNomeCompleto] = useState(perfil.nome_completo)
  const [numeroAluno, setNumeroAluno] = useState(perfil.numero_aluno ?? '')

  // Ressincronizar ao abrir
  useEffect(() => {
    if (!open) return
    setErro(null)
    setNomeCompleto(perfil.nome_completo)
    setNumeroAluno(perfil.numero_aluno ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    startTransition(async () => {
      const res = await atualizarMeuPerfil({
        nome_completo: nomeCompleto,
        numero_aluno: numeroAluno,
      })

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
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4" />
          Editar perfil
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
          <DialogDescription>
            Atualiza os teus dados. Email, papel e escola não são editáveis aqui — fala com um
            administrador se precisares de mudar algum.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {erro && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {erro}
            </div>
          )}

          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="nomeCompleto">Nome completo *</Label>
            <Input
              id="nomeCompleto"
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              required
              maxLength={200}
              autoFocus
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={perfil.email} disabled />
            <p className="text-xs text-slate-400">
              Para alterar o email, contacta um administrador.
            </p>
          </div>

          {/* Número de aluno (só para alunos) */}
          {perfil.papel === 'aluno' && (
            <div className="space-y-1.5">
              <Label htmlFor="numeroAluno">Número de aluno</Label>
              <Input
                id="numeroAluno"
                value={numeroAluno}
                onChange={(e) => setNumeroAluno(e.target.value)}
                maxLength={50}
                placeholder="Opcional"
              />
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending || !nomeCompleto.trim()}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? 'A guardar...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
