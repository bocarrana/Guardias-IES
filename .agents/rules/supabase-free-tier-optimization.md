# Regla Obligatoria: Optimización Extrema de Consumo en Supabase (Plan Gratuito / Free Tier)

## Contexto y Restricción Crítica
Las aplicaciones de los centros educativos (`ies_*`) operan sobre **planes gratuitos de Supabase (Free Tier)**. 
En este nivel, Supabase impone límites estrictos de:
- **Disk IO Budget / IOPS burst** (se agota fácilmente con lecturas/escrituras frecuentes o polling).
- **Compute (CPU compartida Micro)** y conexiones concurrentes de Postgres.
- **Límites de Egress y llamadas Auth**.

---

## Directrices Mandatorias para el Asistente en CUALQUIER Conversación o Tarea

### 1. Prohibido el Polling Agresivo
- **NUNCA** configurar `setInterval` o loops de recarga automática inferiores a 60-90 segundos para consultas a Supabase.
- Los refrescos de fondo (ej: pantallas de guardia o sincronización) **deben pausarse** si la pestaña no está visible (`document.visibilityState !== 'visible'`).
- Priorizar eventos en tiempo real con Supabase Realtime (si está disponible) o **caché en memoria** en lugar de sondeos continuos.

### 2. Caché en Memoria Obligatoria (In-Memory Cache)
- Cualquier dato que no cambie cada segundo (profesores, horarios, calendarios escolares, grupos de guardia, configuración de cupos, asignaciones) **DEBE estar cacheado** en memoria (`supabaseClient.ts` o React Query/SWR) con TTLs generosos (de 3 a 10 minutos mínimo).
- Antes de disparar un `supabase.from('...').select(...)`, verificar siempre si existe valor válido en caché.

### 3. Prohibidas las Consultas Destructivas / Pesadas en el Ciclo de Render
- **NUNCA** ejecutar cascadas automáticas de `DELETE` + `INSERT` o migraciones masivas en los hooks de carga inicial o renderizado pasivo de la aplicación (como `useGuards` o `useEffect` de carga).
- Las mutaciones en base de datos solo deben ocurrir ante **acciones explícitas del usuario** (ej: guardar guardia, crear sustitución, reservar aula).

### 4. Consultas Eficientes y Filtradas (Lean Queries)
- **NUNCA** hacer `select('*')` indiscriminado en tablas con grandes volúmenes de datos o campos pesados.
- Aplicar siempre filtros de fecha (`gte`, `lte`), índices y `.limit()` para evitar escaneos secuenciales de tabla completa (*Full Table Scans*) en Postgres.
- Implementar timeouts de seguridad cortos en promesas de red (ej: `Promise.race` con timeout de 6-8s) para evitar que la UI se congele si la base de datos ralentiza.

### 5. Auditoría Proactiva en Cada Feature o Modificación
- En cualquier solicitud del usuario (creación de nuevas pantallas, endpoints, hooks o servicios):
  - **Auditar y minimizar** el número total de llamadas a la base de datos.
  - Explicar o documentar brevemente cómo la solución respeta el consumo mínimo de recursos de Supabase Free.
