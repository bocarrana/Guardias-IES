-- ====================================================================
-- SCRIPT SQL: CREACIÓN Y POBLACIÓN DEL CALENDARIO ESCOLAR ARAGÓN 2026-2027
-- ====================================================================

-- 1. Crear tabla Calendario si no existe
CREATE TABLE IF NOT EXISTS public."Calendario" (
    "id" BIGSERIAL PRIMARY KEY,
    "fecha" DATE UNIQUE NOT NULL,
    "es_lectivo" BOOLEAN NOT NULL DEFAULT true,
    "descripcion" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar seguridad RLS
ALTER TABLE public."Calendario" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura para todos" ON public."Calendario";
CREATE POLICY "Permitir lectura para todos" ON public."Calendario" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escritura para todos" ON public."Calendario";
CREATE POLICY "Permitir escritura para todos" ON public."Calendario" FOR ALL USING (true);

-- 3. Limpiar fechas previas
TRUNCATE TABLE public."Calendario" CASCADE;

-- 4. Generar todos los días del curso 2026-2027 (1 sept 2026 - 30 junio 2027)
INSERT INTO public."Calendario" ("fecha", "es_lectivo", "descripcion")
SELECT 
    d::date AS fecha,
    CASE 
        -- Fines de semana
        WHEN EXTRACT(DOW FROM d) IN (0, 6) THEN false
        -- Festivos oficiales Aragón 2026-2027
        WHEN d::date = '2026-10-12' THEN false -- Fiesta Nacional de España / Pilar
        WHEN d::date = '2026-11-02' THEN false -- Todos los Santos
        WHEN d::date = '2026-12-07' THEN false -- Constitución
        WHEN d::date = '2026-12-08' THEN false -- Inmaculada Concepción
        WHEN d::date BETWEEN '2026-12-23' AND '2027-01-06' THEN false -- Vacaciones Navidad
        WHEN d::date IN ('2027-02-18', '2027-02-19') THEN false -- Semana Blanca / Carnaval / Provincial Huesca
        WHEN d::date BETWEEN '2027-03-25' AND '2027-04-02' THEN false -- Vacaciones Semana Santa
        WHEN d::date = '2027-04-23' THEN false -- Día de Aragón (San Jorge)
        WHEN d::date = '2027-05-01' THEN false -- Fiesta del Trabajo
        WHEN d::date = '2027-05-03' THEN false -- Festivo Provincial (Huesca/Zaragoza)
        -- Periodos de preparación y trámites
        WHEN d::date < '2026-09-08' THEN false -- Preparación claustro
        WHEN d::date > '2027-06-18' THEN false -- Evaluaciones finales
        ELSE true
    END AS es_lectivo,
    CASE 
        WHEN EXTRACT(DOW FROM d) IN (0, 6) THEN 'Fin de semana'
        WHEN d::date = '2026-10-12' THEN 'Fiesta Nacional de España / El Pilar'
        WHEN d::date = '2026-11-02' THEN 'Lunes siguiente a Todos los Santos'
        WHEN d::date = '2026-12-07' THEN 'Puente de la Constitución'
        WHEN d::date = '2026-12-08' THEN 'Inmaculada Concepción'
        WHEN d::date BETWEEN '2026-12-23' AND '2027-01-06' THEN 'Vacaciones de Navidad'
        WHEN d::date IN ('2027-02-18', '2027-02-19') THEN 'Día no lectivo provincial (Carnaval / Huesca)'
        WHEN d::date BETWEEN '2027-03-25' AND '2027-04-02' THEN 'Vacaciones de Semana Santa'
        WHEN d::date = '2027-04-23' THEN 'Día de Aragón (San Jorge)'
        WHEN d::date = '2027-05-01' THEN 'Fiesta del Trabajo'
        WHEN d::date = '2027-05-03' THEN 'Día no lectivo provincial (Huesca)'
        WHEN d::date < '2026-09-08' THEN 'Inicio de curso profesorado / Preparación'
        WHEN d::date > '2027-06-18' THEN 'Evaluaciones y trámites fin de curso'
        ELSE NULL
    END AS descripcion
FROM generate_series('2026-09-01'::date, '2027-06-30'::date, '1 day'::interval) d;
