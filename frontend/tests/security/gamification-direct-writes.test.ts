// @vitest-environment node
/**
 * Testes de segurança: REVOKE de escritas directas nas tabelas
 * de gamificação (migration 20260618000001).
 *
 * NOTA: Forçamos `environment: 'node'` (em vez do default `happy-dom`
 * em vitest.config.ts) porque o `@supabase/supabase-js` recente
 * inicializa o cliente Realtime que requer `WebSocket`. Node 22 tem
 * `globalThis.WebSocket` nativo, mas o happy-dom (DOM minimalista)
 * sobrepõe-o com `undefined`, partindo o `createClient`. Os testes
 * desta suite são integração HTTP pura — não precisam de DOM. Outros
 * testes (csp, log, sanitize) mantêm o default happy-dom.
 *
 * Verifica:
 *   1. inserts directos em progresso_modulo / tentativas_quiz /
 *      tentativas_simulacao / respostas_tentativa falham como aluno
 *      autenticado
 *   2. updates directos falham
 *   3. fn_submeter_quiz continua a funcionar
 *   4. fn_concluir_aula continua a funcionar
 *   5. fn_submeter_simulacao continua a funcionar
 *   6. leaderboard (perfis.pontos_total) e badges (utilizador_badges)
 *      continuam a atualizar via as RPCs legítimas
 *
 * Pré-requisitos:
 *   - Supabase local up (`supabase start`)
 *   - Migrations aplicadas (`supabase db reset`)
 *   - Seed carregado (IDs estáticos abaixo)
 *   - Env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *     SUPABASE_SERVICE_ROLE_KEY
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { warnIfMissingIntegrationEnv } from '../helpers/integration-env'

const SUITE_NAME = 'Security: REVOKE escritas directas gamificação'
const envStatus = warnIfMissingIntegrationEnv(SUITE_NAME)
const { envOk, explicitSkip, reason } = envStatus

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// IDs do seed (estáticos)
const MODULO_ID = 'c0000001-0000-0000-0000-000000000001'   // Introdução à Cibersegurança
const AULA_ID = 'a0000001-0001-0000-0000-000000000001'     // Aula 1 do módulo 1
const QUIZ_ID = 'd0000001-0001-0000-0000-000000000001'     // Quiz Fundamentos
const SIMULACAO_ID = 'f0000001-0001-0000-0000-000000000001' // Simulação 1

// Sentinela: se faltam env vars e o user NÃO setou SKIP_INTEGRATION_TESTS=1,
// fazemos a suite FALHAR com mensagem clara em vez de skip silencioso.
// Política do projecto: testes de segurança críticos NÃO podem passar
// disfarçados de skipped.
describe.runIf(!envOk && !explicitSkip)(SUITE_NAME, () => {
  it('FAIL: integration env not configured', () => {
    throw new Error(
      reason ??
        'Integration env not configured. Set SKIP_INTEGRATION_TESTS=1 to silence.',
    )
  })
})

describe.skipIf(!envOk)(SUITE_NAME, () => {
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

  /**
   * Cria aluno e devolve cliente já autenticado.
   *
   * Padrão: signUp directamente no client que vai ser usado nas
   * chamadas seguintes. Em Supabase local com `enable_confirmations =
   * false` (ver supabase/config.toml), `auth.signUp()` devolve
   * imediatamente `data.session` — o JWT fica em memória nesse client
   * e é enviado em todos os pedidos subsequentes.
   *
   * Não usamos `anon.signUp + new client.signInWithPassword` porque
   * essa combinação tinha um caminho problemático em algumas versões
   * de supabase-js onde o segundo client não retinha JWT.
   */
  async function createAndSignInAluno(): Promise<{
    client: SupabaseClient
    userId: string
  }> {
    const email = `aluno-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`
    const password = 'Aluno@1234'

    const client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: signupData, error: signupError } = await client.auth.signUp({
      email,
      password,
    })
    expect(signupError).toBeNull()
    expect(signupData.user, 'signUp deve devolver user').toBeTruthy()
    expect(
      signupData.session,
      'signUp deve devolver session imediatamente (Supabase local: enable_confirmations=false)',
    ).toBeTruthy()
    expect(
      signupData.session?.access_token,
      'signUp deve devolver access_token',
    ).toBeTruthy()

    const userId = signupData.user!.id
    createdUserIds.push(userId)

    return { client, userId }
  }

  /**
   * Asserta que uma RPC retornou `{ ok: true }`, imprimindo o payload
   * completo no console em caso de falha — em vez do genérico
   * "expected true, got false" que esconde o motivo real (campo `erro`
   * devolvido pela função SQL).
   */
  function expectRpcOk(
    rpcName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: any,
  ) {
    expect(error, `RPC ${rpcName} devolveu erro: ${error?.message ?? '(none)'}`).toBeNull()
    if (data?.ok !== true) {
      console.error('RPC failed', { rpc: rpcName, data, error })
    }
    expect(data?.ok, `RPC ${rpcName} devolveu ok=false (ver console.error acima)`).toBe(true)
  }

  // ──────────────────────────────────────────────────────────────────
  // 1. INSERT directos falham como authenticated
  // ──────────────────────────────────────────────────────────────────

  it('CRITICAL: aluno NÃO consegue INSERT em progresso_modulo (forjar conclusão)', async () => {
    const { client, userId } = await createAndSignInAluno()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client.from('progresso_modulo') as any).insert({
      aluno_id: userId,
      modulo_id: MODULO_ID,
      aulas_concluidas: [],
      percentagem: 100,
      concluido: true,
    })

    expect(error, 'INSERT directo deveria falhar (REVOKE)').toBeTruthy()
    expect(error!.message.toLowerCase()).toMatch(/permission|denied|privilege|not authorized/i)

    // Confirmar que nada foi escrito
    const { data: rows } = await admin
      .from('progresso_modulo')
      .select('id')
      .eq('aluno_id', userId)
    expect(rows ?? []).toHaveLength(0)
  })

  it('CRITICAL: aluno NÃO consegue INSERT em tentativas_quiz (forjar nota=100)', async () => {
    const { client, userId } = await createAndSignInAluno()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client.from('tentativas_quiz') as any).insert({
      quiz_id: QUIZ_ID,
      aluno_id: userId,
      nota: 100,
      pontos_ganhos: 0,
      concluido: true,
      concluido_em: new Date().toISOString(),
    })

    expect(error, 'INSERT directo deveria falhar (REVOKE)').toBeTruthy()
    expect(error!.message.toLowerCase()).toMatch(/permission|denied|privilege|not authorized/i)

    const { data: rows } = await admin
      .from('tentativas_quiz')
      .select('id')
      .eq('aluno_id', userId)
    expect(rows ?? []).toHaveLength(0)
  })

  it('CRITICAL: aluno NÃO consegue INSERT em tentativas_simulacao (forjar reportou)', async () => {
    const { client, userId } = await createAndSignInAluno()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client.from('tentativas_simulacao') as any).insert({
      simulacao_id: SIMULACAO_ID,
      aluno_id: userId,
      estado: 'reportou',
      pontos_ganhos: 0,
    })

    expect(error, 'INSERT directo deveria falhar (REVOKE)').toBeTruthy()
    expect(error!.message.toLowerCase()).toMatch(/permission|denied|privilege|not authorized/i)

    const { data: rows } = await admin
      .from('tentativas_simulacao')
      .select('id')
      .eq('aluno_id', userId)
    expect(rows ?? []).toHaveLength(0)
  })

  it('CRITICAL: aluno NÃO consegue INSERT em respostas_tentativa', async () => {
    const { client } = await createAndSignInAluno()

    // Tentar inserir uma resposta com tentativa_id arbitrário —
    // mesmo que houvesse uma tentativa real do aluno, a tabela está
    // bloqueada para escrita directa.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client.from('respostas_tentativa') as any).insert({
      tentativa_id: '00000000-0000-0000-0000-000000000000',
      pergunta_id: '00000000-0000-0000-0000-000000000000',
      opcao_id: null,
      correta: true,
    })

    expect(error, 'INSERT directo deveria falhar (REVOKE)').toBeTruthy()
    expect(error!.message.toLowerCase()).toMatch(/permission|denied|privilege|not authorized/i)
  })

  // ──────────────────────────────────────────────────────────────────
  // 2. UPDATE directos falham como authenticated
  // ──────────────────────────────────────────────────────────────────

  it('CRITICAL: aluno NÃO consegue UPDATE em progresso_modulo (alterar concluido)', async () => {
    const { client, userId } = await createAndSignInAluno()

    // Setup: criar uma row legítima via service-role (representa progresso real)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('progresso_modulo') as any).insert({
      aluno_id: userId,
      modulo_id: MODULO_ID,
      aulas_concluidas: [],
      percentagem: 0,
      concluido: false,
    })

    // Aluno tenta marcar como concluído para disparar badges
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client.from('progresso_modulo') as any)
      .update({ concluido: true, percentagem: 100 })
      .eq('aluno_id', userId)
      .eq('modulo_id', MODULO_ID)

    expect(error, 'UPDATE directo deveria falhar (REVOKE)').toBeTruthy()
    expect(error!.message.toLowerCase()).toMatch(/permission|denied|privilege|not authorized/i)

    // Confirmar que a row NÃO foi alterada
    const { data: row } = await admin
      .from('progresso_modulo')
      .select('concluido, percentagem')
      .eq('aluno_id', userId)
      .eq('modulo_id', MODULO_ID)
      .single()
    expect(row!.concluido).toBe(false)
    expect(Number(row!.percentagem)).toBe(0)
  })

  it('CRITICAL: aluno NÃO consegue UPDATE em tentativas_quiz (alterar nota)', async () => {
    const { client, userId } = await createAndSignInAluno()

    // Setup: criar tentativa via service-role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tentativa } = await (admin.from('tentativas_quiz') as any)
      .insert({
        quiz_id: QUIZ_ID,
        aluno_id: userId,
        nota: 0,
        pontos_ganhos: 0,
        concluido: false,
      })
      .select('id')
      .single()

    // Aluno tenta inflar a nota
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client.from('tentativas_quiz') as any)
      .update({ nota: 100, concluido: true })
      .eq('id', tentativa!.id)

    expect(error, 'UPDATE directo deveria falhar (REVOKE)').toBeTruthy()
    expect(error!.message.toLowerCase()).toMatch(/permission|denied|privilege|not authorized/i)

    const { data: row } = await admin
      .from('tentativas_quiz')
      .select('nota, concluido')
      .eq('id', tentativa!.id)
      .single()
    expect(Number(row!.nota)).toBe(0)
    expect(row!.concluido).toBe(false)
  })

  it('CRITICAL: aluno NÃO consegue UPDATE em tentativas_simulacao (alterar estado)', async () => {
    const { client, userId } = await createAndSignInAluno()

    // Setup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tentativa } = await (admin.from('tentativas_simulacao') as any)
      .insert({
        simulacao_id: SIMULACAO_ID,
        aluno_id: userId,
        estado: 'clicou',
        pontos_ganhos: 0,
      })
      .select('id')
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client.from('tentativas_simulacao') as any)
      .update({ estado: 'reportou' })
      .eq('id', tentativa!.id)

    expect(error, 'UPDATE directo deveria falhar (REVOKE)').toBeTruthy()
    expect(error!.message.toLowerCase()).toMatch(/permission|denied|privilege|not authorized/i)

    const { data: row } = await admin
      .from('tentativas_simulacao')
      .select('estado')
      .eq('id', tentativa!.id)
      .single()
    expect(row!.estado).toBe('clicou')
  })

  // ──────────────────────────────────────────────────────────────────
  // 3, 4, 5. Caminhos legítimos via RPC SECURITY DEFINER
  //          (bypassam REVOKE porque correm como owner)
  // ──────────────────────────────────────────────────────────────────

  it('LEGITIMATE: fn_submeter_quiz continua a funcionar (SECURITY DEFINER bypassa REVOKE)', async () => {
    const { client, userId } = await createAndSignInAluno()

    // Submetemos respostas vazias — não importa se acerta;
    // o que importa é a RPC correr até ao fim e gravar
    // tentativas_quiz/respostas_tentativa apesar do REVOKE.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client as any).rpc('fn_submeter_quiz', {
      p_quiz_id: QUIZ_ID,
      p_respostas: {},
    })

    expectRpcOk('fn_submeter_quiz', data, error)
    expect(typeof data?.nota).toBe('number')

    // Tentativa GRAVADA na tabela apesar do REVOKE → prova SECURITY DEFINER bypass
    const { data: tentativas } = await admin
      .from('tentativas_quiz')
      .select('id, concluido')
      .eq('aluno_id', userId)
    expect(tentativas ?? []).toHaveLength(1)
    expect(tentativas![0].concluido).toBe(true)

    // E pelo menos 1 resposta gravada (uma por pergunta do quiz)
    const { data: respostas } = await admin
      .from('respostas_tentativa')
      .select('id')
      .eq('tentativa_id', tentativas![0].id)
    expect((respostas ?? []).length).toBeGreaterThan(0)
  })

  it('LEGITIMATE: fn_concluir_aula continua a funcionar (escreve progresso_modulo)', async () => {
    const { client, userId } = await createAndSignInAluno()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client as any).rpc('fn_concluir_aula', {
      p_aula_id: AULA_ID,
    })

    expectRpcOk('fn_concluir_aula', data, error)
    expect(data?.ja_concluida).toBe(false)

    // Confirma row gravada apesar do REVOKE (SECURITY DEFINER bypass)
    const { data: progresso } = await admin
      .from('progresso_modulo')
      .select('aulas_concluidas, percentagem')
      .eq('aluno_id', userId)
      .eq('modulo_id', MODULO_ID)
      .single()

    expect(progresso).toBeTruthy()
    expect(progresso!.aulas_concluidas).toContain(AULA_ID)
  })

  it('LEGITIMATE: fn_submeter_simulacao continua a funcionar', async () => {
    const { client, userId } = await createAndSignInAluno()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client as any).rpc('fn_submeter_simulacao', {
      p_simulacao_id: SIMULACAO_ID,
      p_estado: 'reportou',
      p_tempo_decisao: 15,
    })

    expectRpcOk('fn_submeter_simulacao', data, error)
    expect(data?.pontos_ganhos).toBeGreaterThan(0)

    const { data: tentativas } = await admin
      .from('tentativas_simulacao')
      .select('id, estado')
      .eq('aluno_id', userId)
    expect(tentativas ?? []).toHaveLength(1)
    expect(tentativas![0].estado).toBe('reportou')
  })

  // ──────────────────────────────────────────────────────────────────
  // 6. Leaderboard (perfis.pontos_total) e badges (utilizador_badges)
  //    actualizam apenas via RPCs legítimas
  // ──────────────────────────────────────────────────────────────────

  it('LEADERBOARD: pontos_total cresce APENAS via RPC, nunca via escrita directa', async () => {
    const { client, userId } = await createAndSignInAluno()

    // Estado inicial
    const { data: antes } = await admin
      .from('perfis')
      .select('pontos_total')
      .eq('id', userId)
      .single()
    expect(antes!.pontos_total).toBe(0)

    // Tentativa de manipulação directa (deveria falhar — REVOKE em
    // tentativas_simulacao impede o passo 1 do exploit)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: forjeError } = await (client.from('tentativas_simulacao') as any).insert({
      simulacao_id: SIMULACAO_ID,
      aluno_id: userId,
      estado: 'reportou',
      pontos_ganhos: 999999,
    })
    expect(forjeError).toBeTruthy()

    // Pontos continuam a 0 (sem ataque bem-sucedido)
    const { data: depoisDoAtaque } = await admin
      .from('perfis')
      .select('pontos_total')
      .eq('id', userId)
      .single()
    expect(depoisDoAtaque!.pontos_total).toBe(0)

    // Caminho legítimo: RPC atribui pontos correctamente
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcRes, error: rpcErr } = await (client as any).rpc('fn_submeter_simulacao', {
      p_simulacao_id: SIMULACAO_ID,
      p_estado: 'reportou',
      p_tempo_decisao: 20,
    })
    expectRpcOk('fn_submeter_simulacao (Leaderboard)', rpcRes, rpcErr)
    const pontosLegitimos = rpcRes!.pontos_ganhos as number
    expect(pontosLegitimos).toBeGreaterThan(0)
    expect(pontosLegitimos).toBeLessThan(999999) // não foi a quantidade que o atacante tentou

    const { data: depoisRpc } = await admin
      .from('perfis')
      .select('pontos_total')
      .eq('id', userId)
      .single()
    expect(depoisRpc!.pontos_total).toBe(pontosLegitimos)
  })

  it('BADGES: aluno NÃO consegue forjar 5x "reportou" para apanhar Badge "Detetive Digital"', async () => {
    const { client, userId } = await createAndSignInAluno()

    // Tentar inserir 5 tentativas falsas — TODAS devem falhar
    for (let i = 0; i < 5; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (client.from('tentativas_simulacao') as any).insert({
        simulacao_id: SIMULACAO_ID,
        aluno_id: userId,
        estado: 'reportou',
        pontos_ganhos: 0,
      })
      expect(error).toBeTruthy()
    }

    // Disparar fn_verificar_badges via fn_submeter_simulacao (1 reportou real)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client as any).rpc('fn_submeter_simulacao', {
      p_simulacao_id: SIMULACAO_ID,
      p_estado: 'reportou',
      p_tempo_decisao: 15,
    })

    // Badge "Detetive Digital" precisa de 5 reportou. Como só 1 é real, NÃO atribuído.
    const { data: badges } = await admin
      .from('utilizador_badges')
      .select('badge_id')
      .eq('utilizador_id', userId)
      .eq('badge_id', 'b1000001-0000-0000-0000-000000000002') // Detetive Digital

    expect(badges ?? []).toHaveLength(0)
  })

  it('BADGES: aluno NÃO consegue inserir directamente em utilizador_badges', async () => {
    const { client, userId } = await createAndSignInAluno()

    // utilizador_badges tem RLS ON mas sem policy de INSERT para authenticated
    // → INSERT é negado por defeito.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client.from('utilizador_badges') as any).insert({
      utilizador_id: userId,
      badge_id: 'b1000001-0000-0000-0000-000000000005', // "Especialista" — +100 pts
    })

    expect(error).toBeTruthy()

    const { data: badges } = await admin
      .from('utilizador_badges')
      .select('id')
      .eq('utilizador_id', userId)
    expect(badges ?? []).toHaveLength(0)
  })

  it('BADGES: caminho legítimo — badge "Primeiro Passo" é atribuído quando aluno conclui módulo via RPCs', async () => {
    const { client, userId } = await createAndSignInAluno()

    // Concluir TODAS as aulas do módulo 1 (3 aulas) via fn_concluir_aula
    // (necessário para concluido=true → Badge 1 ("Primeiro Passo"))
    const aulasModulo1 = [
      'a0000001-0001-0000-0000-000000000001',
      'a0000001-0001-0000-0000-000000000002',
      'a0000001-0001-0000-0000-000000000003',
    ]

    for (const aulaId of aulasModulo1) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (client as any).rpc('fn_concluir_aula', { p_aula_id: aulaId })
      expectRpcOk(`fn_concluir_aula (aula ${aulaId})`, data, error)
    }

    // Badge "Primeiro Passo" deveria estar atribuído
    const { data: badges } = await admin
      .from('utilizador_badges')
      .select('badge_id')
      .eq('utilizador_id', userId)
      .eq('badge_id', 'b1000001-0000-0000-0000-000000000001') // Primeiro Passo

    expect(badges ?? []).toHaveLength(1)
  })

  // SELECT continua a funcionar (REVOKE não toca em SELECT)
  it('READ: aluno continua a fazer SELECT em progresso_modulo (próprio)', async () => {
    const { client, userId } = await createAndSignInAluno()

    // Setup via service-role (próprio fluxo RPC seria suficiente, mas
    // queremos testar SELECT explicitamente).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('progresso_modulo') as any).insert({
      aluno_id: userId,
      modulo_id: MODULO_ID,
      aulas_concluidas: [AULA_ID],
      percentagem: 33,
      concluido: false,
    })

    const { data, error } = await client
      .from('progresso_modulo')
      .select('aulas_concluidas, percentagem')
      .eq('aluno_id', userId)
      .eq('modulo_id', MODULO_ID)
      .single()

    expect(error).toBeNull()
    expect(data).toBeTruthy()
    expect(Number(data!.percentagem)).toBe(33)
  })
})
