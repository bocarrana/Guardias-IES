-- ====================================================================
-- CORRECCIÓN DEL ESQUEMA DE LA TABLA "Guardias"
-- Ejecutar en el SQL Editor del proyecto NUEVO ("Guardias IES Aragón")
-- ====================================================================

BEGIN;

-- 1. Eliminar tablas dependientes temporalmente para poder rehacer "Guardias"
DROP TABLE IF EXISTS public."Activity_Logs" CASCADE;
DROP TABLE IF EXISTS public."Guardias" CASCADE;

-- 2. Crear la tabla "Guardias" con el esquema correcto compatible con el código
CREATE TABLE public."Guardias" (
    "ID Guardia" text PRIMARY KEY,
    "Fecha" date NOT NULL,
    "Franja horaria" text REFERENCES public."Franjas horarias"("id franja") ON DELETE CASCADE,
    "Aula" text REFERENCES public."Aulas"("id aulas") ON DELETE SET NULL,
    "Grupo atendido" text REFERENCES public."Grupos"("id grupos") ON DELETE SET NULL,
    "Materia ausente" text REFERENCES public."Materias"("id materias") ON DELETE SET NULL,
    "Profesor ausente" text REFERENCES public."Profesores"(id) ON DELETE CASCADE,
    "Profesor de guardia" text REFERENCES public."Profesores"(id) ON DELETE SET NULL,
    "Estado" text DEFAULT 'Pendiente/disponible' CHECK ("Estado" IN ('Pendiente/disponible', 'Pendiente/asignada', 'Realizada')),
    "Tipo de Guardia" text DEFAULT 'Ordinaria' CHECK ("Tipo de Guardia" IN ('Ordinaria', 'Convivencia', 'Recreo')),
    "Observaciones" text,
    "Tarea dejada" text DEFAULT 'NO' CHECK ("Tarea dejada" IN ('SÍ', 'NO', 'TRUE', 'FALSE')),
    "Archivo de tarea" text
);

-- 3. Volver a crear la tabla "Activity_Logs" referenciando "ID Guardia" como TEXT
CREATE TABLE public."Activity_Logs" (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text REFERENCES public."Profesores"(id) ON DELETE SET NULL,
    action text NOT NULL,
    guard_id text REFERENCES public."Guardias"("ID Guardia") ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Habilitar RLS
ALTER TABLE public."Guardias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Activity_Logs" ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas de acceso RLS
DROP POLICY IF EXISTS "Permitir lectura para todos" ON public."Guardias";
CREATE POLICY "Permitir lectura para todos" ON public."Guardias" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escritura para todos" ON public."Guardias";
CREATE POLICY "Permitir escritura para todos" ON public."Guardias" FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir lectura para todos" ON public."Activity_Logs";
CREATE POLICY "Permitir lectura para todos" ON public."Activity_Logs" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escritura para todos" ON public."Activity_Logs";
CREATE POLICY "Permitir escritura para todos" ON public."Activity_Logs" FOR ALL USING (true);

COMMIT;
