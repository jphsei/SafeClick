'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface ConcluirAulaButtonProps {
  aulaId: string
  moduloId: string
  totalAulas: number
  aulasConcluidas: string[]
  pontosConclusao: number
  nextAulaHref: string
}

export function ConcluirAulaButton({
  aulaId,
  moduloId,
  totalAulas,
  aulasConcluidas,
  pontosConclusao,
  nextAulaHref,
}: ConcluirAulaButtonProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function handleConcluir() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const novasAulas = [...new Set([...aulasConcluidas, aulaId])]
    const percentagem = Math.round((novasAulas.length / totalAulas) * 100)
    const concluido = novasAulas.length >= totalAulas

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('progresso_modulo') as any).upsert(
      {
        aluno_id: user.id,
        modulo_id: moduloId,
        aulas_concluidas: novasAulas,
        percentagem,
        concluido,
        ...(concluido ? { concluido_em: new Date().toISOString() } : {}),
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'aluno_id,modulo_id' }
    )

    // Award module completion points when 100% done
    if (concluido && pontosConclusao > 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).rpc('fn_atualizar_pontos', {
          p_utilizador_id: user.id,
          p_pontos: pontosConclusao,
        })
      } catch {
        // silently ignore
      }
    }

    // Check and award badges after each lesson (and especially on module completion)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('fn_verificar_badges', {
        p_aluno_id: user.id,
      })
    } catch {
      // silently ignore
    }

    setLoading(false)
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
