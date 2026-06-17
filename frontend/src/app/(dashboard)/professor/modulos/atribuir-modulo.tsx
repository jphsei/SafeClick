'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Plus, X, Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface AtribuirModuloProps {
  moduloId: string
  turmas: { id: string; nome: string }[]
  turmasAtribuidas: string[] // IDs das turmas onde já está atribuído
}

export function AtribuirModulo({ moduloId, turmas, turmasAtribuidas }: AtribuirModuloProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null) // turma_id a processar

  async function handleToggle(turmaId: string, jaAtribuido: boolean) {
    setLoading(turmaId)

    if (jaAtribuido) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('turma_modulos') as any)
        .delete()
        .eq('turma_id', turmaId)
        .eq('modulo_id', moduloId)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('turma_modulos') as any).insert({
        turma_id: turmaId,
        modulo_id: moduloId,
      })
    }

    setLoading(null)
    router.push(pathname)
    router.refresh()
  }

  if (turmas.length === 0) return null

  return (
    <div className="relative">
      <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)} className="text-xs">
        <Plus className="h-3 w-3" />
        Atribuir
      </Button>

      {open && (
        <div className="absolute right-0 top-9 z-10 w-52 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-700">Atribuir a turma</p>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="py-1 max-h-48 overflow-y-auto">
            {turmas.map((turma) => {
              const atribuido = turmasAtribuidas.includes(turma.id)
              return (
                <li key={turma.id}>
                  <button
                    onClick={() => handleToggle(turma.id, atribuido)}
                    disabled={loading === turma.id}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {loading === turma.id ? (
                      <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                    ) : atribuido ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="h-4 w-4 rounded border-2 border-slate-300" />
                    )}
                    <span className="truncate">{turma.nome}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
