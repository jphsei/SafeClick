'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  ShieldAlert,
  Award,
  Trophy,
  Users,
  FolderOpen,
  BarChart3,
  School,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type PapelUtilizador } from '@/lib/types/database.types'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const alunoNav: NavItem[] = [
  { label: 'Dashboard', href: '/aluno', icon: LayoutDashboard },
  { label: 'Módulos', href: '/aluno/modulos', icon: BookOpen },
  { label: 'Quizzes', href: '/aluno/quizzes', icon: ClipboardList },
  { label: 'Simulações', href: '/aluno/simulacoes', icon: ShieldAlert },
  { label: 'Badges', href: '/aluno/badges', icon: Award },
  { label: 'Leaderboard', href: '/aluno/leaderboard', icon: Trophy },
]

const professorNav: NavItem[] = [
  { label: 'Dashboard', href: '/professor', icon: LayoutDashboard },
  { label: 'Turmas', href: '/professor/turmas', icon: Users },
  { label: 'Módulos', href: '/professor/modulos', icon: BookOpen },
  { label: 'Recursos', href: '/professor/recursos', icon: FolderOpen },
  { label: 'Relatórios', href: '/professor/relatorios', icon: BarChart3 },
]

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Escolas', href: '/admin/escolas', icon: School },
  { label: 'Utilizadores', href: '/admin/utilizadores', icon: Users },
  { label: 'Módulos', href: '/admin/modulos', icon: BookOpen },
  { label: 'Configurações', href: '/admin/configuracoes', icon: Settings },
]

function getNavItems(papel: PapelUtilizador): NavItem[] {
  switch (papel) {
    case 'professor': return professorNav
    case 'administrador': return adminNav
    default: return alunoNav
  }
}

interface SidebarProps {
  papel: PapelUtilizador
}

function SidebarContent({
  papel,
  onClose,
}: {
  papel: PapelUtilizador
  onClose?: () => void
}) {
  const pathname = usePathname()
  const navItems = getNavItems(papel)

  return (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-white">SafeClick</span>
            <p className="text-xs text-slate-400 leading-none mt-0.5">
              {papel === 'aluno'
                ? 'Portal do Aluno'
                : papel === 'professor'
                ? 'Portal do Professor'
                : 'Painel de Administração'}
            </p>
          </div>
        </div>
        {/* Close button (mobile only) */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white transition-colors"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== '/aluno' &&
                item.href !== '/professor' &&
                item.href !== '/admin' &&
                pathname.startsWith(item.href))

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700 px-6 py-4">
        <p className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} SafeClick
        </p>
      </div>
    </div>
  )
}

export function Sidebar({ papel }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  // Listen for toggle event from Header hamburger button
  useEffect(() => {
    const handler = () => setMobileOpen((o) => !o)
    document.addEventListener('toggle-sidebar', handler)
    return () => document.removeEventListener('toggle-sidebar', handler)
  }, [])

  // Close on route change
  const pathname = usePathname()
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-full w-64 flex-shrink-0 flex-col">
        <SidebarContent papel={papel} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative z-50 w-72 flex-shrink-0">
            <SidebarContent papel={papel} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
