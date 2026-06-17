'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Pencil, Eye, EyeOff } from 'lucide-react'
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
import { PasswordStrength } from '@/components/auth/password-strength'
import { type PapelUtilizador } from '@/lib/types/database.types'
import { criarUtilizador, atualizarUtilizador } from './actions'

interface Utilizador {
  id: string
  email: string
  nome_completo: string
  papel: PapelUtilizador
  escola_id: string | null
  numero_aluno: string | null
}

interface EscolaOpt {
  id: string
  nome: string
}

interface UtilizadorFormProps {
  utilizador?: Utilizador
  escolas: EscolaOpt[]
}

const PAPEL_LABELS: Record<PapelUtilizador, string> = {
  aluno: 'Aluno',
  professor: 'Professor',
  administrador: 'Administrador',
}

export function UtilizadorForm({ utilizador, escolas }: UtilizadorFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const modoEditar = !!utilizador

  // Estado dos campos
  const [email, setEmail] = useState(utilizador?.email ?? '')
  const [password, setPassword] = useState('')
  const [nomeCompleto, setNomeCompleto] = useState(utilizador?.nome_completo ?? '')
  const [papel, setPapel] = useState<PapelUtilizador>(utilizador?.papel ?? 'aluno')
  const [escolaId, setEscolaId] = useState<string>(utilizador?.escola_id ?? '')
  const [numeroAluno, setNumeroAluno] = useState(utilizador?.numero_aluno ?? '')

  // Ressincronizar ao abrir o modal
  useEffect(() => {
    if (!open) return
    setErro(null)
    setShowPassword(false)
    setEmail(utilizador?.email ?? '')
    setPassword('')
    setNomeCompleto(utilizador?.nome_completo ?? '')
    setPapel(utilizador?.papel ?? 'aluno')
    setEscolaId(utilizador?.escola_id ?? '')
    setNumeroAluno(utilizador?.numero_aluno ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    startTransition(async () => {
      const escolaIdFinal = escolaId || null
      const numeroAlunoFinal = papel === 'aluno' ? numeroAluno : null

      const res = modoEditar
        ? await atualizarUtilizador({
            id: utilizador.id,
            nome_completo: nomeCompleto,
            papel,
            escola_id: escolaIdFinal,
            numero_aluno: numeroAlunoFinal,
          })
        : await criarUtilizador({
            email,
            password,
            nome_completo: nomeCompleto,
            papel,
            escola_id: escolaIdFinal,
            numero_aluno: numeroAlunoFinal,
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
        {modoEditar ? (
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Editar utilizador"
          >
            <Pencil className="h-4 w-4" />
          </button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Novo utilizador
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{modoEditar ? 'Editar utilizador' : 'Novo utilizador'}</DialogTitle>
          <DialogDescription>
            {modoEditar
              ? 'Edita o papel, escola e número de aluno. Email e password só podem ser alterados pelo próprio utilizador.'
              : 'Cria uma conta nova. A password é definida agora; comunica-a ao utilizador.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {erro && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {erro}
            </div>
          )}

          {/* Email (só no criar) */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required={!modoEditar}
              disabled={modoEditar}
              maxLength={200}
              autoComplete="email"
              autoFocus={!modoEditar}
            />
            {modoEditar && <p className="text-xs text-slate-400">Não editável neste fluxo.</p>}
          </div>

          {/* Password (só no criar) */}
          {!modoEditar && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
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
              autoFocus={modoEditar}
            />
          </div>

          {/* Papel */}
          <div className="space-y-1.5">
            <Label htmlFor="papel">Papel *</Label>
            <select
              id="papel"
              value={papel}
              onChange={(e) => setPapel(e.target.value as PapelUtilizador)}
              className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(Object.keys(PAPEL_LABELS) as PapelUtilizador[]).map((p) => (
                <option key={p} value={p}>
                  {PAPEL_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          {/* Escola */}
          <div className="space-y-1.5">
            <Label htmlFor="escolaId">Escola</Label>
            <select
              id="escolaId"
              value={escolaId}
              onChange={(e) => setEscolaId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Sem escola —</option>
              {escolas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Número de aluno (só para papel=aluno) */}
          {papel === 'aluno' && (
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
            <Button
              type="submit"
              disabled={
                pending || !nomeCompleto.trim() || (!modoEditar && (!email.trim() || !password))
              }
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending
                ? modoEditar
                  ? 'A guardar...'
                  : 'A criar...'
                : modoEditar
                  ? 'Guardar'
                  : 'Criar utilizador'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
