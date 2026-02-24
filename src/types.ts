// Enums
export enum GuardStatus {
  AVAILABLE = 'Pendiente/disponible',
  ASSIGNED = 'Pendiente/asignada',
  COMPLETED = 'Realizada'
}

export enum GuardType {
  ORDINARY = 'Ordinaria',
  COEXISTENCE = 'Convivencia'
}

export enum TaskStatus {
  YES = 'Sí',
  NO = 'No'
}

// Interfaces
export interface Teacher {
  id: string; 
  name: string; 
  email?: string; 
  department: string; 
  guard_group: string; 
  avatar_url?: string; 
  role?: string; 
  user_id?: string;
  total_guards?: number; 
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
  time_slot?: TimeSlot;
  classroom?: Classroom; 
  group?: Group;
  subject?: Subject;
  requesting_teacher?: Teacher;
  covering_teacher?: Teacher;
}