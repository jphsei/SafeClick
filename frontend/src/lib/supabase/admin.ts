// `server-only` faz o build do Next.js falhar se este módulo for
// importado por qualquer client component, evitando que a chave
// SUPABASE_SERVICE_ROLE_KEY chegue ao bundle do browser. É defesa
// em profundidade — a chave já só existe em `.env.local` (no .gitignore)
// e o JSDoc abaixo avisa quem ler o ficheiro, mas isto transforma
// o aviso em enforcement automático.
import 'server-only'
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
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
