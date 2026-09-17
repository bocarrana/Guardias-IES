# Auto-Deploy y Sincronización Automática

## Regla Obligatoria para Todos los Agentes y Tareas

1. **Sincronización de Clones:**
   - Cada vez que se realicen cambios en `_plantilla_base`, se DEBE ejecutar siempre `node scripts/sync_clones.js` para propagar los cambios a todos los centros activos (`ies_*`).

2. **Verificación de Build:**
   - Siempre verificar que `npm run build` en `_plantilla_base` compila sin errores antes de finalizar.

3. **Auto-Push para Despliegue en Producción (Vercel):**
   - El usuario requiere visualizar siempre los cambios en sus apps desplegadas sin tener que pedirlo.
   - Una vez finalizados y verificados los cambios, el agente DEBE realizar automáticamente el `git add`, `git commit -m "..."` y `git push origin main` en el repositorio para que Vercel despliegue la actualización inmediatamente.
