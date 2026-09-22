# Auto-Deploy y Sincronización Automática

## Regla Obligatoria para Todos los Agentes y Tareas

1. **Sincronización de Clones:**
   - Cada vez que se realicen cambios en `_plantilla_base`, se DEBE ejecutar siempre `node scripts/sync_clones.js` para propagar los cambios a todos los centros activos (`ies_*`).
   - Sincronizar también los cambios relevantes en `guardias-ies-v2` para mantener ambos entornos al día.

2. **Verificación de Build:**
   - Siempre verificar que `npm run build` compila sin errores antes de finalizar.

3. **Auto-Push y Despliegue en Producción (Vercel):**
   - El usuario requiere visualizar SIEMPRE los cambios en sus apps desplegadas sin tener que pedirlo.
   - En cada sesión de trabajo, una vez finalizados y verificados los cambios, el agente DEBE realizar SIEMPRE:
     1. `git add .`, `git commit -m "..."` y `git push origin main` en `guardias-ies-aragon` (lo que dispara el auto-deploy en Vercel de todos los institutos).
     2. Despliegue en producción en `guardias-ies-v2` con `npx vercel --prod --yes` (asociado al proyecto `project-kwzf8` de Vercel que sirve el dominio oficial `https://guardias.iesreyescatolicos.com/`).
