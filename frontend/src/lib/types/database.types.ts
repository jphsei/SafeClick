// ============================================================
// Enums — devem corresponder aos CREATE TYPE no schema SQL
// ============================================================
export type PapelUtilizador = 'aluno' | 'professor' | 'administrador'
export type EstadoModulo = 'rascunho' | 'publicado' | 'arquivado'
export type NivelDificuldade = 'basico' | 'intermedio' | 'avancado'
export type TipoRecurso = 'plano_aula' | 'apresentacao' | 'guia' | 'video' | 'documento'
export type TipoPergunta = 'escolha_multipla' | 'verdadeiro_falso' | 'resposta_curta'
export type EstadoSimulacao = 'pendente' | 'clicou' | 'reportou' | 'ignorou'

// ============================================================
// Interfaces das tabelas
// ============================================================

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

export interface TurmaAluno {
  id: string
  turma_id: string
  aluno_id: string
  inscrito_em: string
  ativo: boolean
}

export interface TurmaModulo {
  id: string
  turma_id: string
  modulo_id: string
  data_inicio: string | null
  data_fim: string | null
  obrigatorio: boolean
  atribuido_em: string
}

export interface Modulo {
  id: string
  titulo: string
  descricao: string | null
  thumbnail_url: string | null
  dificuldade: NivelDificuldade
  estado: EstadoModulo
  ordem: number
  pontos_conclusao: number
  duracao_minutos: number | null
  tags: string[] | null
  criado_por: string | null
  criado_em: string
  atualizado_em: string
}

export interface Aula {
  id: string
  modulo_id: string
  titulo: string
  conteudo: string | null
  video_url: string | null
  ordem: number
  duracao_minutos: number | null
  criado_em: string
  atualizado_em: string
}

export interface Badge {
  id: string
  nome: string
  descricao: string
  icone_url: string | null
  criterio: string | null
  pontos_bonus: number
  criado_em: string
}

export interface UtilizadorBadge {
  id: string
  utilizador_id: string
  badge_id: string
  ganho_em: string
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

export interface TentativaQuiz {
  id: string
  quiz_id: string
  aluno_id: string
  nota: number | null
  pontos_ganhos: number
  tempo_gasto: number | null
  concluido: boolean
  iniciado_em: string
  concluido_em: string | null
}

export interface RespostaTentativa {
  id: string
  tentativa_id: string
  pergunta_id: string
  opcao_id: string | null
  resposta_texto: string | null
  correta: boolean | null
  respondido_em: string
}

export interface SimulacaoPhishing {
  id: string
  titulo: string
  descricao: string | null
  assunto_email: string
  corpo_email: string
  remetente_falso: string
  url_falso: string | null
  pistas: string[] | null
  dificuldade: NivelDificuldade
  pontos_sucesso: number
  ativo: boolean
  criado_por: string | null
  criado_em: string
  atualizado_em: string
}

export interface TentativaSimulacao {
  id: string
  simulacao_id: string
  aluno_id: string
  estado: EstadoSimulacao
  pontos_ganhos: number
  tempo_decisao: number | null
  feedback_visto: boolean
  realizado_em: string
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
  aulas_concluidas: string[]  // array de UUIDs das aulas concluídas
  percentagem: number
  concluido: boolean
  iniciado_em: string
  concluido_em: string | null
  atualizado_em: string
}

export interface Notificacao {
  id: string
  utilizador_id: string
  titulo: string
  mensagem: string
  lida: boolean
  criado_em: string
}

// ============================================================
// Supabase Database generic type
// ============================================================
export type Database = {
  public: {
    Tables: {
      perfis: {
        Row: Perfil
        Insert: {
          id: string
          nome_completo: string
          email: string
          papel?: PapelUtilizador
          avatar_url?: string | null
          escola_id?: string | null
          numero_aluno?: string | null
          pontos_total?: number
          ativo?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<Perfil, 'id'>>
      }
      escolas: {
        Row: Escola
        Insert: {
          id?: string
          nome: string
          codigo?: string | null
          morada?: string | null
          cidade?: string | null
          codigo_postal?: string | null
          telefone?: string | null
          email?: string | null
          website?: string | null
          ativo?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<Escola, 'id'>>
      }
      turmas: {
        Row: Turma
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          escola_id: string
          professor_id: string
          ano_letivo?: string | null
          ativo?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<Turma, 'id'>>
      }
      turma_alunos: {
        Row: TurmaAluno
        Insert: {
          id?: string
          turma_id: string
          aluno_id: string
          inscrito_em?: string
          ativo?: boolean
        }
        Update: Partial<Omit<TurmaAluno, 'id'>>
      }
      turma_modulos: {
        Row: TurmaModulo
        Insert: {
          id?: string
          turma_id: string
          modulo_id: string
          data_inicio?: string | null
          data_fim?: string | null
          obrigatorio?: boolean
          atribuido_em?: string
        }
        Update: Partial<Omit<TurmaModulo, 'id'>>
      }
      modulos: {
        Row: Modulo
        Insert: {
          id?: string
          titulo: string
          descricao?: string | null
          thumbnail_url?: string | null
          dificuldade?: NivelDificuldade
          estado?: EstadoModulo
          ordem?: number
          pontos_conclusao?: number
          duracao_minutos?: number | null
          tags?: string[] | null
          criado_por?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<Modulo, 'id'>>
      }
      aulas: {
        Row: Aula
        Insert: {
          id?: string
          modulo_id: string
          titulo: string
          conteudo?: string | null
          video_url?: string | null
          ordem: number
          duracao_minutos?: number | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<Aula, 'id'>>
      }
      badges: {
        Row: Badge
        Insert: {
          id?: string
          nome: string
          descricao: string
          icone_url?: string | null
          criterio?: string | null
          pontos_bonus?: number
          criado_em?: string
        }
        Update: Partial<Omit<Badge, 'id'>>
      }
      utilizador_badges: {
        Row: UtilizadorBadge
        Insert: {
          id?: string
          utilizador_id: string
          badge_id: string
          ganho_em?: string
        }
        Update: Partial<Omit<UtilizadorBadge, 'id'>>
      }
      quizzes: {
        Row: Quiz
        Insert: {
          id?: string
          modulo_id?: string | null
          titulo: string
          descricao?: string | null
          tempo_limite_minutos?: number | null
          pontuacao_maxima?: number
          ativo?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<Quiz, 'id'>>
      }
      perguntas: {
        Row: Pergunta
        Insert: {
          id?: string
          quiz_id: string
          texto: string
          tipo: TipoPergunta
          pontos?: number
          ordem: number
          criado_em?: string
        }
        Update: Partial<Omit<Pergunta, 'id'>>
      }
      opcoes_resposta: {
        Row: OpcaoResposta
        Insert: {
          id?: string
          pergunta_id: string
          texto: string
          correta: boolean
          ordem: number
        }
        Update: Partial<Omit<OpcaoResposta, 'id'>>
      }
      tentativas_quiz: {
        Row: TentativaQuiz
        Insert: {
          id?: string
          quiz_id: string
          aluno_id: string
          nota?: number | null
          pontos_ganhos?: number
          tempo_gasto?: number | null
          concluido?: boolean
          iniciado_em?: string
          concluido_em?: string | null
        }
        Update: Partial<Omit<TentativaQuiz, 'id'>>
      }
      respostas_tentativa: {
        Row: RespostaTentativa
        Insert: {
          id?: string
          tentativa_id: string
          pergunta_id: string
          opcao_id?: string | null
          resposta_texto?: string | null
          correta?: boolean | null
          respondido_em?: string
        }
        Update: Partial<Omit<RespostaTentativa, 'id'>>
      }
      simulacoes_phishing: {
        Row: SimulacaoPhishing
        Insert: {
          id?: string
          titulo: string
          descricao?: string | null
          assunto_email: string
          corpo_email: string
          remetente_falso: string
          url_falso?: string | null
          pistas?: string[] | null
          dificuldade?: NivelDificuldade
          pontos_sucesso?: number
          ativo?: boolean
          criado_por?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<SimulacaoPhishing, 'id'>>
      }
      tentativas_simulacao: {
        Row: TentativaSimulacao
        Insert: {
          id?: string
          simulacao_id: string
          aluno_id: string
          estado?: EstadoSimulacao
          pontos_ganhos?: number
          tempo_decisao?: number | null
          feedback_visto?: boolean
          realizado_em?: string
        }
        Update: Partial<Omit<TentativaSimulacao, 'id'>>
      }
      recursos_pedagogicos: {
        Row: RecursoPedagogico
        Insert: {
          id?: string
          titulo: string
          descricao?: string | null
          tipo: TipoRecurso
          url_ficheiro?: string | null
          modulo_id?: string | null
          criado_por?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: Partial<Omit<RecursoPedagogico, 'id'>>
      }
      progresso_modulo: {
        Row: ProgressoModulo
        Insert: {
          id?: string
          aluno_id: string
          modulo_id: string
          aulas_concluidas?: string[]
          percentagem?: number
          concluido?: boolean
          iniciado_em?: string
          concluido_em?: string | null
          atualizado_em?: string
        }
        Update: Partial<Omit<ProgressoModulo, 'id'>>
      }
      notificacoes: {
        Row: Notificacao
        Insert: {
          id?: string
          utilizador_id: string
          titulo: string
          mensagem: string
          lida?: boolean
          criado_em?: string
        }
        Update: Partial<Omit<Notificacao, 'id'>>
      }
    }
    Views: {
      v_leaderboard: {
        Row: {
          id: string
          nome_completo: string
          avatar_url: string | null
          pontos_total: number
          escola: string | null
          posicao_global: number
          total_badges: number
        }
      }
      v_progresso_aluno: {
        Row: {
          aluno_id: string
          nome_completo: string
          modulo_id: string
          modulo: string
          percentagem: number
          concluido: boolean
          iniciado_em: string
          concluido_em: string | null
        }
      }
      v_stats_turma: {
        Row: {
          turma_id: string
          turma: string
          professor_id: string
          total_alunos: number
          media_progresso: number
          modulos_em_progresso: number
        }
      }
      v_stats_simulacoes: {
        Row: {
          aluno_id: string
          nome_completo: string
          total_simulacoes: number
          detectadas: number
          clicadas: number
          taxa_deteccao: number
        }
      }
    }
    Functions: Record<string, never>
    Enums: {
      papel_utilizador: PapelUtilizador
      estado_modulo: EstadoModulo
      nivel_dificuldade: NivelDificuldade
      tipo_recurso: TipoRecurso
      tipo_pergunta: TipoPergunta
      estado_simulacao: EstadoSimulacao
    }
  }
}
