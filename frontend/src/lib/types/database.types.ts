export type PapelUtilizador = 'aluno' | 'professor' | 'administrador'
export type EstadoModulo = 'rascunho' | 'publicado' | 'arquivado'
export type NivelDificuldade = 'basico' | 'intermedio' | 'avancado'
export type TipoRecurso = 'plano_aula' | 'apresentacao' | 'ficha' | 'video' | 'outro'
export type TipoPergunta = 'escolha_multipla' | 'verdadeiro_falso' | 'texto_livre'
export type EstadoSimulacao = 'ativa' | 'inativa'

export interface Perfil {
  id: string
  nome_completo: string
  email: string
  papel: PapelUtilizador
  avatar_url: string | null
  escola_id: string | null
  numero_aluno: string | null
  pontos_total: number
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface Escola {
  id: string
  nome: string
  codigo: string | null
  morada: string | null
  cidade: string | null
  codigo_postal: string | null
  telefone: string | null
  email: string | null
  website: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface Turma {
  id: string
  nome: string
  descricao: string | null
  escola_id: string
  professor_id: string
  ano_letivo: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface Modulo {
  id: string
  titulo: string
  descricao: string | null
  nivel_dificuldade: NivelDificuldade
  ordem: number
  estado: EstadoModulo
  imagem_url: string | null
  criado_em: string
  atualizado_em: string
}

export interface Aula {
  id: string
  modulo_id: string
  titulo: string
  conteudo: string | null
  ordem: number
  duracao_minutos: number | null
  criado_em: string
  atualizado_em: string
}

export interface Badge {
  id: string
  nome: string
  descricao: string | null
  icone_url: string | null
  criterio: string | null
  pontos_necessarios: number
  criado_em: string
}

export interface Quiz {
  id: string
  modulo_id: string | null
  titulo: string
  descricao: string | null
  tempo_limite_minutos: number | null
  pontuacao_maxima: number
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface Pergunta {
  id: string
  quiz_id: string
  texto: string
  tipo: TipoPergunta
  pontos: number
  ordem: number
  criado_em: string
}

export interface OpcaoResposta {
  id: string
  pergunta_id: string
  texto: string
  correta: boolean
  ordem: number
}

export interface SimulacaoPhishing {
  id: string
  titulo: string
  descricao: string | null
  conteudo_email: string | null
  remetente_falso: string | null
  url_falso: string | null
  dicas: string[] | null
  nivel_dificuldade: NivelDificuldade
  estado: EstadoSimulacao
  criado_em: string
  atualizado_em: string
}

export interface RecursoPedagogico {
  id: string
  titulo: string
  descricao: string | null
  tipo: TipoRecurso
  url_ficheiro: string | null
  modulo_id: string | null
  criado_por: string | null
  criado_em: string
  atualizado_em: string
}

export interface ProgressoModulo {
  id: string
  aluno_id: string
  modulo_id: string
  aulas_concluidas: number
  total_aulas: number
  concluido: boolean
  pontos_ganhos: number
  iniciado_em: string
  concluido_em: string | null
  atualizado_em: string
}

export interface UtilizadorBadge {
  id: string
  utilizador_id: string
  badge_id: string
  ganho_em: string
}

export interface Notificacao {
  id: string
  utilizador_id: string
  titulo: string
  mensagem: string
  lida: boolean
  criado_em: string
}

// Supabase Database generic type
export type Database = {
  public: {
    Tables: {
      perfis: {
        Row: Perfil
        Insert: Partial<Perfil> & { id: string; nome_completo: string; email: string; papel: PapelUtilizador }
        Update: Partial<Perfil>
      }
      escolas: {
        Row: Escola
        Insert: Partial<Escola> & { nome: string }
        Update: Partial<Escola>
      }
      turmas: {
        Row: Turma
        Insert: Partial<Turma> & { nome: string; escola_id: string; professor_id: string }
        Update: Partial<Turma>
      }
      modulos: {
        Row: Modulo
        Insert: Partial<Modulo> & { titulo: string }
        Update: Partial<Modulo>
      }
      aulas: {
        Row: Aula
        Insert: Partial<Aula> & { modulo_id: string; titulo: string; ordem: number }
        Update: Partial<Aula>
      }
      badges: {
        Row: Badge
        Insert: Partial<Badge> & { nome: string }
        Update: Partial<Badge>
      }
      quizzes: {
        Row: Quiz
        Insert: Partial<Quiz> & { titulo: string }
        Update: Partial<Quiz>
      }
      perguntas: {
        Row: Pergunta
        Insert: Partial<Pergunta> & { quiz_id: string; texto: string; tipo: TipoPergunta; ordem: number }
        Update: Partial<Pergunta>
      }
      opcoes_resposta: {
        Row: OpcaoResposta
        Insert: Partial<OpcaoResposta> & { pergunta_id: string; texto: string; correta: boolean; ordem: number }
        Update: Partial<OpcaoResposta>
      }
      simulacoes_phishing: {
        Row: SimulacaoPhishing
        Insert: Partial<SimulacaoPhishing> & { titulo: string }
        Update: Partial<SimulacaoPhishing>
      }
      recursos_pedagogicos: {
        Row: RecursoPedagogico
        Insert: Partial<RecursoPedagogico> & { titulo: string; tipo: TipoRecurso }
        Update: Partial<RecursoPedagogico>
      }
      progresso_modulo: {
        Row: ProgressoModulo
        Insert: Partial<ProgressoModulo> & { aluno_id: string; modulo_id: string }
        Update: Partial<ProgressoModulo>
      }
      utilizador_badges: {
        Row: UtilizadorBadge
        Insert: Partial<UtilizadorBadge> & { utilizador_id: string; badge_id: string }
        Update: Partial<UtilizadorBadge>
      }
      notificacoes: {
        Row: Notificacao
        Insert: Partial<Notificacao> & { utilizador_id: string; titulo: string; mensagem: string }
        Update: Partial<Notificacao>
      }
    }
    Views: {
      v_leaderboard: {
        Row: {
          id: string
          nome_completo: string
          pontos_total: number
          rank: number
        }
      }
      v_progresso_aluno: {
        Row: {
          aluno_id: string
          modulo_id: string
          titulo_modulo: string
          aulas_concluidas: number
          total_aulas: number
          concluido: boolean
          pontos_ganhos: number
        }
      }
      v_stats_turma: {
        Row: {
          turma_id: string
          nome_turma: string
          total_alunos: number
          media_pontos: number
          taxa_conclusao: number
        }
      }
      v_stats_simulacoes: {
        Row: {
          aluno_id: string
          nome_completo: string
          total_simulacoes: number
          simulacoes_detetadas: number
          taxa_detecao: number
        }
      }
    }
    Functions: Record<string, never>
    Enums: {
      papel_utilizador: PapelUtilizador
      estado_modulo: EstadoModulo
      nivel_dificuldade: NivelDificuldade
    }
  }
}
