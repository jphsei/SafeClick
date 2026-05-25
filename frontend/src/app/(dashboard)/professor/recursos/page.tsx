import { requireRole } from '@/lib/auth/require-role'
import { RecursosClient, type RecursoRow } from './recursos-client'

export default async function RecursosPage() {
  const { user, supabase } = await requireRole('professor')

  // Os recursos pedagógicos são partilhados entre professores. Cada um
  // só pode apagar os que criou — daí precisarmos do `criado_por` aqui
  // para o `RecursosClient` decidir quando mostrar o botão de apagar.
  const { data: recursosRaw } = await supabase
    .from('recursos_pedagogicos')
    .select('id, titulo, descricao, tipo, url_ficheiro, modulo_id, criado_por')
    .order('criado_em', { ascending: false })

  const recursos = (recursosRaw as RecursoRow[] | null) ?? []

  // Lista de módulos para o select de filtro no RecursosClient.
  const { data: modulosRaw } = await supabase
    .from('modulos')
    .select('id, titulo')
    .order('titulo')

  const modulos = (modulosRaw as { id: string; titulo: string }[] | null) ?? []

  return (
    <RecursosClient
      recursos={recursos}
      modulos={modulos}
      professorId={user.id}
    />
  )
}
