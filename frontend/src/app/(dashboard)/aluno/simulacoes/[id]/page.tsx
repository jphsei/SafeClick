import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireUser } from '@/lib/auth/require-role'
import { sanitizeEmailHtml } from '@/lib/sanitize'
import { SimulacaoClient } from './simulacao-client'
import { type EstadoSimulacao } from '@/lib/types/database.types'

export default async function SimulacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, supabase } = await requireUser()

  const { data: simRaw } = await supabase
    .from('simulacoes_phishing')
    .select(
      'id, titulo, descricao, assunto_email, corpo_email, remetente_falso, url_falso, pistas, dificuldade, pontos_sucesso',
    )
    .eq('id', id)
    .eq('ativo', true)
    .single()

  if (!simRaw) notFound()

  const sim = simRaw as {
    id: string
    titulo: string
    descricao: string | null
    assunto_email: string
    corpo_email: string
    remetente_falso: string
    url_falso: string | null
    pistas: string[] | null
    dificuldade: string
    pontos_sucesso: number
  }

  // Check for previous attempt
  const { data: tentativaRaw } = await supabase
    .from('tentativas_simulacao')
    .select('estado, pontos_ganhos')
    .eq('simulacao_id', id)
    .eq('aluno_id', user.id)
    .order('realizado_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  const tentativaAnterior = tentativaRaw as {
    estado: EstadoSimulacao
    pontos_ganhos: number
  } | null

  return (
    <div className="space-y-6">
      <Link
        href="/aluno/simulacoes"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar às simulações
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{sim.titulo}</h1>
        {sim.descricao && <p className="text-slate-500 mt-1">{sim.descricao}</p>}
      </div>

      <SimulacaoClient
        simulacaoId={sim.id}
        titulo={sim.titulo}
        assuntoEmail={sim.assunto_email}
        // O HTML é sanitizado no servidor antes de chegar ao browser.
        // O cliente confia que o que recebe está limpo (script tags,
        // event handlers e javascript: URLs removidos).
        corpoEmail={sanitizeEmailHtml(sim.corpo_email)}
        remetenteFalso={sim.remetente_falso}
        urlFalso={sim.url_falso}
        pistas={sim.pistas}
        pontosSucesso={sim.pontos_sucesso}
        tentativaAnterior={tentativaAnterior}
      />
    </div>
  )
}
