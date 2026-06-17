'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface ConcluirAulaButtonProps {
  aulaId: string
  totalAulas: number
  aulasConcluidas: string[]
  pontosConclusao: number
  nextAulaHref: string
}

type ResultadoConcluir = {
  ok: boolean
  erro?: string
  ja_concluida?: boolean
  pontos_ganhos?: number
  modulo_concluido?: boolean
  percentagem?: number
}

export function ConcluirAulaButton({
  aulaId,
  totalAulas,
  aulasConcluidas,
  pontosConclusao,
  nextAulaHref,
}: ConcluirAulaButtonProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleConcluir() {
    setLoading(true)
    setErro(null)

    // Toda a lógica de cálculo de progresso, atribuição de pontos e
    // verificação de badges está agora em fn_concluir_aula (SQL).
    // O cliente só envia o ID da aula — não há mais nada a confiar.
    const { data, error } = await supabase.rpc('fn_concluir_aula', {
      p_aula_id: aulaId,
    })

    if (error) {
      setErro('Erro ao concluir a aula. Tenta novamente.')
      setLoading(false)
      return
    }

    const res = data as ResultadoConcluir

    if (!res?.ok) {
      setErro(res?.erro ?? 'Não foi possível marcar a aula como concluída.')
      setLoading(false)
      return
    }

    // Sucesso — navega para a próxima aula (ou volta ao módulo se foi a última)
    router.push(nextAulaHref)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 p-4">
      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm text-green-800">
          Terminaste esta aula? Marca-a como concluída para registar o teu progresso.
        </p>
        {aulasConcluidas.length + 1 >= totalAulas && pontosConclusao > 0 && (
          <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
            <Star className="h-3 w-3" />
            Última aula — ganhas {pontosConclusao} pontos ao concluir o módulo!
          </p>
        )}
        {erro && <p className="text-xs text-red-600 mt-1">{erro}</p>}
      </div>
      <Button
        onClick={handleConcluir}
        disabled={loading}
        className="flex-shrink-0 bg-green-600 hover:bg-green-700"
        size="sm"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle className="h-4 w-4" />
        )}
        {loading ? 'A guardar...' : 'Marcar concluída'}
      </Button>
    </div>
  )
}
