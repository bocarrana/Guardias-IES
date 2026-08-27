
-- Update libre_disposicion policies to allow Admin and Administración, but NOT Jefatura
DROP POLICY IF EXISTS "ld_insert_admin" ON libre_disposicion;
CREATE POLICY "ld_insert_admin" ON libre_disposicion FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1 FROM "Profesores" p WHERE p.user_id = auth.uid() AND p.rol IN ('superadmin', 'Administrador', 'Admin', 'Administración') ));

DROP POLICY IF EXISTS "ld_delete_admin" ON libre_disposicion;
CREATE POLICY "ld_delete_admin" ON libre_disposicion FOR DELETE 
USING (EXISTS ( SELECT 1 FROM "Profesores" p WHERE p.user_id = auth.uid() AND p.rol IN ('superadmin', 'Administrador', 'Admin', 'Administración') ));

-- Update configuracion_centro
DROP POLICY IF EXISTS "cfg_upsert_admin" ON configuracion_centro;
CREATE POLICY "cfg_upsert_admin" ON configuracion_centro FOR ALL 
USING (EXISTS ( SELECT 1 FROM "Profesores" p WHERE p.user_id = auth.uid() AND p.rol IN ('superadmin', 'Administrador', 'Admin', 'Jefatura') ));

