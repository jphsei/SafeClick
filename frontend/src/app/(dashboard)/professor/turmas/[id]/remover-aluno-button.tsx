'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserMinus, Loader2 } from 'lucide-react'
import { removerAlunoDaTurma } from '../actions'
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
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleRemover() {
    setLoading(true)
    setErro(null)

    const result = await removerAlunoDaTurma({ id: turmaAlunoId })

    setLoading(false)

    if (!result.ok) {
      setErro(result.erro)
      return
    }

    router.refresh()
  }

  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (!open) setErro(null)
      }}
    >
      <AlertDialogTrigger asChild>
        <button
          disabled={loading}
          className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
          title="Remover da turma"
          aria-label={nomeAluno ? `Remover ${nomeAluno} da turma` : 'Remover aluno da turma'}
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
        {erro && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {erro}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleRemover()
            }}
            disabled={loading}
          >
            {loading ? 'A remover...' : 'Remover'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}