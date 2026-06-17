import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Cookie sentinel que sinaliza ao middleware "este utilizador está num
 * fluxo de recovery de password e ainda não definiu a nova". Enquanto
 * estiver presente, o middleware redireciona qualquer navegação para
 * `/redefinir-palavra-passe`, impedindo o link de reset de funcionar
 * como bypass de login.
 *
 * É set aqui (no callback) e limpo na action `updateUser` após reset
 * bem-sucedido (ou no logout).
 */
export const PWD_RESET_COOKIE = 'pwd_reset_required'
/** 30 min — tempo suficiente para o user mudar a password sem stress. */
const PWD_RESET_COOKIE_MAX_AGE = 60 * 30

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/aluno'
  const type = searchParams.get('type') // 'recovery' quando vem do reset password

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`)

      // Se este callback foi disparado por um link de recovery de
      // password, marcar a sessão como "pendente de mudança de pwd".
      if (type === 'recovery') {
        response.cookies.set(PWD_RESET_COOKIE, '1', {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: PWD_RESET_COOKIE_MAX_AGE,
        })
      }

      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
