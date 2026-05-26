import 'server-only'
import { type SupabaseClient } from '@supabase/supabase-js'
import { type Database } from '@/lib/types/database.types'

/**
 * Health checks para o dashboard admin.
 *
 * Cada check deve ser idempotente, rápido (<1s) e não ter efeitos
 * laterais. Devolvem `{ ok, label, detail? }` para a UI renderizar
 * com cores e texto.
 */

export interface HealthResult {
  ok: boolean
  /** Texto curto a mostrar (ex: "Operacional", "Falhou", "Sem resposta") */
  label: string
  /** Detalhe opcional para tooltip ou linha secundária */
  detail?: string
}

/**
 * Verifica que a base de dados responde a queries.
 * Faz um count rápido a uma tabela pequena (`escolas`) que serve de "ping".
 */
export async function checkDatabase(
  supabase: SupabaseClient<Database>,
): Promise<HealthResult> {
  try {
    const { error } = await supabase
      .from('escolas')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    if (error) {
      return { ok: false, label: 'Erro', detail: error.message }
    }
    return { ok: true, label: 'Operacional' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'desconhecido'
    return { ok: false, label: 'Sem resposta', detail: msg }
  }
}

/**
 * Verifica que o serviço de autenticação responde.
 * Como já passamos pelo `requireRole` antes, temos uma sessão activa —
 * usamos `getUser()` para confirmar que o token continua válido.
 */
export async function checkAuth(
  supabase: SupabaseClient<Database>,
): Promise<HealthResult> {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      return { ok: false, label: 'Erro', detail: error.message }
    }
    if (!data.user) {
      return { ok: false, label: 'Sem sessão' }
    }
    return { ok: true, label: 'Operacional' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'desconhecido'
    return { ok: false, label: 'Sem resposta', detail: msg }
  }
}
