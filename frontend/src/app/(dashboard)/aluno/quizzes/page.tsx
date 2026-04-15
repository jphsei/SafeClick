import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, Clock, Star, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function QuizzesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: quizzesRaw } = await supabase
    .from('quizzes')
    .select('id, titulo, descricao, pontos_conclusao, tempo_limite, modulo_id')
    .eq('ativo', true)
    .order('criado_em')

  const quizzes =
    (quizzesRaw as {
      id: string
      titulo: string
      descricao: string | null
      pontos_conclusao: number
      tempo_limite: number | null
      modulo_id: string | null
    }[]) ?? []

  // Fetch completed attempts
  const { data: tentativasRaw } = await supabase
    .from('tentativas_quiz')
    .select('quiz_id, nota, pontos_ganhos')
    .eq('aluno_id', user.id)
    .eq('concluido', true)

  const tentativasMap = new Map(
    (tentativasRaw as { quiz_id: string; nota: number | null; pontos_ganhos: number }[] ?? [])
      .map((t) => [t.quiz_id, t])
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Quizzes</h1>
        <p className="text-slate-500 mt-1">
          Testa os teus conhecimentos sobre cibersegurança.
        </p>
      </div>

      {quizzes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nenhum quiz disponível.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => {
            const tentativa = tentativasMap.get(quiz.id)
            const concluido = !!tentativa

            return (
              <Card key={quiz.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 py-4">
                    <div
                      className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
                        concluido ? 'bg-green-100' : 'bg-blue-100'
                      }`}
                    >
                      {concluido ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <ClipboardList className="h-6 w-6 text-blue-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{quiz.titulo}</p>
                      {quiz.descricao && (
                        <p className="text-sm text-slate-500 truncate mt-0.5">
                          {quiz.descricao}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {quiz.pontos_conclusao} pts
                        </span>
                        {quiz.tempo_limite && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {quiz.tempo_limite} min
                          </span>
                        )}
                        {concluido && tentativa.nota !== null && (
                          <span className="text-green-600 font-medium">
                            Nota: {Math.round(tentativa.nota)}% · {tentativa.pontos_ganhos} pts
                          </span>
                        )}
                      </div>
                    </div>

                    <Link href={`/aluno/quizzes/${quiz.id}`} className="flex-shrink-0">
                      <Button size="sm" variant={concluido ? 'outline' : 'default'}>
                        {concluido ? 'Rever' : 'Fazer quiz'}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
