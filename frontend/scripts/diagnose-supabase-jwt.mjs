#!/usr/bin/env node
/**
 * Diagnóstico isolado do JWT emitido pelo Supabase local.
 *
 * NÃO toca em nada do projecto:
 *   - não importa nenhuma helper de tests/
 *   - não usa as wrappers em src/lib/supabase/
 *   - usa apenas @supabase/supabase-js puro
 *
 * O que faz:
 *   1. Lê env vars de .env.local (idêntico ao que o Vitest faz via loadEnv)
 *   2. Cria createClient (anon)
 *   3. Faz signUp com email/password aleatórios
 *   4. Decodifica o access_token devolvido (header + payload em JSON)
 *   5. Chama getSession() e getUser() e mostra ambos
 *   6. Faz uma RPC inocente (fn_concluir_aula com aula inexistente) só
 *      para verificar o que devolve o servidor
 *   7. Limpa o user criado
 *
 * Como correr:
 *   cd frontend
 *   node scripts/diagnose-supabase-jwt.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── 1. Carregar .env.local sem dependências externas ───────────────
function loadEnvLocal() {
  const envPath = join(__dirname, '..', '.env.local')
  try {
    const content = readFileSync(envPath, 'utf8')
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (!m) continue
      let value = m[2].trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (process.env[m[1]] === undefined) {
        process.env[m[1]] = value
      }
    }
  } catch (err) {
    console.error('Não consegui ler .env.local:', err.message)
    process.exit(1)
  }
}
loadEnvLocal()

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !ANON || !SROLE) {
  console.error('Faltam env vars. Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// ── 2. Helper: decoder de JWT (sem libs) ───────────────────────────
function decodeJwt(token) {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return { error: `JWT has ${parts.length} parts, expected 3` }
  const decodePart = (p) => {
    const padded = p + '='.repeat((4 - (p.length % 4)) % 4)
    const b64 = padded.replace(/-/g, '+').replace(/_/g, '/')
    try {
      return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
    } catch (e) {
      return { _decode_error: e.message }
    }
  }
  return {
    header: decodePart(parts[0]),
    payload: decodePart(parts[1]),
    signatureLen: parts[2].length,
  }
}

function printJwt(label, token) {
  console.log(`\n── ${label} ─────────────────────────────────────────`)
  if (!token) {
    console.log('  (no token)')
    return
  }
  const d = decodeJwt(token)
  console.log('  header :', JSON.stringify(d?.header, null, 2))
  console.log('  payload:', JSON.stringify(d?.payload, null, 2))
  console.log('  has `sub` claim?', d?.payload && 'sub' in d.payload)
  console.log('  has `role` claim?', d?.payload && 'role' in d.payload)
  console.log('  has `aud` claim?', d?.payload && 'aud' in d.payload)
}

// ── 3. Inspeccionar a anon key estática ────────────────────────────
console.log('========== ANON KEY (do .env.local) ==========')
printJwt('ANON KEY (static)', ANON)

console.log('\n========== SERVICE_ROLE KEY ==========')
printJwt('SERVICE_ROLE (static)', SROLE)

// ── 4. signUp + getSession + getUser num cliente puro ─────────────
const client = createClient(URL, ANON, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const email = `diag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`
const password = 'Diag@12345' // 10+ chars para passar minimum_password_length

console.log(`\n========== signUp(${email}) ==========`)
const { data: signUpData, error: signUpError } = await client.auth.signUp({ email, password })
console.log('error:', signUpError?.message ?? null)
console.log('user.id:', signUpData?.user?.id ?? null)
console.log('user.aud:', signUpData?.user?.aud ?? null)
console.log('user.role:', signUpData?.user?.role ?? null)
console.log('session present?', !!signUpData?.session)
console.log('access_token len:', signUpData?.session?.access_token?.length ?? 0)
console.log('token_type:', signUpData?.session?.token_type ?? null)
console.log('expires_in:', signUpData?.session?.expires_in ?? null)

printJwt('signUp.session.access_token (USER JWT)', signUpData?.session?.access_token)

console.log('\n========== getSession() ==========')
const { data: getSessionData, error: getSessionError } = await client.auth.getSession()
console.log('error:', getSessionError?.message ?? null)
console.log('has session?', !!getSessionData?.session)
console.log('access_token len:', getSessionData?.session?.access_token?.length ?? 0)
const sameToken =
  signUpData?.session?.access_token &&
  getSessionData?.session?.access_token === signUpData.session.access_token
console.log('same token as signUp?', sameToken)

console.log('\n========== getUser() ==========')
const { data: getUserData, error: getUserError } = await client.auth.getUser()
console.log('error:', getUserError ? `${getUserError.name}: ${getUserError.message}` : null)
console.log('error code:', getUserError?.status ?? getUserError?.code ?? null)
console.log('user.id:', getUserData?.user?.id ?? null)
console.log('user.aud:', getUserData?.user?.aud ?? null)
console.log('user.role:', getUserData?.user?.role ?? null)

// ── 5. Raw HTTP GET /auth/v1/user para ver a resposta crua ────────
console.log('\n========== RAW GET /auth/v1/user ==========')
try {
  const res = await fetch(`${URL}/auth/v1/user`, {
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${signUpData?.session?.access_token}`,
    },
  })
  console.log('status:', res.status)
  const text = await res.text()
  console.log('body:', text)
} catch (e) {
  console.log('fetch error:', e.message)
}

// ── 6. Raw RPC call ───────────────────────────────────────────────
console.log('\n========== RAW POST /rest/v1/rpc/fn_concluir_aula ==========')
try {
  const res = await fetch(`${URL}/rest/v1/rpc/fn_concluir_aula`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${signUpData?.session?.access_token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ p_aula_id: '00000000-0000-0000-0000-000000000000' }),
  })
  console.log('status:', res.status)
  const text = await res.text()
  console.log('body:', text)
} catch (e) {
  console.log('fetch error:', e.message)
}

// ── 7. JWT secret check via service-role ──────────────────────────
console.log('\n========== HEALTH ENDPOINTS ==========')
try {
  const settings = await fetch(`${URL}/auth/v1/settings`, { headers: { apikey: ANON } })
  console.log('GET /auth/v1/settings:', settings.status, await settings.text())
} catch (e) {
  console.log('settings fetch failed:', e.message)
}

// ── 8. Cleanup ────────────────────────────────────────────────────
if (signUpData?.user?.id) {
  console.log('\n========== Cleanup ==========')
  const admin = createClient(URL, SROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: delErr } = await admin.auth.admin.deleteUser(signUpData.user.id)
  console.log('deleteUser error:', delErr?.message ?? null)
}

console.log('\n========== DONE ==========')
process.exit(0)
