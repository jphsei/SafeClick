'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck, Loader2 } from 'lucide-react'
import { marcarTodasComoLidas } from './actions'

export function NotificationsListActions() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await marcarTodasComoLidas()
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
    >
      {pending
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : <CheckCheck className="h-4 w-4" />
      }
      Marcar todas como lidas
    </button>
  )
}
