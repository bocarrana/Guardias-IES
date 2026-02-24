# Guardias IES Manager V2.0

Sistema de gestión de guardias escolares para institutos, desarrollado con **React**, **TypeScript**, **Tailwind CSS** y **Supabase**.

## 🚀 Características

- **Autenticación con Google Workspace:** Acceso restringido a correos registrados en la base de datos.
- **Gestión de Guardias:** Creación, edición, asignación y finalización de guardias en tiempo real.
- **Panel de Estadísticas:** Visualización de datos mediante gráficos (Recharts).
- **Directorio de Profesorado:** Listado de profesores con sus estadísticas de guardias.
- **Interfaz Moderna:** Diseño oscuro (Dark Mode) con estética "Glassmorphism" y componentes responsivos.

## 🛠️ Tecnologías

- **Frontend:** React 19, Vite, TypeScript.
- **Estilos:** Tailwind CSS, Lucide React (iconos).
- **Backend/Base de Datos:** Supabase (PostgreSQL, Auth, Storage).
- **Gráficos:** Recharts.

## 📋 Requisitos Previos

Necesitarás una instancia de **Supabase** con las siguientes tablas:

1. `Profesores`: (id, name, email, avatar_url, etc.)
2. `Guardias`: (id, date, status, requesting_teacher_id, covering_teacher_id, etc.)
3. `FranjasHorarias`, `Aulas`, `Grupos`, `Materias`: Tablas maestras para los desplegables.

## ⚙️ Configuración Local

1. **Clonar el repositorio:**
   ```bash
   git clone <tu-url-de-github>
   cd guardias-ies-manager
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Variables de Entorno:**
   Crea un archivo `.env` en la raíz con tus credenciales de Supabase:
   ```env
   VITE_SUPABASE_URL=tu_url_supabase
   VITE_SUPABASE_ANON_KEY=tu_key_anonima
   ```

4. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

## 📄 Licencia

Este proyecto es para uso educativo/administrativo interno.
