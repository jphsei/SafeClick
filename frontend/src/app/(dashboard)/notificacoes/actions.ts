'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth/require-role'

const idSchema = z.object({
  id: z.string().uuid('ID inválido.'),
})

type ActionResult = { ok: true } | { ok: false; erro: string }

/**
 * Marca uma notificação como lida. Só permite ao próprio dono — o RLS
 * já protege, mas filtramos por `utilizador_id` explicitamente para
 * defesa em profundidade.
 */
export async function marcarComoLida(rawInput: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, erro: 'ID inválido.' }
  }

  const { user, supabase } = await requireUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('notificacoes') as any)
    .update({ lida: true })
    .eq('id', parsed.data.id)
    .eq('utilizador_id', user.id)

  if (error) {
    return { ok: false, erro: `Erro: ${error.message}` }
  }

  // Como o badge de não lidas vive no layout, revalidamos a raiz do
  // dashboard para o count atualizar em todas as pages.
  revalidatePath('/', 'layout')
  return { ok: true }
}

/**
 * Marca TODAS as notificações do utilizador como lidas.
 */
export async function marcarTodasComoLidas(): Promise<ActionResult> {
  const { user, supabase } = await requireUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('notificacoes') as any)
    .update({ lida: true })
    .eq('utilizador_id', user.id)
    .eq('lida', false)

  if (error) {
    return { ok: false, erro: `Erro: ${error.message}` }
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}
