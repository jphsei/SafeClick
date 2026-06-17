'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, X, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AdicionarAlunoFormProps {
  turmaId: string
}

export function AdicionarAlunoForm({ turmaId }: AdicionarAlunoFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!identifier.trim()) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const term = identifier.trim()

    // Search by email or numero_aluno
    const isEmail = term.includes('@')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = (supabase.from('perfis') as any)
      .select('id, nome_completo, papel')
      .eq('ativo', true)
      .eq('papel', 'aluno')

    const { data: perfisData, error: searchError } = isEmail
      ? await query.eq('email', term).maybeSingle()
      : await query.eq('numero_aluno', term).maybeSingle()

    if (searchError || !perfisData) {
      setError('Aluno não encontrado. Verifica o email ou número de aluno.')
      setLoading(false)
      return
    }

    const aluno = perfisData as { id: string; nome_completo: string; papel: string }

    // Check if already enrolled
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from('turma_alunos') as any)
      .select('id, ativo')
      .eq('turma_id', turmaId)
      .eq('aluno_id', aluno.id)
      .maybeSingle()

    if (existing) {
      if (existing.ativo) {
        setError(`${aluno.nome_completo} já está inscrito nesta turma.`)
        setLoading(false)
        return
      }
      // Re-activate
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('turma_alunos') as any).update({ ativo: true }).eq('id', existing.id)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase.from('turma_alunos') as any).insert({
        turma_id: turmaId,
        aluno_id: aluno.id,
      })

      if (insertError) {
        setError('Erro ao adicionar aluno. Tenta novamente.')
        setLoading(false)
        return
      }
    }

    setSuccess(`${aluno.nome_completo} adicionado com sucesso!`)
    setIdentifier('')
    setLoading(false)
    // Refresca os Server Components da rota actual sem full reload —
    // a lista de alunos atualiza-se a partir da BD.
    router.refresh()
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Adicionar aluno
      </Button>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm w-full sm:w-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Adicionar aluno</h3>
        <button
          onClick={() => {
            setOpen(false)
            setError(null)
            setSuccess(null)
          }}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-3 rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 text-sm text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="identifier">Email ou número de aluno</Label>
          <Input
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="email@escola.pt ou 22405828"
            required
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={loading || !identifier.trim()}
            size="sm"
            className="flex-1"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {loading ? 'A adicionar...' : 'Adicionar'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setOpen(false)
              setError(null)
              setSuccess(null)
            }}
          >
            Fechar
          </Button>
        </div>
      </form>
    </div>
  )
}
