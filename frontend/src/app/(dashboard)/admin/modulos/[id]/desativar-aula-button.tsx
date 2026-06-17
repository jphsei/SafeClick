'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Power, RotateCcw, Loader2 } from 'lucide-react'
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
import { desativarAula, reativarAula } from './actions'

interface Props {
  aulaId: string
  tituloAula: string
  ativo: boolean
}

export function DesativarAulaButton({ aulaId, tituloAula, ativo }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const res = ativo ? await desativarAula({ id: aulaId }) : await reativarAula({ id: aulaId })
      if (res.ok) router.refresh()
    })
  }

  if (!ativo) {
    return (
      <button
        onClick={handleClick}
        disabled={pending}
        title="Reativar aula"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-green-50 hover:text-green-600 transition-colors disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
      </button>
    )
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          disabled={pending}
          title="Desativar aula"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desativar aula</AlertDialogTitle>
          <AlertDialogDescription>
            Desativar <span className="font-medium text-slate-900">{tituloAula}</span>? Os alunos
            deixam de ver esta aula, mas o progresso e quizzes associados mantêm-se. Reversível.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleClick}>Desativar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
