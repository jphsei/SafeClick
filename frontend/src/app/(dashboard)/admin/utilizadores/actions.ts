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
 * Fluxo em duas fases (necessário porque o GoTrue v2.186+ insere
 * em `auth.users` e SÓ DEPOIS popula `raw_app_meta_data` com um
 * UPDATE separado — o trigger `trg_auth_novo_utilizador` AFTER INSERT
 * vê `raw_app_meta_data` ainda sem `papel`, criando sempre o perfil
 * como `'aluno'`):
 *
 *   1. `auth.admin.createUser({ ..., app_metadata: { papel, escola_id } })`
 *      cria a linha em `auth.users`. O trigger AFTER INSERT corre e
 *      cria a row em `perfis` como aluno. `app_metadata` é settable
 *      apenas via service-role — sem injecção pelo cliente.
 *
 *   2. UPDATE explícito em `perfis` com `papel` e `escola_id` reais.
 *      Em Local, a migration 20260618000006 (trigger AFTER UPDATE OF
 *      raw_app_meta_data) também faz esta sincronização; este UPDATE
 *      é redundante mas idempotente. Em Cloud, não podemos criar
 *      triggers em `auth.users` (precisa de ownership do
 *      supabase_auth_admin), por isso este UPDATE é a única forma
 *      de garantir o papel/escola_id correctos.
 *
 * Falha entre as fases:
 *   - Se `createUser` falhar → não há rollback necessário.
 *   - Se o UPDATE em perfis falhar → rollback via `deleteUser` para
 *     não deixar um aluno órfão quando o admin pediu professor/admin.
 */
export const criarUtilizador = adminAction(createSchema, async (input) => {
  const admin = createAdminClient()

  // ── Fase 1: criar user em auth.users ─────────────────────────────
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      nome_completo: input.nome_completo,
      numero_aluno: input.numero_aluno,
    },
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

  const newUserId = created.user?.id
  if (!newUserId) {
    return { ok: false, erro: 'createUser não devolveu o ID do utilizador.' }
  }

  // ── Fase 2: sincronizar papel/escola_id no perfil ────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (admin.from('perfis') as any)
    .update({
      papel: input.papel,
      escola_id: input.escola_id ?? null,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', newUserId)

  if (updateError) {
    // Rollback: apaga o user para não deixar inconsistência.
    await admin.auth.admin.deleteUser(newUserId).catch(() => {
      /* ignore — admin terá de limpar manualmente */
    })
    return {
      ok: false,
      erro: `Erro a definir papel/escola: ${updateError.message}. Utilizador removido — tenta novamente.`,
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