# Guardias IES v2

Refactorización premium del sistema de gestión de sustituciones y guardias para centros educativos.

## 🚀 Mejoras Implementadas

- **Modernización de Arquitectura**: Migración de `App.tsx` monolítico a una estructura modular basada en componentes, hooks personalizados y context API.
- **Seguridad**: Gestión de credenciales mediante variables de entorno (`.env`).
- **Sistema de Diseño Premium**: 
  - CSS personalizado con variables de diseño (design tokens).
  - Glassmorfismo y efectos de brillo (neon glow).
  - Tipografía moderna: 'Inter' para interfaz y 'JetBrains Mono' para datos.
  - Soporte nativo para modo oscuro.
- **Experiencia de Usuario (UI/UX)**:
  - Notificaciones elegantes con **Sonner** (reemplazando alertas clásicas).
  - Animaciones fluidas con **Framer Motion**.
  - Dashboard interactivo con estadísticas visuales mediante **Recharts**.
  - Buscador global y filtros rápidos en el panel de guardias.
- **Real-Time**: Implementación de Supabase Realtime para actualizaciones instantáneas de las guardias habilitadas.

## 📁 Estructura del Proyecto

```
src/
├── components/     # Componentes UI modulares (GuardList, Dashboard, etc.)
├── config/         # Configuración del cliente Supabase
├── context/        # Gestión de estado global de Authenticación
├── hooks/          # Lógica de negocio reutilizable (Custom hooks)
├── services/       # Capa de servicios para consumo de API
├── types.ts        # Definiciones de Tipos de TypeScript
└── index.css       # Sistema de diseño global
```

## 🛠️ Tecnologías

- **React 19** + **TypeScript**
- **Vite** (Build Tool)
- **Supabase** (Backend & Realtime)
- **Framer Motion** (Animaciones)
- **Recharts** (Gráficos)
- **Sonner** (Toasts)
- **Lucide React** (Iconografía)

## 📖 Instalación

1. Clonar el repositorio.
2. Instalar dependencias: `npm install`.
3. Configurar el archivo `.env` con las claves de Supabase.
4. Ejecutar en desarrollo: `npm run dev`.
