import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED_ROUTES = ['/aluno', '/professor', '/admin']
const AUTH_ROUTES = ['/login', '/registo']

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  )
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

  // Unauthenticated user trying to access protected route
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Authenticated user trying to access auth routes - redirect to their dashboard
  if (isAuthRoute && user) {
    const { data: perfilRaw } = await supabase
      .from('perfis')
      .select('papel')
      .eq('id', user.id)
      .single()

    const perfil = perfilRaw as { papel: string } | null

    const url = request.nextUrl.clone()
    if (perfil?.papel === 'professor') {
      url.pathname = '/professor'
    } else if (perfil?.papel === 'administrador') {
      url.pathname = '/admin'
    } else {
      url.pathname = '/aluno'
    }
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
