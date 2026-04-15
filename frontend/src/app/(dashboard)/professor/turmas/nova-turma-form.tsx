'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NovaTurmaFormProps {
  professorId: string
  escolaId: string | null
}

export function NovaTurmaForm({ professorId, escolaId }: NovaTurmaFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [anoLetivo, setAnoLetivo] = useState('2025/2026')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return

    setLoading(true)
    setError(null)

    // Diagnóstico: verificar se o browser está autenticado
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      setLoading(false)
      setError('Sessão expirada. Volta a fazer login.')
      return
    }
    console.log('[NovaTurma] user.id =', currentUser.id, '| professorId =', professorId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase.from('turmas') as any).insert({
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      ano_letivo: anoLetivo.trim() || '2025/2026',
      professor_id: professorId,
      ...(escolaId ? { escola_id: escolaId } : {}),
    })

    setLoading(false)

    if (insertError) {
      console.error('[NovaTurma] insertError:', insertError)
      setError(`Erro: ${insertError.message}`)
      return
    }

    setNome('')
    setDescricao('')
    setAnoLetivo('2025/2026')
    setOpen(false)
    window.location.href = '/professor/turmas'
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nova turma
      </Button>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Nova turma</h3>
        <button
          onClick={() => { setOpen(false); setError(null) }}
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
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome da turma *</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: 10º A, Turma de Informática"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="anoLetivo">Ano letivo</Label>
          <Input
            id="anoLetivo"
            value={anoLetivo}
            onChange={(e) => setAnoLetivo(e.target.value)}
            placeholder="Ex: 2025/2026"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="descricao">Descrição (opcional)</Label>
          <Input
            id="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descrição breve da turma"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={loading || !nome.trim()}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'A criar...' : 'Criar turma'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => { setOpen(false); setError(null) }}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
