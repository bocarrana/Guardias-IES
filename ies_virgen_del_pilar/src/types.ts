// ==============================
// Guardias IES — Type Definitions
// ==============================

// --- Enums ---
export enum GuardStatus {
    AVAILABLE = 'Pendiente/disponible',
    ASSIGNED = 'Pendiente/asignada',
    COMPLETED = 'Realizada',
}

export enum GuardType {
    ORDINARY = 'Ordinaria',
    COEXISTENCE = 'Convivencia',
    RECREO = 'Recreo',
}

export enum TaskStatus {
    YES = 'SÍ',
    NO = 'NO',
}

// --- Interfaces ---
export interface Teacher {
    id: string;
    name: string;
    email?: string;
    department: string;
    guard_group: string;
    avatar_url?: string;
    avatar_seed?: string;
    role?: 'Docente' | 'Jefatura' | 'Administración' | 'Admin' | 'Usuario' | 'Administrador' | 'superadmin' | 'Pantalla';
    user_id?: string;
    total_guards?: number;
    horas_guardia?: number;
    active?: boolean;
}

export interface GuardGroupSchedule {
    id: string;
    profesor_id: string;
    dia_semana: string;
    franja_id: string;
    horas: number;
    // Joined
    teacher?: Teacher;
    time_slot?: TimeSlot;
}

export interface TimeSlot {
    id: string;
    label: string;
    start_time?: string;
    end_time?: string;
    type?: string;
}

export interface Group {
    id: string;
    name: string;
    education_level?: string;
}

export interface Subject {
    id: string;
    name: string;
    padre_id?: string;
}

export interface Classroom {
    id: string;
    name: string;
    building?: string;
    location?: string;
}

export interface Guard {
    id: string;
    date: string;
    time_slot_id: string;
    classroom_id: string;
    group_id: string;
    subject_id: string;
    requesting_teacher_id: string;
    covering_teacher_id?: string | null;
    status: GuardStatus;
    type: GuardType;
    observations?: string;
    has_task?: string;
    task_file_url?: string;

    // Joined relations (for UI display)
    time_slot?: TimeSlot;
    classroom?: Classroom;
    group?: Group;
    subject?: Subject;
    requesting_teacher?: Teacher;
    covering_teacher?: Teacher;
}

// --- Personal Schedule ---
export interface PersonalScheduleEntry {
    id: string;
    profesor_id: string;
    dia_semana: string;
    franja_id: string;
    materia_id?: string;
    grupo_id?: string;
    aula_id?: string;
    tipo: 'Lectivo' | 'Guardia';
    created_at?: string;
    // Joins opcionales
    materia?: Subject;
    grupo?: Group;
    aula?: Classroom;
}

// --- Calendar ---
export interface CalendarDay {
    id: string;
    fecha: string;
    es_lectivo: boolean;
    descripcion?: string;
}

// --- Meta Options ---
export interface MetaOptions {
    slots: TimeSlot[];
    classrooms: Classroom[];
    groups: Group[];
    subjects: Subject[];
}

export type ViewType = 'guards' | 'guard_groups' | 'teachers' | 'dashboard' | 'my_schedule' | 'admin' | 'free_classrooms' | 'floor_plan' | 'calendar' | 'libre_disposicion';

export interface CalendarEvent {
    id: string;
    date: string;
    title: string;
    description?: string;
    file_url?: string;
    creator_id: string;
    category?: string;
    created_at?: string;
    // Joined
    creator?: Teacher;
}

export interface RoomReservation {
    id: string;
    aula_id: string;
    profesor_id: string;
    fecha: string;
    tramo_horario: string;
    motivo?: string;
    anual?: boolean;
    
    // Joined relations
    classroom?: Classroom;
    teacher?: Teacher;
}
