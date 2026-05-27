import { School, MapPin, Phone, Mail } from 'lucide-react'
import { requireRole } from '@/lib/auth/require-role'
import { Card, CardContent } from '@/components/ui/card'
import { EscolaForm } from './escola-form'
import { DesativarEscolaButton } from './desativar-escola-button'

interface EscolaRow {
  id: string
  nome: string
  codigo_postal: string | null
  cidade: string | null
  morada: string | null
  telefone: string | null
  email: string | null
  ativo: boolean
}

export default async function AdminEscolasPage() {
  const { supabase } = await requireRole('administrador')

  const { data: escolasRaw } = await supabase
    .from('escolas')
    .select('id, nome, codigo_postal, cidade, morada, telefone, email, ativo')
    .order('nome')

  const escolas = (escolasRaw as EscolaRow[] | null) ?? []
  const ativas = escolas.filter((e) => e.ativo).length

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Escolas</h1>
          <p className="text-slate-500 mt-1">
            {ativas} escola{ativas !== 1 ? 's' : ''} ativa{ativas !== 1 ? 's' : ''}
            {escolas.length > ativas && ` · ${escolas.length - ativas} inativa${escolas.length - ativas !== 1 ? 's' : ''}`}
          </p>
        </div>
        <EscolaForm />
      </div>

      {escolas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <School className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">
              Nenhuma escola registada. Cria a primeira no botão acima.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {escolas.map((escola) => (
            <Card key={escola.id} className={escola.ativo ? '' : 'opacity-60'}>
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
                    <School className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{escola.nome}</p>
                      {escola.codigo_postal && (
                        <span className="text-xs bg-slate-100 text-slate-500 rounded px-2 py-0.5">
                          {escola.codigo_postal}
                        </span>
                      )}
                      {!escola.ativo && (
                        <span className="text-xs bg-red-100 text-red-600 rounded px-2 py-0.5">
                          Inativa
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 space-y-1">
                      {escola.cidade && (
                        <p className="flex items-center gap-1.5 text-xs text-slate-500">
                          <MapPin className="h-3 w-3" />
                          {escola.morada ? `${escola.morada}, ${escola.cidade}` : escola.cidade}
                        </p>
                      )}
                      {escola.telefone && (
                        <p className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Phone className="h-3 w-3" />
                          {escola.telefone}
                        </p>
                      )}
                      {escola.email && (
                        <p className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Mail className="h-3 w-3" />
                          {escola.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-0.5">
                    <EscolaForm escola={escola} />
                    <DesativarEscolaButton
                      escolaId={escola.id}
                      nomeEscola={escola.nome}
                      ativo={escola.ativo}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
