/**
 * roles.ts — Utilidades centralizadas para control de acceso basado en roles.
 *
 * Jerarquía de roles (de mayor a menor privilegio):
 *  - Admin       (ex "superadmin"): acceso total, gestiona todos los perfiles.
 *  - Jefatura    (ex "Administrador"): acceso al panel admin excepto Libre Disposición (solo lectura).
 *  - Administración (nuevo): acceso de Docente pero con gestión total de Libre Disposición.
 *  - Docente     (ex "Usuario"): acceso estándar de usuario.
 *
 * Compatibilidad: los valores antiguos ('superadmin', 'Administrador', 'Usuario') se mapean correctamente.
 */

import { Teacher } from '../types';

/** Devuelve true si el rol equivale a Admin (máximo privilegio). */
export const isAdminRole = (role?: string): boolean => {
    if (!role) return false;
    return role === 'Admin' || role === 'superadmin';
};

/** Devuelve true si el rol equivale a Jefatura (ex Administrador). */
export const isJefaturaRole = (role?: string): boolean => {
    if (!role) return false;
    return role === 'Jefatura' || role === 'Administrador';
};

/** Devuelve true si el rol es Administración (nuevo). */
export const isAdministracionRole = (role?: string): boolean => {
    if (!role) return false;
    return role === 'Administración';
};

/** Devuelve true si el rol equivale a Docente (usuario básico). */
export const isDocenteRole = (role?: string): boolean => {
    if (!role) return true; // sin rol → tratado como docente
    return role === 'Docente' || role === 'Usuario';
};

/** Devuelve true si el rol es Pantalla (solo visualización en paneles). */
export const isPantallaRole = (role?: string): boolean => {
    if (!role) return false;
    return role === 'Pantalla';
};

// ── Helpers compuestos ─────────────────────────────────────

/**
 * Tiene acceso al PANEL ADMINISTRADOR (/admin):
 * Admin y Jefatura.
 */
export const canAccessAdminPanel = (teacher?: Teacher | null): boolean => {
    return isAdminRole(teacher?.role) || isJefaturaRole(teacher?.role);
};

/**
 * Tiene CONTROL TOTAL sobre Libre Disposición (asignar, borrar, cambiar cupo):
 * Admin y Administración.
 */
export const canManageLibreDisposicion = (teacher?: Teacher | null): boolean => {
    return isAdminRole(teacher?.role) || isAdministracionRole(teacher?.role);
};

/**
 * Tiene acceso a la pestaña "Mi Horario":
 * No disponible para Administración.
 */
export const canAccessMySchedule = (teacher?: Teacher | null): boolean => {
    return !isAdministracionRole(teacher?.role) && !isPantallaRole(teacher?.role);
};

/**
 * Tiene acceso a la pestaña "Estadísticas":
 * No disponible para Administración.
 */
export const canAccessDashboard = (teacher?: Teacher | null): boolean => {
    return !isAdministracionRole(teacher?.role) && !isPantallaRole(teacher?.role);
};

/**
 * Tiene acceso a la pestaña "Aulas Libres":
 * No disponible para Administración.
 */
export const canAccessFreeClassrooms = (teacher?: Teacher | null): boolean => {
    return !isAdministracionRole(teacher?.role) && !isPantallaRole(teacher?.role);
};

/**
 * Puede editar los datos o borrar el perfil de otro usuario:
 * Admin: Puede a todos.
 * Jefatura: Solo puede a Docentes.
 */
export const canEditTeacherProfile = (currentUser?: Teacher | null, targetTeacher?: Teacher | null): boolean => {
    if (!currentUser || !targetTeacher) return false;
    if (isAdminRole(currentUser.role)) return true;
    if (isJefaturaRole(currentUser.role) && isDocenteRole(targetTeacher.role)) return true;
    return false;
};

/**
 * Devuelve la lista de roles que puede asignar este usuario
 * en un menú desplegable al crear/editar.
 */
export const getAssignableRoles = (currentUser?: Teacher | null): string[] => {
    if (isAdminRole(currentUser?.role)) {
        return ['Docente', 'Jefatura', 'Administración', 'Admin', 'Pantalla'];
    }
    if (isJefaturaRole(currentUser?.role)) {
        return ['Docente', 'Jefatura'];
    }
    return ['Docente'];
};


/**
 * Devuelve el nombre para mostrar del rol.
 */
export const getRoleDisplayName = (role?: string): string => {
    switch (role) {
        case 'superadmin':
        case 'Admin': return 'Admin';
        case 'Administrador':
        case 'Jefatura': return 'Jefatura';
        case 'Administración': return 'Administración';
        case 'Usuario':
        case 'Docente': return 'Docente';
        case 'Pantalla': return 'Pantalla';
        default: return 'Docente';
    }
};

/**
 * Colores para las etiquetas de rol en la UI.
 */
export const getRoleStyle = (role?: string): { background: string; color: string; border: string } => {
    if (isAdminRole(role)) return {
        background: 'rgba(236, 72, 153, 0.1)',
        color: '#ec4899',
        border: '1px solid rgba(236, 72, 153, 0.2)',
    };
    if (isJefaturaRole(role)) return {
        background: 'rgba(34, 211, 238, 0.1)',
        color: 'var(--brand-400)',
        border: '1px solid rgba(34, 211, 238, 0.2)',
    };
    if (isAdministracionRole(role)) return {
        background: 'rgba(168, 85, 247, 0.1)',
        color: '#a78bfa',
        border: '1px solid rgba(168, 85, 247, 0.2)',
    };
    if (isPantallaRole(role)) return {
        background: 'rgba(56, 189, 248, 0.1)',
        color: '#38bdf8',
        border: '1px solid rgba(56, 189, 248, 0.2)',
    };
    return {
        background: 'rgba(100, 116, 139, 0.1)',
        color: 'var(--text-muted)',
        border: '1px solid rgba(100, 116, 139, 0.2)',
    };
};
