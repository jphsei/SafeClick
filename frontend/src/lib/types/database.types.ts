// ============================================================
// Database types — bridge entre os tipos gerados e o resto do app
// ============================================================
// Este ficheiro reexporta o tipo `Database` gerado pelo Supabase
// (em `database.generated.ts`) e cria aliases amigáveis para os
// enums e linhas das tabelas, mantendo os nomes que o código já usa.
//
// **Não editar à mão as definições abaixo** — para mudar o shape
// de uma tabela, mexe na migração SQL e corre `npm run db:types`.
// ============================================================

import { type Database } from './database.generated'

export type { Database, Json } from './database.generated'

// ── Helpers para encurtar os tipos ──────────────────────────────
type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

// ── Enums ───────────────────────────────────────────────────────
export type PapelUtilizador  = Enums<'papel_utilizador'>
export type EstadoModulo     = Enums<'estado_modulo'>
export type NivelDificuldade = Enums<'nivel_dificuldade'>
export type TipoRecurso      = Enums<'tipo_recurso'>
export type TipoPergunta     = Enums<'tipo_pergunta'>
export type EstadoSimulacao  = Enums<'estado_simulacao'>

// ── Linhas de tabelas (aliases amigáveis) ───────────────────────
export type Perfil             = Tables<'perfis'>
export type Escola             = Tables<'escolas'>
export type Turma              = Tables<'turmas'>
export type TurmaAluno         = Tables<'turma_alunos'>
export type TurmaModulo        = Tables<'turma_modulos'>
export type Modulo             = Tables<'modulos'>
export type Aula               = Tables<'aulas'>
export type Badge              = Tables<'badges'>
export type UtilizadorBadge    = Tables<'utilizador_badges'>
export type Quiz               = Tables<'quizzes'>
export type Pergunta           = Tables<'perguntas'>
export type OpcaoResposta      = Tables<'opcoes_resposta'>
export type TentativaQuiz      = Tables<'tentativas_quiz'>
export type RespostaTentativa  = Tables<'respostas_tentativa'>
export type SimulacaoPhishing  = Tables<'simulacoes_phishing'>
export type TentativaSimulacao = Tables<'tentativas_simulacao'>
export type RecursoPedagogico  = Tables<'recursos_pedagogicos'>
export type ProgressoModulo    = Tables<'progresso_modulo'>
export type Notificacao        = Tables<'notificacoes'>
