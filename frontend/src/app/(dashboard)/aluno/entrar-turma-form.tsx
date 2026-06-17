'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Users, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  temTurma: boolean
}

export function EntrarTurmaForm({ temTurma }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const codigoLimpo = codigo.trim().toUpperCase()
    if (!codigoLimpo) return

    setLoading(true)
    setErro(null)
    setSucesso(null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('fn_inscrever_por_codigo', {
      p_codigo: codigoLimpo,
    })

    setLoading(false)

    if (error) {
      setErro('Ocorreu um erro. Tenta novamente.')
      return
    }

    const resultado = data as { ok: boolean; turma_nome?: string; erro?: string }

    if (!resultado.ok) {
      setErro(resultado.erro ?? 'Código inválido ou expirado.')
      return
    }

    setSucesso(`Entraste na turma "${resultado.turma_nome}"!`)
    setCodigo('')
    setTimeout(() => router.refresh(), 1500)
  }

  if (sucesso) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
        <p className="text-sm font-medium text-green-800">{sucesso}</p>
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border p-4 ${temTurma ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50'}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${temTurma ? 'bg-slate-100' : 'bg-blue-100'}`}
        >
          <Users className={`h-4 w-4 ${temTurma ? 'text-slate-600' : 'text-blue-600'}`} />
        </div>
        <div>
          <p className={`text-sm font-semibold ${temTurma ? 'text-slate-900' : 'text-blue-900'}`}>
            {temTurma ? 'Entrar noutra turma' : 'Ainda não estás em nenhuma turma'}
          </p>
          <p className={`text-xs mt-0.5 ${temTurma ? 'text-slate-500' : 'text-blue-700'}`}>
            Pede o código ao teu professor e introduz aqui.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={codigo}
          onChange={(e) => {
            setCodigo(e.target.value.toUpperCase())
            setErro(null)
          }}
          placeholder="Código da turma (ex: AB3X9K)"
          maxLength={8}
          className="font-mono tracking-widest uppercase"
        />
        <Button type="submit" disabled={loading || !codigo.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
        </Button>
      </form>

      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
    </div>
  )
}
