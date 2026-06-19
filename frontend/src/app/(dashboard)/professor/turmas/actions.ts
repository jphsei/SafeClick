'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/require-role'

/**
 * Server actions para gestão de turmas pelo professor.
 *
 * Substituem escritas directas do cliente que dependiam unicamente
 * de RLS para autorização. Com server actions, ganhamos:
 *   - RBAC explícito via `requireRole(['professor', 'administrador'])`
 *   - Validação Zod do input
 *   - Erros propagados ao componente para mostrar feedback ao user
 *   - Defense in depth se as policies RLS estiverem incompletas
 */

const idOnlySchema = z.object({ id: z.string().uuid('ID inválido.') })

type ActionResult = { ok: true } | { ok: false; erro: string }

/**
 * Remove um aluno de uma turma (soft delete via `turma_alunos.ativo = false`).
 *
 * Substitui o UPDATE directo do cliente em `remover-aluno-button.tsx`,
 * que dependia exclusivamente da policy `ta_professor_gerir` para
 * autorização e ignorava erros. Aqui:
 *   - RBAC server-side (`professor` ou `administrador`)
 *   - O cliente da action é o `supabase` autenticado do professor;
 *     a policy continua a ser avaliada (defense in depth)
 *   - Erro do UPDATE é propagado ao componente para mostrar toast/feedback
 *
 * @param rawInput  Objecto com `id` = `turma_alunos.id` (a row da relação)
 */
export async function removerAlunoDaTurma(rawInput: unknown): Promise<ActionResult> {
  const parsed = idOnlySchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, erro: 'ID inválido.' }
  }

  try {
    const { supabase } = await requireRole(['professor', 'administrador'])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error, data } = await (supabase.from('turma_alunos') as any)
      .update({ ativo: false })
      .eq('id', parsed.data.id)
      .eq('ativo', true) // só "remove" rows actualmente activas
      .select('id')
      .maybeSingle()

    if (error) {
      return { ok: false, erro: `Erro ao remover aluno: ${error.message}` }
    }

    // Se não houve match (RLS bloqueou, ou row já estava inactiva, ou
    // id não pertence a uma turma deste professor), `data` é null.
    if (!data) {
      return {
        ok: false,
        erro: 'Não foi possível remover este aluno (sem permissão ou já removido).',
      }
    }

    // Revalida a página da turma e a lista de turmas — o aluno
    // desaparece da listagem sem full reload.
    revalidatePath('/professor/turmas', 'page')
    revalidatePath(`/professor/turmas/[id]`, 'page')

    return { ok: true }
  } catch (err) {
    console.error('[removerAlunoDaTurma] erro:', err)
    return { ok: false, erro: 'Ocorreu um erro inesperado. Tenta novamente.' }
  }
}
