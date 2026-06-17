import { Settings, Database, Shield, Bell, Globe } from 'lucide-react'
import { requireRole } from '@/lib/auth/require-role'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getAppVersion, getMigrationsCount } from '@/lib/platform-info'

export default async function AdminConfiguracoesPage() {
  await requireRole('administrador')

  // Dados reais (em vez dos placeholders hardcoded de antes)
  const version = getAppVersion()
  const migrationsCount = await getMigrationsCount()

  const sections = [
    {
      icon: Database,
      title: 'Base de dados',
      description: 'Gestão de dados e backups',
      items: [
        { label: 'Motor', value: 'PostgreSQL (Supabase)' },
        { label: 'RLS', value: 'Ativo em todas as tabelas' },
        {
          label: 'Migrações',
          value: migrationsCount != null ? `${migrationsCount} no repositório` : '—',
        },
      ],
    },
    {
      icon: Shield,
      title: 'Autenticação',
      description: 'Configurações de acesso',
      items: [
        { label: 'Provedor', value: 'Supabase Auth' },
        { label: 'Email/Password', value: 'Ativo' },
        { label: '2FA (professor/admin)', value: 'OTP por email' },
      ],
    },
    {
      icon: Bell,
      title: 'Notificações',
      description: 'Sistema de notificações',
      items: [{ label: 'Notificações in-app', value: 'Disponíveis' }],
    },
    {
      icon: Globe,
      title: 'Plataforma',
      description: 'Informações gerais',
      items: [
        { label: 'Versão', value: version },
        { label: 'Framework', value: 'Next.js 16 + TypeScript' },
        { label: 'Idioma', value: 'Português (PT)' },
      ],
    },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 mt-1">Informações e configurações da plataforma.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Card key={section.title}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className="h-4 w-4 text-blue-600" />
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {section.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <span className="text-sm font-medium text-slate-900">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-start gap-3 pt-5">
          <Settings className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Configurações avançadas</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Funcionalidades como gestão de chaves API, SMTP personalizado e webhooks ainda não
              estão expostas nesta UI — geríveis directamente no Studio do Supabase.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
