'use server'

import { cookies } from 'next/headers'
import { PWD_RESET_COOKIE } from '@/app/auth/callback/route'

/**
 * Limpa o cookie sentinel `pwd_reset_required` depois do utilizador
 * definir a nova password com sucesso. Sem isto, o middleware
 * continuaria a forçar redirect para /redefinir-palavra-passe.
 */
export async function clearPasswordResetCookie(): Promise<void> {
  const store = await cookies()
  store.delete(PWD_RESET_COOKIE)
}
