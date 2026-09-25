import { supabase } from '../config/supabase';
import { invalidateCache } from './supabaseClient';
import { Teacher } from '../types';

export interface RecreoZone {
    id: string;
    name: string;
    shortName: string;
    color: string;
    badgeBg: string;
    description: string;
    locations: string[];
}

export const RECREO_ZONES: RecreoZone[] = [
    {
        id: 'zona_1_puerta',
        name: 'Zona 1 Puerta',
        shortName: 'Z1 Puerta',
        color: '#3b82f6', // Blue
        badgeBg: 'rgba(59, 130, 246, 0.15)',
        description: 'Acceso principal y zona parking exterior',
        locations: ['Puerta principal', 'Zona parking'],
    },
    {
        id: 'zona_1_edificio',
        name: 'Zona 1 Edificio',
        shortName: 'Z1 Edificio',
        color: '#06b6d4', // Cyan
        badgeBg: 'rgba(6, 182, 212, 0.15)',
        description: 'Edificio Principal, Sala de profesores, Usos múltiples y Plaza de la Igualdad',
        locations: ['Edificio Principal', 'Sala de profesores', 'Usos múltiples', 'Plaza de la Igualdad'],
    },
    {
        id: 'zona_2',
        name: 'Zona 2',
        shortName: 'Zona 2',
        color: '#10b981', // Green
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        description: 'Pistas deportivas centrales y exteriores',
        locations: ['Pistas deportivas'],
    },
    {
        id: 'zona_3',
        name: 'Zona 3',
        shortName: 'Zona 3',
        color: '#f59e0b', // Amber
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        description: 'Edificio A (1º ESO), Edificio D (Polideportivo) y Pista anexa',
        locations: ['Edificio A (1º ESO)', 'Edificio D (Polideportivo)', 'Pista deportiva'],
    },
    {
        id: 'zona_4',
        name: 'Zona 4',
        shortName: 'Zona 4',
        color: '#ec4899', // Pink / Rose
        badgeBg: 'rgba(236, 72, 153, 0.15)',
        description: 'Edificios B y C, Invernaderos, Edificio E y Campo de Rugby',
        locations: ['Edificio B', 'Edificio C', 'Invernadero', 'Invernaderos', 'Edificio E', 'Campo de Rugby'],
    },
];

export const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] as const;
export type DayOfWeek = typeof DAYS_OF_WEEK[number];

/** Grid data format: key is `${zoneId}_${dayOfWeek}`, value is teacherName or teacherId */
export type RecreoGrid = Record<string, string>;

const STORAGE_KEY_PREFIX = 'recreo_schedule_reyes_catolicos_';

// Default preloaded data extracted directly from the physical corkboard sheet (Septiembre 2026)
const DEFAULT_SEP_2026_RECREO_1: RecreoGrid = {
    'zona_1_puerta_Lunes': 'Rubén Salvador',
    'zona_1_puerta_Martes': 'María Rubio',
    'zona_1_puerta_Miércoles': 'Macarena Santa-María',
    'zona_1_puerta_Jueves': 'Raquel Sanz',
    'zona_1_puerta_Viernes': 'Sofía Navarro',

    'zona_1_edificio_Lunes': 'Inés Giménez',
    'zona_1_edificio_Martes': 'Jaime Nuño',
    'zona_1_edificio_Miércoles': 'David Boudet',
    'zona_1_edificio_Jueves': 'Marta Ruíz',
    'zona_1_edificio_Viernes': 'Celia Pérez',

    'zona_2_Lunes': 'Zulima Aguado',
    'zona_2_Martes': 'Jorge Ferrer',
    'zona_2_Miércoles': 'Nicolás Bernad',
    'zona_2_Jueves': 'Mª Teresa Sánchez',
    'zona_2_Viernes': '',

    'zona_3_Lunes': 'Fco. Javier Muñoz',
    'zona_3_Martes': 'Susana Martínez',
    'zona_3_Miércoles': 'Javier Asín',
    'zona_3_Jueves': 'Ángel Violeta',
    'zona_3_Viernes': 'Odet Lardies',

    'zona_4_Lunes': 'Sonia Bleda',
    'zona_4_Martes': 'Pablo Benedé',
    'zona_4_Miércoles': 'Eva Andrés',
    'zona_4_Jueves': 'Mª José Pérez',
    'zona_4_Viernes': 'Sara Casado',
};

const DEFAULT_SEP_2026_RECREO_2: RecreoGrid = {
    'zona_1_puerta_Lunes': 'Pablo Benedé',
    'zona_1_puerta_Martes': 'Ángel Violeta',
    'zona_1_puerta_Miércoles': 'Mª Teresa Sánchez',
    'zona_1_puerta_Jueves': 'David Boudet',
    'zona_1_puerta_Viernes': 'Jaime Nuño',

    'zona_1_edificio_Lunes': 'María Rubio',
    'zona_1_edificio_Martes': 'Javier Asín',
    'zona_1_edificio_Miércoles': 'Marta Ruíz',
    'zona_1_edificio_Jueves': 'Odette Lardiés',
    'zona_1_edificio_Viernes': 'Inés Giménez',

    'zona_2_Lunes': 'Fco. Javier Muñoz',
    'zona_2_Martes': 'Mª José Pérez',
    'zona_2_Miércoles': 'Jorge Ferrer',
    'zona_2_Jueves': 'Sara Casado',
    'zona_2_Viernes': 'Macarena Santa-María',

    'zona_3_Lunes': 'Zulima Aguado',
    'zona_3_Martes': 'Eva Andrés',
    'zona_3_Miércoles': 'Nicolás Bernad',
    'zona_3_Jueves': 'Laura Blas',
    'zona_3_Viernes': 'Susana Martínez',

    'zona_4_Lunes': 'Sofía Navarro',
    'zona_4_Martes': 'Rubén Salvador',
    'zona_4_Miércoles': 'Sonia Bleda',
    'zona_4_Jueves': 'Celia Pérez',
    'zona_4_Viernes': 'Laura Blas',
};

/** Normalize string for easy comparison */
export const normalizeText = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Find full teacher object by name substring or ID */
export const findTeacherByName = (nameOrId: string, teachers: Teacher[]): Teacher | undefined => {
    if (!nameOrId || !teachers.length) return undefined;
    const clean = normalizeText(nameOrId);
    
    // Exact ID
    const byId = teachers.find(t => t.id === nameOrId);
    if (byId) return byId;

    // Full name search
    const byExact = teachers.find(t => normalizeText(t.name) === clean);
    if (byExact) return byExact;

    // Partial match (e.g., "Rubén Salvador" matches "Rubén Salvador Hernández")
    const byPartial = teachers.find(t => normalizeText(t.name).includes(clean) || clean.includes(normalizeText(t.name)));
    return byPartial;
};

/** Get storage key */
const getStorageKey = (year: number, month: number, recreoType: '1' | '2'): string => {
    return `${STORAGE_KEY_PREFIX}${year}_${month}_r${recreoType}`;
};

/** 
 * Rotates a grid by N steps forward in the 5-zone cycle:
 * Z1 Puerta -> Z1 Edificio -> Z2 -> Z3 -> Z4 -> Z1 Puerta
 */
export const rotateRecreoGrid = (grid: RecreoGrid, steps: number = 1): RecreoGrid => {
    if (!grid || Object.keys(grid).length === 0) return {};
    const zoneIds = RECREO_ZONES.map(z => z.id); // ['zona_1_puerta', 'zona_1_edificio', 'zona_2', 'zona_3', 'zona_4']
    const totalZones = zoneIds.length;
    const normalizedSteps = ((steps % totalZones) + totalZones) % totalZones;
    if (normalizedSteps === 0) return { ...grid };

    const rotated: RecreoGrid = {};
    for (const day of DAYS_OF_WEEK) {
        for (let i = 0; i < totalZones; i++) {
            const srcZone = zoneIds[i];
            const destZone = zoneIds[(i + normalizedSteps) % totalZones];
            const teacherName = grid[`${srcZone}_${day}`];
            if (teacherName !== undefined && teacherName !== null) {
                rotated[`${destZone}_${day}`] = teacherName;
            }
        }
    }
    return rotated;
};

/** Get monthly schedule with automatic monthly cyclic rotation fallback */
export const getMonthlyRecreoGrid = (year: number, month: number, recreoType: '1' | '2'): RecreoGrid => {
    try {
        const key = getStorageKey(year, month, recreoType);
        const stored = localStorage.getItem(key);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Error reading from localStorage:', e);
    }

    // Base corkboard data starts in Septiembre 2026 (Month 9)
    const baseYear = 2026;
    const baseMonth = 9;
    const diffMonths = (year - baseYear) * 12 + (month - baseMonth);
    const baseGrid = recreoType === '1' ? DEFAULT_SEP_2026_RECREO_1 : DEFAULT_SEP_2026_RECREO_2;

    return rotateRecreoGrid(baseGrid, diffMonths);
};

/** Save monthly schedule */
export const saveMonthlyRecreoGrid = async (year: number, month: number, recreoType: '1' | '2', grid: RecreoGrid): Promise<void> => {
    const key = getStorageKey(year, month, recreoType);
    try {
        localStorage.setItem(key, JSON.stringify(grid));
    } catch (e) {
        console.error('Error saving recreo grid to localStorage:', e);
    }

    try {
        const id = `_CONFIG_${key}`;
        await supabase.from('Aulas').upsert({
            'id aulas': id,
            'aulas': id,
            'ubicación': JSON.stringify(grid),
        }, { onConflict: 'id aulas' });
        invalidateCache('meta_options');
    } catch (err) {
        console.error('Error syncing recreo grid to Supabase:', err);
    }
};

/** Clear monthly schedule */
export const clearMonthlyRecreoGrid = async (year: number, month: number, recreoType: '1' | '2'): Promise<void> => {
    const key = getStorageKey(year, month, recreoType);
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.error('Error clearing recreo grid:', e);
    }

    try {
        const id = `_CONFIG_${key}`;
        await supabase.from('Aulas').delete().eq('id aulas', id);
        invalidateCache('meta_options');
    } catch (err) {
        console.error('Error removing recreo grid from Supabase:', err);
    }
};

/** Copy schedule from one month to another */
export const copyMonthlyRecreoGrid = (
    fromYear: number, fromMonth: number,
    toYear: number, toMonth: number,
    recreoType: '1' | '2'
): RecreoGrid => {
    const sourceGrid = getMonthlyRecreoGrid(fromYear, fromMonth, recreoType);
    saveMonthlyRecreoGrid(toYear, toMonth, recreoType, sourceGrid);
    return sourceGrid;
};

/** Get day of week name from Date */
export const getSpanishDayNameFromDate = (date: Date = new Date()): DayOfWeek | null => {
    const day = date.getDay(); // 0 is Sunday, 1 is Monday, 5 is Friday
    if (day === 1) return 'Lunes';
    if (day === 2) return 'Martes';
    if (day === 3) return 'Miércoles';
    if (day === 4) return 'Jueves';
    if (day === 5) return 'Viernes';
    return null; // Weekend
};

export interface TodayRecreoAssignment {
    zone: RecreoZone;
    teacherName: string;
    teacher?: Teacher;
    recreoType: '1' | '2';
}

/** Get all assignments for today */
export const getTodayRecreoAssignments = (teachers: Teacher[], date: Date = new Date()): {
    recreo1: TodayRecreoAssignment[];
    recreo2: TodayRecreoAssignment[];
    dayName: DayOfWeek | null;
} => {
    const dayName = getSpanishDayNameFromDate(date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    if (!dayName) {
        return { recreo1: [], recreo2: [], dayName: null };
    }

    const grid1 = getMonthlyRecreoGrid(year, month, '1');
    const grid2 = getMonthlyRecreoGrid(year, month, '2');

    const recreo1: TodayRecreoAssignment[] = RECREO_ZONES.map(zone => {
        const teacherName = grid1[`${zone.id}_${dayName}`] || '';
        const teacher = teacherName ? findTeacherByName(teacherName, teachers) : undefined;
        return { zone, teacherName, teacher, recreoType: '1' };
    });

    const recreo2: TodayRecreoAssignment[] = RECREO_ZONES.map(zone => {
        const teacherName = grid2[`${zone.id}_${dayName}`] || '';
        const teacher = teacherName ? findTeacherByName(teacherName, teachers) : undefined;
        return { zone, teacherName, teacher, recreoType: '2' };
    });

    return { recreo1, recreo2, dayName };
};

/** Check what zone a teacher is in today */
export const getTeacherTodayRecreoDuty = (
    teacher: Teacher | null,
    teachers: Teacher[],
    date: Date = new Date()
): { recreo1?: RecreoZone; recreo2?: RecreoZone; dayName: DayOfWeek | null } => {
    if (!teacher) return { dayName: null };
    const { recreo1, recreo2, dayName } = getTodayRecreoAssignments(teachers, date);
    if (!dayName) return { dayName: null };

    const normUser = normalizeText(teacher.name);

    const r1 = recreo1.find(item => {
        if (item.teacher?.id === teacher.id) return true;
        if (item.teacherName && (normalizeText(item.teacherName).includes(normUser) || normUser.includes(normalizeText(item.teacherName)))) return true;
        return false;
    });

    const r2 = recreo2.find(item => {
        if (item.teacher?.id === teacher.id) return true;
        if (item.teacherName && (normalizeText(item.teacherName).includes(normUser) || normUser.includes(normalizeText(item.teacherName)))) return true;
        return false;
    });

    return {
        recreo1: r1?.zone,
        recreo2: r2?.zone,
        dayName,
    };
};

/** Formats a teacher's full name to only show First Name + First Surname (Nombre + 1.er Apellido) */
export const formatShortTeacherName = (fullName: string): string => {
    if (!fullName) return '';
    const clean = fullName.trim();
    if (clean.includes(',')) {
        const [apellidos, nombre] = clean.split(',').map(s => s.trim());
        const primerApellido = apellidos.split(/\s+/)[0] || '';
        const primerNombre = (nombre || '').split(/\s+/)[0] || '';
        return `${primerNombre} ${primerApellido}`.trim();
    }
    const parts = clean.split(/\s+/);
    if (parts.length <= 2) return clean;
    return `${parts[0]} ${parts[1]}`;
};
