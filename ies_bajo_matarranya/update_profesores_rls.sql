-- ====================================================================
-- MIGRATION: Update RLS Policies & Trigger for public."Profesores"
-- ====================================================================

-- 1. Ensure RLS is active
ALTER TABLE public."Profesores" ENABLE ROW LEVEL SECURITY;

-- 2. Drop legacy or conflicting policies
DROP POLICY IF EXISTS "Superadmin_Manage_All" ON public."Profesores";
DROP POLICY IF EXISTS "Update own profile" ON public."Profesores";
DROP POLICY IF EXISTS "permitir_insert_admin_jefatura" ON public."Profesores";
DROP POLICY IF EXISTS "permitir_update_admin_jefatura" ON public."Profesores";
DROP POLICY IF EXISTS "permitir_delete_admin_jefatura" ON public."Profesores";
DROP POLICY IF EXISTS "Auth Read Profesores" ON public."Profesores";

-- 3. Create SELECT policy (anyone from the school domain can view teachers)
CREATE POLICY "Auth Read Profesores" ON public."Profesores"
FOR SELECT TO authenticated
USING (
    ((auth.jwt() ->> 'email'::text) ~~* '%@iesreyescatolicos.com'::text)
);

-- 4. Create INSERT policy (Admin, superadmin, Jefatura, and Administrador can create teacher profiles)
CREATE POLICY "permitir_insert_admin_jefatura" ON public."Profesores"
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public."Profesores" p
        WHERE (p.user_id = auth.uid() OR lower(p.email) = lower(auth.jwt() ->> 'email'))
        AND p.rol = ANY (ARRAY['superadmin'::"Tipos de usuarios", 'Administrador'::"Tipos de usuarios", 'Admin'::"Tipos de usuarios", 'Jefatura'::"Tipos de usuarios"])
    )
);

-- 5. Create UPDATE policy (users can update their own profile, OR Admin/Jefatura/Administrador can update any profile)
CREATE POLICY "permitir_update_admin_jefatura" ON public."Profesores"
FOR UPDATE TO authenticated
USING (
    (email = (auth.jwt() ->> 'email'::text)) OR
    EXISTS (
        SELECT 1 FROM public."Profesores" p
        WHERE (p.user_id = auth.uid() OR lower(p.email) = lower(auth.jwt() ->> 'email'))
        AND p.rol = ANY (ARRAY['superadmin'::"Tipos de usuarios", 'Administrador'::"Tipos de usuarios", 'Admin'::"Tipos de usuarios", 'Jefatura'::"Tipos de usuarios"])
    )
)
WITH CHECK (
    (email = (auth.jwt() ->> 'email'::text)) OR
    EXISTS (
        SELECT 1 FROM public."Profesores" p
        WHERE (p.user_id = auth.uid() OR lower(p.email) = lower(auth.jwt() ->> 'email'))
        AND p.rol = ANY (ARRAY['superadmin'::"Tipos de usuarios", 'Administrador'::"Tipos de usuarios", 'Admin'::"Tipos de usuarios", 'Jefatura'::"Tipos de usuarios"])
    )
);

-- 6. Create DELETE policy (Admin, superadmin, Jefatura, and Administrador can delete teacher profiles)
CREATE POLICY "permitir_delete_admin_jefatura" ON public."Profesores"
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public."Profesores" p
        WHERE (p.user_id = auth.uid() OR lower(p.email) = lower(auth.jwt() ->> 'email'))
        AND p.rol = ANY (ARRAY['superadmin'::"Tipos de usuarios", 'Administrador'::"Tipos de usuarios", 'Admin'::"Tipos de usuarios", 'Jefatura'::"Tipos de usuarios"])
    )
);

-- 7. Update the check_profesor_update trigger function to allow roles to be changed by Admins and Jefatura study leaders
CREATE OR REPLACE FUNCTION public.check_profesor_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF TG_OP IS NULL THEN RAISE EXCEPTION 'Solo para triggers'; END IF;
  -- If rol is changed, only Admin, superadmin, Jefatura, or Administrador can do it
  IF NEW.rol IS DISTINCT FROM OLD.rol THEN
    IF NOT EXISTS (
      SELECT 1 FROM public."Profesores" p
      WHERE (p.user_id = auth.uid() OR lower(p.email) = lower(current_setting('request.jwt.claims', true)::jsonb ->> 'email'))
      AND p.rol = ANY (ARRAY['superadmin'::"Tipos de usuarios", 'Administrador'::"Tipos de usuarios", 'Admin'::"Tipos de usuarios", 'Jefatura'::"Tipos de usuarios"])
    ) THEN
      RAISE EXCEPTION 'Only Admins and Jefatura study leaders can change roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
