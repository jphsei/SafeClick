import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { PWD_RESET_COOKIE } from '@/app/auth/callback/route'
import { buildCsp, generateNonce } from '@/lib/csp'

const PROTECTED_ROUTES = ['/aluno', '/professor', '/admin']
const AUTH_ROUTES = ['/login', '/registo']

/** Rota onde o utilizador define a nova password — única autorizada
 *  enquanto o cookie `pwd_reset_required` estiver setado. */
const RESET_PWD_ROUTE = '/redefinir-palavra-passe'

export async function proxy(request: NextRequest) {
  // ── 0. Gerar nonce e construir CSP ─────────────────────────────────────────
  // Logic de buildCsp extraída para lib/csp.ts para ser testável sem
  // mock do NextRequest.
  const nonce = generateNonce()
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV !== 'production',
    supabaseOrigin: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    // Turnstile script externo (challenges.cloudflare.com) é
    // carregado por `components/auth/turnstile.tsx` quando o sitekey
    // está configurado. Sem isto no CSP, o script seria bloqueado
    // e o widget não renderizava.
    turnstileEnabled: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY),
  })

  // Passamos o nonce ao Next.js via x-nonce no request header. Para isto
  // funcionar, o request modificado tem de chegar ao `NextResponse.next`
  // — o `updateSession` aceita o parâmetro `requestHeaders` precisamente
  // para esse fim.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const { supabaseResponse, user, supabase } = await updateSession(request, requestHeaders)
  const pathname = request.nextUrl.pathname

  // ── 1. Utilizador em fluxo de recovery: forçar /redefinir-palavra-passe ──
  const pwdResetRequired = request.cookies.get(PWD_RESET_COOKIE)?.value === '1'
  if (
    pwdResetRequired &&
    pathname !== RESET_PWD_ROUTE &&
    !pathname.startsWith('/auth/') &&
    !pathname.startsWith('/api/')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = RESET_PWD_ROUTE
    const r = NextResponse.redirect(url)
    r.headers.set('Content-Security-Policy', csp)
    return r
  }

  const isProtectedRoute = PROTECTED_ROUTES.some((r) => pathname.startsWith(r))
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r))

  // ── 2. Rotas protegidas exigem sessão ─────────────────────────────────────
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const r = NextResponse.redirect(url)
    r.headers.set('Content-Security-Policy', csp)
    return r
  }

  // ── 3. Utilizador autenticado não deve ver login/registo ──────────────────
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
    const r = NextResponse.redirect(url)
    r.headers.set('Content-Security-Policy', csp)
    return r
  }

  // Injectar CSP na resposta final
  supabaseResponse.headers.set('Content-Security-Policy', csp)
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
