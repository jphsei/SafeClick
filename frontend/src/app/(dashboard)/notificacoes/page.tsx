import Link from 'next/link'
import {
  BellOff,
  Info,
  CheckCircle,
  AlertTriangle,
  Trophy,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { requireUser } from '@/lib/auth/require-role'
import { Card, CardContent } from '@/components/ui/card'
import { tempoRelativo } from '@/lib/relative-time'
import { NotificationsListActions } from './list-actions'

const PAGE_SIZE = 20

const TIPO_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  info: Info,
  sucesso: CheckCircle,
  aviso: AlertTriangle,
  conquista: Trophy,
}

const TIPO_COLOR: Record<string, string> = {
  info: 'text-blue-500 bg-blue-50',
  sucesso: 'text-green-500 bg-green-50',
  aviso: 'text-yellow-500 bg-yellow-50',
  conquista: 'text-purple-500 bg-purple-50',
}

interface NotificacaoRow {
  id: string
  titulo: string
  mensagem: string
  lida: boolean
  tipo: string
  url_destino: string | null
  criado_em: string
}

export default async function NotificacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>
}) {
  const { user, supabase } = await requireUser()
  const params = await searchParams
  const pagina = Math.max(1, Number(params.pagina ?? 1))
  const from = (pagina - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: notificacoesRaw, count } = await supabase
    .from('notificacoes')
    .select('id, titulo, mensagem, lida, tipo, url_destino, criado_em', { count: 'exact' })
    .eq('utilizador_id', user.id)
    .order('criado_em', { ascending: false })
    .range(from, to)

  const notificacoes = (notificacoesRaw as NotificacaoRow[] | null) ?? []
  const total = count ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const naoLidas = notificacoes.filter((n) => !n.lida).length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/aluno"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao dashboard
      </Link>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notificações</h1>
          <p className="text-slate-500 mt-1">
            {total} no total
            {naoLidas > 0 && ` · ${naoLidas} não lida${naoLidas !== 1 ? 's' : ''} nesta página`}
          </p>
        </div>
        {total > 0 && <NotificationsListActions />}
      </div>

      {notificacoes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BellOff className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Sem notificações.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-slate-100">
                {notificacoes.map((notif) => {
                  const Icon = TIPO_ICON[notif.tipo] ?? Info
                  const colors = TIPO_COLOR[notif.tipo] ?? TIPO_COLOR.info
                  const [textColor, bgColor] = colors.split(' ')

                  const Wrapper = notif.url_destino ? Link : 'div'
                  const wrapperProps = notif.url_destino ? { href: notif.url_destino } : {}

                  return (
                    <li key={notif.id}>
                      <Wrapper
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        {...(wrapperProps as any)}
                        className={`flex items-start gap-3 px-5 py-4 transition-colors ${notif.url_destino ? 'hover:bg-slate-50 cursor-pointer' : ''} ${notif.lida ? '' : 'bg-blue-50/40'}`}
                      >
                        <div
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${bgColor}`}
                        >
                          <Icon className={`h-5 w-5 ${textColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p
                              className={`text-sm leading-tight ${notif.lida ? 'text-slate-700' : 'font-semibold text-slate-900'}`}
                            >
                              {notif.titulo}
                            </p>
                            {!notif.lida && (
                              <span className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">
                                Nova
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 mt-1">{notif.mensagem}</p>
                          <p className="text-xs text-slate-400 mt-1.5">
                            {tempoRelativo(notif.criado_em)}
                          </p>
                        </div>
                      </Wrapper>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Link
                href={pagina > 1 ? `/notificacoes?pagina=${pagina - 1}` : '#'}
                aria-disabled={pagina <= 1}
                className={`flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm transition-colors ${pagina <= 1 ? 'opacity-40 pointer-events-none' : 'hover:bg-slate-50'}`}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Link>
              <span className="text-sm text-slate-500 px-2">
                Página {pagina} de {totalPaginas}
              </span>
              <Link
                href={pagina < totalPaginas ? `/notificacoes?pagina=${pagina + 1}` : '#'}
                aria-disabled={pagina >= totalPaginas}
                className={`flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm transition-colors ${pagina >= totalPaginas ? 'opacity-40 pointer-events-none' : 'hover:bg-slate-50'}`}
              >
                Seguinte
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
