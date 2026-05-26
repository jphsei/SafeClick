import 'server-only'
import { readdir } from 'fs/promises'
import path from 'path'
import pkg from '../../package.json'

/**
 * Informação real da plataforma para mostrar em `/admin/configuracoes`.
 *
 * Em vez de hardcodar "Versão 1.0.0" e "3 migrações aplicadas",
 * lemos os valores reais em runtime/build-time.
 */

/** Versão da app — lida directamente do `package.json`. */
export function getAppVersion(): string {
  return pkg.version
}

/**
 * Conta o número de ficheiros `.sql` em `supabase/migrations/`.
 *
 * Usamos o filesystem em vez de query à tabela `supabase_migrations.
 * schema_migrations` porque:
 *   - O schema `supabase_migrations` não está exposto via API REST por
 *     defeito (precisaria de configuração extra).
 *   - O número que importa para o admin é "quantas migrações o repo
 *     tem", e essa é a definição na pasta de migrações.
 *
 * Devolve `null` em caso de erro (ex: pasta não existe em produção,
 * filesystem read-only). A page mostra "—" nesse caso.
 */
export async function getMigrationsCount(): Promise<number | null> {
  try {
    // O CWD do Next.js é `frontend/` — a pasta de migrações é `../supabase/migrations/`.
    const migrationsDir = path.join(process.cwd(), '..', 'supabase', 'migrations')
    const files = await readdir(migrationsDir)
    return files.filter((f) => f.endsWith('.sql')).length
  } catch (err) {
    console.warn('[platform-info] não foi possível contar migrações:', err)
    return null
  }
}
