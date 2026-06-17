'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { adminAction } from '@/lib/auth/admin-action'

// ── Schemas ─────────────────────────────────────────────────────

const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v)

const baseAulaFields = {
  titulo: z.string().trim().min(1, 'O título é obrigatório.').max(200),
  conteudo: z.preprocess(emptyToNull, z.string().trim().max(50000).nullable().optional()),
  video_url: z.preprocess(
    emptyToNull,
    z.string().trim().url('URL do vídeo inválido.').nullable().optional(),
  ),
  ordem: z.coerce.number().int().min(0).max(10000),
  duracao_minutos: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().int().min(0).max(10000).nullable().optional(),
  ),
  pontos: z.coerce.number().int().min(0).max(1000),
}

const createSchema = z.object({
  modulo_id: z.string().uuid('ID de módulo inválido.'),
  ...baseAulaFields,
})

const updateSchema = z.object({
  id: z.string().uuid('ID inválido.'),
  ...baseAulaFields,
})

const idOnlySchema = z.object({
  id: z.string().uuid('ID inválido.'),
})

// ── Actions ─────────────────────────────────────────────────────

export const criarAula = adminAction(createSchema, async (input, { supabase }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('aulas') as any).insert(input)
  if (error) {
    return { ok: false, erro: `Erro ao criar aula: ${error.message}` }
  }
  revalidatePath(`/admin/modulos/${input.modulo_id}`)
  return { ok: true }
})

export const atualizarAula = adminAction(updateSchema, async (input, { supabase }) => {
  const { id, ...patch } = input
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, data } = await (supabase.from('aulas') as any)
    .update({ ...patch, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select('modulo_id')
    .single()

  if (error) {
    return { ok: false, erro: `Erro ao atualizar: ${error.message}` }
  }
  if (data?.modulo_id) revalidatePath(`/admin/modulos/${data.modulo_id}`)
  return { ok: true }
})

export const desativarAula = adminAction(idOnlySchema, async ({ id }, { supabase }) => {
  // Soft delete: preserva o histórico de quizzes/tentativas associados.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, data } = await (supabase.from('aulas') as any)
    .update({ ativo: false, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select('modulo_id')
    .single()

  if (error) {
    return { ok: false, erro: `Erro ao desativar: ${error.message}` }
  }
  if (data?.modulo_id) revalidatePath(`/admin/modulos/${data.modulo_id}`)
  return { ok: true }
})

export const reativarAula = adminAction(idOnlySchema, async ({ id }, { supabase }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, data } = await (supabase.from('aulas') as any)
    .update({ ativo: true, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select('modulo_id')
    .single()

  if (error) {
    return { ok: false, erro: `Erro ao reativar: ${error.message}` }
  }
  if (data?.modulo_id) revalidatePath(`/admin/modulos/${data.modulo_id}`)
  return { ok: true }
})
