import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { PWD_RESET_COOKIE } from '@/app/auth/callback/route'

const PROTECTED_ROUTES = ['/aluno', '/professor', '/admin']
const AUTH_ROUTES = ['/login', '/registo']

/** Rota onde o utilizador define a nova password — única autorizada
 *  enquanto o cookie `pwd_reset_required` estiver setado. */
const RESET_PWD_ROUTE = '/redefinir-palavra-passe'

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // ── 0. Utilizador em fluxo de recovery: forçar /redefinir-palavra-passe ──
  // O cookie é set pelo /auth/callback quando o token vem de "Esqueci
  // a palavra-passe". Sem este redirect, o link de reset funcionava
  // como bypass de login — o exchangeCodeForSession cria sessão antes
  // do user definir a nova password, e se ele saísse da página de
  // reset, ficava com sessão válida sem nunca ter mudado a password.
  const pwdResetRequired = request.cookies.get(PWD_RESET_COOKIE)?.value === '1'
  if (
    pwdResetRequired &&
    pathname !== RESET_PWD_ROUTE &&
    !pathname.startsWith('/auth/') &&
    !pathname.startsWith('/api/')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = RESET_PWD_ROUTE
    return NextResponse.redirect(url)
  }

  const isProtectedRoute = PROTECTED_ROUTES.some((r) => pathname.startsWith(r))
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r))

  // ── 1. Rotas protegidas exigem sessão ─────────────────────────────────────
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ── 2. Utilizador autenticado não deve ver login/registo ──────────────────
  if (isAuthRoute && user) {
    const { data: perfilRaw } = await supabase
      .from('perfis')
      .select('papel')
      .eq('id', user.id)
      .single()

    const papel = (perfilRaw as { papel: string } | null)?.papel
    const url = request.nextUrl.clone()
    url.pathname =
      papel === 'professor' ? '/professor' : papel === 'administrador' ? '/admin' : '/aluno'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
