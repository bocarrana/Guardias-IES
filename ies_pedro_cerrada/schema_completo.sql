-- ====================================================================
-- SCRIPT DE INICIALIZACIÓN COMPLETO: CREACIÓN DE TABLAS Y SEMILLA DE DATOS (IES ARAGÓN)
-- ====================================================================

-- Habilitar extensión uuid-ossp si no está activa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- 1. Crear Tipo de Datos de Usuarios si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Tipos de usuarios') THEN
        CREATE TYPE "Tipos de usuarios" AS ENUM ('superadmin', 'Administrador', 'Admin', 'Jefatura', 'Administración', 'Docente', 'Usuario', 'Pantalla');
    END IF;
END $$;

-- 2. Creación de Tablas Principales

-- Tabla: Profesores
CREATE TABLE IF NOT EXISTS public."Profesores" (
    id text PRIMARY KEY,
    "nombre y apellidos" text NOT NULL,
    email text UNIQUE,
    departamento text,
    "grupo de guardia" text,
    foto text,
    avatar_seed text,
    rol text DEFAULT 'Usuario',
    user_id uuid,
    horas_guardia integer DEFAULT 1,
    activo boolean DEFAULT true
);

-- Tabla: Franjas horarias
CREATE TABLE IF NOT EXISTS public."Franjas horarias" (
    "id franja" text PRIMARY KEY,
    franja text,
    "hora inicio" text,
    "hora fin" text,
    tipo text
);

-- Tabla: Aulas
CREATE TABLE IF NOT EXISTS public."Aulas" (
    "id aulas" text PRIMARY KEY,
    aulas text UNIQUE NOT NULL,
    edificio text,
    ubicacion text
);

-- Tabla: Materias
CREATE TABLE IF NOT EXISTS public."Materias" (
    "id materias" text PRIMARY KEY,
    materias text UNIQUE NOT NULL,
    padre_id text
);

-- Tabla: Grupos
CREATE TABLE IF NOT EXISTS public."Grupos" (
    "id grupos" text PRIMARY KEY,
    grupos text UNIQUE NOT NULL,
    nivel_educativo text
);

-- Tabla: Grupos_Guardia
CREATE TABLE IF NOT EXISTS public."Grupos_Guardia" (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profesor_id text REFERENCES public."Profesores"(id) ON DELETE CASCADE,
    dia_semana text NOT NULL CHECK (dia_semana IN ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes')),
    franja_id text REFERENCES public."Franjas horarias"("id franja") ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(profesor_id, dia_semana, franja_id)
);

-- Tabla: Horario_Personal
CREATE TABLE IF NOT EXISTS public."Horario_Personal" (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profesor_id text REFERENCES public."Profesores"(id) ON DELETE CASCADE,
    dia_semana text NOT NULL CHECK (dia_semana IN ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes')),
    franja_id text REFERENCES public."Franjas horarias"("id franja") ON DELETE CASCADE,
    materia_id text REFERENCES public."Materias"("id materias") ON DELETE SET NULL,
    grupo_id text REFERENCES public."Grupos"("id grupos") ON DELETE SET NULL,
    aula_id text REFERENCES public."Aulas"("id aulas") ON DELETE SET NULL,
    tipo text CHECK (tipo IN ('Lectivo', 'Guardia')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: Guardias
CREATE TABLE IF NOT EXISTS public."Guardias" (
    "ID Guardia" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "Fecha" date NOT NULL,
    "Tramo Horario" text REFERENCES public."Franjas horarias"("id franja") ON DELETE CASCADE,
    "Aula" text REFERENCES public."Aulas"("id aulas") ON DELETE SET NULL,
    "Grupo" text REFERENCES public."Grupos"("id grupos") ON DELETE SET NULL,
    "Materia" text REFERENCES public."Materias"("id materias") ON DELETE SET NULL,
    "Profesor Solicitante" text REFERENCES public."Profesores"(id) ON DELETE CASCADE,
    "Profesor Guardias" text REFERENCES public."Profesores"(id) ON DELETE SET NULL,
    "Estado" text DEFAULT 'Pendiente/disponible' CHECK ("Estado" IN ('Pendiente/disponible', 'Pendiente/asignada', 'Realizada')),
    "Tipo Guardias" text DEFAULT 'Ordinaria' CHECK ("Tipo Guardias" IN ('Ordinaria', 'Convivencia', 'Recreo')),
    "Observaciones" text,
    "Tiene Tarea" text DEFAULT 'NO' CHECK ("Tiene Tarea" IN ('SÍ', 'NO')),
    archivo_tarea_url text
);

-- Tabla: Activity_Logs
CREATE TABLE IF NOT EXISTS public."Activity_Logs" (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text REFERENCES public."Profesores"(id) ON DELETE SET NULL,
    action text NOT NULL,
    guard_id uuid REFERENCES public."Guardias"("ID Guardia") ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabla: reservas_aulas
CREATE TABLE IF NOT EXISTS public."reservas_aulas" (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    aula_id text REFERENCES public."Aulas"("id aulas") ON DELETE CASCADE,
    profesor_id text REFERENCES public."Profesores"(id) ON DELETE CASCADE,
    fecha date NOT NULL,
    tramo_horario text REFERENCES public."Franjas horarias"("id franja") ON DELETE CASCADE,
    motivo text,
    anual boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Tabla: libre_disposicion
CREATE TABLE IF NOT EXISTS public."libre_disposicion" (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    profesor_id text REFERENCES public."Profesores"(id) ON DELETE CASCADE,
    fecha date NOT NULL,
    motivo text,
    created_at timestamp with time zone DEFAULT now()
);

-- Tabla: configuracion_centro
CREATE TABLE IF NOT EXISTS public."configuracion_centro" (
    id integer PRIMARY KEY,
    nombre_centro text,
    direccion_centro text,
    telefono_centro text,
    email_centro text,
    logo_url text
);

-- 3. Limpieza de datos previos (por si se re-ejecuta en una base de datos con tablas existentes)
TRUNCATE TABLE "Activity_Logs" CASCADE;
TRUNCATE TABLE "Guardias" CASCADE;
TRUNCATE TABLE "Horario_Personal" CASCADE;
TRUNCATE TABLE "Grupos_Guardia" CASCADE;
TRUNCATE TABLE "reservas_aulas" CASCADE;
TRUNCATE TABLE "libre_disposicion" CASCADE;
TRUNCATE TABLE "configuracion_centro" CASCADE;
DELETE FROM "Profesores";

-- 4. Inserción de Profesores Mock (85 usuarios de pruebas con perfiles variados y dominio @educa.aragon.es)
-- Cuenta Administrador principal de pruebas
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia, activo) 
VALUES ('P001', 'Alberto Planas (Pruebas)', 'alplanast@educa.aragon.es', 'INFORMÁTICA', 'Admin', 1, true);

-- Profesorado de distintos departamentos
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P002', 'Pilar Moreno Blanco', 'pilar.morenob002@educa.aragon.es', 'AGRARIAS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P003', 'David Torres Rodríguez', 'david.torresr003@educa.aragon.es', 'AGRARIAS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P004', 'Miguel Molina Muñoz', 'miguel.molinam004@educa.aragon.es', 'AGRARIAS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P005', 'Tomás Ortega Molina', 'tomas.ortegam005@educa.aragon.es', 'AGRARIAS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P006', 'Sandra Martínez López', 'sandra.martinezl006@educa.aragon.es', 'AGRARIAS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P007', 'Pablo Hernández Romero', 'pablo.hernandezr007@educa.aragon.es', 'AGRARIAS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P008', 'Julia Gutiérrez Suárez', 'julia.gutierrezs008@educa.aragon.es', 'ARTES PLÁSTICAS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P009', 'Ana Blanco Sánchez', 'ana.blancos009@educa.aragon.es', 'ARTES PLÁSTICAS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P010', 'Antonio Peña Gutiérrez', 'antonio.penag010@educa.aragon.es', 'BIOLOGÍA Y GEOLOGÍA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P011', 'Jaime Fernández Delgado', 'jaime.fernandezd011@educa.aragon.es', 'BIOLOGÍA Y GEOLOGÍA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P012', 'Francisco Jiménez Gómez', 'francisco.jimenezg012@educa.aragon.es', 'BIOLOGÍA Y GEOLOGÍA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P013', 'Inés Romero Torres', 'ines.romerot013@educa.aragon.es', 'BIOLOGÍA Y GEOLOGÍA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P014', 'Eva Vázquez Castillo', 'eva.vazquezc014@educa.aragon.es', 'BIOLOGÍA Y GEOLOGÍA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P015', 'Virginia Ortiz Jiménez', 'virginia.ortizj015@educa.aragon.es', 'ECONOMÍA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P016', 'Agustín González Ramos', 'agustin.gonzalezr016@educa.aragon.es', 'ECONOMÍA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P017', 'Víctor Gómez Rubio', 'victor.gomezr017@educa.aragon.es', 'EDUCACIÓN FÍSICA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P018', 'Manuel Muñoz Hernández', 'manuel.munozh018@educa.aragon.es', 'EDUCACIÓN FÍSICA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P019', 'José Domínguez Serrano', 'jose.dominguezs019@educa.aragon.es', 'EDUCACIÓN FÍSICA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P020', 'Luis Morales González', 'luis.moralesg020@educa.aragon.es', 'EDUCACIÓN FÍSICA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P021', 'Ángel Rubio Moreno', 'angel.rubiom021@educa.aragon.es', 'EDUCACIÓN FÍSICA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P022', 'Daniel Sánchez Castro', 'daniel.sanchezc022@educa.aragon.es', 'EDUCACIÓN FÍSICA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P023', 'Beatriz Díaz Fernández', 'beatriz.diazf023@educa.aragon.es', 'FILOSOFÍA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P024', 'Miriam Navarro Álvarez', 'miriam.navarroa024@educa.aragon.es', 'FILOSOFÍA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P025', 'Carolina Castro Morales', 'carolina.castrom025@educa.aragon.es', 'FOL', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P026', 'Conchi Castillo Martínez', 'conchi.castillom026@educa.aragon.es', 'FRANCÉS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P027', 'Esther López Alonso', 'esther.lopeza027@educa.aragon.es', 'FRANCÉS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P028', 'Santiago Ruiz Ortiz', 'santiago.ruizo028@educa.aragon.es', 'FRANCÉS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P029', 'Juan Alonso Pérez', 'juan.alonsop029@educa.aragon.es', 'FRANCÉS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P030', 'Carlos Serrano Navarro', 'carlos.serranon030@educa.aragon.es', 'FÍSICA Y QUÍMICA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P031', 'Carmen Delgado Peña', 'carmen.delgadop031@educa.aragon.es', 'FÍSICA Y QUÍMICA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P032', 'David Rodríguez Martín', 'david.rodriguezm032@educa.aragon.es', 'FÍSICA Y QUÍMICA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P033', 'Miguel Martín Domínguez', 'miguel.martind033@educa.aragon.es', 'GEOGRAFÍA E HISTORIA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P034', 'Marta Álvarez Ortega', 'marta.alvarezo034@educa.aragon.es', 'GEOGRAFÍA E HISTORIA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P035', 'Óscar Ramos Ruiz', 'oscar.ramosr035@educa.aragon.es', 'GEOGRAFÍA E HISTORIA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P036', 'Pablo Suárez Vázquez', 'pablo.suarezv036@educa.aragon.es', 'GEOGRAFÍA E HISTORIA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P037', 'Laura García García', 'laura.garciag037@educa.aragon.es', 'GEOGRAFÍA E HISTORIA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P038', 'Pilar Pérez Díaz', 'pilar.perezd038@educa.aragon.es', 'INGLÉS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P039', 'Teresa Moreno Blanco', 'teresa.morenob039@educa.aragon.es', 'INGLÉS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P040', 'Marisa Torres Rodríguez', 'marisa.torresr040@educa.aragon.es', 'INGLÉS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P041', 'Irene Molina Muñoz', 'irene.molinam041@educa.aragon.es', 'INGLÉS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P042', 'Sandra Ortega Molina', 'sandra.ortegam042@educa.aragon.es', 'INGLÉS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P043', 'Anabel Martínez López', 'anabel.martinezl043@educa.aragon.es', 'INGLÉS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P044', 'Julia Hernández Romero', 'julia.hernandezr044@educa.aragon.es', 'INGLÉS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P045', 'Ana Gutiérrez Suárez', 'ana.gutierrezs045@educa.aragon.es', 'INGLÉS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P046', 'Víctor Blanco Sánchez', 'victor.blancos046@educa.aragon.es', 'LATÍN Y GRIEGO', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P047', 'María Peña Gutiérrez', 'maria.penag047@educa.aragon.es', 'LENGUA Y LITERATURA CASTELLANA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P048', 'José Fernández Delgado', 'jose.fernandezd048@educa.aragon.es', 'LENGUA Y LITERATURA CASTELLANA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P049', 'Inés Jiménez Gómez', 'ines.jimenezg049@educa.aragon.es', 'LENGUA Y LITERATURA CASTELLANA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P050', 'Eva Romero Torres', 'eva.romerot050@educa.aragon.es', 'LENGUA Y LITERATURA CASTELLANA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P051', 'Daniel Vázquez Castillo', 'daniel.vazquezc051@educa.aragon.es', 'LENGUA Y LITERATURA CASTELLANA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P052', 'Fernando Ortiz Jiménez', 'fernando.ortizj052@educa.aragon.es', 'LENGUA Y LITERATURA CASTELLANA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P053', 'Adriana González Ramos', 'adriana.gonzalezr053@educa.aragon.es', 'LENGUA Y LITERATURA CASTELLANA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P054', 'Pedro Gómez Rubio', 'pedro.gomezr054@educa.aragon.es', 'LENGUA Y LITERATURA CASTELLANA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P055', 'Alberto Muñoz Hernández', 'alberto.munozh055@educa.aragon.es', 'LENGUA Y LITERATURA CASTELLANA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P056', 'Diana Domínguez Serrano', 'diana.dominguezs056@educa.aragon.es', 'MATEMÁTICAS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P057', 'Santiago Morales González', 'santiago.moralesg057@educa.aragon.es', 'MATEMÁTICAS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P058', 'Juan Rubio Moreno', 'juan.rubiom058@educa.aragon.es', 'MATEMÁTICAS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P059', 'Carlos Sánchez Castro', 'carlos.sanchezc059@educa.aragon.es', 'MATEMÁTICAS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P060', 'Javier Díaz Fernández', 'javier.diazf060@educa.aragon.es', 'MATEMÁTICAS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P061', 'Carolina Navarro Álvarez', 'carolina.navarroa061@educa.aragon.es', 'MATEMÁTICAS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P062', 'Miguel Castro Morales', 'miguel.castrom062@educa.aragon.es', 'MATEMÁTICAS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P063', 'Tomás Castillo Martínez', 'tomas.castillom063@educa.aragon.es', 'MATEMÁTICAS', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P064', 'Idoia López Alonso', 'idoia.lopeza064@educa.aragon.es', 'MÚSICA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P065', 'Pablo Ruiz Ortiz', 'pablo.ruizo065@educa.aragon.es', 'MÚSICA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P066', 'Elena Alonso Pérez', 'elena.alonsop066@educa.aragon.es', 'MÚSICA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P067', 'Jesús Serrano Navarro', 'jesus.serranon067@educa.aragon.es', 'ORIENTACIÓN', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P068', 'Isabel Delgado Peña', 'isabel.delgadop068@educa.aragon.es', 'ORIENTACIÓN', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P069', 'Lucía Rodríguez Martín', 'lucia.rodriguezm069@educa.aragon.es', 'ORIENTACIÓN', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P070', 'Marta Martín Domínguez', 'marta.martind070@educa.aragon.es', 'ORIENTACIÓN', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P071', 'Gonzalo Álvarez Ortega', 'gonzalo.alvarezo071@educa.aragon.es', 'RELIGIÓN', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P072', 'Natalia Ramos Ruiz', 'natalia.ramosr072@educa.aragon.es', 'SERVICIOS A LA COMUNIDAD', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P073', 'Alejandro Suárez Vázquez', 'alejandro.suarezv073@educa.aragon.es', 'SERVICIOS A LA COMUNIDAD', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P074', 'Pilar García García', 'pilar.garciag074@educa.aragon.es', 'SERVICIOS A LA COMUNIDAD', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P075', 'Víctor Pérez Díaz', 'victor.perezd075@educa.aragon.es', 'SERVICIOS A LA COMUNIDAD', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P076', 'Marisa Moreno Blanco', 'marisa.morenob076@educa.aragon.es', 'SERVICIOS A LA COMUNIDAD', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P077', 'José Torres Rodríguez', 'jose.torresr077@educa.aragon.es', 'SERVICIOS A LA COMUNIDAD', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P078', 'Luis Molina Muñoz', 'luis.molinam078@educa.aragon.es', 'PROCEDIMIENTOS SANITARIOS Y ASISTENCIALES', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P079', 'Anabel Ortega Molina', 'anabel.ortegam079@educa.aragon.es', 'TECNOLOGÍA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P080', 'Julia Martínez López', 'julia.martinezl080@educa.aragon.es', 'TECNOLOGÍA', 'Usuario', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P081', 'Ana Hernández Romero', 'ana.hernandezr081@educa.aragon.es', 'TECNOLOGÍA', 'Usuario', 1);

-- Roles especiales de Administración y Dirección
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P082', 'Rafael Gutiérrez Suárez', 'rafael.gutierrezs082@educa.aragon.es', 'PERSONAL ADMINISTRACIÓN', 'Administración', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P083', 'María Blanco Sánchez', 'maria.blancos083@educa.aragon.es', 'PERSONAL ADMINISTRACIÓN', 'Administración', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P084', 'Alberto Peña Gutiérrez', 'alberto.penag084@educa.aragon.es', 'EQUIPO DIRECTIVO', 'Jefatura', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P085', 'Ramón Fernández Delgado', 'ramon.fernandezd085@educa.aragon.es', 'EQUIPO DIRECTIVO', 'Jefatura', 1);
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P086', 'Santiago Jiménez Gómez', 'santiago.jimenezg086@educa.aragon.es', 'EQUIPO DIRECTIVO', 'Jefatura', 1);

-- Pantalla de pasillo (Display)
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P087', 'Juan Romero Torres', 'juan.romerot087@educa.aragon.es', 'TECNOLOGÍA', 'Pantalla', 1);

-- Usuario Demo para Jefatura de Estudios
INSERT INTO "Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia) VALUES ('P088', 'Jefe de Estudios (Demo)', 'usuariodemo@educa.aragon.es', 'EQUIPO DIRECTIVO', 'Jefatura', 1);

-- 5. Habilitar RLS en las tablas
ALTER TABLE public."Profesores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Franjas horarias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Aulas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Materias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Grupos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Grupos_Guardia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Horario_Personal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Guardias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Activity_Logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."reservas_aulas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."libre_disposicion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."configuracion_centro" ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas RLS básicas para acceso público/autenticado en demostración
CREATE POLICY "Permitir lectura para todos" ON public."Profesores" FOR SELECT USING (true);
CREATE POLICY "Permitir escritura para todos" ON public."Profesores" FOR ALL USING (true);

CREATE POLICY "Permitir lectura para todos" ON public."Franjas horarias" FOR SELECT USING (true);
CREATE POLICY "Permitir escritura para todos" ON public."Franjas horarias" FOR ALL USING (true);

CREATE POLICY "Permitir lectura para todos" ON public."Aulas" FOR SELECT USING (true);
CREATE POLICY "Permitir escritura para todos" ON public."Aulas" FOR ALL USING (true);

CREATE POLICY "Permitir lectura para todos" ON public."Materias" FOR SELECT USING (true);
CREATE POLICY "Permitir escritura para todos" ON public."Materias" FOR ALL USING (true);

CREATE POLICY "Permitir lectura para todos" ON public."Grupos" FOR SELECT USING (true);
CREATE POLICY "Permitir escritura para todos" ON public."Grupos" FOR ALL USING (true);

CREATE POLICY "Permitir lectura para todos" ON public."Grupos_Guardia" FOR SELECT USING (true);
CREATE POLICY "Permitir escritura para todos" ON public."Grupos_Guardia" FOR ALL USING (true);

CREATE POLICY "Permitir lectura para todos" ON public."Horario_Personal" FOR SELECT USING (true);
CREATE POLICY "Permitir escritura para todos" ON public."Horario_Personal" FOR ALL USING (true);

CREATE POLICY "Permitir lectura para todos" ON public."Guardias" FOR SELECT USING (true);
CREATE POLICY "Permitir escritura para todos" ON public."Guardias" FOR ALL USING (true);

CREATE POLICY "Permitir lectura para todos" ON public."Activity_Logs" FOR SELECT USING (true);
CREATE POLICY "Permitir escritura para todos" ON public."Activity_Logs" FOR ALL USING (true);

CREATE POLICY "Permitir lectura para todos" ON public."reservas_aulas" FOR SELECT USING (true);
CREATE POLICY "Permitir escritura para todos" ON public."reservas_aulas" FOR ALL USING (true);

CREATE POLICY "Permitir lectura para todos" ON public."libre_disposicion" FOR SELECT USING (true);
CREATE POLICY "Permitir escritura para todos" ON public."libre_disposicion" FOR ALL USING (true);

CREATE POLICY "Permitir lectura para todos" ON public."configuracion_centro" FOR SELECT USING (true);
CREATE POLICY "Permitir escritura para todos" ON public."configuracion_centro" FOR ALL USING (true);

COMMIT;
