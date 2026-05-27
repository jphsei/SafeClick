'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUser } from '@/lib/auth/require-role'

// ── Schemas ─────────────────────────────────────────────────────

const emptyToNull = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? null : v

const atualizarPerfilSchema = z.object({
  nome_completo: z.string().trim().min(1, 'O nome é obrigatório.').max(200),
  numero_aluno:  z.preprocess(emptyToNull, z.string().trim().max(50).nullable().optional()),
})

type ActionResult = { ok: true } | { ok: false; erro: string }

/**
 * Atualizar o **próprio** perfil. Limitado a campos que o utilizador
 * tem direito a alterar:
 *   - `nome_completo`
 *   - `numero_aluno` (só relevante para alunos)
 *
 * Email, papel e escola **não são alteráveis** por aqui. Email é gerido
 * pelo Supabase Auth (outro fluxo). Papel e escola só por admin via
 * `/admin/utilizadores`.
 */
export async function atualizarMeuPerfil(rawInput: unknown): Promise<ActionResult> {
  const parsed = atualizarPerfilSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  try {
    const { user, supabase } = await requireUser()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('perfis') as any)
      .update({
        nome_completo: parsed.data.nome_completo,
        numero_aluno:  parsed.data.numero_aluno,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      return { ok: false, erro: `Erro ao atualizar: ${error.message}` }
    }

    // Revalidar pages que mostram dados do perfil: o próprio /perfil,
    // o header (no layout), e dashboards onde o nome aparece.
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (err) {
    console.error('[atualizarMeuPerfil] erro:', err)
    return { ok: false, erro: 'Ocorreu um erro inesperado. Tenta novamente.' }
  }
}
