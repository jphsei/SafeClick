'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { type PapelUtilizador } from '@/lib/types/database.types'

// Esta página já não é usada — a verificação 2FA é feita por email OTP
// durante o login. Redireciona para o dashboard adequado caso alguém
// chegue aqui por algum motivo (bookmark antigo, link stale, etc.).
export default function ConfigurarMfaPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function redirect() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: perfilData } = await supabase
        .from('perfis')
        .select('papel')
        .eq('id', user.id)
        .single()

      const papel = (perfilData as { papel: PapelUtilizador } | null)?.papel
      if (papel === 'professor') router.push('/professor')
      else if (papel === 'administrador') router.push('/admin')
      else router.push('/aluno')
      router.refresh()
    }
    redirect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col items-center gap-3 py-8 text-slate-500">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <p className="text-sm">A redirecionar...</p>
    </div>
  )
}
