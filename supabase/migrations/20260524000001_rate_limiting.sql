-- ============================================================
-- Migração: rate limiting persistente em Postgres
-- ============================================================
-- Move o rate limiter de login/OTP de um Map em memória do Node
-- (frontend/src/lib/auth/rate-limiter.ts) para a base de dados.
--
-- Em ambientes serverless (Vercel, Cloud Run) cada invocação do
-- handler pode correr numa instância nova, pelo que o Map era
-- partilhado por sorte. Aqui ficamos com semântica exata, atómica
-- e à prova de race conditions via `FOR UPDATE`.
--
-- Esquema:
--   - tabela `auth_rate_limits` com 1 linha por chave (IP+email)
--   - função `fn_check_rate_limit` que tenta consumir um slot
--   - função `fn_reset_rate_limit` para limpar após sucesso
--   - função `fn_cleanup_rate_limits` para purgar entradas antigas
-- ============================================================

-- ── Tabela ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
    key             TEXT PRIMARY KEY,
    attempts        INTEGER NOT NULL DEFAULT 0,
    window_start    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_until    TIMESTAMPTZ,
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.auth_rate_limits IS
'Rate limiting de autenticação (login + OTP). Uma linha por chave '
'(tipicamente IP+email). Limpeza oportunista feita em cada chamada '
'a fn_check_rate_limit.';

-- Índice para o cleanup ser eficiente
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_window_start
    ON public.auth_rate_limits (window_start);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_locked_until
    ON public.auth_rate_limits (locked_until)
    WHERE locked_until IS NOT NULL;

-- RLS: a tabela só é acessível via service role (do servidor Next.js).
-- Os clientes nunca lhe tocam diretamente.
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
-- (nenhuma policy adicionada = nada é acessível para anon/authenticated)


-- ============================================================
-- fn_cleanup_rate_limits
-- ============================================================
-- Apaga entradas claramente obsoletas: lockouts expirados E sem
-- atividade recente. Chamada oportunisticamente a partir de
-- fn_check_rate_limit (sem custo extra de cron).
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_cleanup_rate_limits()
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.auth_rate_limits
     WHERE (locked_until IS NULL OR locked_until < NOW())
       AND atualizado_em < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================
-- fn_check_rate_limit
-- ============================================================
-- Tenta consumir um slot. Retorna jsonb com:
--   - allowed: boolean (true se a tentativa pode prosseguir)
--   - attempts_left: int (slots restantes na janela atual)
--   - retry_after_seconds: int (segundos até poder voltar a tentar)
--
-- Parâmetros:
--   p_key                  chave do rate limit (ex: "ip:email")
--   p_max_attempts         tentativas permitidas por janela
--   p_window_seconds       duração da janela em segundos
--   p_lockout_seconds      duração do lockout após esgotar quota
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_check_rate_limit(
    p_key             TEXT,
    p_max_attempts    INTEGER,
    p_window_seconds  INTEGER,
    p_lockout_seconds INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_row              public.auth_rate_limits;
    v_now              TIMESTAMPTZ := NOW();
    v_window_expires   TIMESTAMPTZ;
    v_retry_after_secs INTEGER;
BEGIN
    -- Cleanup oportunista (1% das chamadas para evitar overhead)
    IF random() < 0.01 THEN
        PERFORM public.fn_cleanup_rate_limits();
    END IF;

    -- Buscar a linha existente (lock para evitar race condition)
    SELECT * INTO v_row
      FROM public.auth_rate_limits
     WHERE key = p_key
     FOR UPDATE;

    -- ── Caso 1: lockout ativo ────────────────────────────────
    IF v_row.locked_until IS NOT NULL AND v_row.locked_until > v_now THEN
        v_retry_after_secs := CEIL(EXTRACT(EPOCH FROM (v_row.locked_until - v_now)))::INTEGER;
        RETURN jsonb_build_object(
            'allowed',             false,
            'attempts_left',       0,
            'retry_after_seconds', v_retry_after_secs
        );
    END IF;

    -- ── Caso 2: lockout expirou (apagar e recomeçar) ─────────
    IF v_row.locked_until IS NOT NULL AND v_row.locked_until <= v_now THEN
        DELETE FROM public.auth_rate_limits WHERE key = p_key;
        v_row := NULL;
    END IF;

    -- ── Caso 3: sem registo ou janela expirada (nova janela) ─
    v_window_expires := v_row.window_start + (p_window_seconds || ' seconds')::INTERVAL;

    IF v_row.key IS NULL OR v_window_expires < v_now THEN
        INSERT INTO public.auth_rate_limits (key, attempts, window_start, atualizado_em)
        VALUES (p_key, 1, v_now, v_now)
        ON CONFLICT (key) DO UPDATE SET
            attempts      = 1,
            window_start  = v_now,
            locked_until  = NULL,
            atualizado_em = v_now;

        RETURN jsonb_build_object(
            'allowed',             true,
            'attempts_left',       p_max_attempts - 1,
            'retry_after_seconds', 0
        );
    END IF;

    -- ── Caso 4: já estava no máximo nesta janela ─────────────
    -- (já tinha sido aplicado lockout numa tentativa anterior
    --  mas o Caso 1 não apanhou porque locked_until estava NULL
    --  por algum motivo — defesa em profundidade)
    IF v_row.attempts >= p_max_attempts THEN
        UPDATE public.auth_rate_limits
           SET locked_until  = v_now + (p_lockout_seconds || ' seconds')::INTERVAL,
               atualizado_em = v_now
         WHERE key = p_key;

        RETURN jsonb_build_object(
            'allowed',             false,
            'attempts_left',       0,
            'retry_after_seconds', p_lockout_seconds
        );
    END IF;

    -- ── Caso 5: janela aberta, incrementar ───────────────────
    -- Se esta tentativa for a que ATINGE o máximo, aplica lockout
    -- desde já (impede o ataque "espalhar tentativas para escapar
    -- da janela": uma vez gravado locked_until, o Caso 1 apanha
    -- independentemente do tempo que passe até à próxima).
    IF v_row.attempts + 1 >= p_max_attempts THEN
        UPDATE public.auth_rate_limits
           SET attempts      = v_row.attempts + 1,
               locked_until  = v_now + (p_lockout_seconds || ' seconds')::INTERVAL,
               atualizado_em = v_now
         WHERE key = p_key;

        -- A tentativa atual ainda passa (foi a última permitida),
        -- mas attempts_left = 0 indica que o próximo erro é fatal.
        RETURN jsonb_build_object(
            'allowed',             true,
            'attempts_left',       0,
            'retry_after_seconds', 0
        );
    END IF;

    UPDATE public.auth_rate_limits
       SET attempts      = v_row.attempts + 1,
           atualizado_em = v_now
     WHERE key = p_key;

    RETURN jsonb_build_object(
        'allowed',             true,
        'attempts_left',       p_max_attempts - v_row.attempts - 1,
        'retry_after_seconds', 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.fn_check_rate_limit IS
'Verifica e consome um slot do rate limit para a chave dada. '
'Atómico (usa FOR UPDATE). Devolve JSONB com allowed, attempts_left, '
'retry_after_seconds.';


-- ============================================================
-- fn_reset_rate_limit
-- ============================================================
-- Limpa o contador para uma chave (chamada após sucesso de login).
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_reset_rate_limit(
    p_key TEXT
) RETURNS VOID AS $$
BEGIN
    DELETE FROM public.auth_rate_limits WHERE key = p_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ── Permissões ───────────────────────────────────────────────
-- Apenas o service role chama estas funções. Revogamos do PUBLIC
-- e NÃO concedemos a `authenticated` — o rate limiting acontece
-- ANTES do utilizador estar autenticado, e é o servidor Next.js
-- (com a service-role key) quem invoca.
REVOKE ALL ON FUNCTION public.fn_check_rate_limit(TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_reset_rate_limit(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_cleanup_rate_limits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_check_rate_limit(TEXT, INTEGER, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_reset_rate_limit(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_cleanup_rate_limits() TO service_role;
