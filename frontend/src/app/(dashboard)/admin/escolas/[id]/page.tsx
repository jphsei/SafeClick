import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  School,
  MapPin,
  Phone,
  Mail,
  Users,
  GraduationCap,
  BookUser,
  ChevronDown,
} from 'lucide-react'
import { requireRole } from '@/lib/auth/require-role'
import { Card, CardContent } from '@/components/ui/card'

interface EscolaRow {
  id: string
  nome: string
  morada: string | null
  cidade: string | null
  codigo_postal: string | null
  telefone: string | null
  email: string | null
  ativo: boolean
}

interface TurmaRow {
  id: string
  nome: string
  descricao: string | null
  ano_letivo: string
  ativo: boolean
  perfis: { nome_completo: string; email: string } | null
}

interface TurmaAlunoRow {
  id: string
  turma_id: string
  ativo: boolean
  perfis: {
    id: string
    nome_completo: string
    email: string
    numero_aluno: string | null
    pontos_total: number
  } | null
}

export default async function AdminEscolaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase } = await requireRole('administrador')

  // ── 1. Carregar a escola ──────────────────────────────────────
  const { data: escolaRaw } = await supabase
    .from('escolas')
    .select('id, nome, morada, cidade, codigo_postal, telefone, email, ativo')
    .eq('id', id)
    .single()

  if (!escolaRaw) notFound()
  const escola = escolaRaw as EscolaRow

  // ── 2. Turmas desta escola (com info do professor) ────────────
  const { data: turmasRaw } = await supabase
    .from('turmas')
    .select('id, nome, descricao, ano_letivo, ativo, perfis!turmas_professor_id_fkey(nome_completo, email)')
    .eq('escola_id', id)
    .order('ano_letivo', { ascending: false })
    .order('nome')

  const turmas = (turmasRaw as TurmaRow[] | null) ?? []

  // ── 3. Alunos de todas estas turmas (1 query, agrupada no JS) ─
  const turmaIds = turmas.map((t) => t.id)
  let alunosPorTurma = new Map<string, TurmaAlunoRow[]>()

  if (turmaIds.length > 0) {
    const { data: alunosRaw } = await supabase
      .from('turma_alunos')
      .select('id, turma_id, ativo, perfis(id, nome_completo, email, numero_aluno, pontos_total)')
      .in('turma_id', turmaIds)
      .eq('ativo', true)
      .order('inscrito_em')

    const alunos = (alunosRaw as TurmaAlunoRow[] | null) ?? []
    alunosPorTurma = alunos.reduce((acc, a) => {
      const arr = acc.get(a.turma_id) ?? []
      arr.push(a)
      acc.set(a.turma_id, arr)
      return acc
    }, new Map<string, TurmaAlunoRow[]>())
  }

  const totalAlunos = Array.from(alunosPorTurma.values()).reduce((sum, arr) => sum + arr.length, 0)
  const turmasAtivas = turmas.filter((t) => t.ativo).length

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link
        href="/admin/escolas"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar às escolas
      </Link>

      {/* ── Header com info da escola ────────────────────────── */}
      <Card className={escola.ativo ? '' : 'opacity-60'}>
        <CardContent className="pt-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100">
              <School className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900">{escola.nome}</h1>
                {!escola.ativo && (
                  <span className="text-xs bg-red-100 text-red-600 rounded px-2 py-0.5">Inativa</span>
                )}
              </div>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {escola.cidade && (
                  <p className="flex items-center gap-1.5 text-sm text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    {escola.morada ? `${escola.morada}, ${escola.cidade}` : escola.cidade}
                    {escola.codigo_postal && ` · ${escola.codigo_postal}`}
                  </p>
                )}
                {escola.telefone && (
                  <p className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Phone className="h-3.5 w-3.5" />
                    {escola.telefone}
                  </p>
                )}
                {escola.email && (
                  <p className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Mail className="h-3.5 w-3.5" />
                    {escola.email}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Sumário (turmas + alunos) ───────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100">
              <BookUser className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{turmasAtivas}</p>
              <p className="text-xs text-slate-500">
                Turma{turmasAtivas !== 1 ? 's' : ''} ativa{turmasAtivas !== 1 ? 's' : ''}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <GraduationCap className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{totalAlunos}</p>
              <p className="text-xs text-slate-500">
                Aluno{totalAlunos !== 1 ? 's' : ''} inscrito{totalAlunos !== 1 ? 's' : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Lista de turmas (expansível) ────────────────────── */}
      {turmas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookUser className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Esta escola ainda não tem turmas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-700">Turmas</h2>
          {turmas.map((turma) => {
            const alunos = alunosPorTurma.get(turma.id) ?? []
            return (
              <Card key={turma.id} className={turma.ativo ? '' : 'opacity-60'}>
                <details className="group">
                  <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors list-none">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-green-50">
                      <BookUser className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate flex items-center gap-2">
                        {turma.nome}
                        {!turma.ativo && (
                          <span className="text-xs bg-red-100 text-red-600 rounded px-1.5 py-0.5">Inativa</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {turma.ano_letivo}
                        {turma.perfis?.nome_completo && ` · Prof. ${turma.perfis.nome_completo}`}
                        {turma.descricao && ` · ${turma.descricao}`}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                      <Users className="h-3.5 w-3.5" />
                      {alunos.length}
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0 transition-transform group-open:rotate-180" />
                  </summary>

                  {/* Lista de alunos */}
                  <div className="border-t border-slate-100 px-5 py-3">
                    {alunos.length === 0 ? (
                      <p className="text-sm text-slate-400 italic py-2">Sem alunos inscritos.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {alunos.map((ta) => {
                          const aluno = ta.perfis
                          if (!aluno) return null
                          const initials = aluno.nome_completo
                            .split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                          return (
                            <li key={ta.id} className="flex items-center gap-3 py-2">
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                                {initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-900 truncate">{aluno.nome_completo}</p>
                                <p className="text-xs text-slate-400 truncate">
                                  {aluno.email}
                                  {aluno.numero_aluno && ` · Nº ${aluno.numero_aluno}`}
                                </p>
                              </div>
                              <span className="text-xs text-slate-400 flex-shrink-0">{aluno.pontos_total} pts</span>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </details>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
