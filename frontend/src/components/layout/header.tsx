'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, LogOut, User, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { NotificationsPopover, type NotificacaoItem } from './notifications-popover'

interface HeaderProps {
  nomeUtilizador: string
  email: string
  notificacoesNaoLidas?: number
  notificacoes?: NotificacaoItem[]
}

export function Header({
  nomeUtilizador,
  email,
  notificacoesNaoLidas = 0,
  notificacoes = [],
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const initials = nomeUtilizador
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 flex-shrink-0">
      {/* Mobile: hamburger */}
      <button
        className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        onClick={() => {
          // Toggle sidebar visibility on mobile via custom event
          document.dispatchEvent(new CustomEvent('toggle-sidebar'))
        }}
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop: empty left side */}
      <div className="hidden md:block" />

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <NotificationsPopover notificacoes={notificacoes} naoLidas={notificacoesNaoLidas} />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-slate-900 leading-none">
                {nomeUtilizador.split(' ')[0]}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 max-w-[120px] truncate">{email}</p>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-slate-400 transition-transform hidden sm:block',
                dropdownOpen && 'rotate-180',
              )}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                <div className="px-3 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900 truncate">{nomeUtilizador}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{email}</p>
                </div>
                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    router.push('/perfil')
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <User className="h-4 w-4 text-slate-400" />O meu perfil
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Terminar sessão
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
