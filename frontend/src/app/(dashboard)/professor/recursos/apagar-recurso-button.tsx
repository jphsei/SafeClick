'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  recursoId: string
}

export function ApagarRecursoButton({ recursoId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Tens a certeza que queres apagar este recurso?')) return

    setLoading(true)
    await supabase
      .from('recursos_pedagogicos')
      .delete()
      .eq('id', recursoId)
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Apagar recurso"
      className="flex-shrink-0 flex items-center justify-center rounded-lg border border-red-100 p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
    >
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : <Trash2 className="h-4 w-4" />
      }
    </button>
  )
}
