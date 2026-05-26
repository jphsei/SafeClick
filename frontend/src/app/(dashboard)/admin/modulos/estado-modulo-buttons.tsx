'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send, EyeOff, Archive, RotateCcw, Loader2 } from 'lucide-react'
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
import { type EstadoModulo } from '@/lib/types/database.types'
import { mudarEstadoModulo } from './actions'

interface Props {
  moduloId: string
  tituloModulo: string
  estado: EstadoModulo
}

/**
 * Conjunto de botões para mudar o estado de um módulo.
 * Botões disponíveis variam consoante o estado actual:
 *
 *  rascunho  → [Publicar] [Arquivar]
 *  publicado → [Despublicar] [Arquivar]
 *  arquivado → [Desarquivar (volta a rascunho)]
 *
 * "Arquivar" e "Despublicar publicado" exigem confirmação porque
 * têm impacto visível para os alunos.
 */
export function EstadoModuloButtons({ moduloId, tituloModulo, estado }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function mudar(novoEstado: EstadoModulo) {
    startTransition(async () => {
      const res = await mudarEstadoModulo({ id: moduloId, estado: novoEstado })
      if (res.ok) router.refresh()
    })
  }

  if (estado === 'arquivado') {
    return (
      <button
        onClick={() => mudar('rascunho')}
        disabled={pending}
        title="Desarquivar (volta a rascunho)"
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
    <>
      {/* Publicar / Despublicar */}
      {estado === 'rascunho' ? (
        <button
          onClick={() => mudar('publicado')}
          disabled={pending}
          title="Publicar módulo"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-50"
        >
          {pending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Send className="h-4 w-4" />
          }
        </button>
      ) : (
        // Despublicar (publicado → rascunho) precisa de confirmação
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={pending}
              title="Despublicar (esconde dos alunos)"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-yellow-50 hover:text-yellow-600 transition-colors disabled:opacity-50"
            >
              {pending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <EyeOff className="h-4 w-4" />
              }
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Despublicar módulo</AlertDialogTitle>
              <AlertDialogDescription>
                Despublicar <span className="font-medium text-slate-900">{tituloModulo}</span>?
                {' '}O módulo volta a estado "rascunho" e deixa de ser visível
                para os alunos. Progresso existente preservado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => mudar('rascunho')}>
                Despublicar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Arquivar (sempre com confirmação) */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            disabled={pending}
            title="Arquivar módulo"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            {pending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Archive className="h-4 w-4" />
            }
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar módulo</AlertDialogTitle>
            <AlertDialogDescription>
              Arquivar <span className="font-medium text-slate-900">{tituloModulo}</span>?
              {' '}O módulo deixa de aparecer (alunos e admin) mas o histórico
              (aulas, quizzes, tentativas) mantém-se. Pode-se desarquivar
              depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => mudar('arquivado')}>
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
