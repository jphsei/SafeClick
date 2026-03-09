-- ============================================================
-- SafeClick - Plataforma de Sensibilização em Cibersegurança
-- Migration: Schema inicial completo
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE papel_utilizador AS ENUM ('aluno', 'professor', 'administrador');
CREATE TYPE estado_modulo AS ENUM ('rascunho', 'publicado', 'arquivado');
CREATE TYPE tipo_recurso AS ENUM ('plano_aula', 'apresentacao', 'guia', 'video', 'documento');
CREATE TYPE tipo_pergunta AS ENUM ('escolha_multipla', 'verdadeiro_falso', 'resposta_curta');
CREATE TYPE estado_simulacao AS ENUM ('pendente', 'clicou', 'reportou', 'ignorou');
CREATE TYPE nivel_dificuldade AS ENUM ('basico', 'intermedio', 'avancado');

-- ============================================================
-- TABELA: perfis
-- Estende auth.users com informação específica da plataforma
-- ============================================================

CREATE TABLE public.perfis (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_completo   TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    papel           papel_utilizador NOT NULL DEFAULT 'aluno',
    avatar_url      TEXT,
    escola_id       UUID,                      -- referenciado depois
    numero_aluno    TEXT,                       -- só para alunos
    pontos_total    INTEGER NOT NULL DEFAULT 0,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.perfis IS 'Perfis de utilizadores - extensão da tabela auth.users';
COMMENT ON COLUMN public.perfis.papel IS 'Papel do utilizador: aluno, professor ou administrador';

-- ============================================================
-- TABELA: escolas
-- ============================================================

CREATE TABLE public.escolas (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome        TEXT NOT NULL,
    morada      TEXT,
    cidade      TEXT,
    codigo_postal TEXT,
    telefone    TEXT,
    email       TEXT,
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.escolas IS 'Escolas registadas na plataforma';

-- Adicionar FK de perfis para escolas
ALTER TABLE public.perfis
    ADD CONSTRAINT fk_perfis_escola
    FOREIGN KEY (escola_id) REFERENCES public.escolas(id) ON DELETE SET NULL;

-- ============================================================
-- TABELA: turmas
-- ============================================================

CREATE TABLE public.turmas (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome            TEXT NOT NULL,
    descricao       TEXT,
    escola_id       UUID REFERENCES public.escolas(id) ON DELETE CASCADE,
    professor_id    UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    ano_letivo      TEXT NOT NULL,              -- ex: "2025/2026"
    ano_escolar     TEXT,                       -- ex: "10º Ano"
    codigo_acesso   TEXT UNIQUE,                -- código para alunos se inscreverem
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.turmas IS 'Turmas/grupos de alunos geridas por professores';

-- ============================================================
-- TABELA: turma_alunos
-- Relação Many-to-Many entre turmas e alunos
-- ============================================================

CREATE TABLE public.turma_alunos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turma_id    UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
    aluno_id    UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    inscrito_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(turma_id, aluno_id)
);

COMMENT ON TABLE public.turma_alunos IS 'Inscrição de alunos em turmas';

-- ============================================================
-- TABELA: modulos
-- Módulos de e-learning sobre cibersegurança
-- ============================================================

CREATE TABLE public.modulos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo          TEXT NOT NULL,
    descricao       TEXT,
    thumbnail_url   TEXT,
    dificuldade     nivel_dificuldade NOT NULL DEFAULT 'basico',
    estado          estado_modulo NOT NULL DEFAULT 'rascunho',
    ordem           INTEGER NOT NULL DEFAULT 0,
    pontos_conclusao INTEGER NOT NULL DEFAULT 10,
    duracao_minutos INTEGER,                    -- duração estimada
    tags            TEXT[],                     -- ex: ['phishing', 'passwords']
    criado_por      UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.modulos IS 'Módulos de e-learning sobre cibersegurança';

-- ============================================================
-- TABELA: aulas
-- Lições/aulas dentro de um módulo
-- ============================================================

CREATE TABLE public.aulas (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    modulo_id       UUID NOT NULL REFERENCES public.modulos(id) ON DELETE CASCADE,
    titulo          TEXT NOT NULL,
    conteudo        TEXT,                       -- conteúdo em HTML/Markdown
    video_url       TEXT,
    ordem           INTEGER NOT NULL DEFAULT 0,
    duracao_minutos INTEGER,
    pontos          INTEGER NOT NULL DEFAULT 5,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.aulas IS 'Aulas/lições individuais dentro de um módulo';

-- ============================================================
-- TABELA: recursos_pedagogicos
-- Recursos de apoio para professores
-- ============================================================

CREATE TABLE public.recursos_pedagogicos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo          TEXT NOT NULL,
    descricao       TEXT,
    tipo            tipo_recurso NOT NULL DEFAULT 'documento',
    url_ficheiro    TEXT,
    modulo_id       UUID REFERENCES public.modulos(id) ON DELETE SET NULL,
    visivel         BOOLEAN NOT NULL DEFAULT TRUE,
    criado_por      UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.recursos_pedagogicos IS 'Recursos pedagógicos de apoio para professores (planos de aula, apresentações, etc.)';

-- ============================================================
-- TABELA: quizzes
-- Questionários de avaliação
-- ============================================================

CREATE TABLE public.quizzes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo          TEXT NOT NULL,
    descricao       TEXT,
    modulo_id       UUID REFERENCES public.modulos(id) ON DELETE CASCADE,
    aula_id         UUID REFERENCES public.aulas(id) ON DELETE CASCADE,
    tempo_limite    INTEGER,                    -- tempo em segundos (NULL = sem limite)
    tentativas_max  INTEGER NOT NULL DEFAULT 3,
    pontos_conclusao INTEGER NOT NULL DEFAULT 20,
    nota_minima     NUMERIC(5,2) NOT NULL DEFAULT 60.00, -- percentagem mínima para passar
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_por      UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (modulo_id IS NOT NULL OR aula_id IS NOT NULL)
);

COMMENT ON TABLE public.quizzes IS 'Questionários/quizzes de avaliação de conhecimentos';

-- ============================================================
-- TABELA: perguntas
-- Perguntas de um quiz
-- ============================================================

CREATE TABLE public.perguntas (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id         UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    enunciado       TEXT NOT NULL,
    tipo            tipo_pergunta NOT NULL DEFAULT 'escolha_multipla',
    explicacao      TEXT,                       -- explicação mostrada após resposta
    pontos          INTEGER NOT NULL DEFAULT 1,
    ordem           INTEGER NOT NULL DEFAULT 0,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.perguntas IS 'Perguntas individuais de um quiz';

-- ============================================================
-- TABELA: opcoes_resposta
-- Opções de resposta para perguntas de escolha múltipla
-- ============================================================

CREATE TABLE public.opcoes_resposta (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pergunta_id     UUID NOT NULL REFERENCES public.perguntas(id) ON DELETE CASCADE,
    texto           TEXT NOT NULL,
    correta         BOOLEAN NOT NULL DEFAULT FALSE,
    ordem           INTEGER NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.opcoes_resposta IS 'Opções de resposta para perguntas de escolha múltipla e V/F';

-- ============================================================
-- TABELA: tentativas_quiz
-- Registo de tentativas de alunos em quizzes
-- ============================================================

CREATE TABLE public.tentativas_quiz (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id         UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    aluno_id        UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    nota            NUMERIC(5,2),               -- percentagem (0-100)
    pontos_ganhos   INTEGER NOT NULL DEFAULT 0,
    tempo_gasto     INTEGER,                    -- segundos
    concluido       BOOLEAN NOT NULL DEFAULT FALSE,
    iniciado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    concluido_em    TIMESTAMPTZ
);

COMMENT ON TABLE public.tentativas_quiz IS 'Tentativas de alunos em quizzes';

-- ============================================================
-- TABELA: respostas_tentativa
-- Respostas dadas numa tentativa de quiz
-- ============================================================

CREATE TABLE public.respostas_tentativa (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tentativa_id        UUID NOT NULL REFERENCES public.tentativas_quiz(id) ON DELETE CASCADE,
    pergunta_id         UUID NOT NULL REFERENCES public.perguntas(id) ON DELETE CASCADE,
    opcao_id            UUID REFERENCES public.opcoes_resposta(id) ON DELETE SET NULL,
    resposta_texto      TEXT,                   -- para perguntas de resposta curta
    correta             BOOLEAN,
    respondido_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tentativa_id, pergunta_id)
);

COMMENT ON TABLE public.respostas_tentativa IS 'Respostas individuais dadas durante uma tentativa de quiz';

-- ============================================================
-- TABELA: progresso_modulo
-- Progresso de cada aluno em cada módulo
-- ============================================================

CREATE TABLE public.progresso_modulo (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aluno_id        UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    modulo_id       UUID NOT NULL REFERENCES public.modulos(id) ON DELETE CASCADE,
    aulas_concluidas UUID[] NOT NULL DEFAULT '{}',  -- IDs das aulas concluídas
    percentagem     NUMERIC(5,2) NOT NULL DEFAULT 0,
    concluido       BOOLEAN NOT NULL DEFAULT FALSE,
    iniciado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    concluido_em    TIMESTAMPTZ,
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(aluno_id, modulo_id)
);

COMMENT ON TABLE public.progresso_modulo IS 'Registo do progresso de cada aluno em cada módulo';

-- ============================================================
-- TABELA: simulacoes_phishing
-- Cenários de simulação de ataques de phishing
-- ============================================================

CREATE TABLE public.simulacoes_phishing (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo          TEXT NOT NULL,
    descricao       TEXT,
    assunto_email   TEXT NOT NULL,
    corpo_email     TEXT NOT NULL,
    remetente_falso TEXT NOT NULL,
    url_falso       TEXT,
    pistas          TEXT[],                     -- dicas de identificação de phishing
    dificuldade     nivel_dificuldade NOT NULL DEFAULT 'basico',
    pontos_sucesso  INTEGER NOT NULL DEFAULT 15,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_por      UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.simulacoes_phishing IS 'Cenários de simulação de ataques de phishing para treino';

-- ============================================================
-- TABELA: tentativas_simulacao
-- Resultados de alunos nas simulações de phishing
-- ============================================================

CREATE TABLE public.tentativas_simulacao (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulacao_id    UUID NOT NULL REFERENCES public.simulacoes_phishing(id) ON DELETE CASCADE,
    aluno_id        UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    estado          estado_simulacao NOT NULL DEFAULT 'pendente',
    pontos_ganhos   INTEGER NOT NULL DEFAULT 0,
    tempo_decisao   INTEGER,                    -- segundos até à decisão
    feedback_visto  BOOLEAN NOT NULL DEFAULT FALSE,
    realizado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tentativas_simulacao IS 'Resultados de alunos em simulações de phishing';

-- ============================================================
-- TABELA: badges
-- Emblemas/conquistas da plataforma
-- ============================================================

CREATE TABLE public.badges (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome            TEXT NOT NULL UNIQUE,
    descricao       TEXT NOT NULL,
    icone_url       TEXT,
    criterio        TEXT,                       -- descrição do critério para ganhar
    pontos_bonus    INTEGER NOT NULL DEFAULT 0,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.badges IS 'Emblemas/conquistas que os alunos podem ganhar';

-- ============================================================
-- TABELA: utilizador_badges
-- Emblemas ganhos por utilizadores
-- ============================================================

CREATE TABLE public.utilizador_badges (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utilizador_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    badge_id    UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    ganho_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(utilizador_id, badge_id)
);

COMMENT ON TABLE public.utilizador_badges IS 'Badges ganhos por cada utilizador';

-- ============================================================
-- TABELA: notificacoes
-- Notificações do sistema para utilizadores
-- ============================================================

CREATE TABLE public.notificacoes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utilizador_id   UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    titulo          TEXT NOT NULL,
    mensagem        TEXT NOT NULL,
    lida            BOOLEAN NOT NULL DEFAULT FALSE,
    tipo            TEXT NOT NULL DEFAULT 'info', -- 'info', 'sucesso', 'aviso', 'conquista'
    url_destino     TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notificacoes IS 'Notificações do sistema enviadas aos utilizadores';

-- ============================================================
-- TABELA: turma_modulos
-- Módulos atribuídos a turmas (pelo professor/admin)
-- ============================================================

CREATE TABLE public.turma_modulos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turma_id        UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
    modulo_id       UUID NOT NULL REFERENCES public.modulos(id) ON DELETE CASCADE,
    data_inicio     DATE,
    data_fim        DATE,
    obrigatorio     BOOLEAN NOT NULL DEFAULT TRUE,
    atribuido_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(turma_id, modulo_id)
);

COMMENT ON TABLE public.turma_modulos IS 'Módulos atribuídos a turmas pelos professores';

-- ============================================================
-- ÍNDICES para melhorar performance
-- ============================================================

CREATE INDEX idx_perfis_papel ON public.perfis(papel);
CREATE INDEX idx_perfis_escola ON public.perfis(escola_id);
CREATE INDEX idx_turmas_professor ON public.turmas(professor_id);
CREATE INDEX idx_turmas_escola ON public.turmas(escola_id);
CREATE INDEX idx_turma_alunos_turma ON public.turma_alunos(turma_id);
CREATE INDEX idx_turma_alunos_aluno ON public.turma_alunos(aluno_id);
CREATE INDEX idx_modulos_estado ON public.modulos(estado);
CREATE INDEX idx_aulas_modulo ON public.aulas(modulo_id);
CREATE INDEX idx_quizzes_modulo ON public.quizzes(modulo_id);
CREATE INDEX idx_perguntas_quiz ON public.perguntas(quiz_id);
CREATE INDEX idx_opcoes_pergunta ON public.opcoes_resposta(pergunta_id);
CREATE INDEX idx_tentativas_quiz_aluno ON public.tentativas_quiz(aluno_id);
CREATE INDEX idx_tentativas_quiz_quiz ON public.tentativas_quiz(quiz_id);
CREATE INDEX idx_progresso_aluno ON public.progresso_modulo(aluno_id);
CREATE INDEX idx_progresso_modulo ON public.progresso_modulo(modulo_id);
CREATE INDEX idx_tentativas_simulacao_aluno ON public.tentativas_simulacao(aluno_id);
CREATE INDEX idx_tentativas_simulacao_sim ON public.tentativas_simulacao(simulacao_id);
CREATE INDEX idx_utilizador_badges_user ON public.utilizador_badges(utilizador_id);
CREATE INDEX idx_notificacoes_user ON public.notificacoes(utilizador_id);
CREATE INDEX idx_notificacoes_lida ON public.notificacoes(utilizador_id, lida);

-- ============================================================
-- FUNÇÃO: atualizar campo atualizado_em automaticamente
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de atualização automática
CREATE TRIGGER trg_perfis_atualizado_em
    BEFORE UPDATE ON public.perfis
    FOR EACH ROW EXECUTE FUNCTION public.fn_atualizar_timestamp();

CREATE TRIGGER trg_turmas_atualizado_em
    BEFORE UPDATE ON public.turmas
    FOR EACH ROW EXECUTE FUNCTION public.fn_atualizar_timestamp();

CREATE TRIGGER trg_modulos_atualizado_em
    BEFORE UPDATE ON public.modulos
    FOR EACH ROW EXECUTE FUNCTION public.fn_atualizar_timestamp();

CREATE TRIGGER trg_aulas_atualizado_em
    BEFORE UPDATE ON public.aulas
    FOR EACH ROW EXECUTE FUNCTION public.fn_atualizar_timestamp();

CREATE TRIGGER trg_quizzes_atualizado_em
    BEFORE UPDATE ON public.quizzes
    FOR EACH ROW EXECUTE FUNCTION public.fn_atualizar_timestamp();

CREATE TRIGGER trg_simulacoes_atualizado_em
    BEFORE UPDATE ON public.simulacoes_phishing
    FOR EACH ROW EXECUTE FUNCTION public.fn_atualizar_timestamp();

CREATE TRIGGER trg_progresso_atualizado_em
    BEFORE UPDATE ON public.progresso_modulo
    FOR EACH ROW EXECUTE FUNCTION public.fn_atualizar_timestamp();

-- ============================================================
-- FUNÇÃO: criar perfil automaticamente após registo no auth
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_novo_utilizador()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfis (id, nome_completo, email, papel)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'papel')::papel_utilizador, 'aluno')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auth_novo_utilizador
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.fn_novo_utilizador();

-- ============================================================
-- FUNÇÃO: atualizar pontos do utilizador
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_atualizar_pontos(
    p_utilizador_id UUID,
    p_pontos INTEGER
) RETURNS VOID AS $$
BEGIN
    UPDATE public.perfis
    SET pontos_total = pontos_total + p_pontos
    WHERE id = p_utilizador_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNÇÃO: calcular progresso de módulo para um aluno
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_calcular_progresso_modulo(
    p_aluno_id UUID,
    p_modulo_id UUID
) RETURNS NUMERIC AS $$
DECLARE
    v_total_aulas INTEGER;
    v_aulas_concluidas INTEGER;
    v_percentagem NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_total_aulas
    FROM public.aulas
    WHERE modulo_id = p_modulo_id;

    IF v_total_aulas = 0 THEN
        RETURN 0;
    END IF;

    SELECT array_length(aulas_concluidas, 1) INTO v_aulas_concluidas
    FROM public.progresso_modulo
    WHERE aluno_id = p_aluno_id AND modulo_id = p_modulo_id;

    v_aulas_concluidas := COALESCE(v_aulas_concluidas, 0);
    v_percentagem := (v_aulas_concluidas::NUMERIC / v_total_aulas::NUMERIC) * 100;

    RETURN ROUND(v_percentagem, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Activar RLS em todas as tabelas
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turma_alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recursos_pedagogicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opcoes_resposta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tentativas_quiz ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas_tentativa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progresso_modulo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulacoes_phishing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tentativas_simulacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilizador_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turma_modulos ENABLE ROW LEVEL SECURITY;

-- --------------------
-- Políticas: perfis
-- --------------------
-- Utilizador vê o seu próprio perfil
CREATE POLICY "perfis_select_proprio" ON public.perfis
    FOR SELECT USING (auth.uid() = id);

-- Professores e admins veem perfis da sua escola
CREATE POLICY "perfis_select_escola" ON public.perfis
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid()
            AND p.papel IN ('professor', 'administrador')
            AND p.escola_id = perfis.escola_id
        )
    );

-- Utilizador atualiza o seu próprio perfil
CREATE POLICY "perfis_update_proprio" ON public.perfis
    FOR UPDATE USING (auth.uid() = id);

-- Admin pode ver e modificar todos os perfis
CREATE POLICY "perfis_admin_tudo" ON public.perfis
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid()
            AND p.papel = 'administrador'
        )
    );

-- --------------------
-- Políticas: escolas
-- --------------------
CREATE POLICY "escolas_select_todos" ON public.escolas
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "escolas_admin_modificar" ON public.escolas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel = 'administrador'
        )
    );

-- --------------------
-- Políticas: turmas
-- --------------------
-- Professores veem as suas turmas
CREATE POLICY "turmas_select_professor" ON public.turmas
    FOR SELECT USING (professor_id = auth.uid());

-- Alunos veem as turmas onde estão inscritos
CREATE POLICY "turmas_select_aluno" ON public.turmas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.turma_alunos ta
            WHERE ta.turma_id = turmas.id AND ta.aluno_id = auth.uid() AND ta.ativo = TRUE
        )
    );

-- Professores criam e gerem as suas turmas
CREATE POLICY "turmas_professor_gerir" ON public.turmas
    FOR ALL USING (professor_id = auth.uid());

-- Admin gere todas as turmas
CREATE POLICY "turmas_admin_tudo" ON public.turmas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel = 'administrador'
        )
    );

-- --------------------
-- Políticas: modulos (conteúdo público para autenticados)
-- --------------------
CREATE POLICY "modulos_select_publicados" ON public.modulos
    FOR SELECT USING (estado = 'publicado' AND auth.role() = 'authenticated');

CREATE POLICY "modulos_admin_professor_tudo" ON public.modulos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel IN ('professor', 'administrador')
        )
    );

-- --------------------
-- Políticas: aulas
-- --------------------
CREATE POLICY "aulas_select_autenticado" ON public.aulas
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "aulas_admin_professor_modificar" ON public.aulas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel IN ('professor', 'administrador')
        )
    );

-- --------------------
-- Políticas: quizzes, perguntas, opções
-- --------------------
CREATE POLICY "quizzes_select_autenticado" ON public.quizzes
    FOR SELECT USING (auth.role() = 'authenticated' AND ativo = TRUE);

CREATE POLICY "quizzes_admin_professor_modificar" ON public.quizzes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel IN ('professor', 'administrador')
        )
    );

CREATE POLICY "perguntas_select_autenticado" ON public.perguntas
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "perguntas_admin_professor_modificar" ON public.perguntas
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel IN ('professor', 'administrador')
        )
    );

CREATE POLICY "opcoes_select_autenticado" ON public.opcoes_resposta
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "opcoes_admin_professor_modificar" ON public.opcoes_resposta
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel IN ('professor', 'administrador')
        )
    );

-- --------------------
-- Políticas: tentativas_quiz e respostas
-- --------------------
CREATE POLICY "tentativas_select_proprio" ON public.tentativas_quiz
    FOR SELECT USING (aluno_id = auth.uid());

CREATE POLICY "tentativas_insert_proprio" ON public.tentativas_quiz
    FOR INSERT WITH CHECK (aluno_id = auth.uid());

CREATE POLICY "tentativas_update_proprio" ON public.tentativas_quiz
    FOR UPDATE USING (aluno_id = auth.uid());

CREATE POLICY "tentativas_professor_select" ON public.tentativas_quiz
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel IN ('professor', 'administrador')
        )
    );

CREATE POLICY "respostas_select_proprio" ON public.respostas_tentativa
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tentativas_quiz tq
            WHERE tq.id = respostas_tentativa.tentativa_id AND tq.aluno_id = auth.uid()
        )
    );

CREATE POLICY "respostas_insert_proprio" ON public.respostas_tentativa
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tentativas_quiz tq
            WHERE tq.id = respostas_tentativa.tentativa_id AND tq.aluno_id = auth.uid()
        )
    );

-- --------------------
-- Políticas: progresso_modulo
-- --------------------
CREATE POLICY "progresso_select_proprio" ON public.progresso_modulo
    FOR SELECT USING (aluno_id = auth.uid());

CREATE POLICY "progresso_insert_proprio" ON public.progresso_modulo
    FOR INSERT WITH CHECK (aluno_id = auth.uid());

CREATE POLICY "progresso_update_proprio" ON public.progresso_modulo
    FOR UPDATE USING (aluno_id = auth.uid());

CREATE POLICY "progresso_professor_select" ON public.progresso_modulo
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel IN ('professor', 'administrador')
        )
    );

-- --------------------
-- Políticas: simulacoes_phishing
-- --------------------
CREATE POLICY "simulacoes_select_autenticado" ON public.simulacoes_phishing
    FOR SELECT USING (auth.role() = 'authenticated' AND ativo = TRUE);

CREATE POLICY "simulacoes_admin_professor_modificar" ON public.simulacoes_phishing
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel IN ('professor', 'administrador')
        )
    );

-- --------------------
-- Políticas: tentativas_simulacao
-- --------------------
CREATE POLICY "tent_sim_select_proprio" ON public.tentativas_simulacao
    FOR SELECT USING (aluno_id = auth.uid());

CREATE POLICY "tent_sim_insert_proprio" ON public.tentativas_simulacao
    FOR INSERT WITH CHECK (aluno_id = auth.uid());

CREATE POLICY "tent_sim_update_proprio" ON public.tentativas_simulacao
    FOR UPDATE USING (aluno_id = auth.uid());

CREATE POLICY "tent_sim_professor_select" ON public.tentativas_simulacao
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel IN ('professor', 'administrador')
        )
    );

-- --------------------
-- Políticas: badges
-- --------------------
CREATE POLICY "badges_select_todos" ON public.badges
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "badges_admin_modificar" ON public.badges
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel = 'administrador'
        )
    );

-- --------------------
-- Políticas: utilizador_badges
-- --------------------
CREATE POLICY "ubadges_select_proprio" ON public.utilizador_badges
    FOR SELECT USING (utilizador_id = auth.uid());

CREATE POLICY "ubadges_select_professor" ON public.utilizador_badges
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel IN ('professor', 'administrador')
        )
    );

-- --------------------
-- Políticas: notificacoes
-- --------------------
CREATE POLICY "notif_select_proprio" ON public.notificacoes
    FOR SELECT USING (utilizador_id = auth.uid());

CREATE POLICY "notif_update_proprio" ON public.notificacoes
    FOR UPDATE USING (utilizador_id = auth.uid());

-- --------------------
-- Políticas: recursos_pedagogicos
-- --------------------
CREATE POLICY "recursos_select_autenticado" ON public.recursos_pedagogicos
    FOR SELECT USING (auth.role() = 'authenticated' AND visivel = TRUE);

CREATE POLICY "recursos_admin_professor_modificar" ON public.recursos_pedagogicos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel IN ('professor', 'administrador')
        )
    );

-- --------------------
-- Políticas: turma_alunos
-- --------------------
CREATE POLICY "ta_select_proprio" ON public.turma_alunos
    FOR SELECT USING (aluno_id = auth.uid());

CREATE POLICY "ta_professor_select" ON public.turma_alunos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.turmas t
            WHERE t.id = turma_alunos.turma_id AND t.professor_id = auth.uid()
        )
    );

CREATE POLICY "ta_admin_tudo" ON public.turma_alunos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel = 'administrador'
        )
    );

-- --------------------
-- Políticas: turma_modulos
-- --------------------
CREATE POLICY "tm_select_autenticado" ON public.turma_modulos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "tm_professor_modificar" ON public.turma_modulos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.turmas t
            WHERE t.id = turma_modulos.turma_id AND t.professor_id = auth.uid()
        )
    );

CREATE POLICY "tm_admin_tudo" ON public.turma_modulos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.perfis p
            WHERE p.id = auth.uid() AND p.papel = 'administrador'
        )
    );

-- ============================================================
-- VIEWs úteis para o dashboard
-- ============================================================

-- Vista: Leaderboard global (ranking de alunos por pontos)
CREATE VIEW public.v_leaderboard AS
SELECT
    p.id,
    p.nome_completo,
    p.avatar_url,
    p.pontos_total,
    e.nome AS escola,
    RANK() OVER (ORDER BY p.pontos_total DESC) AS posicao_global,
    COUNT(ub.badge_id) AS total_badges
FROM public.perfis p
LEFT JOIN public.escolas e ON e.id = p.escola_id
LEFT JOIN public.utilizador_badges ub ON ub.utilizador_id = p.id
WHERE p.papel = 'aluno' AND p.ativo = TRUE
GROUP BY p.id, p.nome_completo, p.avatar_url, p.pontos_total, e.nome
ORDER BY p.pontos_total DESC;

COMMENT ON VIEW public.v_leaderboard IS 'Ranking global de alunos por pontuação';

-- Vista: Estatísticas de módulos por aluno
CREATE VIEW public.v_progresso_aluno AS
SELECT
    pm.aluno_id,
    p.nome_completo,
    m.id AS modulo_id,
    m.titulo AS modulo,
    pm.percentagem,
    pm.concluido,
    pm.iniciado_em,
    pm.concluido_em
FROM public.progresso_modulo pm
JOIN public.perfis p ON p.id = pm.aluno_id
JOIN public.modulos m ON m.id = pm.modulo_id;

COMMENT ON VIEW public.v_progresso_aluno IS 'Progresso detalhado de cada aluno por módulo';

-- Vista: Estatísticas de turma para professores
CREATE VIEW public.v_stats_turma AS
SELECT
    t.id AS turma_id,
    t.nome AS turma,
    t.professor_id,
    COUNT(DISTINCT ta.aluno_id) AS total_alunos,
    ROUND(AVG(pm.percentagem), 2) AS media_progresso,
    COUNT(DISTINCT pm.modulo_id) AS modulos_em_progresso
FROM public.turmas t
LEFT JOIN public.turma_alunos ta ON ta.turma_id = t.id AND ta.ativo = TRUE
LEFT JOIN public.progresso_modulo pm ON pm.aluno_id = ta.aluno_id
GROUP BY t.id, t.nome, t.professor_id;

COMMENT ON VIEW public.v_stats_turma IS 'Estatísticas agregadas por turma para o painel do professor';

-- Vista: Resultados de simulações de phishing
CREATE VIEW public.v_stats_simulacoes AS
SELECT
    ts.aluno_id,
    p.nome_completo,
    COUNT(*) AS total_simulacoes,
    COUNT(*) FILTER (WHERE ts.estado = 'reportou') AS detectadas,
    COUNT(*) FILTER (WHERE ts.estado = 'clicou') AS clicadas,
    ROUND(
        COUNT(*) FILTER (WHERE ts.estado = 'reportou')::NUMERIC
        / NULLIF(COUNT(*), 0) * 100,
    2) AS taxa_deteccao
FROM public.tentativas_simulacao ts
JOIN public.perfis p ON p.id = ts.aluno_id
GROUP BY ts.aluno_id, p.nome_completo;

COMMENT ON VIEW public.v_stats_simulacoes IS 'Estatísticas de desempenho em simulações de phishing por aluno';
