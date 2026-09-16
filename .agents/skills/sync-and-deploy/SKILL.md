---
name: sync-and-deploy
description: Procedimiento estricto para sincronizar la plantilla base con los 15 centros educativos y desplegar a producción en Vercel.
---

# Procedimiento de Sincronización y Despliegue Multicentro

Cuando se modifique cualquier funcionalidad en `_plantilla_base`, se debe ejecutar el siguiente flujo:

1. **Sincronización:**
   Ejecutar en la raíz del repositorio:
   ```bash
   node scripts/sync_clones.js
   ```

2. **Verificación de Tipos (TypeScript):**
   Validar que no haya errores de compilación:
   ```bash
   npx --no-install tsc --noEmit
   ```

3. **Commit y Push en Git:**
   Guardar los cambios en la rama `main`:
   ```bash
   git add .
   git commit -m "feat/fix: <descripción del cambio>"
   git push origin main
   ```

4. **Despliegue a Producción (Vercel):**
   Desplegar el centro en producción:
   ```bash
   cd ies_reyes_catolicos
   npx vercel --prod --yes
   ```
