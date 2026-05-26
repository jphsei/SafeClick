'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Info,
  CheckCircle,
  AlertTriangle,
  Trophy,
  BellOff,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { tempoRelativo } from '@/lib/relative-time'
import { marcarComoLida, marcarTodasComoLidas } from '@/app/(dashboard)/notificacoes/actions'

export interface NotificacaoItem {
  id: string
  titulo: string
  mensagem: string
  lida: boolean
  tipo: string
  url_destino: string | null
  criado_em: string
}

interface Props {
  notificacoes: NotificacaoItem[]
  naoLidas: number
}

const TIPO_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  info:       Info,
  sucesso:    CheckCircle,
  aviso:      AlertTriangle,
  conquista:  Trophy,
}

const TIPO_COLOR: Record<string, string> = {
  info:       'text-blue-500',
  sucesso:    'text-green-500',
  aviso:      'text-yellow-500',
  conquista:  'text-purple-500',
}

export function NotificationsPopover({ notificacoes, naoLidas }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleClickItem(notif: NotificacaoItem) {
    setOpen(false)

    // Marcar como lida em background (não bloqueia a navegação)
    if (!notif.lida) {
      startTransition(async () => {
        await marcarComoLida({ id: notif.id })
        router.refresh()
      })
    }

    // Navegar se tem destino
    if (notif.url_destino) {
      router.push(notif.url_destino)
    }
  }

  function handleMarcarTodas() {
    startTransition(async () => {
      await marcarTodasComoLidas()
      router.refresh()
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-900">Notificações</p>
          {naoLidas > 0 && (
            <button
              onClick={handleMarcarTodas}
              disabled={pending}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
            >
              {pending && <Loader2 className="h-3 w-3 animate-spin" />}
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* Lista */}
        <div className="max-h-[400px] overflow-y-auto">
          {notificacoes.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <BellOff className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Sem notificações.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notificacoes.map((notif) => {
                const Icon = TIPO_ICON[notif.tipo] ?? Info
                const colorClass = TIPO_COLOR[notif.tipo] ?? 'text-blue-500'

                return (
                  <li key={notif.id}>
                    <button
                      onClick={() => handleClickItem(notif)}
                      disabled={pending}
                      className={`w-full text-left flex items-start gap-2.5 px-4 py-3 hover:bg-slate-50 transition-colors disabled:opacity-50 ${notif.lida ? '' : 'bg-blue-50/40'}`}
                    >
                      <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${colorClass}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-tight truncate ${notif.lida ? 'text-slate-700' : 'font-medium text-slate-900'}`}>
                          {notif.titulo}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {notif.mensagem}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {tempoRelativo(notif.criado_em)}
                        </p>
                      </div>
                      {!notif.lida && (
                        <span className="flex-shrink-0 mt-1.5 h-2 w-2 rounded-full bg-blue-600" aria-hidden />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100">
          <Link
            href="/notificacoes"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 px-4 py-2.5 text-sm text-blue-600 hover:bg-slate-50 transition-colors"
          >
            Ver todas
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
