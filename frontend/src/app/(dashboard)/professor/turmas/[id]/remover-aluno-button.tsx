'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserMinus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface RemoverAlunoButtonProps {
  turmaAlunoId: string
}

export function RemoverAlunoButton({ turmaAlunoId }: RemoverAlunoButtonProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function handleRemover() {
    if (!confirm('Tens a certeza que queres remover este aluno da turma?')) return

    setLoading(true)
    await supabase
      .from('turma_alunos')
      .update({ ativo: false })
      .eq('id', turmaAlunoId)

    setLoading(false)
    // router.refresh() re-corre os Server Components da rota actual
    // sem fazer full reload — o estado local de outros componentes
    // mantém-se, mas as queries do servidor são re-executadas.
    router.refresh()
  }

  return (
    <button
      onClick={handleRemover}
      disabled={loading}
      className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
      title="Remover da turma"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <UserMinus className="h-4 w-4" />
      )}
    </button>
  )
}
