'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { adminAction } from '@/lib/auth/admin-action'
import { createAdminClient } from '@/lib/supabase/admin'
import { validatePassword, MIN_PASSWORD_LENGTH } from '@/lib/auth/password'

// ── Schemas ─────────────────────────────────────────────────────

const emptyToNull = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? null : v

const papelSchema = z.enum(['aluno', 'professor', 'administrador'], {
  message: 'Papel inválido.',
})

const createSchema = z.object({
  email:          z.string().trim().email('Email inválido.').max(200),
  password:       z.string().refine(
    (pw) => validatePassword(pw).valid,
    () => ({
      message: `Password deve ter ${MIN_PASSWORD_LENGTH}+ caracteres, letra, número e carácter especial.`,
    }),
  ),
  nome_completo:  z.string().trim().min(1, 'O nome é obrigatório.').max(200),
  papel:          papelSchema,
  escola_id:      z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  numero_aluno:   z.preprocess(emptyToNull, z.string().trim().max(50).nullable().optional()),
})

const updateSchema = z.object({
  id:             z.string().uuid('ID inválido.'),
  nome_completo:  z.string().trim().min(1, 'O nome é obrigatório.').max(200),
  papel:          papelSchema,
  escola_id:      z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  numero_aluno:   z.preprocess(emptyToNull, z.string().trim().max(50).nullable().optional()),
})

const idOnlySchema = z.object({
  id: z.string().uuid('ID inválido.'),
})

// ── Actions ─────────────────────────────────────────────────────

/**
 * Cria utilizador novo. Precisa do service role porque
 * `auth.admin.createUser` não funciona com o JWT do admin normal.
 *
 * O trigger `fn_novo_utilizador` cria a linha em `perfis` automaticamente
 * com base no `user_metadata`. A escola_id é atualizada num UPDATE
 * a seguir (o trigger não a lê do user_metadata).
 */
export const criarUtilizador = adminAction(createSchema, async (input) => {
  const admin = createAdminClient()

  // 1. Criar em auth.users (skip email confirmation — o admin é quem
  //    valida que o email é real, e o user vai receber a password do admin)
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      nome_completo: input.nome_completo,
      papel:         input.papel,
      numero_aluno:  input.numero_aluno,
    },
  })

  if (authError || !created.user) {
    if (authError?.message.includes('already registered')) {
      return { ok: false, erro: 'Já existe uma conta com este email.' }
    }
    return { ok: false, erro: `Erro ao criar utilizador: ${authError?.message ?? 'desconhecido'}` }
  }

  // 2. Atualizar escola_id em `perfis` (o trigger não a apanha)
  if (input.escola_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updError } = await (admin.from('perfis') as any)
      .update({ escola_id: input.escola_id })
      .eq('id', created.user.id)

    if (updError) {
      // Não falhamos a criação inteira por causa disto — utilizador já existe.
      console.error('[criarUtilizador] erro ao definir escola_id:', updError)
    }
  }

  revalidatePath('/admin/utilizadores')
  return { ok: true }
})

/**
 * Atualiza nome, papel, escola e número de aluno. NÃO atualiza email
 * nem password — isso requer fluxo de auth separado (que aqui ainda
 * não temos).
 */
export const atualizarUtilizador = adminAction(updateSchema, async (input, { supabase }) => {
  const { id, ...patch } = input
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('perfis') as any)
    .update({
      ...patch,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { ok: false, erro: `Erro ao atualizar: ${error.message}` }
  }
  revalidatePath('/admin/utilizadores')
  return { ok: true }
})

/**
 * Desativar exige duas coisas:
 *
 *   1. `perfis.ativo = false` — metadata da app (mostrar como inativo
 *      na UI, condições nas vistas, etc.).
 *   2. Banir no Supabase Auth — `auth.admin.updateUserById` com
 *      `ban_duration` longo. Sem isto, o login continua a funcionar
 *      (o Supabase Auth não conhece a flag `ativo`).
 *
 * Usamos `'876000h'` (100 anos) como "banimento permanente reversível".
 */
const PERMANENT_BAN_DURATION = '876000h'

export const desativarUtilizador = adminAction(idOnlySchema, async ({ id }, { user, supabase }) => {
  // Salvaguarda: admin não pode desativar a sua própria conta
  if (id === user.id) {
    return { ok: false, erro: 'Não podes desativar a tua própria conta.' }
  }

  // 1. Banir no Supabase Auth (impede login imediato)
  const admin = createAdminClient()
  const { error: banError } = await admin.auth.admin.updateUserById(id, {
    ban_duration: PERMANENT_BAN_DURATION,
  })
  if (banError) {
    return { ok: false, erro: `Erro ao banir conta: ${banError.message}` }
  }

  // 2. Marcar perfis.ativo = false (metadata da app)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('perfis') as any)
    .update({ ativo: false, atualizado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { ok: false, erro: `Erro ao atualizar perfil: ${error.message}` }
  }
  revalidatePath('/admin/utilizadores')
  return { ok: true }
})

export const reativarUtilizador = adminAction(idOnlySchema, async ({ id }, { supabase }) => {
  // 1. Desbanir no Supabase Auth (permite login outra vez)
  const admin = createAdminClient()
  const { error: unbanError } = await admin.auth.admin.updateUserById(id, {
    ban_duration: 'none',
  })
  if (unbanError) {
    return { ok: false, erro: `Erro ao desbanir conta: ${unbanError.message}` }
  }

  // 2. Marcar perfis.ativo = true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('perfis') as any)
    .update({ ativo: true, atualizado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { ok: false, erro: `Erro ao atualizar perfil: ${error.message}` }
  }
  revalidatePath('/admin/utilizadores')
  return { ok: true }
})
