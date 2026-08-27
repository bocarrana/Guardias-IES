# 🏫 Guía Maestra de Despliegue para Nuevos Institutos

Esta guía resume el procedimiento optimizado y estandarizado para poner en marcha la aplicación de guardias en **cualquier nuevo instituto** en menos de **8 minutos**.

---

## ⏱️ Resumen del Flujo de Trabajo (5 Pasos)

| Paso | Plataforma | Tiempo est. | Qué se hace |
| :--- | :--- | :---: | :--- |
| **1** | **Supabase** | 2 min | Crear proyecto para el nuevo centro |
| **2** | **Supabase** | 1 min | Ejecutar `schema_completo.sql` y crear Admin |
| **3** | **Google Cloud & Supabase** | 2 min | Vincular OAuth de Google (Login con `@ies...`) |
| **4** | **Proyecto Local** | 1 min | Poner logo y claves en `.env` de la carpeta del centro |
| **5** | **Vercel** | 2 min | Desplegar el proyecto asignando su Root Directory |

---

## 🛠️ PASO A PASO DETALLADO

### 1️⃣ Crear el Proyecto en Supabase (2 min)
1. Entra en tu panel de [Supabase](https://supabase.com/dashboard).
2. Haz clic en **"New Project"**.
3. Rellena los datos:
   * **Name:** `IES [Nombre del Centro]` (ej: `IES Ramón y Cajal`).
   * **Database Password:** Genera o usa una contraseña segura y anótala.
   * **Region:** `Frankfurt (eu-central-1)` o `London (eu-west-2)`.
   * **Pricing Plan:** Free tier.
4. Haz clic en **"Create new project"** y espera ~1 minuto a que termine de aprovisionarse.

---

### 2️⃣ Inicializar la Base de Datos (1 min)
1. Dentro del nuevo proyecto de Supabase, en el menú lateral izquierdo haz clic en **"SQL Editor"** (`>_`).
2. Pulsa en **"New query"**.
3. Abre en tu ordenador el archivo `_plantilla_base/schema_completo.sql`, copia todo su contenido, pégalo en el editor de Supabase y pulsa **"Run"** (`Ctrl + Enter`).
   > ℹ️ *Este script ya crea automáticamente todas las tablas, permisos de seguridad RLS y carga el **Calendario Escolar Oficial de Aragón 2026-2027**.*
4. En una nueva consulta SQL, inserta la cuenta del administrador del centro (Jefatura de Estudios):
   ```sql
   -- Ejemplo para crear al Administrador inicial
   INSERT INTO public."Profesores" (id, "nombre y apellidos", email, departamento, rol, horas_guardia, activo)
   VALUES ('P001', 'Jefatura de Estudios', 'guardias@ies[dominio].es', 'EQUIPO DIRECTIVO', 'Admin', 1, true);
   ```

---

### 3️⃣ Configurar el Login con Google OAuth (2 min)
1. **En Supabase:**
   * Ve a **Project Settings** -> **API** y copia la **Project URL** (ej: `https://xyz.supabase.co`).
   * Ve a **Authentication** -> **Providers** -> **Google**.
   * Activa la casilla **"Enable Google provider"**.
   * Pega el **Client ID** y **Client Secret** (los mismos de Google Cloud Console que ya tenemos creados para la marca neutra "Guardias IES").
   * Copia la **Callback URL** que te da Supabase (ej: `https://xyz.supabase.co/auth/v1/callback`).
   * Pulsa **Save**.

2. **En Google Cloud Console:**
   * Entra en [Google Cloud Console -> Credenciales](https://console.cloud.google.com/apis/credentials).
   * Haz clic en el cliente OAuth `Guardias IES`.
   * En **"URIs de redireccionamiento autorizados"**, pulsa **+ Añadir URI** y pega la Callback URL copiada de Supabase.
   * Pulsa **Guardar**.

3. **En Supabase (URL Configuration):**
   * Ve a **Authentication** -> **URL Configuration**.
   * **Site URL:** `https://guardias-[nombrecentro].vercel.app`
   * **Redirect URLs:** Añade `https://guardias-[nombrecentro].vercel.app/**` y `http://localhost:5173/**`
   * Pulsa **Save**.

---

### 4️⃣ Configurar la Carpeta Local del Centro (1 min)
1. En tu proyecto local, busca la carpeta del instituto correspondiente (ej: `ies_ramon_y_cajal`).
2. Coloca el logo del centro en formato PNG en `ies_[centro]/public/logo.png`.
3. Crea o edita el archivo `ies_[centro]/.env` y `.env.local` con las claves del nuevo Supabase:
   ```env
   VITE_SUPABASE_URL=https://[id-proyecto].supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_[clave_anon_de_supabase]
   ```
4. Guarda y sube los cambios a GitHub:
   ```bash
   git add .
   git commit -m "Configurado nuevo centro IES [Nombre]"
   git push origin main
   ```

---

### 5️⃣ Desplegar en Vercel (2 min)
1. Entra en tu panel de [Vercel](https://vercel.com/dashboard).
2. Pulsa en **"Add New..."** -> **"Project"**.
3. Selecciona tu repositorio de GitHub `bocarrana/Guardias-IES`.
4. En la pantalla de configuración:
   * **Project Name:** `guardias-[centro]` (ej: `guardias-ramon-y-cajal`).
   * **Root Directory:** Haz clic en **Edit** y selecciona la carpeta de ese centro (ej: `ies_ramon_y_cajal`).
   * **Environment Variables:** Añade:
     * `VITE_SUPABASE_URL` = (URL de Supabase del nuevo proyecto)
     * `VITE_SUPABASE_ANON_KEY` = (Anon Key de Supabase del nuevo proyecto)
5. Haz clic en **"Deploy"**.

---

## ✅ ¡Centro Listo y Operativo!

En cuanto termine el despliegue (~45 segundos):
1. Entra en `https://guardias-[centro].vercel.app`.
2. Pulsa en **"Iniciar sesión con Google"** usando el correo administrador creado en el Paso 2.
3. El instituto ya tiene su app independiente, segura y personalizada con su propio logo y base de datos aislada.
