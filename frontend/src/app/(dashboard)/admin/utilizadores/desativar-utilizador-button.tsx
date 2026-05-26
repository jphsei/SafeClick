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
import { desativarUtilizador, reativarUtilizador } from './actions'

interface Props {
  utilizadorId: string
  nomeUtilizador: string
  ativo: boolean
  /** Se for o próprio admin logado, esconde o botão para evitar lock-out. */
  isCurrentUser: boolean
}

export function DesativarUtilizadorButton({
  utilizadorId,
  nomeUtilizador,
  ativo,
  isCurrentUser,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  // Salvaguarda contra desativar a própria conta — a server action também
  // verifica, mas escondemos o botão por convivência da UI.
  if (isCurrentUser) return null

  function handleClick() {
    startTransition(async () => {
      const res = ativo
        ? await desativarUtilizador({ id: utilizadorId })
        : await reativarUtilizador({ id: utilizadorId })

      if (res.ok) router.refresh()
    })
  }

  if (!ativo) {
    return (
      <button
        onClick={handleClick}
        disabled={pending}
        title="Reativar utilizador"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-green-50 hover:text-green-600 transition-colors disabled:opacity-50"
      >
        {pending
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <RotateCcw className="h-4 w-4" />
        }
      </button>
    )
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          disabled={pending}
          title="Desativar utilizador"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          {pending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Power className="h-4 w-4" />
          }
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar ação</AlertDialogTitle>
          <AlertDialogDescription>
            Tens a certeza que queres desativar{' '}
            <span className="font-medium text-slate-900">{nomeUtilizador}</span>?
            {' '}A conta deixa de poder fazer login mas o histórico (turmas,
            quizzes, badges) mantém-se. Podes reativar mais tarde.
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
