export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      aulas: {
        Row: {
          ativo: boolean
          atualizado_em: string
          conteudo: string | null
          criado_em: string
          duracao_minutos: number | null
          id: string
          modulo_id: string
          ordem: number
          pontos: number
          titulo: string
          video_url: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          conteudo?: string | null
          criado_em?: string
          duracao_minutos?: number | null
          id?: string
          modulo_id: string
          ordem?: number
          pontos?: number
          titulo: string
          video_url?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          conteudo?: string | null
          criado_em?: string
          duracao_minutos?: number | null
          id?: string
          modulo_id?: string
          ordem?: number
          pontos?: number
          titulo?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aulas_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aulas_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "v_progresso_aluno"
            referencedColumns: ["modulo_id"]
          },
        ]
      }
      auth_rate_limits: {
        Row: {
          attempts: number
          atualizado_em: string
          key: string
          locked_until: string | null
          window_start: string
        }
        Insert: {
          attempts?: number
          atualizado_em?: string
          key: string
          locked_until?: string | null
          window_start?: string
        }
        Update: {
          attempts?: number
          atualizado_em?: string
          key?: string
          locked_until?: string | null
          window_start?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          criado_em: string
          criterio: string | null
          descricao: string
          icone_url: string | null
          id: string
          nome: string
          pontos_bonus: number
        }
        Insert: {
          criado_em?: string
          criterio?: string | null
          descricao: string
          icone_url?: string | null
          id?: string
          nome: string
          pontos_bonus?: number
        }
        Update: {
          criado_em?: string
          criterio?: string | null
          descricao?: string
          icone_url?: string | null
          id?: string
          nome?: string
          pontos_bonus?: number
        }
        Relationships: []
      }
      email_otp_sessions: {
        Row: {
          challenge_hash: string | null
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown
          used: boolean
          user_id: string
        }
        Insert: {
          challenge_hash?: string | null
          code_hash: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          used?: boolean
          user_id: string
        }
        Update: {
          challenge_hash?: string | null
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      escolas: {
        Row: {
          ativo: boolean
          cidade: string | null
          codigo_postal: string | null
          criado_em: string
          email: string | null
          id: string
          morada: string | null
          nome: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          codigo_postal?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          morada?: string | null
          nome: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          codigo_postal?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          morada?: string | null
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      modulos: {
        Row: {
          atualizado_em: string
          criado_em: string
          criado_por: string | null
          descricao: string | null
          dificuldade: Database["public"]["Enums"]["nivel_dificuldade"]
          duracao_minutos: number | null
          estado: Database["public"]["Enums"]["estado_modulo"]
          id: string
          ordem: number
          pontos_conclusao: number
          tags: string[] | null
          thumbnail_url: string | null
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          dificuldade?: Database["public"]["Enums"]["nivel_dificuldade"]
          duracao_minutos?: number | null
          estado?: Database["public"]["Enums"]["estado_modulo"]
          id?: string
          ordem?: number
          pontos_conclusao?: number
          tags?: string[] | null
          thumbnail_url?: string | null
          titulo: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          dificuldade?: Database["public"]["Enums"]["nivel_dificuldade"]
          duracao_minutos?: number | null
          estado?: Database["public"]["Enums"]["estado_modulo"]
          id?: string
          ordem?: number
          pontos_conclusao?: number
          tags?: string[] | null
          thumbnail_url?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "modulos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modulos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "v_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          criado_em: string
          id: string
          lida: boolean
          mensagem: string
          tipo: string
          titulo: string
          url_destino: string | null
          utilizador_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          lida?: boolean
          mensagem: string
          tipo?: string
          titulo: string
          url_destino?: string | null
          utilizador_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          lida?: boolean
          mensagem?: string
          tipo?: string
          titulo?: string
          url_destino?: string | null
          utilizador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_utilizador_id_fkey"
            columns: ["utilizador_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_utilizador_id_fkey"
            columns: ["utilizador_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      opcoes_resposta: {
        Row: {
          correta: boolean
          id: string
          ordem: number
          pergunta_id: string
          texto: string
        }
        Insert: {
          correta?: boolean
          id?: string
          ordem?: number
          pergunta_id: string
          texto: string
        }
        Update: {
          correta?: boolean
          id?: string
          ordem?: number
          pergunta_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "opcoes_resposta_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "perguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          ativo: boolean
          atualizado_em: string
          avatar_url: string | null
          criado_em: string
          email: string
          escola_id: string | null
          id: string
          nome_completo: string
          numero_aluno: string | null
          papel: Database["public"]["Enums"]["papel_utilizador"]
          pontos_total: number
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          avatar_url?: string | null
          criado_em?: string
          email: string
          escola_id?: string | null
          id: string
          nome_completo: string
          numero_aluno?: string | null
          papel?: Database["public"]["Enums"]["papel_utilizador"]
          pontos_total?: number
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          avatar_url?: string | null
          criado_em?: string
          email?: string
          escola_id?: string | null
          id?: string
          nome_completo?: string
          numero_aluno?: string | null
          papel?: Database["public"]["Enums"]["papel_utilizador"]
          pontos_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_perfis_escola"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      perguntas: {
        Row: {
          criado_em: string
          enunciado: string
          explicacao: string | null
          id: string
          ordem: number
          pontos: number
          quiz_id: string
          tipo: Database["public"]["Enums"]["tipo_pergunta"]
        }
        Insert: {
          criado_em?: string
          enunciado: string
          explicacao?: string | null
          id?: string
          ordem?: number
          pontos?: number
          quiz_id: string
          tipo?: Database["public"]["Enums"]["tipo_pergunta"]
        }
        Update: {
          criado_em?: string
          enunciado?: string
          explicacao?: string | null
          id?: string
          ordem?: number
          pontos?: number
          quiz_id?: string
          tipo?: Database["public"]["Enums"]["tipo_pergunta"]
        }
        Relationships: [
          {
            foreignKeyName: "perguntas_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      progresso_modulo: {
        Row: {
          aluno_id: string
          atualizado_em: string
          aulas_concluidas: string[]
          concluido: boolean
          concluido_em: string | null
          id: string
          iniciado_em: string
          modulo_id: string
          percentagem: number
        }
        Insert: {
          aluno_id: string
          atualizado_em?: string
          aulas_concluidas?: string[]
          concluido?: boolean
          concluido_em?: string | null
          id?: string
          iniciado_em?: string
          modulo_id: string
          percentagem?: number
        }
        Update: {
          aluno_id?: string
          atualizado_em?: string
          aulas_concluidas?: string[]
          concluido?: boolean
          concluido_em?: string | null
          id?: string
          iniciado_em?: string
          modulo_id?: string
          percentagem?: number
        }
        Relationships: [
          {
            foreignKeyName: "progresso_modulo_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progresso_modulo_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progresso_modulo_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progresso_modulo_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "v_progresso_aluno"
            referencedColumns: ["modulo_id"]
          },
        ]
      }
      quizzes: {
        Row: {
          ativo: boolean
          atualizado_em: string
          aula_id: string | null
          criado_em: string
          criado_por: string | null
          descricao: string | null
          id: string
          modulo_id: string | null
          nota_minima: number
          pontos_conclusao: number
          tempo_limite: number | null
          tentativas_max: number
          titulo: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          aula_id?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          modulo_id?: string | null
          nota_minima?: number
          pontos_conclusao?: number
          tempo_limite?: number | null
          tentativas_max?: number
          titulo: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          aula_id?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          modulo_id?: string | null
          nota_minima?: number
          pontos_conclusao?: number
          tempo_limite?: number | null
          tentativas_max?: number
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "v_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "v_progresso_aluno"
            referencedColumns: ["modulo_id"]
          },
        ]
      }
      recursos_pedagogicos: {
        Row: {
          criado_em: string
          criado_por: string | null
          descricao: string | null
          id: string
          modulo_id: string | null
          tipo: Database["public"]["Enums"]["tipo_recurso"]
          titulo: string
          url_ficheiro: string | null
          visivel: boolean
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          modulo_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_recurso"]
          titulo: string
          url_ficheiro?: string | null
          visivel?: boolean
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          modulo_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_recurso"]
          titulo?: string
          url_ficheiro?: string | null
          visivel?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "recursos_pedagogicos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recursos_pedagogicos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "v_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recursos_pedagogicos_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recursos_pedagogicos_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "v_progresso_aluno"
            referencedColumns: ["modulo_id"]
          },
        ]
      }
      respostas_tentativa: {
        Row: {
          correta: boolean | null
          id: string
          opcao_id: string | null
          pergunta_id: string
          respondido_em: string
          resposta_texto: string | null
          tentativa_id: string
        }
        Insert: {
          correta?: boolean | null
          id?: string
          opcao_id?: string | null
          pergunta_id: string
          respondido_em?: string
          resposta_texto?: string | null
          tentativa_id: string
        }
        Update: {
          correta?: boolean | null
          id?: string
          opcao_id?: string | null
          pergunta_id?: string
          respondido_em?: string
          resposta_texto?: string | null
          tentativa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "respostas_tentativa_opcao_id_fkey"
            columns: ["opcao_id"]
            isOneToOne: false
            referencedRelation: "opcoes_resposta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_tentativa_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "perguntas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_tentativa_tentativa_id_fkey"
            columns: ["tentativa_id"]
            isOneToOne: false
            referencedRelation: "tentativas_quiz"
            referencedColumns: ["id"]
          },
        ]
      }
      simulacoes_phishing: {
        Row: {
          assunto_email: string
          ativo: boolean
          atualizado_em: string
          corpo_email: string
          criado_em: string
          criado_por: string | null
          descricao: string | null
          dificuldade: Database["public"]["Enums"]["nivel_dificuldade"]
          id: string
          pistas: string[] | null
          pontos_sucesso: number
          remetente_falso: string
          titulo: string
          url_falso: string | null
        }
        Insert: {
          assunto_email: string
          ativo?: boolean
          atualizado_em?: string
          corpo_email: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          dificuldade?: Database["public"]["Enums"]["nivel_dificuldade"]
          id?: string
          pistas?: string[] | null
          pontos_sucesso?: number
          remetente_falso: string
          titulo: string
          url_falso?: string | null
        }
        Update: {
          assunto_email?: string
          ativo?: boolean
          atualizado_em?: string
          corpo_email?: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          dificuldade?: Database["public"]["Enums"]["nivel_dificuldade"]
          id?: string
          pistas?: string[] | null
          pontos_sucesso?: number
          remetente_falso?: string
          titulo?: string
          url_falso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "simulacoes_phishing_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulacoes_phishing_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "v_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      tentativas_quiz: {
        Row: {
          aluno_id: string
          concluido: boolean
          concluido_em: string | null
          id: string
          iniciado_em: string
          nota: number | null
          pontos_ganhos: number
          quiz_id: string
          tempo_gasto: number | null
        }
        Insert: {
          aluno_id: string
          concluido?: boolean
          concluido_em?: string | null
          id?: string
          iniciado_em?: string
          nota?: number | null
          pontos_ganhos?: number
          quiz_id: string
          tempo_gasto?: number | null
        }
        Update: {
          aluno_id?: string
          concluido?: boolean
          concluido_em?: string | null
          id?: string
          iniciado_em?: string
          nota?: number | null
          pontos_ganhos?: number
          quiz_id?: string
          tempo_gasto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tentativas_quiz_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tentativas_quiz_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tentativas_quiz_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      tentativas_simulacao: {
        Row: {
          aluno_id: string
          estado: Database["public"]["Enums"]["estado_simulacao"]
          feedback_visto: boolean
          id: string
          pontos_ganhos: number
          realizado_em: string
          simulacao_id: string
          tempo_decisao: number | null
        }
        Insert: {
          aluno_id: string
          estado?: Database["public"]["Enums"]["estado_simulacao"]
          feedback_visto?: boolean
          id?: string
          pontos_ganhos?: number
          realizado_em?: string
          simulacao_id: string
          tempo_decisao?: number | null
        }
        Update: {
          aluno_id?: string
          estado?: Database["public"]["Enums"]["estado_simulacao"]
          feedback_visto?: boolean
          id?: string
          pontos_ganhos?: number
          realizado_em?: string
          simulacao_id?: string
          tempo_decisao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tentativas_simulacao_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tentativas_simulacao_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tentativas_simulacao_simulacao_id_fkey"
            columns: ["simulacao_id"]
            isOneToOne: false
            referencedRelation: "simulacoes_phishing"
            referencedColumns: ["id"]
          },
        ]
      }
      turma_alunos: {
        Row: {
          aluno_id: string
          ativo: boolean
          id: string
          inscrito_em: string
          turma_id: string
        }
        Insert: {
          aluno_id: string
          ativo?: boolean
          id?: string
          inscrito_em?: string
          turma_id: string
        }
        Update: {
          aluno_id?: string
          ativo?: boolean
          id?: string
          inscrito_em?: string
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turma_alunos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turma_alunos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turma_alunos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turma_alunos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "v_stats_turma"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      turma_modulos: {
        Row: {
          atribuido_em: string
          data_fim: string | null
          data_inicio: string | null
          id: string
          modulo_id: string
          obrigatorio: boolean
          turma_id: string
        }
        Insert: {
          atribuido_em?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          modulo_id: string
          obrigatorio?: boolean
          turma_id: string
        }
        Update: {
          atribuido_em?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          modulo_id?: string
          obrigatorio?: boolean
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turma_modulos_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turma_modulos_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "v_progresso_aluno"
            referencedColumns: ["modulo_id"]
          },
          {
            foreignKeyName: "turma_modulos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turma_modulos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "v_stats_turma"
            referencedColumns: ["turma_id"]
          },
        ]
      }
      turmas: {
        Row: {
          ano_escolar: string | null
          ano_letivo: string
          ativo: boolean
          atualizado_em: string
          codigo_acesso: string | null
          codigo_expira_em: string | null
          criado_em: string
          descricao: string | null
          escola_id: string | null
          id: string
          nome: string
          professor_id: string | null
        }
        Insert: {
          ano_escolar?: string | null
          ano_letivo: string
          ativo?: boolean
          atualizado_em?: string
          codigo_acesso?: string | null
          codigo_expira_em?: string | null
          criado_em?: string
          descricao?: string | null
          escola_id?: string | null
          id?: string
          nome: string
          professor_id?: string | null
        }
        Update: {
          ano_escolar?: string | null
          ano_letivo?: string
          ativo?: boolean
          atualizado_em?: string
          codigo_acesso?: string | null
          codigo_expira_em?: string | null
          criado_em?: string
          descricao?: string | null
          escola_id?: string | null
          id?: string
          nome?: string
          professor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turmas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      utilizador_badges: {
        Row: {
          badge_id: string
          ganho_em: string
          id: string
          utilizador_id: string
        }
        Insert: {
          badge_id: string
          ganho_em?: string
          id?: string
          utilizador_id: string
        }
        Update: {
          badge_id?: string
          ganho_em?: string
          id?: string
          utilizador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "utilizador_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utilizador_badges_utilizador_id_fkey"
            columns: ["utilizador_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utilizador_badges_utilizador_id_fkey"
            columns: ["utilizador_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_leaderboard: {
        Row: {
          avatar_url: string | null
          escola: string | null
          id: string | null
          nome_completo: string | null
          pontos_total: number | null
          posicao_global: number | null
          total_badges: number | null
        }
        Relationships: []
      }
      v_progresso_aluno: {
        Row: {
          aluno_id: string | null
          concluido: boolean | null
          concluido_em: string | null
          iniciado_em: string | null
          modulo: string | null
          modulo_id: string | null
          nome_completo: string | null
          percentagem: number | null
        }
        Relationships: [
          {
            foreignKeyName: "progresso_modulo_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progresso_modulo_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      v_stats_simulacoes: {
        Row: {
          aluno_id: string | null
          clicadas: number | null
          detectadas: number | null
          nome_completo: string | null
          taxa_deteccao: number | null
          total_simulacoes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tentativas_simulacao_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tentativas_simulacao_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      v_stats_turma: {
        Row: {
          media_progresso: number | null
          modulos_em_progresso: number | null
          professor_id: string | null
          total_alunos: number | null
          turma: string | null
          turma_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turmas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "v_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      fn_aluno_pertence_ao_professor: {
        Args: { p_aluno_id: string }
        Returns: boolean
      }
      fn_atualizar_pontos: {
        Args: { p_pontos: number; p_utilizador_id: string }
        Returns: undefined
      }
      fn_calcular_progresso_modulo: {
        Args: { p_aluno_id: string; p_modulo_id: string }
        Returns: number
      }
      fn_check_rate_limit: {
        Args: {
          p_key: string
          p_lockout_seconds: number
          p_max_attempts: number
          p_window_seconds: number
        }
        Returns: Json
      }
      fn_cleanup_rate_limits: { Args: never; Returns: undefined }
      fn_concluir_aula: { Args: { p_aula_id: string }; Returns: Json }
      fn_get_user_escola_id: { Args: never; Returns: string }
      fn_get_user_papel: { Args: never; Returns: string }
      fn_inscrever_por_codigo: { Args: { p_codigo: string }; Returns: Json }
      fn_is_aluno_da_turma: { Args: { p_turma_id: string }; Returns: boolean }
      fn_is_professor_da_turma: {
        Args: { p_turma_id: string }
        Returns: boolean
      }
      fn_regenerar_codigo_turma: { Args: { p_turma_id: string }; Returns: Json }
      fn_reset_rate_limit: { Args: { p_key: string }; Returns: undefined }
      fn_submeter_quiz: {
        Args: { p_quiz_id: string; p_respostas: Json }
        Returns: Json
      }
      fn_submeter_simulacao: {
        Args: {
          p_estado: string
          p_simulacao_id: string
          p_tempo_decisao: number
        }
        Returns: Json
      }
      fn_validar_codigo_turma: { Args: { p_codigo: string }; Returns: boolean }
      fn_verificar_badges: { Args: never; Returns: number }
    }
    Enums: {
      estado_modulo: "rascunho" | "publicado" | "arquivado"
      estado_simulacao: "pendente" | "clicou" | "reportou" | "ignorou"
      nivel_dificuldade: "basico" | "intermedio" | "avancado"
      papel_utilizador: "aluno" | "professor" | "administrador"
      tipo_pergunta: "escolha_multipla" | "verdadeiro_falso" | "resposta_curta"
      tipo_recurso:
        | "plano_aula"
        | "apresentacao"
        | "guia"
        | "video"
        | "documento"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      estado_modulo: ["rascunho", "publicado", "arquivado"],
      estado_simulacao: ["pendente", "clicou", "reportou", "ignorou"],
      nivel_dificuldade: ["basico", "intermedio", "avancado"],
      papel_utilizador: ["aluno", "professor", "administrador"],
      tipo_pergunta: ["escolha_multipla", "verdadeiro_falso", "resposta_curta"],
      tipo_recurso: [
        "plano_aula",
        "apresentacao",
        "guia",
        "video",
        "documento",
      ],
    },
  },
} as const

