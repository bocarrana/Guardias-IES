-- ====================================================================
-- INSTRUCCIONES:
-- 1. Copia todo este script SQL.
-- 2. Ejecútalo en el SQL Editor del proyecto ANTIGUO ("Guardias IES" de IES Reyes Católicos).
-- 3. La consulta generará como resultado una lista de comandos INSERT.
-- 4. Copia todos esos comandos INSERT resultantes, ve al SQL Editor de tu NUEVO proyecto ("Guardias IES Aragón") y ejecútalos allí.
-- ====================================================================

-- Generar inserts para Aulas (solo columnas core id y nombre)
SELECT 'INSERT INTO "Aulas" ("id aulas", "aulas") VALUES (' 
  || quote_literal("id aulas") || ', ' 
  || quote_literal("aulas") || ') ON CONFLICT ("aulas") DO UPDATE SET "id aulas" = EXCLUDED."id aulas";' AS sql_insert
FROM "Aulas"

UNION ALL

-- Generar inserts para Materias
SELECT 'INSERT INTO "Materias" ("id materias", "materias", "padre_id") VALUES (' 
  || quote_literal("id materias") || ', ' 
  || quote_literal("materias") || ', ' 
  || COALESCE(quote_literal("padre_id"), 'NULL') || ') ON CONFLICT ("materias") DO UPDATE SET "id materias" = EXCLUDED."id materias";'
FROM "Materias"

UNION ALL

-- Generar inserts para Grupos
SELECT 'INSERT INTO "Grupos" ("id grupos", "grupos") VALUES (' 
  || quote_literal("id grupos") || ', ' 
  || quote_literal("grupos") || ') ON CONFLICT ("grupos") DO UPDATE SET "id grupos" = EXCLUDED."id grupos";'
FROM "Grupos"

UNION ALL

-- Generar inserts para Franjas horarias
SELECT 'INSERT INTO "Franjas horarias" ("id franja", "franja", "hora inicio", "hora fin", "tipo") VALUES (' 
  || quote_literal("id franja") || ', ' 
  || COALESCE(quote_literal("franja"), 'NULL') || ', ' 
  || COALESCE(quote_literal("hora inicio"), 'NULL') || ', ' 
  || COALESCE(quote_literal("hora fin"), 'NULL') || ', ' 
  || COALESCE(quote_literal("tipo"), 'NULL') || ') ON CONFLICT ("id franja") DO NOTHING;'
FROM "Franjas horarias"

UNION ALL

-- Generar inserts para Horario_Personal
SELECT 'INSERT INTO "Horario_Personal" ("id", "profesor_id", "dia_semana", "franja_id", "materia_id", "grupo_id", "aula_id", "tipo") VALUES (' 
  || quote_literal(id) || ', ' 
  || quote_literal(profesor_id) || ', ' 
  || quote_literal(dia_semana) || ', ' 
  || quote_literal(franja_id) || ', ' 
  || COALESCE(quote_literal(materia_id), 'NULL') || ', ' 
  || COALESCE(quote_literal(grupo_id), 'NULL') || ', ' 
  || COALESCE(quote_literal(aula_id), 'NULL') || ', ' 
  || COALESCE(quote_literal(tipo), 'NULL') || ') ON CONFLICT DO NOTHING;'
FROM "Horario_Personal"

UNION ALL

-- Generar inserts para Grupos_Guardia
SELECT 'INSERT INTO "Grupos_Guardia" ("id", "profesor_id", "dia_semana", "franja_id") VALUES (' 
  || quote_literal(id) || ', ' 
  || quote_literal(profesor_id) || ', ' 
  || quote_literal(dia_semana) || ', ' 
  || quote_literal(franja_id) || ') ON CONFLICT DO NOTHING;'
FROM "Grupos_Guardia";
