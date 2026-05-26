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
import { desativarEscola, reativarEscola } from './actions'

interface Props {
  escolaId: string
  nomeEscola: string
  ativo: boolean
}

export function DesativarEscolaButton({ escolaId, nomeEscola, ativo }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const res = ativo
        ? await desativarEscola({ id: escolaId })
        : await reativarEscola({ id: escolaId })

      if (res.ok) router.refresh()
    })
  }

  // Reativar é uma ação não-destrutiva — não precisa de confirmação
  if (!ativo) {
    return (
      <button
        onClick={handleClick}
        disabled={pending}
        title="Reativar escola"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-green-50 hover:text-green-600 transition-colors disabled:opacity-50"
      >
        {pending
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <RotateCcw className="h-4 w-4" />
        }
      </button>
    )
  }

  // Desativar exige confirmação
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          disabled={pending}
          title="Desativar escola"
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
            Tens a certeza que queres desativar a escola{' '}
            <span className="font-medium text-slate-900">{nomeEscola}</span>?
            {' '}A escola deixa de estar visível mas o histórico (turmas, utilizadores)
            mantém-se. Podes reativar mais tarde.
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
