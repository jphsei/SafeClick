-- ============================================================
-- Notificação ao professor quando um aluno entra na turma
-- via código de acesso
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_inscrever_por_codigo(p_codigo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turma_id      UUID;
  v_turma_nome    TEXT;
  v_professor_id  UUID;
  v_aluno_nome    TEXT;
  v_ja_inscrito   BOOLEAN;
BEGIN
  SELECT t.id, t.nome, t.professor_id
  INTO   v_turma_id, v_turma_nome, v_professor_id
  FROM   public.turmas t
  WHERE  UPPER(t.codigo_acesso) = UPPER(TRIM(p_codigo))
    AND  t.ativo = TRUE
    AND  (t.codigo_expira_em IS NULL OR t.codigo_expira_em > NOW());

  IF v_turma_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Código inválido ou expirado. Pede um novo ao teu professor.');
  END IF;

  -- Verificar se já estava inscrito (para não duplicar notificação)
  SELECT EXISTS(
    SELECT 1 FROM public.turma_alunos
    WHERE turma_id = v_turma_id AND aluno_id = auth.uid() AND ativo = TRUE
  ) INTO v_ja_inscrito;

  INSERT INTO public.turma_alunos (turma_id, aluno_id, ativo)
  VALUES (v_turma_id, auth.uid(), TRUE)
  ON CONFLICT (turma_id, aluno_id)
  DO UPDATE SET ativo = TRUE;

  -- Notificar o professor (só se for uma nova inscrição)
  IF NOT v_ja_inscrito THEN
    SELECT nome_completo INTO v_aluno_nome
    FROM public.perfis WHERE id = auth.uid();

    INSERT INTO public.notificacoes (utilizador_id, titulo, mensagem, tipo, url_destino)
    VALUES (
      v_professor_id,
      'Novo aluno na turma',
      v_aluno_nome || ' entrou na turma "' || v_turma_nome || '".',
      'info',
      '/professor/turmas/' || v_turma_id::TEXT
    );
  END IF;

  RETURN jsonb_build_object(
    'ok',         true,
    'turma_id',   v_turma_id,
    'turma_nome', v_turma_nome
  );
END;
$$;
