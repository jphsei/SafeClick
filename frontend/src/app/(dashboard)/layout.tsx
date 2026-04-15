import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { type PapelUtilizador } from '@/lib/types/database.types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfilRaw } = await supabase
    .from('perfis')
    .select('nome_completo, papel, email')
    .eq('id', user.id)
    .single()

  const perfil = perfilRaw as { nome_completo: string; papel: PapelUtilizador; email: string } | null

  const papel: PapelUtilizador = perfil?.papel ?? 'aluno'
  const nomeCompleto: string = perfil?.nome_completo ?? 'Utilizador'
  const email: string = perfil?.email ?? user.email ?? ''

  const { count: notificacoesNaoLidas } = await supabase
    .from('notificacoes')
    .select('*', { count: 'exact', head: true })
    .eq('utilizador_id', user.id)
    .eq('lida', false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <Sidebar papel={papel} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header
          nomeUtilizador={nomeCompleto}
          email={email}
          notificacoesNaoLidas={notificacoesNaoLidas ?? 0}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
