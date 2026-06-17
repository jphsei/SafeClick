'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { adminAction } from '@/lib/auth/admin-action'

// ── Schemas ─────────────────────────────────────────────────────

const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v)

const dificuldadeSchema = z.enum(['basico', 'intermedio', 'avancado'], {
  message: 'Dificuldade inválida.',
})

const estadoSchema = z.enum(['rascunho', 'publicado', 'arquivado'], {
  message: 'Estado inválido.',
})

const baseModuloFields = {
  titulo: z.string().trim().min(1, 'O título é obrigatório.').max(200),
  descricao: z.preprocess(emptyToNull, z.string().trim().max(2000).nullable().optional()),
  dificuldade: dificuldadeSchema,
  pontos_conclusao: z.coerce.number().int().min(0).max(1000),
  duracao_minutos: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().int().min(0).max(10000).nullable().optional(),
  ),
  ordem: z.coerce.number().int().min(0).max(10000),
  thumbnail_url: z.preprocess(
    emptyToNull,
    z.string().trim().url('Thumbnail tem de ser um URL válido.').nullable().optional(),
  ),
}

const createSchema = z.object(baseModuloFields)

const updateSchema = z.object({
  id: z.string().uuid('ID inválido.'),
  ...baseModuloFields,
})

const mudarEstadoSchema = z.object({
  id: z.string().uuid('ID inválido.'),
  estado: estadoSchema,
})

// ── Actions ─────────────────────────────────────────────────────

export const criarModulo = adminAction(createSchema, async (input, { user, supabase }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('modulos') as any).insert({
    ...input,
    estado: 'rascunho',
    criado_por: user.id,
  })
  if (error) {
    return { ok: false, erro: `Erro ao criar módulo: ${error.message}` }
  }
  revalidatePath('/admin/modulos')
  return { ok: true }
})

export const atualizarModulo = adminAction(updateSchema, async (input, { supabase }) => {
  const { id, ...patch } = input
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('modulos') as any)
    .update({ ...patch, atualizado_em: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    return { ok: false, erro: `Erro ao atualizar: ${error.message}` }
  }
  revalidatePath('/admin/modulos')
  revalidatePath(`/admin/modulos/${id}`)
  return { ok: true }
})

export const mudarEstadoModulo = adminAction(
  mudarEstadoSchema,
  async ({ id, estado }, { supabase }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('modulos') as any)
      .update({ estado, atualizado_em: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      return { ok: false, erro: `Erro ao mudar estado: ${error.message}` }
    }
    revalidatePath('/admin/modulos')
    return { ok: true }
  },
)
