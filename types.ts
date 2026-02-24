// Enums
export enum GuardStatus {
  AVAILABLE = 'Pendiente/disponible',
  ASSIGNED = 'Pendiente/asignada',
  COMPLETED = 'Realizada'
}

// Valores exactos del Enum en base de datos
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
  id: string; // 'id' (P001)
  name: string; // 'nombre y apellidos'
  email?: string; // 'email'
  department: string; // 'departamento'
  guard_group: string; // 'grupo de guardia'
  avatar_url?: string; // 'foto'
  role?: string; // 'rol'
  user_id?: string;
  
  // Stats helpers (frontend only)
  total_guards?: number; 
}

export interface TimeSlot {
  id: string; // 'id franja'
  label: string; // 'franja'
  start_time?: string; // 'hora inicio'
  end_time?: string; // 'hora fin'
  type?: string; // 'tipo'
}

export interface Group {
  id: string; // 'id grupos'
  name: string; // 'grupos'
  education_level?: string; // 'enseñanza'
}

export interface Subject {
  id: string; // 'id materias'
  name: string; // 'materias'
}

export interface Classroom {
  id: string; // 'id aulas'
  name: string; // 'aulas'
  building?: string; // 'edificio'
  location?: string; // 'ubicación'
}

export interface Guard {
  id: string; // 'ID Guardia' (G-001)
  date: string; // 'Fecha'
  
  // Foreign Keys (IDs)
  time_slot_id: string; // 'Franja horaria'
  classroom_id: string; // 'Aula' -> Referencia a Aulas.id aulas
  group_id: string; // 'Grupo atendido'
  subject_id: string; // 'Materia ausente'
  requesting_teacher_id: string; // 'Profesor ausente'
  covering_teacher_id?: string | null; // 'Profesor de guardia'
  
  // Data Fields
  status: GuardStatus; // 'Estado'
  type: GuardType; // 'Tipo de Guardia'
  observations?: string; // 'Observaciones'
  has_task?: string; // 'Tarea dejada' ("Sí" | "No")
  
  // Joined fields (for UI display via relations)
  time_slot?: TimeSlot;
  classroom?: Classroom; 
  group?: Group;
  subject?: Subject;
  requesting_teacher?: Teacher;
  covering_teacher?: Teacher;
}