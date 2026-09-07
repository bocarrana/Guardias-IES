# Regla: Detección y Sincronización de Cambios en Supabase

## Contexto
El proyecto opera como un monorepo multitenant donde cada instituto educativo (`ies_*`) tiene:
1. Su propia aplicación frontend compilada.
2. Su **propio proyecto de base de datos en Supabase aislado**.

## Protocolo Obligatorio ante Cambios de Base de Datos
Cada vez que una funcionalidad, corrección o mejora requiera cambios en la base de datos de Supabase:
- Creación o modificación de tablas.
- Adición o cambio de columnas.
- Reglas de seguridad RLS (Row Level Security).
- Buckets de Supabase Storage o políticas de acceso.
- Funciones SQL, triggers o vistas.

### El Asistente DEBE automáticamente:
1. **Detectar proactivamente el impacto en la base de datos** sin esperar a que el usuario lo solicite.
2. **Crear el script SQL de migración idempotente** (usando `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE POLICY IF NOT EXISTS`, etc.) en la carpeta `scripts/migrations/`.
3. **Ejecutar o sincronizar la migración en las bases de datos activas** de los centros utilizando los scripts correspondientes.
4. **Garantizar retrocompatibilidad en el frontend**: El código de la aplicación en React/TypeScript debe manejar de forma elegante (`try/catch` o valores por defecto opcionales) cualquier desfase temporal hasta que la migración esté completada en todos los centros.
