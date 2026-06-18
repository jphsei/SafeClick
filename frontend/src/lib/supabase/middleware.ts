import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { type Database } from '@/lib/types/database.types'

/**
 * `updateSession` — refresh do token Supabase via middleware.
 *
 * O parâmetro opcional `requestHeaders` permite ao caller (proxy.ts)
 * injectar headers no request que serão propagados para o Next.js
 * via `NextResponse.next({ request: { headers } })`. Isto é
 * essencial para a CSP nonce-based: o Next.js lê `x-nonce` do
 * request para injectar `nonce="..."` nos seus scripts internos
 * (hidratação, prefetch, etc.). Sem este pass-through, a CSP
 * estrita bloqueia os scripts do framework.
 */
export async function updateSession(
  request: NextRequest,
  requestHeaders?: Headers,
) {
  let supabaseResponse = NextResponse.next({
    request: requestHeaders ? { headers: requestHeaders } : request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: requestHeaders ? { headers: requestHeaders } : request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh session - important: do not add logic between createServerClient and supabase.auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user, supabase }
}
