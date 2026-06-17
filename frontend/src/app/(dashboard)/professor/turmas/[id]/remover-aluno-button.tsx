'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserMinus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface RemoverAlunoButtonProps {
  turmaAlunoId: string
  nomeAluno?: string
}

export function RemoverAlunoButton({ turmaAlunoId, nomeAluno }: RemoverAlunoButtonProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function handleRemover() {
    setLoading(true)
    await supabase.from('turma_alunos').update({ ativo: false }).eq('id', turmaAlunoId)

    setLoading(false)
    // router.refresh() re-corre os Server Components da rota actual
    // sem fazer full reload — o estado local de outros componentes
    // mantém-se, mas as queries do servidor são re-executadas.
    router.refresh()
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
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
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar ação</AlertDialogTitle>
          <AlertDialogDescription>
            {nomeAluno ? (
              <>
                Tens a certeza que queres remover{' '}
                <span className="font-medium text-slate-900">{nomeAluno}</span> da turma?
              </>
            ) : (
              'Tens a certeza que queres remover este aluno da turma?'
            )}{' '}
            O aluno deixa de ter acesso aos materiais da turma, mas a conta dele mantém-se.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleRemover}>Remover</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
