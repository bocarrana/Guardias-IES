-- ====================================================================
-- CORRECCIÓN FINAL DEL ESQUEMA "Guardias" CON CONSTRATINS EXPLÍCITOS
-- Ejecutar en el SQL Editor del proyecto NUEVO ("Guardias IES Aragón")
-- ====================================================================

BEGIN;

-- 1. Eliminar tablas dependientes temporalmente para poder rehacer "Guardias"
DROP TABLE IF EXISTS public."Activity_Logs" CASCADE;
DROP TABLE IF EXISTS public."Guardias" CASCADE;

-- 2. Crear la tabla "Guardias" con nombres de foreign keys explícitos requeridos por el frontend
CREATE TABLE public."Guardias" (
    "ID Guardia" text PRIMARY KEY,
    "Fecha" date NOT NULL,
    "Franja horaria" text,
    "Aula" text,
    "Grupo atendido" text,
    "Materia ausente" text,
    "Profesor ausente" text,
    "Profesor de guardia" text,
    "Estado" text DEFAULT 'Pendiente/disponible' CHECK ("Estado" IN ('Pendiente/disponible', 'Pendiente/asignada', 'Realizada')),
    "Tipo de Guardia" text DEFAULT 'Ordinaria' CHECK ("Tipo de Guardia" IN ('Ordinaria', 'Convivencia', 'Recreo')),
    "Observaciones" text,
    "Tarea dejada" text DEFAULT 'NO' CHECK ("Tarea dejada" IN ('SÍ', 'NO', 'TRUE', 'FALSE')),
    "Archivo de tarea" text,

    -- Restricciones de Clave Foránea con nombres EXACTOS solicitados por el frontend
    CONSTRAINT "Guardias_Franja horaria_fkey" FOREIGN KEY ("Franja horaria") 
        REFERENCES public."Franjas horarias"("id franja") ON DELETE CASCADE,
        
    CONSTRAINT "Guardias_Aula_fkey" FOREIGN KEY ("Aula") 
        REFERENCES public."Aulas"("id aulas") ON DELETE SET NULL,
        
    CONSTRAINT "Guardias_Grupo atendido_fkey" FOREIGN KEY ("Grupo atendido") 
        REFERENCES public."Grupos"("id grupos") ON DELETE SET NULL,
        
    CONSTRAINT "Guardias_Materia ausente_fkey" FOREIGN KEY ("Materia ausente") 
        REFERENCES public."Materias"("id materias") ON DELETE SET NULL,
        
    CONSTRAINT "Guardias_Profesor ausente_fkey1" FOREIGN KEY ("Profesor ausente") 
        REFERENCES public."Profesores"(id) ON DELETE CASCADE,
        
    CONSTRAINT "Guardias_Profesor de guardia_fkey" FOREIGN KEY ("Profesor de guardia") 
        REFERENCES public."Profesores"(id) ON DELETE SET NULL
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
