/**
 * Testes de segurança: prevenção de escalada de privilégios via signup.
 *
 * Estes testes correm contra o Supabase LOCAL (porta 54321) e verificam,
 * end-to-end, que a vulnerabilidade documentada está fechada:
 *
 *   - Migration: supabase/migrations/20260617000001_fix_signup_role_security.sql
 *   - Migration: supabase/migrations/20260617000002_use_app_metadata_for_papel.sql
 *
 * Como correr:
 *   1. `supabase start` (Supabase local up)
 *   2. `supabase db reset` (aplicar as migrations)
 *   3. Garantir que as env vars estão setadas (a partir de .env.local):
 *        NEXT_PUBLIC_SUPABASE_URL
 *        NEXT_PUBLIC_SUPABASE_ANON_KEY
 *        SUPABASE_SERVICE_ROLE_KEY
 *   4. `npm test`
 *
 * Os testes são `describe.skipIf(!envOk)` para não falharem em CI sem
 * Supabase. Para correr na CI, adicionar um job que arranca o Supabase
 * antes destes testes.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const envOk = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!envOk)('Security: signup privilege escalation prevention', () => {
  let anon: SupabaseClient
  let admin: SupabaseClient
  const createdUserIds: string[] = []

  beforeAll(() => {
    anon = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  })

  afterAll(async () => {
    // Cleanup — remover todos os utilizadores criados pelos testes
    for (const id of createdUserIds) {
      await admin.auth.admin.deleteUser(id).catch(() => {
        /* ignore */
      })
    }
  })

  /**
   * Teste 1: O ataque clássico — signup público com `papel: "administrador"`
   * no `user_metadata`. Antes da migration era escalada total. Agora
   * tem de criar como aluno.
   */
  it('CRITICAL: signup com papel=administrador em user_metadata cria aluno', async () => {
    const email = `attacker-${Date.now()}@test.local`
    const { data, error } = await anon.auth.signUp({
      email,
      password: 'Attacker@1234',
      options: {
        data: {
          nome_completo: 'Evil Attacker',
          papel: 'administrador', // ← tentativa de escalada
        },
      },
    })

    expect(error).toBeNull()
    expect(data.user).toBeTruthy()
    createdUserIds.push(data.user!.id)

    // Verificar a entrada na tabela perfis com service-role
    const { data: perfil, error: perfilError } = await admin
      .from('perfis')
      .select('papel, email')
      .eq('id', data.user!.id)
      .single()

    expect(perfilError).toBeNull()
    expect(perfil).toBeTruthy()
    expect(perfil!.email).toBe(email)
    expect(perfil!.papel).toBe('aluno') // ← NÃO 'administrador'
  })

  /**
   * Teste 2: Variante — papel + escola_id em user_metadata. Mesma
   * defesa: tudo ignorado.
   */
  it('CRITICAL: signup com papel=professor + escola_id em metadata cria aluno sem escola', async () => {
    const email = `attacker2-${Date.now()}@test.local`
    const { data, error } = await anon.auth.signUp({
      email,
      password: 'Attacker@1234',
      options: {
        data: {
          nome_completo: 'Evil2',
          papel: 'professor',
          escola_id: '11111111-1111-1111-1111-111111111111',
        },
      },
    })

    expect(error).toBeNull()
    createdUserIds.push(data.user!.id)

    const { data: perfil } = await admin
      .from('perfis')
      .select('papel, escola_id')
      .eq('id', data.user!.id)
      .single()

    expect(perfil!.papel).toBe('aluno')
    expect(perfil!.escola_id).toBeNull()
  })

  /**
   * Teste 3: Variante — signup tenta passar `app_metadata`. O endpoint
   * /auth/v1/signup do Supabase NÃO aceita app_metadata (é settable
   * apenas via auth.admin.*). Confirmamos que o tipo TS reflecte isso
   * e que mesmo via API REST raw não funciona.
   */
  it('CRITICAL: signup REST com app_metadata é rejeitado/ignorado', async () => {
    const email = `attacker3-${Date.now()}@test.local`

    // POST directo ao endpoint, fora do SDK, para testar a worst-case
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password: 'Attacker@1234',
        // tenta forçar:
        // eslint-disable-next-line @typescript-eslint/naming-convention
        app_metadata: { papel: 'administrador' },
        data: { nome_completo: 'Evil3' },
      }),
    })

    expect(res.ok).toBe(true) // signup propriamente dito sucede
    const body = (await res.json()) as { user?: { id: string } }
    if (body.user) createdUserIds.push(body.user.id)

    const { data: perfil } = await admin
      .from('perfis')
      .select('papel')
      .eq('email', email)
      .single()

    expect(perfil!.papel).toBe('aluno') // app_metadata foi ignorado pelo Supabase
  })

  /**
   * Teste 4: A criação legítima via service-role (admin) com
   * `app_metadata.papel = 'professor'` resulta em professor. Confirma
   * que o caminho legítimo continua a funcionar atomicamente.
   */
  it('Legitimate path: admin createUser com app_metadata.papel=professor cria professor', async () => {
    const email = `legit-prof-${Date.now()}@test.local`
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: 'Legit@1234',
      email_confirm: true,
      user_metadata: { nome_completo: 'Legit Prof' },
      app_metadata: { papel: 'professor' },
    })

    expect(error).toBeNull()
    expect(data.user).toBeTruthy()
    createdUserIds.push(data.user!.id)

    const { data: perfil } = await admin
      .from('perfis')
      .select('papel')
      .eq('id', data.user!.id)
      .single()

    expect(perfil!.papel).toBe('professor')
  })

  /**
   * Teste 5: Aluno autenticado tenta dar UPDATE directamente em
   * perfis.papel via supabase-js. O trigger
   * `fn_prevenir_escalada_perfil` (migration 20260617000003) deve
   * lançar RAISE EXCEPTION e o UPDATE falha.
   */
  it('Trigger: aluno autenticado NÃO consegue alterar o próprio papel', async () => {
    const email = `aluno-${Date.now()}@test.local`
    const password = 'Aluno@1234'
    const { data: signupData, error: signupError } = await anon.auth.signUp({
      email,
      password,
    })
    expect(signupError).toBeNull()
    createdUserIds.push(signupData.user!.id)

    // Cliente com sessão do aluno
    const alunoClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: signInError } = await alunoClient.auth.signInWithPassword({ email, password })
    expect(signInError).toBeNull()

    const { error: updateError } = await alunoClient
      .from('perfis')
      .update({ papel: 'administrador' })
      .eq('id', signupData.user!.id)

    // Trigger BEFORE UPDATE deve lançar — updateError não-null
    expect(updateError).toBeTruthy()
    expect(updateError?.message).toMatch(/papel|permissão|permission/i)

    // Confirmar via service-role que o papel não mudou
    const { data: perfilFinal } = await admin
      .from('perfis')
      .select('papel')
      .eq('id', signupData.user!.id)
      .single()
    expect(perfilFinal!.papel).toBe('aluno')
  })

  /**
   * Teste 6: O mesmo trigger bloqueia mudança a outros campos
   * sensíveis (escola_id, pontos_total, ativo).
   */
  it('Trigger: aluno NÃO consegue alterar escola_id, pontos_total nem ativo', async () => {
    const email = `aluno6-${Date.now()}@test.local`
    const password = 'Aluno@1234'
    const { data: signupData } = await anon.auth.signUp({ email, password })
    createdUserIds.push(signupData.user!.id)

    const alunoClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await alunoClient.auth.signInWithPassword({ email, password })

    // Tentar mudar escola_id
    const { error: e1 } = await alunoClient
      .from('perfis')
      .update({ escola_id: '11111111-1111-1111-1111-111111111111' })
      .eq('id', signupData.user!.id)
    expect(e1).toBeTruthy()

    // Tentar inflar pontos_total
    const { error: e2 } = await alunoClient
      .from('perfis')
      .update({ pontos_total: 999999 })
      .eq('id', signupData.user!.id)
    expect(e2).toBeTruthy()

    // Tentar reactivar conta desactivada (não está mas confirma defesa)
    const { error: e3 } = await alunoClient
      .from('perfis')
      .update({ ativo: false })
      .eq('id', signupData.user!.id)
    expect(e3).toBeTruthy()

    // Mas nome_completo deve passar (campo legitimamente editável)
    const { error: e4 } = await alunoClient
      .from('perfis')
      .update({ nome_completo: 'Nome Mudado' })
      .eq('id', signupData.user!.id)
    expect(e4).toBeNull()
  })

  /**
   * Teste 7: O admin (via service-role) consegue alterar tudo
   * normalmente — o trigger reconhece auth.uid() = NULL e bypassa.
   */
  it('Service-role: admin consegue alterar papel de outro user', async () => {
    const email = `target-${Date.now()}@test.local`
    const { data: signupData } = await anon.auth.signUp({
      email,
      password: 'Target@1234',
    })
    createdUserIds.push(signupData.user!.id)

    // Service-role tenta escalar — deve passar
    const { error } = await admin
      .from('perfis')
      .update({ papel: 'professor' })
      .eq('id', signupData.user!.id)
    expect(error).toBeNull()

    const { data: perfil } = await admin
      .from('perfis')
      .select('papel')
      .eq('id', signupData.user!.id)
      .single()
    expect(perfil!.papel).toBe('professor')
  })
})
