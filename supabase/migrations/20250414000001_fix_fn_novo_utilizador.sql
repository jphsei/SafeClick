-- Corrige fn_novo_utilizador para incluir numero_aluno do user_metadata
CREATE OR REPLACE FUNCTION public.fn_novo_utilizador()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfis (id, nome_completo, email, papel, numero_aluno)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(
            (NEW.raw_user_meta_data->>'papel')::public.papel_utilizador,
            'aluno'::public.papel_utilizador
        ),
        NEW.raw_user_meta_data->>'numero_aluno'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
