-- ============================================================
-- FUNÇÃO: verificar e atribuir badges ao aluno
-- Retorna o número de badges atribuídos nesta chamada
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_verificar_badges(p_aluno_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count       INTEGER;
    v_awarded     INTEGER := 0;
    v_badge_id    UUID;
    v_bonus       INTEGER;
    v_nome        TEXT;
BEGIN
    -- ── Badge 1: "Primeiro Passo" ──────────────────────────────
    -- Critério: concluiu pelo menos 1 módulo
    v_badge_id := 'b1000001-0000-0000-0000-000000000001';
    IF NOT EXISTS (
        SELECT 1 FROM public.utilizador_badges
        WHERE utilizador_id = p_aluno_id AND badge_id = v_badge_id
    ) THEN
        SELECT COUNT(*) INTO v_count
        FROM public.progresso_modulo
        WHERE aluno_id = p_aluno_id AND concluido = TRUE;
        IF v_count >= 1 THEN
            INSERT INTO public.utilizador_badges (utilizador_id, badge_id)
            VALUES (p_aluno_id, v_badge_id);
            PERFORM public.fn_atualizar_pontos(p_aluno_id, 10);
            INSERT INTO public.notificacoes (utilizador_id, titulo, mensagem)
            VALUES (p_aluno_id, '🏅 Badge desbloqueado!',
                    'Conquistaste o badge "Primeiro Passo". +10 pontos bónus!');
            v_awarded := v_awarded + 1;
        END IF;
    END IF;

    -- ── Badge 2: "Detetive Digital" ────────────────────────────
    -- Critério: reportou 5 simulações de phishing
    v_badge_id := 'b1000001-0000-0000-0000-000000000002';
    IF NOT EXISTS (
        SELECT 1 FROM public.utilizador_badges
        WHERE utilizador_id = p_aluno_id AND badge_id = v_badge_id
    ) THEN
        SELECT COUNT(*) INTO v_count
        FROM public.tentativas_simulacao
        WHERE aluno_id = p_aluno_id AND estado = 'reportou';
        IF v_count >= 5 THEN
            INSERT INTO public.utilizador_badges (utilizador_id, badge_id)
            VALUES (p_aluno_id, v_badge_id);
            PERFORM public.fn_atualizar_pontos(p_aluno_id, 25);
            INSERT INTO public.notificacoes (utilizador_id, titulo, mensagem)
            VALUES (p_aluno_id, '🏅 Badge desbloqueado!',
                    'Conquistaste o badge "Detetive Digital". +25 pontos bónus!');
            v_awarded := v_awarded + 1;
        END IF;
    END IF;

    -- ── Badge 3: "Mestre das Passwords" ────────────────────────
    -- Critério: obteve 100% em pelo menos 1 quiz
    v_badge_id := 'b1000001-0000-0000-0000-000000000003';
    IF NOT EXISTS (
        SELECT 1 FROM public.utilizador_badges
        WHERE utilizador_id = p_aluno_id AND badge_id = v_badge_id
    ) THEN
        SELECT COUNT(*) INTO v_count
        FROM public.tentativas_quiz
        WHERE aluno_id = p_aluno_id AND concluido = TRUE AND nota >= 100;
        IF v_count >= 1 THEN
            INSERT INTO public.utilizador_badges (utilizador_id, badge_id)
            VALUES (p_aluno_id, v_badge_id);
            PERFORM public.fn_atualizar_pontos(p_aluno_id, 20);
            INSERT INTO public.notificacoes (utilizador_id, titulo, mensagem)
            VALUES (p_aluno_id, '🏅 Badge desbloqueado!',
                    'Conquistaste o badge "Mestre das Passwords". +20 pontos bónus!');
            v_awarded := v_awarded + 1;
        END IF;
    END IF;

    -- ── Badge 4: "Estudante Dedicado" ──────────────────────────
    -- Critério: concluiu 5 ou mais módulos
    v_badge_id := 'b1000001-0000-0000-0000-000000000004';
    IF NOT EXISTS (
        SELECT 1 FROM public.utilizador_badges
        WHERE utilizador_id = p_aluno_id AND badge_id = v_badge_id
    ) THEN
        SELECT COUNT(*) INTO v_count
        FROM public.progresso_modulo
        WHERE aluno_id = p_aluno_id AND concluido = TRUE;
        IF v_count >= 5 THEN
            INSERT INTO public.utilizador_badges (utilizador_id, badge_id)
            VALUES (p_aluno_id, v_badge_id);
            PERFORM public.fn_atualizar_pontos(p_aluno_id, 50);
            INSERT INTO public.notificacoes (utilizador_id, titulo, mensagem)
            VALUES (p_aluno_id, '🏅 Badge desbloqueado!',
                    'Conquistaste o badge "Estudante Dedicado". +50 pontos bónus!');
            v_awarded := v_awarded + 1;
        END IF;
    END IF;

    -- ── Badge 5: "Especialista em Cibersegurança" ───────────────
    -- Critério: concluiu todos os módulos publicados
    v_badge_id := 'b1000001-0000-0000-0000-000000000005';
    IF NOT EXISTS (
        SELECT 1 FROM public.utilizador_badges
        WHERE utilizador_id = p_aluno_id AND badge_id = v_badge_id
    ) THEN
        SELECT COUNT(*) INTO v_count
        FROM public.progresso_modulo
        WHERE aluno_id = p_aluno_id AND concluido = TRUE;
        IF v_count > 0 AND v_count >= (
            SELECT COUNT(*) FROM public.modulos WHERE estado = 'publicado'
        ) THEN
            INSERT INTO public.utilizador_badges (utilizador_id, badge_id)
            VALUES (p_aluno_id, v_badge_id);
            PERFORM public.fn_atualizar_pontos(p_aluno_id, 100);
            INSERT INTO public.notificacoes (utilizador_id, titulo, mensagem)
            VALUES (p_aluno_id, '🏅 Badge desbloqueado!',
                    'Conquistaste o badge "Especialista em Cibersegurança". +100 pontos bónus!');
            v_awarded := v_awarded + 1;
        END IF;
    END IF;

    -- ── Badge 6: "Quiz Master" ─────────────────────────────────
    -- Critério: obteve 100% em 3 ou mais quizzes
    v_badge_id := 'b1000001-0000-0000-0000-000000000006';
    IF NOT EXISTS (
        SELECT 1 FROM public.utilizador_badges
        WHERE utilizador_id = p_aluno_id AND badge_id = v_badge_id
    ) THEN
        SELECT COUNT(*) INTO v_count
        FROM public.tentativas_quiz
        WHERE aluno_id = p_aluno_id AND concluido = TRUE AND nota >= 100;
        IF v_count >= 3 THEN
            INSERT INTO public.utilizador_badges (utilizador_id, badge_id)
            VALUES (p_aluno_id, v_badge_id);
            PERFORM public.fn_atualizar_pontos(p_aluno_id, 30);
            INSERT INTO public.notificacoes (utilizador_id, titulo, mensagem)
            VALUES (p_aluno_id, '🏅 Badge desbloqueado!',
                    'Conquistaste o badge "Quiz Master". +30 pontos bónus!');
            v_awarded := v_awarded + 1;
        END IF;
    END IF;

    -- ── Badge 7: "Alerta Máximo" ───────────────────────────────
    -- Critério: fez 10 ou mais simulações sem nunca clicar
    v_badge_id := 'b1000001-0000-0000-0000-000000000007';
    IF NOT EXISTS (
        SELECT 1 FROM public.utilizador_badges
        WHERE utilizador_id = p_aluno_id AND badge_id = v_badge_id
    ) THEN
        -- Tem de nunca ter clicado
        SELECT COUNT(*) INTO v_count
        FROM public.tentativas_simulacao
        WHERE aluno_id = p_aluno_id AND estado = 'clicou';
        IF v_count = 0 THEN
            SELECT COUNT(*) INTO v_count
            FROM public.tentativas_simulacao
            WHERE aluno_id = p_aluno_id;
            IF v_count >= 10 THEN
                INSERT INTO public.utilizador_badges (utilizador_id, badge_id)
                VALUES (p_aluno_id, v_badge_id);
                PERFORM public.fn_atualizar_pontos(p_aluno_id, 40);
                INSERT INTO public.notificacoes (utilizador_id, titulo, mensagem)
                VALUES (p_aluno_id, '🏅 Badge desbloqueado!',
                        'Conquistaste o badge "Alerta Máximo". +40 pontos bónus!');
                v_awarded := v_awarded + 1;
            END IF;
        END IF;
    END IF;

    RETURN v_awarded;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.fn_verificar_badges(UUID) TO authenticated;
