'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { adminAction } from '@/lib/auth/admin-action'
import { createAdminClient } from '@/lib/supabase/admin'
import { validatePassword, MIN_PASSWORD_LENGTH } from '@/lib/auth/password'

// ── Schemas ─────────────────────────────────────────────────────

const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v)

const papelSchema = z.enum(['aluno', 'professor', 'administrador'], {
  message: 'Papel inválido.',
})

const createSchema = z.object({
  email: z.string().trim().email('Email inválido.').max(200),
  password: z.string().refine(
    (pw) => validatePassword(pw).valid,
    () => ({
      message: `Password deve ter ${MIN_PASSWORD_LENGTH}+ caracteres, letra, número e carácter especial.`,
    }),
  ),
  nome_completo: z.string().trim().min(1, 'O nome é obrigatório.').max(200),
  papel: papelSchema,
  escola_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  numero_aluno: z.preprocess(emptyToNull, z.string().trim().max(50).nullable().optional()),
})

const updateSchema = z.object({
  id: z.string().uuid('ID inválido.'),
  nome_completo: z.string().trim().min(1, 'O nome é obrigatório.').max(200),
  papel: papelSchema,
  escola_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  numero_aluno: z.preprocess(emptyToNull, z.string().trim().max(50).nullable().optional()),
})

const idOnlySchema = z.object({
  id: z.string().uuid('ID inválido.'),
})

// ── Actions ─────────────────────────────────────────────────────

/**
 * Cria utilizador novo. Precisa do service role porque
 * `auth.admin.createUser` não funciona com o JWT do admin normal.
 *
 * Operação **atómica**: papel e escola_id são passados via
 * `app_metadata`. O trigger `fn_novo_utilizador` lê esses valores
 * (settable apenas pelo service-role) e cria a entrada em `perfis`
 * com o papel correcto numa única transação Postgres.
 *
 * Não há UPDATE posterior, não há janela de inconsistência: ou
 * `createUser` sucesso (com perfil completo) ou falha (sem nada
 * gravado em auth.users nem em perfis).
 *
 * Ver `supabase/migrations/20260617000002_use_app_metadata_for_papel.sql`.
 */
export const criarUtilizador = adminAction(createSchema, async (input) => {
  const admin = createAdminClient()

  const { error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    // user_metadata: campos não-sensíveis (origem cliente é aceitável)
    user_metadata: {
      nome_completo: input.nome_completo,
      numero_aluno: input.numero_aluno,
    },
    // app_metadata: campos sensíveis (papel = autorização). Settable
    // APENAS por service-role; o trigger lê daqui. Esta é a única
    // forma de criar não-alunos no sistema.
    app_metadata: {
      papel: input.papel,
      escola_id: input.escola_id ?? null,
    },
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { ok: false, erro: 'Já existe uma conta com este email.' }
    }
    return { ok: false, erro: `Erro ao criar utilizador: ${authError.message}` }
  }

  revalidatePath('/admin/utilizadores')
  return { ok: true }
})

/**
 * Atualiza nome, papel, escola e número de aluno. NÃO atualiza email
 * nem password — isso requer fluxo de auth separado (que aqui ainda
 * não temos).
 */
export const atualizarUtilizador = adminAction(updateSchema, async (input) => {
  // Service-role: necessário porque actualizamos colunas sensíveis
  // (papel, escola_id) que estão REVOKE'd para authenticated após a
  // migration 20260617000012. RBAC já foi feito pelo adminAction.
  const admin = createAdminClient()
  const { id, ...patch } = input
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('perfis') as any)
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

export const desativarUtilizador = adminAction(idOnlySchema, async ({ id }, { user }) => {
  // Salvaguarda: admin não pode desativar a sua própria conta
  if (id === user.id) {
    return { ok: false, erro: 'Não podes desativar a tua própria conta.' }
  }

  // Service-role para ambas as operações (ban + ativo). `ativo` está
  // REVOKE'd para authenticated após a migration 20260617000012.
  const admin = createAdminClient()

  // 1. Banir no Supabase Auth (impede login imediato)
  const { error: banError } = await admin.auth.admin.updateUserById(id, {
    ban_duration: PERMANENT_BAN_DURATION,
  })
  if (banError) {
    return { ok: false, erro: `Erro ao banir conta: ${banError.message}` }
  }

  // 2. Marcar perfis.ativo = false (metadata da app)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('perfis') as any)
    .update({ ativo: false, atualizado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { ok: false, erro: `Erro ao atualizar perfil: ${error.message}` }
  }
  revalidatePath('/admin/utilizadores')
  return { ok: true }
})

export const reativarUtilizador = adminAction(idOnlySchema, async ({ id }) => {
  // Service-role para ambas as operações (unban + ativo). Mesmo
  // raciocínio que desativarUtilizador.
  const admin = createAdminClient()

  // 1. Desbanir no Supabase Auth (permite login outra vez)
  const { error: unbanError } = await admin.auth.admin.updateUserById(id, {
    ban_duration: 'none',
  })
  if (unbanError) {
    return { ok: false, erro: `Erro ao desbanir conta: ${unbanError.message}` }
  }

  // 2. Marcar perfis.ativo = true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('perfis') as any)
    .update({ ativo: true, atualizado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { ok: false, erro: `Erro ao atualizar perfil: ${error.message}` }
  }
  revalidatePath('/admin/utilizadores')
  return { ok: true }
})
