import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED_ROUTES = ['/aluno', '/professor', '/admin']
const AUTH_ROUTES = ['/login', '/registo']

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)
  const pathname = request.nextUrl.pathname

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
    url.pathname = papel === 'professor' ? '/professor' : papel === 'administrador' ? '/admin' : '/aluno'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
