import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Teacher, Guard, GuardStatus, GuardType } from '../types';

// Configuración directa
const SUPABASE_URL = 'https://ipijmhqafrwobvnmmzgy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwaWptaHFhZnJ3b2J2bm1temd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4Njg1NzQsImV4cCI6MjA3MDQ0NDU3NH0.uxKjoNC_nOcPjOK56U3ACpS9gOPPapL7BqmQ5kTrLJI';

const BUCKET_PHOTOS = 'Fotos'; 

let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// --- HELPER: STORAGE URL ---
export const getStorageUrl = (path: string | undefined, bucket: string = BUCKET_PHOTOS) => {
  if (!path) return '';
  if (path.startsWith('http')) return path; 
  if (!supabase) return `https://via.placeholder.com/150?text=${path}`; 
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

// --- HELPER: ID GENERATOR ---
const generateGuardId = async (): Promise<string> => {
  if (!supabase) return `G-${Math.floor(Math.random() * 1000)}`;
  const { data, error } = await supabase.from('Guardias').select('"ID Guardia"').order('"ID Guardia"', { ascending: false }).limit(1);
  if (error || !data || data.length === 0) return 'G-001';
  const lastId = data[0]['ID Guardia'];
  const numberPart = parseInt(lastId.split('-')[1]);
  if (isNaN(numberPart)) return `G-${Date.now()}`; 
  const nextId = numberPart + 1;
  return `G-${nextId.toString().padStart(3, '0')}`;
};

// --- AUTH FUNCTIONS ---
export const signInWithGoogle = async () => {
  if (!supabase) { alert("Supabase no está configurado."); return; }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { queryParams: { access_type: 'offline', prompt: 'consent' } },
  });
  if (error) throw error;
};

export const signOut = async () => {
  if (supabase) await supabase.auth.signOut();
  window.location.reload();
};

export const getCurrentSession = async () => {
    if(supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    }
    return null;
}

// --- DATA FETCHING ---
export const getTeacherByEmail = async (email: string): Promise<Teacher | null> => {
  if (supabase) {
    const { data, error } = await supabase.from('Profesores').select('*').eq('email', email).single();
    if (error || !data) return null;
    return {
        id: data.id, name: data['nombre y apellidos'], email: data.email,
        department: data.department, guard_group: data['grupo de guardia'],
        avatar_url: data.foto, role: data.rol, user_id: data.user_id
    };
  }
  return null;
};

export const getTeachers = async (): Promise<Teacher[]> => {
  if (supabase) {
    const { data, error } = await supabase.from('Profesores').select('*');
    if (error) return [];
    return data.map((t: any) => ({
        id: t.id, name: t['nombre y apellidos'], email: t.email,
        department: t.department, guard_group: t['grupo de guardia'],
        avatar_url: t.foto, role: t.rol, user_id: t.user_id
    }));
  }
  return [];
};

export const getGuards = async (): Promise<Guard[]> => {
  if (supabase) {
    const { data, error } = await supabase
      .from('Guardias')
      .select(`
        "ID Guardia", "Fecha", "Franja horaria", "Profesor ausente", "Materia ausente", 
        "Grupo atendido", "Aula", "Observaciones", "Estado", "Profesor de guardia", 
        "Tipo de Guardia", "Tarea dejada",
        requesting_teacher:Profesores!Profesor_ausente_fkey(id, "nombre y apellidos", foto),
        covering_teacher:Profesores!Profesor_de_guardia_fkey(id, "nombre y apellidos", foto),
        time_slot:Franjas_horarias("id franja", franja),
        group:Grupos("id grupos", grupos),
        subject:Materias("id materias", materias),
        classroom:Aulas("id aulas", aulas)
      `)
      .order('Fecha', { ascending: false });

    if (error) { console.error("Error cargando guardias", error); return []; }

    return data.map((g: any) => ({
        id: g['ID Guardia'], date: g['Fecha'], time_slot_id: g['Franja horaria'],
        classroom_id: g['Aula'], group_id: g['Grupo atendido'], subject_id: g['Materia ausente'],
        requesting_teacher_id: g['Profesor ausente'], covering_teacher_id: g['Profesor de guardia'],
        status: g['Estado'] as GuardStatus, type: g['Tipo de Guardia'] as GuardType || GuardType.ORDINARY,
        observations: g['Observaciones'], has_task: g['Tarea dejada'],
        requesting_teacher: g.requesting_teacher ? { id: g.requesting_teacher.id, name: g.requesting_teacher['nombre y apellidos'], avatar_url: g.requesting_teacher.foto, department: '', guard_group: '' } : undefined,
        covering_teacher: g.covering_teacher ? { id: g.covering_teacher.id, name: g.covering_teacher['nombre y apellidos'], avatar_url: g.covering_teacher.foto, department: '', guard_group: '' } : undefined,
        time_slot: g.time_slot ? { id: g.time_slot['id franja'], label: g.time_slot['franja'] } : undefined,
        group: g.group ? { id: g.group['id grupos'], name: g.group['grupos'] } : undefined,
        subject: g.subject ? { id: g.subject['id materias'], name: g.subject['materias'] } : undefined,
        classroom: g.classroom ? { id: g.classroom['id aulas'], name: g.classroom['aulas'] } : { id: g['Aula'], name: g['Aula'] }
    }));
  }
  return [];
};

export const createGuard = async (guard: Partial<Guard>): Promise<any> => {
  if (supabase) {
    const newId = await generateGuardId();
    const dbPayload = {
        "ID Guardia": newId, "Fecha": guard.date, "Franja horaria": guard.time_slot_id,
        "Aula": guard.classroom_id, "Grupo atendido": guard.group_id, "Materia ausente": guard.subject_id,
        "Profesor ausente": guard.requesting_teacher_id, "Estado": GuardStatus.AVAILABLE,
        "Tipo de Guardia": guard.type, "Tarea dejada": guard.has_task || 'No', "Observaciones": guard.observations
    };
    const { data, error } = await supabase.from('Guardias').insert(dbPayload).select().single();
    if (error) throw error;
    return data;
  }
};

export const updateGuardStatus = async (guardId: string, status: GuardStatus, teacherId?: string): Promise<void> => {
  if (supabase) {
    const updateData: any = { "Estado": status };
    if (teacherId) updateData["Profesor de guardia"] = teacherId;
    const { error } = await supabase.from('Guardias').update(updateData).eq('"ID Guardia"', guardId);
    if (error) throw error;
  }
};

export const updateGuardDetails = async (guardId: string, guard: Partial<Guard>): Promise<void> => {
  if (supabase) {
    const dbPayload = {
        "Fecha": guard.date, "Franja horaria": guard.time_slot_id, "Aula": guard.classroom_id,
        "Grupo atendido": guard.group_id, "Materia ausente": guard.subject_id,
        "Tipo de Guardia": guard.type, "Tarea dejada": guard.has_task, "Observaciones": guard.observations
    };
    const { error } = await supabase.from('Guardias').update(dbPayload).eq('"ID Guardia"', guardId);
    if (error) throw error;
  }
};

export const deleteGuard = async (guardId: string): Promise<void> => {
  if (supabase) {
    const { error } = await supabase.from('Guardias').delete().eq('"ID Guardia"', guardId);
    if (error) throw error;
  }
};

export const getMetaOptions = async () => {
   if(supabase) {
       const results = await Promise.allSettled([
           supabase.from('Franjas horarias').select('*').order('hora inicio', { ascending: true }),
           supabase.from('Aulas').select('*').order('aulas', { ascending: true }), 
           supabase.from('Grupos').select('*').order('grupos', { ascending: true }),
           supabase.from('Materias').select('*').order('materias', { ascending: true })
       ]);
       
       const extractData = (res: any) => res.status === 'fulfilled' && res.value.data ? res.value.data : [];
       
       return { 
           slots: extractData(results[0]).map((s: any) => ({ id: s['id franja'], label: s['franja'] })),
           classrooms: extractData(results[1]).map((c: any) => ({ id: c['id aulas'], name: c['aulas'] })),
           groups: extractData(results[2]).map((g: any) => ({ id: g['id grupos'], name: g['grupos'] })),
           subjects: extractData(results[3]).map((s: any) => ({ id: s['id materias'], name: s['materias'] }))
       };
   }
   return { slots: [], classrooms: [], groups: [], subjects: [] };
}