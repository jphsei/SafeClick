import { Users, GraduationCap, BookUser, ShieldCheck } from 'lucide-react'
import { requireRole } from '@/lib/auth/require-role'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type PapelUtilizador } from '@/lib/types/database.types'
import { UtilizadorForm } from './utilizador-form'
import { DesativarUtilizadorButton } from './desativar-utilizador-button'

const papelLabels: Record<PapelUtilizador, string> = {
  aluno: 'Aluno',
  professor: 'Professor',
  administrador: 'Administrador',
}

const papelColors: Record<PapelUtilizador, string> = {
  aluno: 'bg-blue-100 text-blue-700',
  professor: 'bg-green-100 text-green-700',
  administrador: 'bg-purple-100 text-purple-700',
}

const papelIcons: Record<PapelUtilizador, React.ComponentType<{ className?: string }>> = {
  aluno: GraduationCap,
  professor: BookUser,
  administrador: ShieldCheck,
}

interface UtilizadorRow {
  id: string
  nome_completo: string
  email: string
  papel: PapelUtilizador
  pontos_total: number
  ativo: boolean
  criado_em: string
  escola_id: string | null
  numero_aluno: string | null
  escolas: { nome: string } | null
}

export default async function AdminUtilizadoresPage() {
  const { user, supabase } = await requireRole('administrador')

  const { data: utilizadoresRaw } = await supabase
    .from('perfis')
    .select(
      'id, nome_completo, email, papel, pontos_total, ativo, criado_em, escola_id, numero_aluno, escolas(nome)',
    )
    .order('criado_em', { ascending: false })

  const utilizadores = (utilizadoresRaw as UtilizadorRow[] | null) ?? []

  // Lista de escolas ativas para o select do form
  const { data: escolasRaw } = await supabase
    .from('escolas')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome')

  const escolas = (escolasRaw as { id: string; nome: string }[] | null) ?? []

  const counts = utilizadores.reduce<Record<string, number>>((acc, u) => {
    acc[u.papel] = (acc[u.papel] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Utilizadores</h1>
          <p className="text-slate-500 mt-1">
            {utilizadores.length} utilizador{utilizadores.length !== 1 ? 'es' : ''} registado
            {utilizadores.length !== 1 ? 's' : ''}
          </p>
        </div>
        <UtilizadorForm escolas={escolas} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {(Object.keys(papelLabels) as PapelUtilizador[]).map((papel) => {
          const Icon = papelIcons[papel]
          return (
            <Card key={papel}>
              <CardContent className="flex items-center gap-3 pt-5">
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${papelColors[papel].split(' ')[0]}`}
                >
                  <Icon className={`h-5 w-5 ${papelColors[papel].split(' ')[1]}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{counts[papel] ?? 0}</p>
                  <p className="text-xs text-slate-500">
                    {papelLabels[papel]}
                    {(counts[papel] ?? 0) !== 1 ? 'es' : ''}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            Todos os utilizadores
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {utilizadores.length === 0 ? (
            <p className="text-slate-500 text-sm px-6 py-4">Nenhum utilizador.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {utilizadores.map((u) => {
                const PapelIcon = papelIcons[u.papel]
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                      {u.nome_completo
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate flex items-center gap-2">
                        {u.nome_completo}
                        {!u.ativo && (
                          <span className="text-xs bg-red-100 text-red-600 rounded px-1.5 py-0.5">
                            Inativo
                          </span>
                        )}
                        {u.id === user.id && (
                          <span className="text-xs bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">
                            Tu
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {u.email}
                        {u.escolas?.nome && ` · ${u.escolas.nome}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {u.papel === 'aluno' && (
                        <span className="text-xs text-slate-500">{u.pontos_total} pts</span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${papelColors[u.papel]}`}
                      >
                        <PapelIcon className="h-3 w-3" />
                        {papelLabels[u.papel]}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {/* O próprio admin não pode editar nem desativar a
                            sua própria conta — defesa contra mudar papel
                            por engano e ficar sem admin no sistema. */}
                        {u.id !== user.id && (
                          <>
                            <UtilizadorForm
                              utilizador={{
                                id: u.id,
                                email: u.email,
                                nome_completo: u.nome_completo,
                                papel: u.papel,
                                escola_id: u.escola_id,
                                numero_aluno: u.numero_aluno,
                              }}
                              escolas={escolas}
                            />
                            <DesativarUtilizadorButton
                              utilizadorId={u.id}
                              nomeUtilizador={u.nome_completo}
                              ativo={u.ativo}
                              isCurrentUser={false}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
