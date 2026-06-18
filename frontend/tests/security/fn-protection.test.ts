/**
 * Testes de segurança: protecção das RPCs e RLS pós-fixes.
 *
 * Cobre as correções de:
 *   - 20260617000005_fn_verificar_badges_no_params.sql
 *   - 20260617000006_fn_submeter_simulacao.sql
 *   - 20260617000007_rls_perfis_professor_alunos.sql
 *
 * Pré-requisitos:
 *   - Supabase local up (`supabase start`)
 *   - Migrations aplicadas (`supabase db reset`)
 *   - Env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *     SUPABASE_SERVICE_ROLE_KEY
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const envOk = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY)

// IDs do seed (escolas)
const ESCOLA_A = '11111111-1111-1111-1111-111111111111'
// Uma das simulações do seed
const SIMULACAO_ID = 'f0000001-0001-0000-0000-000000000001'

describe.skipIf(!envOk)('Security: RPC protection + perfis RLS', () => {
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
    for (const id of createdUserIds) {
      await admin.auth.admin.deleteUser(id).catch(() => {
        /* ignore */
      })
    }
  })

  /** Helper: criar aluno, fazer login, devolver cliente autenticado + user_id */
  async function createAndSignInAluno(): Promise<{ client: SupabaseClient; userId: string }> {
    const email = `aluno-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`
    const password = 'Aluno@1234'
    const { data: signupData, error: signupError } = await anon.auth.signUp({ email, password })
    expect(signupError).toBeNull()
    const userId = signupData.user!.id
    createdUserIds.push(userId)

    const client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: signInError } = await client.auth.signInWithPassword({ email, password })
    expect(signInError).toBeNull()

    return { client, userId }
  }

  // ──────────────────────────────────────────────────────────────────
  // Problem 1: fn_atualizar_pontos não é callable pelo cliente
  // ──────────────────────────────────────────────────────────────────

  it('CRITICAL: aluno NÃO consegue chamar fn_atualizar_pontos para inflar pontos', async () => {
    const { client, userId } = await createAndSignInAluno()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client as any).rpc('fn_atualizar_pontos', {
      p_utilizador_id: userId,
      p_pontos: 999999,
    })

    expect(error, 'RPC deveria estar bloqueada por REVOKE').toBeTruthy()

    // Confirmar pontos do user não cresceram
    const { data: perfil } = await admin
      .from('perfis')
      .select('pontos_total')
      .eq('id', userId)
      .single()
    expect(perfil!.pontos_total).toBe(0)
  })

  it('CRITICAL: aluno NÃO consegue dar pontos a outro utilizador via fn_atualizar_pontos', async () => {
    const { client: attacker } = await createAndSignInAluno()
    const { userId: victim } = await createAndSignInAluno()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (attacker as any).rpc('fn_atualizar_pontos', {
      p_utilizador_id: victim,
      p_pontos: -10000,
    })

    expect(error).toBeTruthy()

    const { data: perfil } = await admin
      .from('perfis')
      .select('pontos_total')
      .eq('id', victim)
      .single()
    expect(perfil!.pontos_total).toBe(0)
  })

  // ──────────────────────────────────────────────────────────────────
  // Problem 2: fn_verificar_badges sem parâmetros + REVOKE
  // ──────────────────────────────────────────────────────────────────

  it('CRITICAL: assinatura antiga fn_verificar_badges(UUID) não existe', async () => {
    const { client } = await createAndSignInAluno()

    // Tenta a assinatura antiga — devia falhar porque foi DROP'ada
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client as any).rpc('fn_verificar_badges', {
      p_aluno_id: '00000000-0000-0000-0000-000000000000',
    })

    expect(error).toBeTruthy()
    // PostgREST devolve PGRST202 (could not find function) ou similar
    expect(error!.message.toLowerCase()).toMatch(/function|not found|does not exist|signature/i)
  })

  it('CRITICAL: nova assinatura fn_verificar_badges() está REVOKE para authenticated', async () => {
    const { client } = await createAndSignInAluno()

    // Tenta a nova assinatura — deveria falhar por falta de privilégio
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client as any).rpc('fn_verificar_badges')

    expect(error).toBeTruthy()
    expect(error!.message.toLowerCase()).toMatch(/permission|denied|privilege|not.+execute|function/i)
  })

  // ──────────────────────────────────────────────────────────────────
  // Caminho legítimo: fn_submeter_simulacao
  // ──────────────────────────────────────────────────────────────────

  it('Caminho legítimo: aluno chama fn_submeter_simulacao com reportou e ganha pontos', async () => {
    const { client, userId } = await createAndSignInAluno()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client as any).rpc('fn_submeter_simulacao', {
      p_simulacao_id: SIMULACAO_ID,
      p_estado: 'reportou',
      p_tempo_decisao: 15,
    })

    expect(error).toBeNull()
    expect(data?.ok).toBe(true)
    expect(data?.pontos_ganhos).toBeGreaterThan(0)

    const { data: perfil } = await admin
      .from('perfis')
      .select('pontos_total')
      .eq('id', userId)
      .single()
    expect(perfil!.pontos_total).toBe(data!.pontos_ganhos)
  })

  it('Retry: segunda submissão de "reportou" NÃO acumula pontos', async () => {
    const { client, userId } = await createAndSignInAluno()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: r1 } = await (client as any).rpc('fn_submeter_simulacao', {
      p_simulacao_id: SIMULACAO_ID,
      p_estado: 'reportou',
      p_tempo_decisao: 15,
    })
    const pontos1 = r1?.pontos_ganhos as number

    // Retry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: r2 } = await (client as any).rpc('fn_submeter_simulacao', {
      p_simulacao_id: SIMULACAO_ID,
      p_estado: 'reportou',
      p_tempo_decisao: 10,
    })
    expect(r2?.ok).toBe(true)
    expect(r2?.pontos_ganhos).toBe(0) // não acumula

    const { data: perfil } = await admin
      .from('perfis')
      .select('pontos_total')
      .eq('id', userId)
      .single()
    expect(perfil!.pontos_total).toBe(pontos1) // = primeira tentativa, não × 2
  })

  it('fn_submeter_simulacao rejeita estado inválido', async () => {
    const { client } = await createAndSignInAluno()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (client as any).rpc('fn_submeter_simulacao', {
      p_simulacao_id: SIMULACAO_ID,
      p_estado: 'administrador', // ← não é um valor de estado_simulacao
      p_tempo_decisao: 5,
    })
    expect(data?.ok).toBe(false)
  })

  it('fn_submeter_simulacao rejeita tempo_decisao negativo', async () => {
    const { client } = await createAndSignInAluno()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (client as any).rpc('fn_submeter_simulacao', {
      p_simulacao_id: SIMULACAO_ID,
      p_estado: 'reportou',
      p_tempo_decisao: -5,
    })
    expect(data?.ok).toBe(false)
  })

  // ──────────────────────────────────────────────────────────────────
  // Problem 3: RLS perfis — professor só vê alunos das suas turmas
  // ──────────────────────────────────────────────────────────────────

  it('RLS HIGH (RGPD): professor A NÃO vê alunos do professor B', async () => {
    // Setup: criar 2 professores, 2 turmas, 2 alunos em turmas diferentes
    const profAEmail = `profa-${Date.now()}@test.local`
    const profBEmail = `profb-${Date.now()}@test.local`
    const alunoAEmail = `alunoa-${Date.now()}@test.local`
    const alunoBEmail = `alunob-${Date.now()}@test.local`
    const password = 'Test@1234'

    const { data: profA } = await admin.auth.admin.createUser({
      email: profAEmail,
      password,
      email_confirm: true,
      user_metadata: { nome_completo: 'Prof A' },
      app_metadata: { papel: 'professor', escola_id: ESCOLA_A },
    })
    createdUserIds.push(profA.user!.id)

    const { data: profB } = await admin.auth.admin.createUser({
      email: profBEmail,
      password,
      email_confirm: true,
      user_metadata: { nome_completo: 'Prof B' },
      app_metadata: { papel: 'professor', escola_id: ESCOLA_A },
    })
    createdUserIds.push(profB.user!.id)

    const { data: alunoA } = await admin.auth.admin.createUser({
      email: alunoAEmail,
      password,
      email_confirm: true,
      user_metadata: { nome_completo: 'Aluno A' },
      app_metadata: { papel: 'aluno', escola_id: ESCOLA_A },
    })
    createdUserIds.push(alunoA.user!.id)

    const { data: alunoB } = await admin.auth.admin.createUser({
      email: alunoBEmail,
      password,
      email_confirm: true,
      user_metadata: { nome_completo: 'Aluno B' },
      app_metadata: { papel: 'aluno', escola_id: ESCOLA_A },
    })
    createdUserIds.push(alunoB.user!.id)

    // Turmas (criadas via service-role)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: turmaA } = await (admin.from('turmas') as any)
      .insert({
        nome: 'Turma A',
        professor_id: profA.user!.id,
        escola_id: ESCOLA_A,
        ano_letivo: '2025/2026',
        ativo: true,
      })
      .select('id')
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: turmaB } = await (admin.from('turmas') as any)
      .insert({
        nome: 'Turma B',
        professor_id: profB.user!.id,
        escola_id: ESCOLA_A,
        ano_letivo: '2025/2026',
        ativo: true,
      })
      .select('id')
      .single()

    // Inscrições
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('turma_alunos') as any).insert([
      { turma_id: turmaA.id, aluno_id: alunoA.user!.id, ativo: true },
      { turma_id: turmaB.id, aluno_id: alunoB.user!.id, ativo: true },
    ])

    // Prof A faz login e tenta ler alunos
    const profAClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await profAClient.auth.signInWithPassword({ email: profAEmail, password })

    // Prof A consegue ler aluno A (da sua turma)
    const { data: vistoA } = await profAClient
      .from('perfis')
      .select('id, nome_completo')
      .eq('id', alunoA.user!.id)
      .maybeSingle()
    expect(vistoA).toBeTruthy()
    expect(vistoA!.id).toBe(alunoA.user!.id)

    // Prof A NÃO consegue ler aluno B (da turma do prof B)
    const { data: vistoB } = await profAClient
      .from('perfis')
      .select('id, nome_completo')
      .eq('id', alunoB.user!.id)
      .maybeSingle()
    expect(vistoB).toBeNull() // RLS filtra — devolve 0 linhas, não erro
  })

  it('Admin lê todos os perfis', async () => {
    const adminEmail = `admin-${Date.now()}@test.local`
    const password = 'Admin@1234'
    const { data: adminUser } = await admin.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
      user_metadata: { nome_completo: 'Test Admin' },
      app_metadata: { papel: 'administrador' },
    })
    createdUserIds.push(adminUser.user!.id)

    // Criar outro aluno para servir de target
    const { data: target } = await admin.auth.admin.createUser({
      email: `target-${Date.now()}@test.local`,
      password,
      email_confirm: true,
      user_metadata: { nome_completo: 'Target' },
      app_metadata: { papel: 'aluno' },
    })
    createdUserIds.push(target.user!.id)

    const adminClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await adminClient.auth.signInWithPassword({ email: adminEmail, password })

    const { data: visto } = await adminClient
      .from('perfis')
      .select('id, nome_completo')
      .eq('id', target.user!.id)
      .maybeSingle()
    expect(visto).toBeTruthy()
    expect(visto!.id).toBe(target.user!.id)
  })
})
