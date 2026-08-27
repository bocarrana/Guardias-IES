-- ====================================================================
-- SCRIPT DE MIGRACIÓN: CREACIÓN DE TABLAS DE CALENDARIO Y EVENTOS
-- Ejecutar este script en el SQL Editor de tu proyecto "Guardias IES Aragón"
-- ====================================================================

BEGIN;

-- 1. Tabla: Calendario
CREATE TABLE IF NOT EXISTS public."Calendario" (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    fecha date UNIQUE NOT NULL,
    es_lectivo boolean DEFAULT true NOT NULL,
    descripcion text
);

-- 2. Tabla: calendar_events
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date date NOT NULL,
    title text NOT NULL,
    description text,
    file_url text,
    creator_id text REFERENCES public."Profesores"(id) ON DELETE CASCADE,
    category text DEFAULT 'General' NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Habilitar RLS en las tablas
ALTER TABLE public."Calendario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas de acceso RLS
DROP POLICY IF EXISTS "Permitir lectura para todos" ON public."Calendario";
CREATE POLICY "Permitir lectura para todos" ON public."Calendario" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escritura para todos" ON public."Calendario";
CREATE POLICY "Permitir escritura para todos" ON public."Calendario" FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir lectura para todos" ON public.calendar_events;
CREATE POLICY "Permitir lectura para todos" ON public.calendar_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escritura para todos" ON public.calendar_events;
CREATE POLICY "Permitir escritura para todos" ON public.calendar_events FOR ALL USING (true);

COMMIT;
