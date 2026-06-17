import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Clock, Star, Video } from 'lucide-react'
import { requireRole } from '@/lib/auth/require-role'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AulaForm } from './aula-form'
import { DesativarAulaButton } from './desativar-aula-button'

interface AulaRow {
  id: string
  titulo: string
  conteudo: string | null
  video_url: string | null
  ordem: number
  duracao_minutos: number | null
  pontos: number
  ativo: boolean
}

export default async function AdminModuloAulasPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase } = await requireRole('administrador')

  // Carregar o módulo (para mostrar o título no header)
  const { data: moduloRaw } = await supabase
    .from('modulos')
    .select('id, titulo, descricao, estado')
    .eq('id', id)
    .single()

  if (!moduloRaw) notFound()

  const modulo = moduloRaw as {
    id: string
    titulo: string
    descricao: string | null
    estado: string
  }

  // Carregar todas as aulas (ativas e inativas)
  const { data: aulasRaw } = await supabase
    .from('aulas')
    .select('id, titulo, conteudo, video_url, ordem, duracao_minutos, pontos, ativo')
    .eq('modulo_id', id)
    .order('ordem')

  const aulas = (aulasRaw as AulaRow[] | null) ?? []
  const ativas = aulas.filter((a) => a.ativo).length

  // Sugerir a próxima ordem (último + 1)
  const proximaOrdem = aulas.length > 0 ? Math.max(...aulas.map((a) => a.ordem)) + 1 : 1

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link
        href="/admin/modulos"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos módulos
      </Link>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{modulo.titulo}</h1>
          <p className="text-slate-500 mt-1">
            {ativas} aula{ativas !== 1 ? 's' : ''} ativa{ativas !== 1 ? 's' : ''}
            {aulas.length > ativas &&
              ` · ${aulas.length - ativas} inativa${aulas.length - ativas !== 1 ? 's' : ''}`}
          </p>
        </div>
        <AulaForm moduloId={id} proximaOrdem={proximaOrdem} />
      </div>

      {aulas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">Este módulo ainda não tem aulas.</p>
            <AulaForm moduloId={id} proximaOrdem={1} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              Aulas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {aulas.map((aula) => (
                <div
                  key={aula.id}
                  className={`flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition-colors ${aula.ativo ? '' : 'opacity-60'}`}
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <span className="text-sm font-bold text-blue-600">{aula.ordem}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate flex items-center gap-2">
                      {aula.titulo}
                      {!aula.ativo && (
                        <span className="text-xs bg-red-100 text-red-600 rounded px-1.5 py-0.5">
                          Inativa
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {aula.duracao_minutos && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          {aula.duracao_minutos} min
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Star className="h-3 w-3" />
                        {aula.pontos} pts
                      </span>
                      {aula.video_url && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Video className="h-3 w-3" />
                          Vídeo
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <AulaForm moduloId={id} aula={aula} />
                    <DesativarAulaButton
                      aulaId={aula.id}
                      tituloAula={aula.titulo}
                      ativo={aula.ativo}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
