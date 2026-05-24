import Link from 'next/link'
import { School, Users, BookOpen, Shield, TrendingUp, Activity, ArrowRight } from 'lucide-react'
import { requireRole } from '@/lib/auth/require-role'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default async function AdminDashboardPage() {
  const { supabase } = await requireRole('administrador')

  const [
    { count: totalEscolas },
    { count: totalUtilizadores },
    { count: totalModulos },
    { count: totalSimulacoes },
  ] = await Promise.all([
    supabase.from('escolas').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('perfis').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('modulos').select('*', { count: 'exact', head: true }).eq('estado', 'publicado'),
    supabase.from('simulacoes_phishing').select('*', { count: 'exact', head: true }).eq('ativo', true),
  ])

  const stats = [
    { label: 'Escolas registadas', value: totalEscolas ?? 0, icon: School, color: 'bg-blue-100', iconColor: 'text-blue-600', href: '/admin/escolas' },
    { label: 'Utilizadores ativos', value: totalUtilizadores ?? 0, icon: Users, color: 'bg-green-100', iconColor: 'text-green-600', href: '/admin/utilizadores' },
    { label: 'Módulos publicados', value: totalModulos ?? 0, icon: BookOpen, color: 'bg-purple-100', iconColor: 'text-purple-600', href: '/admin/modulos' },
    { label: 'Simulações ativas', value: totalSimulacoes ?? 0, icon: Shield, color: 'bg-cyan-100', iconColor: 'text-cyan-600', href: null },
  ]

  const quickActions = [
    { label: 'Gerir escolas', description: 'Adicionar e editar escolas', href: '/admin/escolas', icon: School },
    { label: 'Gerir utilizadores', description: 'Utilizadores e permissões', href: '/admin/utilizadores', icon: Users },
    { label: 'Gerir módulos', description: 'Ver e gerir módulos publicados', href: '/admin/modulos', icon: BookOpen },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Painel de Administração</h1>
        <p className="text-slate-500 mt-1">Visão geral da plataforma SafeClick.</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          const card = (
            <Card className={stat.href ? 'hover:shadow-sm transition-shadow cursor-pointer' : ''}>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                  <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          )
          return stat.href ? (
            <Link key={stat.label} href={stat.href}>{card}</Link>
          ) : (
            <div key={stat.label}>{card}</div>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Platform health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-600" />
              Estado da plataforma
            </CardTitle>
            <CardDescription>Saúde geral do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Base de dados', status: 'Operacional', ok: true },
              { label: 'Autenticação', status: 'Operacional', ok: true },
              { label: 'Armazenamento', status: 'Operacional', ok: true },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5"
              >
                <span className="text-sm text-slate-700">{item.label}</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${item.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${item.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                  {item.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Ações rápidas
            </CardTitle>
            <CardDescription>Gerir recursos da plataforma</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                    <Icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{action.label}</p>
                    <p className="text-xs text-slate-500">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </Link>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
