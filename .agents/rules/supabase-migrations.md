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

### 1. Cambios Particulares (Específicos de un solo centro)
- Si el cambio es exclusivo para un instituto (ej: una tabla especial, logos, o campo específico de *IES Reyes Católicos*, *IES Sierra de San Quílez*, etc.):
  - Se aplica **únicamente en la base de datos de ese centro específico**.
  - Se protege y aísla en su respectiva carpeta `ies_*` para que los scripts globales (`sync_clones.js`) no lo borren ni lo sobreescriban en otros centros.

### 2. Cambios Globales (Para toda la red de institutos)
- Si la funcionalidad es general para todos los centros:
  - Se genera el script de migración SQL idempotente en `scripts/migrations/`.
  - Se ejecuta en lote para todas las bases de datos activas de los centros.
  - Se sincroniza la base de código (`_plantilla_base` -> `sync_clones.js` -> `git push` -> Vercel).

### 3. Principio de Autodetección y Retrocompatibilidad
- El asistente **detecta proactivamente** si el cambio es particular o global sin necesidad de que el usuario lo recuerde.
- El frontend en React siempre maneja de forma segura las consultas para evitar errores si una tabla o campo opcional no existe en algún centro.
