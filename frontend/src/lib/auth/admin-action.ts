import 'server-only'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/require-role'
import { type User, type SupabaseClient } from '@supabase/supabase-js'
import { type Database } from '@/lib/types/database.types'

/**
 * Helper para Server Actions de administração.
 *
 * Combina 3 responsabilidades comuns:
 *   1. Verifica que o caller tem papel `administrador` (redirect se não)
 *   2. Valida o input contra um Zod schema
 *   3. Devolve um shape consistente `{ ok, ...result }` ou `{ ok: false, erro }`
 *
 * O caller (a action propriamente dita) recebe `(input, ctx)` onde:
 *   - `input` é o objecto já parseado e tipado
 *   - `ctx` tem `{ user, supabase }` (cliente Supabase com a sessão do admin)
 *
 * @example
 *   const schema = z.object({ nome: z.string().min(1) })
 *
 *   export const criarEscola = adminAction(schema, async ({ nome }, { supabase }) => {
 *     const { error } = await supabase.from('escolas').insert({ nome })
 *     if (error) return { ok: false, erro: error.message }
 *     return { ok: true }
 *   })
 */
export type AdminActionResult<T = void> =
  | ({ ok: true } & (T extends void ? object : T))
  | { ok: false; erro: string }

interface AdminActionContext {
  user: User
  supabase: SupabaseClient<Database>
}

export function adminAction<TSchema extends z.ZodTypeAny, TResult = void>(
  schema: TSchema,
  handler: (
    input: z.infer<TSchema>,
    ctx: AdminActionContext,
  ) => Promise<AdminActionResult<TResult>>,
) {
  return async (rawInput: unknown): Promise<AdminActionResult<TResult>> => {
    // 1. Auth — lança redirect se não for admin
    const { user, supabase } = await requireRole('administrador')

    // 2. Validação de input
    const parsed = schema.safeParse(rawInput)
    if (!parsed.success) {
      // Primeiro erro de validação (pt-PT é responsabilidade do schema)
      const firstError = parsed.error.issues[0]
      return {
        ok: false,
        erro: firstError?.message ?? 'Dados inválidos.',
      }
    }

    // 3. Executar handler com erro tratado defensivamente
    try {
      return await handler(parsed.data, { user, supabase })
    } catch (err) {
      console.error('[admin-action] erro inesperado:', err)
      return {
        ok: false,
        erro: 'Ocorreu um erro inesperado. Tenta novamente.',
      }
    }
  }
}
