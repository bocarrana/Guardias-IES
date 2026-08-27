-- ====================================================================
-- SCRIPT PARA PROGRAMAR EL AUTORESET DIARIO EN SUPABASE (A las 03:00 AM)
-- Ejecutar en el SQL Editor del proyecto NUEVO ("Guardias IES Aragón")
-- ====================================================================

-- 1. Habilitar la extensión de cron en Supabase (si no estuviese ya activa)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Crear la función que limpia y vuelve a sembrar los datos de demo de forma determinista
CREATE OR REPLACE FUNCTION public.reset_and_seed_demo()
RETURNS void AS $$
DECLARE
    d date;
    esLectivo boolean;
    descr text;
    m integer;
    dateNum integer;
    dayOfWeek integer;
    i integer;
    
    -- variables para guardias
    req text;
    cov text;
    s_date date;
    s_slot text;
    s_room text;
    s_sub text;
    s_grp text;
    s_status text;
    s_type text;
    s_task text;
    s_obs text;
    rand_val float;
BEGIN
    -- 1. Limpiar datos anteriores
    DELETE FROM public.calendar_events;
    DELETE FROM public."Guardias";
    DELETE FROM public."Calendario";

    -- 2. Generar días de Calendario (Curso 2025-2026: Sept 2025 a Junio 2026)
    d := '2025-09-01';
    WHILE d <= '2026-06-30' LOOP
        dayOfWeek := extract(dow from d); -- 0 = Domingo, 6 = Sábado
        esLectivo := true;
        descr := null;

        IF dayOfWeek = 0 OR dayOfWeek = 6 THEN
            esLectivo := false;
            descr := 'Fin de semana';
        ELSE
            m := extract(month from d);
            dateNum := extract(day from d);
            
            IF (m = 12 AND dateNum >= 22) OR (m = 1 AND dateNum <= 7) THEN
                esLectivo := false;
                descr := 'Vacaciones de Navidad';
            ELSIF (m = 3 AND dateNum >= 30) OR (m = 4 AND dateNum <= 6) THEN
                esLectivo := false;
                descr := 'Semana Santa';
            ELSIF m = 10 AND dateNum = 12 THEN
                esLectivo := false;
                descr := 'Día del Pilar';
            ELSIF m = 11 AND dateNum = 1 THEN
                esLectivo := false;
                descr := 'Todos los Santos';
            ELSIF m = 12 AND dateNum = 6 THEN
                esLectivo := false;
                descr := 'Día de la Constitución';
            ELSIF m = 12 AND dateNum = 8 THEN
                esLectivo := false;
                descr := 'Día de la Inmaculada';
            ELSIF m = 5 AND dateNum = 1 THEN
                esLectivo := false;
                descr := 'Día del Trabajo';
            ELSIF m = 4 AND dateNum = 23 THEN
                esLectivo := false;
                descr := 'Día de Aragón';
            END IF;
        END IF;

        INSERT INTO public."Calendario" (fecha, es_lectivo, descripcion)
        VALUES (d, esLectivo, descr)
        ON CONFLICT (fecha) DO NOTHING;

        d := d + 1;
    END LOOP;

    -- 3. Generar 150 Guardias aleatorias
    FOR i IN 1..150 LOOP
        -- Seleccionar fecha lectiva aleatoria
        -- 80% en el pasado (antes de mayo 2026), 20% en el futuro
        IF random() < 0.8 THEN
            SELECT fecha INTO s_date FROM public."Calendario" 
            WHERE es_lectivo = true AND fecha < '2026-05-01'
            ORDER BY random() LIMIT 1;
        ELSE
            SELECT fecha INTO s_date FROM public."Calendario" 
            WHERE es_lectivo = true AND fecha >= '2026-05-01'
            ORDER BY random() LIMIT 1;
        END IF;

        -- Seleccionar slots, classrooms, subjects, groups
        SELECT "id franja" INTO s_slot FROM public."Franjas horarias" ORDER BY random() LIMIT 1;
        SELECT "id aulas" INTO s_room FROM public."Aulas" ORDER BY random() LIMIT 1;
        SELECT "id materias" INTO s_sub FROM public."Materias" ORDER BY random() LIMIT 1;
        SELECT "id grupos" INTO s_grp FROM public."Grupos" ORDER BY random() LIMIT 1;

        -- Seleccionar profesor solicitante (excluyendo Pantalla / P087)
        SELECT id INTO req FROM public."Profesores" WHERE rol <> 'Pantalla' AND id <> 'P087' ORDER BY random() LIMIT 1;

        -- Definir estado y profesor de guardia
        cov := null;
        s_type := CASE WHEN random() < 0.85 THEN 'Ordinaria' ELSE (CASE WHEN random() < 0.5 THEN 'Recreo' ELSE 'Convivencia' END) END;

        IF s_date < '2026-05-01' THEN
            s_status := 'Realizada';
            SELECT id INTO cov FROM public."Profesores" WHERE rol <> 'Pantalla' AND id <> 'P087' AND id <> req ORDER BY random() LIMIT 1;
        ELSE
            rand_val := random();
            IF rand_val < 0.5 THEN
                s_status := 'Pendiente/asignada';
                SELECT id INTO cov FROM public."Profesores" WHERE rol <> 'Pantalla' AND id <> 'P087' AND id <> req ORDER BY random() LIMIT 1;
            ELSE
                s_status := 'Pendiente/disponible';
                cov := null;
            END IF;
        END IF;

        s_task := CASE WHEN random() < 0.6 THEN 'SÍ' ELSE 'NO' END;
        s_obs := CASE WHEN s_status = 'Realizada' THEN 'La sesión se desarrolló sin incidencias. Se realizaron las actividades indicadas.' 
                      ELSE (CASE WHEN s_task = 'SÍ' THEN 'Dejo ejercicios de la página 45 a 47 del libro de texto.' ELSE 'Aula de estudio libre.' END) END;

        INSERT INTO public."Guardias" (
            "ID Guardia", "Fecha", "Franja horaria", "Aula", "Grupo atendido", "Materia ausente", 
            "Profesor ausente", "Profesor de guardia", "Estado", "Tipo de Guardia", "Observaciones", "Tarea dejada"
        ) VALUES (
            'G-SIM-' || lpad(i::text, 4, '0'), s_date, s_slot, s_room, s_grp, s_sub, 
            req, cov, s_status, s_type, s_obs, s_task
        ) ON CONFLICT DO NOTHING;
    END LOOP;

    -- 4. Sembrar 5 guardias específicas para el 14 de enero de 2026 (para garantizar live demo day)
    DELETE FROM public."Guardias" WHERE "Fecha" = '2026-01-14';
    
    INSERT INTO public."Guardias" ("ID Guardia", "Fecha", "Franja horaria", "Aula", "Grupo atendido", "Materia ausente", "Profesor ausente", "Profesor de guardia", "Estado", "Tipo de Guardia", "Observaciones", "Tarea dejada")
    VALUES 
        ('G-SPEC-001', '2026-01-14', 'F001', (SELECT "id aulas" FROM public."Aulas" LIMIT 1), (SELECT "id grupos" FROM public."Grupos" LIMIT 1), (SELECT "id materias" FROM public."Materias" LIMIT 1), (SELECT id FROM public."Profesores" OFFSET 1 LIMIT 1), null, 'Pendiente/disponible', 'Ordinaria', 'Por favor, realizar ejercicios de repaso de la unidad 3.', 'SÍ'),
        ('G-SPEC-002', '2026-01-14', 'F002', (SELECT "id aulas" FROM public."Aulas" OFFSET 1 LIMIT 1), (SELECT "id grupos" FROM public."Grupos" OFFSET 1 LIMIT 1), (SELECT "id materias" FROM public."Materias" OFFSET 1 LIMIT 1), (SELECT id FROM public."Profesores" OFFSET 2 LIMIT 1), (SELECT id FROM public."Profesores" OFFSET 3 LIMIT 1), 'Pendiente/asignada', 'Ordinaria', 'Examen programado. Repartir y vigilar.', 'SÍ'),
        ('G-SPEC-003', '2026-01-14', 'F002', (SELECT "id aulas" FROM public."Aulas" OFFSET 2 LIMIT 1), (SELECT "id grupos" FROM public."Grupos" OFFSET 2 LIMIT 1), (SELECT "id materias" FROM public."Materias" OFFSET 2 LIMIT 1), (SELECT id FROM public."Profesores" OFFSET 4 LIMIT 1), null, 'Pendiente/disponible', 'Ordinaria', 'Dejo tarea de lectura en el aula virtual.', 'SÍ'),
        ('G-SPEC-004', '2026-01-14', 'F004', (SELECT "id aulas" FROM public."Aulas" OFFSET 3 LIMIT 1), null, 'M_GUARDIA', (SELECT id FROM public."Profesores" OFFSET 5 LIMIT 1), (SELECT id FROM public."Profesores" OFFSET 6 LIMIT 1), 'Realizada', 'Recreo', 'Vigilancia del patio de bachillerato sin incidencias.', 'NO'),
        ('G-SPEC-005', '2026-01-14', 'F006', (SELECT "id aulas" FROM public."Aulas" OFFSET 4 LIMIT 1), (SELECT "id grupos" FROM public."Grupos" OFFSET 3 LIMIT 1), (SELECT "id materias" FROM public."Materias" OFFSET 3 LIMIT 1), (SELECT id FROM public."Profesores" OFFSET 7 LIMIT 1), (SELECT id FROM public."Profesores" OFFSET 8 LIMIT 1), 'Realizada', 'Ordinaria', 'Desarrollo normal de la sesión.', 'NO');

    -- 5. Insertar eventos de calendario
    INSERT INTO public.calendar_events (date, title, description, category, creator_id)
    VALUES 
        ('2026-01-15', 'Reunión de Evaluación del 1er Trimestre', 'Sesión de evaluación conjunta de todos los departamentos en el salón de actos.', 'Reunión', (SELECT id FROM public."Profesores" LIMIT 1)),
        ('2026-04-23', 'Festividad de San Jorge (Día de Aragón)', 'Día no lectivo oficial en toda la comunidad autónoma.', 'Festivo', (SELECT id FROM public."Profesores" LIMIT 1)),
        ('2026-06-18', 'Claustro de Final de Curso', 'Claustro pedagógico del curso escolar y preparación de memorias.', 'Claustro', (SELECT id FROM public."Profesores" LIMIT 1));

END;
$$ LANGUAGE plpgsql;

-- 3. Programar la tarea usando pg_cron (Todos los días a las 03:00 AM)
-- Nota: La zona horaria por defecto de Supabase es UTC. 03:00 AM de España es aproximadamente 01:00 AM / 02:00 AM UTC.
-- Programamos a la 01:00 AM UTC (que son las 03:00 AM de España en horario de verano).
SELECT cron.schedule(
  'autoreset-daily-demo',      -- Nombre único de la tarea
  '0 1 * * *',                 -- Expresión cron: Todos los días a la 01:00 UTC
  'SELECT public.reset_and_seed_demo();' -- Consulta SQL a ejecutar
);
