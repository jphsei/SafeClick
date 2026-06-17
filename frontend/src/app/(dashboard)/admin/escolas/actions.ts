'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { adminAction } from '@/lib/auth/admin-action'

// ── Schemas (validação Zod, mensagens pt-PT) ────────────────────

const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v)

// Colunas reais da tabela `escolas`:
// id, nome, morada, cidade, codigo_postal, telefone, email, ativo, criado_em
const baseEscolaFields = {
  nome: z.string().trim().min(1, 'O nome é obrigatório.').max(200),
  morada: z.preprocess(emptyToNull, z.string().trim().max(300).nullable().optional()),
  cidade: z.preprocess(emptyToNull, z.string().trim().max(100).nullable().optional()),
  codigo_postal: z.preprocess(emptyToNull, z.string().trim().max(20).nullable().optional()),
  telefone: z.preprocess(emptyToNull, z.string().trim().max(30).nullable().optional()),
  email: z.preprocess(
    emptyToNull,
    z.string().trim().email('Email inválido.').nullable().optional(),
  ),
}

const createSchema = z.object(baseEscolaFields)

const updateSchema = z.object({
  id: z.string().uuid('ID inválido.'),
  ...baseEscolaFields,
})

const idOnlySchema = z.object({
  id: z.string().uuid('ID inválido.'),
})

// ── Actions ─────────────────────────────────────────────────────

export const criarEscola = adminAction(createSchema, async (input, { supabase }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('escolas') as any).insert(input)
  if (error) {
    return { ok: false, erro: `Erro ao criar escola: ${error.message}` }
  }
  revalidatePath('/admin/escolas')
  return { ok: true }
})

export const atualizarEscola = adminAction(updateSchema, async (input, { supabase }) => {
  const { id, ...patch } = input
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('escolas') as any).update(patch).eq('id', id)
  if (error) {
    return { ok: false, erro: `Erro ao atualizar: ${error.message}` }
  }
  revalidatePath('/admin/escolas')
  return { ok: true }
})

export const desativarEscola = adminAction(idOnlySchema, async ({ id }, { supabase }) => {
  // Soft delete: preserva histórico de turmas/utilizadores associados.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('escolas') as any).update({ ativo: false }).eq('id', id)
  if (error) {
    return { ok: false, erro: `Erro ao desativar: ${error.message}` }
  }
  revalidatePath('/admin/escolas')
  return { ok: true }
})

export const reativarEscola = adminAction(idOnlySchema, async ({ id }, { supabase }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('escolas') as any).update({ ativo: true }).eq('id', id)
  if (error) {
    return { ok: false, erro: `Erro ao reativar: ${error.message}` }
  }
  revalidatePath('/admin/escolas')
  return { ok: true }
})
