'use client'

import { useState } from 'react'
import { Copy, Check, Key } from 'lucide-react'

interface CodigoAcessoCardProps {
  codigo: string
  nomeTurma: string
}

export function CodigoAcessoCard({ codigo, nomeTurma }: CodigoAcessoCardProps) {
  const [copiado, setCopiado] = useState(false)

  function copiar() {
    navigator.clipboard.writeText(codigo).catch(() => {})
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100">
            <Key className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900">Código de acesso da turma</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Partilha este código com os alunos para eles entrarem em <span className="font-medium">{nomeTurma}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-2xl font-bold tracking-[0.25em] text-blue-900 bg-white border border-blue-200 rounded-lg px-4 py-2 select-all">
            {codigo}
          </span>
          <button
            onClick={copiar}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-600 hover:bg-blue-100 transition-colors"
            title="Copiar código"
          >
            {copiado
              ? <Check className="h-4 w-4 text-green-600" />
              : <Copy className="h-4 w-4" />
            }
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs text-blue-500">
        Os alunos introduzem este código no campo &quot;Código de turma&quot; durante o registo na plataforma.
      </p>
    </div>
  )
}
