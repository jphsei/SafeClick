import 'server-only'
import { redirect } from 'next/navigation'
import { type User, type SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { type Database, type PapelUtilizador } from '@/lib/types/database.types'

type ServerSupabase = SupabaseClient<Database>

/**
 * Helpers de autenticação/autorização para Server Components.
 *
 * Antes destes helpers, 20+ pages do dashboard repetiam o mesmo padrão
 * de 10-15 linhas: getUser → redirect /login → fetch perfil → verificar
 * papel → redirect ao dashboard correto. Estes helpers centralizam essa
 * lógica e devolvem o `supabase` client para a page continuar a usar.
 *
 * Convenção: as funções lançam `redirect()` em vez de retornar `null`,
 * por isso o tipo de retorno garante sempre user/perfil presente — o
 * compilador não precisa de mais checks no caller.
 */

/** Perfil mínimo devolvido por `requireRole`. */
export interface PerfilMinimo {
  papel: PapelUtilizador
  nome_completo: string
  email: string
}

/** Calcula o path do dashboard para um determinado papel. */
function dashboardPath(papel: PapelUtilizador): string {
  if (papel === 'professor') return '/professor'
  if (papel === 'administrador') return '/admin'
  return '/aluno'
}

/**
 * Garante que há um utilizador autenticado.
 * Redireciona para `/login` caso contrário.
 *
 * Devolve o `user` e o `supabase` client (para a page continuar a fazer
 * queries) — não busca perfil.
 */
export async function requireUser(): Promise<{
  user: User
  supabase: ServerSupabase
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return { user, supabase }
}

/**
 * Garante autenticação **e** que o utilizador tem o papel esperado.
 *
 * - Sem utilizador → `redirect('/login')`
 * - Sem perfil na tabela `perfis` → `redirect('/login')` (estado inválido)
 * - Papel diferente do esperado → redireciona para o dashboard do papel real
 *   (admin → `/admin`, professor → `/professor`, aluno → `/aluno`)
 *
 * @param papel  Papel(s) aceite(s). Pode ser uma string ou array.
 */
export async function requireRole(papel: PapelUtilizador | PapelUtilizador[]): Promise<{
  user: User
  perfil: PerfilMinimo
  supabase: ServerSupabase
}> {
  const { user, supabase } = await requireUser()

  const { data: perfilRaw } = await supabase
    .from('perfis')
    .select('papel, nome_completo, email')
    .eq('id', user.id)
    .single()

  if (!perfilRaw) redirect('/login')

  const perfil = perfilRaw as PerfilMinimo
  const papeisAceites = Array.isArray(papel) ? papel : [papel]

  if (!papeisAceites.includes(perfil.papel)) {
    redirect(dashboardPath(perfil.papel))
  }

  return { user, perfil, supabase }
}

/**
 * Garante autenticação e devolve o perfil completo (com os `fields`
 * pedidos). Não verifica papel — use `requireRole` para isso.
 *
 * Útil em pages partilhadas entre papéis (ex: `/perfil`) que precisam
 * de campos extra para além do mínimo.
 *
 * @param fields  Lista de campos para o `.select()` do Supabase.
 *                Default: campos mínimos do perfil.
 * @example
 *   const { perfil } = await requireProfile<{
 *     nome_completo: string
 *     escolas: { nome: string } | null
 *   }>('nome_completo, escolas(nome)')
 */
export async function requireProfile<T = PerfilMinimo>(
  fields: string = 'papel, nome_completo, email',
): Promise<{
  user: User
  perfil: T
  supabase: ServerSupabase
}> {
  const { user, supabase } = await requireUser()

  const { data: perfilRaw } = await supabase
    .from('perfis')
    .select(fields)
    .eq('id', user.id)
    .single()

  if (!perfilRaw) redirect('/login')

  return { user, perfil: perfilRaw as T, supabase }
}
