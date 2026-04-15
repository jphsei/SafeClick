import { redirect } from 'next/navigation'
import { FolderOpen, FileText, Video, Presentation, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { type TipoRecurso } from '@/lib/types/database.types'

const tipoLabels: Record<TipoRecurso, string> = {
  plano_aula: 'Plano de Aula',
  apresentacao: 'Apresentação',
  guia: 'Guia',
  video: 'Vídeo',
  documento: 'Documento',
}

const tipoIcons: Record<TipoRecurso, React.ReactNode> = {
  plano_aula: <FileText className="h-5 w-5 text-blue-600" />,
  apresentacao: <Presentation className="h-5 w-5 text-purple-600" />,
  guia: <FileText className="h-5 w-5 text-green-600" />,
  video: <Video className="h-5 w-5 text-red-600" />,
  documento: <FileText className="h-5 w-5 text-slate-600" />,
}

const tipoColors: Record<TipoRecurso, string> = {
  plano_aula: 'bg-blue-50',
  apresentacao: 'bg-purple-50',
  guia: 'bg-green-50',
  video: 'bg-red-50',
  documento: 'bg-slate-50',
}

export default async function RecursosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfilRaw } = await supabase
    .from('perfis')
    .select('papel')
    .eq('id', user.id)
    .single()

  if ((perfilRaw as { papel: string } | null)?.papel !== 'professor') redirect('/aluno')

  const { data: recursosRaw } = await supabase
    .from('recursos_pedagogicos')
    .select('id, titulo, descricao, tipo, url_ficheiro, modulo_id')
    .order('criado_em', { ascending: false })

  const recursos =
    (recursosRaw as {
      id: string
      titulo: string
      descricao: string | null
      tipo: TipoRecurso
      url_ficheiro: string | null
      modulo_id: string | null
    }[]) ?? []

  const porTipo = recursos.reduce<Record<string, typeof recursos>>((acc, r) => {
    if (!acc[r.tipo]) acc[r.tipo] = []
    acc[r.tipo].push(r)
    return acc
  }, {})

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Recursos pedagógicos</h1>
        <p className="text-slate-500 mt-1">
          Materiais de apoio para as tuas aulas.
        </p>
      </div>

      {recursos.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nenhum recurso disponível.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(Object.keys(tipoLabels) as TipoRecurso[])
            .filter((tipo) => porTipo[tipo]?.length > 0)
            .map((tipo) => (
              <div key={tipo}>
                <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  {tipoIcons[tipo]}
                  {tipoLabels[tipo]}
                  <span className="text-sm font-normal text-slate-400">
                    ({porTipo[tipo].length})
                  </span>
                </h2>
                <div className="space-y-2">
                  {porTipo[tipo].map((recurso) => (
                    <div
                      key={recurso.id}
                      className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${tipoColors[tipo]}`}
                      >
                        {tipoIcons[tipo]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{recurso.titulo}</p>
                        {recurso.descricao && (
                          <p className="text-sm text-slate-500 truncate">{recurso.descricao}</p>
                        )}
                      </div>
                      {recurso.url_ficheiro && (
                        <a
                          href={recurso.url_ficheiro}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          Descarregar
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
