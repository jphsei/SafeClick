import { createClient } from '@supabase/supabase-js'
import { type Database } from '@/lib/types/database.types'

/**
 * Supabase admin client — usa a service-role key, que ignora RLS.
 * Usar EXCLUSIVAMENTE em API routes server-side. Nunca expor ao browser.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
