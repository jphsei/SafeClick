-- Fix infinite recursion in perfis RLS policies
-- The policies "perfis_select_escola" and "perfis_admin_tudo" query the perfis table
-- from within policies ON the perfis table, causing infinite recursion.
-- Fix: use SECURITY DEFINER functions that bypass RLS.

CREATE OR REPLACE FUNCTION public.fn_get_user_papel()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT papel::text FROM public.perfis WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.fn_get_user_escola_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT escola_id FROM public.perfis WHERE id = auth.uid();
$$;

-- Drop the recursive policies
DROP POLICY IF EXISTS "perfis_select_escola" ON public.perfis;
DROP POLICY IF EXISTS "perfis_admin_tudo" ON public.perfis;

-- Recreate without recursion using the SECURITY DEFINER functions
CREATE POLICY "perfis_select_escola" ON public.perfis
    FOR SELECT USING (
        fn_get_user_papel() IN ('professor', 'administrador')
        AND escola_id = fn_get_user_escola_id()
    );

CREATE POLICY "perfis_admin_tudo" ON public.perfis
    FOR ALL USING (
        fn_get_user_papel() = 'administrador'
    );
