import { supabase, getStorageUrl } from '../config/supabase';
export { supabase, getStorageUrl };
import { Teacher, Guard, GuardStatus, GuardType, MetaOptions, GuardGroupSchedule, TimeSlot, PersonalScheduleEntry, CalendarDay, CalendarEvent } from '../types';

// ─── IN-MEMORY CACHE FOR PERFORMANCE OPTIMIZATION ────────────────
const cacheMap = new Map<string, { promise: Promise<any>; expiresAt: number }>();

/**
 * Gets or sets a cached promise.
 */
export const getCached = <T>(key: string, fetchFn: () => Promise<T>, ttlSeconds: number): Promise<T> => {
    const now = Date.now();
    const entry = cacheMap.get(key);
    if (entry && now < entry.expiresAt) {
        return entry.promise;
    }

    const promise = fetchFn();
    // Auto-remove failed promises to prevent caching errors
    promise.catch(() => {
        cacheMap.delete(key);
    });

    cacheMap.set(key, {
        promise,
        expiresAt: now + ttlSeconds * 1000,
    });

    return promise;
};

/**
 * Invalidates cache entries matching a prefix or a list of specific keys.
 */
export const invalidateCache = (prefixOrKeys: string | string[]) => {
    const prefixes = Array.isArray(prefixOrKeys) ? prefixOrKeys : [prefixOrKeys];
    for (const key of Array.from(cacheMap.keys())) {
        if (prefixes.some(p => key === p || key.startsWith(p + ':') || key.startsWith(p + '_'))) {
            cacheMap.delete(key);
        }
    }
};

/**
 * Clears all cache entries.
 */
export const clearAllCache = () => {
    cacheMap.clear();
};

// ─── CLIENT-SIDE SANITIZATION ────────────────────────────
// Defense-in-depth: sanitize on client before sending to DB
// (DB triggers also sanitize, but this catches issues earlier)

/**
 * Strips dangerous HTML/script content from text inputs.
 * Prevents XSS attacks from being stored in the database.
 */
export const sanitizeInput = (input: string | null | undefined): string | null => {
    if (!input) return input as null;
    let clean = input;
    // Remove script tags and content
    clean = clean.replace(/<script[^>]*>.*?<\/script>/gi, '');
    // Remove all HTML tags
    clean = clean.replace(/<[^>]+>/g, '');
    // Remove javascript: protocol
    clean = clean.replace(/javascript:/gi, '');
    // Remove on* event handlers
    clean = clean.replace(/\bon\w+\s*=/gi, '');
    // Trim
    return clean.trim();
};

/**
 * Validates that a string is a safe identifier (no SQL injection chars).
 * Use for IDs and keys only, NOT for free text.
 */
export const isSafeId = (id: string): boolean => {
    return /^[a-zA-Z0-9_\-]+$/.test(id);
};

// ─── SECURITY AUDIT LOGGING ─────────────────────────────

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * Logs a security-relevant event to the security_audit_log table.
 * This is for sensitive operations like failed admin access, role changes, etc.
 */
export const logSecurityEvent = async (
    eventType: string,
    severity: AuditSeverity = 'INFO',
    details: Record<string, unknown> = {},
    targetId?: string,
    targetTable?: string,
) => {
    try {
        const session = await supabase.auth.getSession();
        const email = session?.data?.session?.user?.email;
        const uid = session?.data?.session?.user?.id;

        await supabase.from('security_audit_log').insert({
            event_type: eventType,
            severity,
            actor_email: email || 'unknown',
            actor_uid: uid || null,
            target_id: targetId || null,
            target_table: targetTable || null,
            details,
        });
    } catch (err) {
        // Never let audit logging break the application
        console.error('[SECURITY AUDIT] Failed to log event:', eventType, err);
    }
};

// ─── AUTH ───────────────────────────────────────────────

export const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin,
            queryParams: { access_type: 'offline', prompt: 'consent' },
        },
    });
    if (error) throw error;
};

export const signOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
};

export const getCurrentSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

// ─── TEACHERS ───────────────────────────────────────────

const mapTeacher = (t: any): Teacher => ({
    id: t.id,
    name: t['nombre y apellidos'],
    email: t.email,
    department: t.departamento,
    guard_group: t['grupo de guardia'],
    avatar_url: t.foto,
    avatar_seed: t.avatar_seed,
    role: t.rol,
    user_id: t.user_id,
    horas_guardia: t.horas_guardia ?? 1,
    active: t.activo ?? true,
});

export const getTeacherByEmail = async (email: string): Promise<Teacher | null> => {
    const trimmedEmail = email.trim();
    const key = `teacher_by_email:${trimmedEmail}`;
    return getCached(key, async () => {
        console.log('supabaseClient: Buscando por email:', `"${trimmedEmail}"`);
        // Use ilike for case-insensitive match
        const { data, error } = await supabase
            .from('Profesores')
            .select('*')
            .ilike('email', trimmedEmail)
            .maybeSingle();

        if (error) {
            console.error('supabaseClient: Error fetching teacher:', error);
            return null;
        }

        if (!data) {
            console.warn('supabaseClient: No se encontró registro para el email:', `"${trimmedEmail}"`);
            return null;
        }

        console.log('supabaseClient: Profesor encontrado:', data['nombre y apellidos']);
        return mapTeacher(data);
    }, 30);
};

export const getTeachers = async (showInactive: boolean = false): Promise<Teacher[]> => {
    const key = `teachers:showInactive:${showInactive}`;
    return getCached(key, async () => {
        let query = supabase.from('Profesores').select('*').order('nombre y apellidos');
        if (!showInactive) {
            query = query.eq('activo', true);
        }
        const { data, error } = await query;
        if (error || !data) return [];
        return data.map(mapTeacher);
    }, 30);
};

export const generateTeacherId = async (): Promise<string> => {
    const { data, error } = await supabase
        .from('Profesores')
        .select('id');

    if (error || !data || data.length === 0) return 'P001';

    const numericIds = data
        .map(row => {
            const idStr = row.id;
            if (idStr && idStr.startsWith('P')) {
                const num = parseInt(idStr.substring(1), 10);
                return isNaN(num) ? null : num;
            }
            return null;
        })
        .filter((num): num is number => num !== null);

    if (numericIds.length === 0) return 'P001';

    const maxId = Math.max(...numericIds);
    const nextId = maxId + 1;
    
    if (nextId < 1000) {
        return `P${nextId.toString().padStart(3, '0')}`;
    } else {
        return `P${nextId}`;
    }
};

export const createTeacher = async (teacher: Partial<Teacher>): Promise<void> => {
    const id = await generateTeacherId();
    const dbPayload = {
        id,
        'nombre y apellidos': sanitizeInput(teacher.name),
        email: teacher.email,
        departamento: teacher.department,
        'grupo de guardia': teacher.guard_group || '',
        rol: teacher.role || 'Usuario',
        avatar_seed: teacher.email || id,
        horas_guardia: teacher.horas_guardia || 1,
        activo: teacher.active !== undefined ? teacher.active : true
    };

    const { error } = await supabase.from('Profesores').insert(dbPayload);
    if (error) throw error;
    invalidateCache(['teachers', 'teacher_by_email']);
    await logActivity('ADMIN_CREATE_TEACHER', undefined, id);
    await logSecurityEvent('ADMIN_CREATE_TEACHER', 'INFO', { teacher_name: teacher.name, teacher_email: teacher.email }, id, 'Profesores');
};

export const updateTeacher = async (id: string, teacher: Partial<Teacher>): Promise<void> => {
    const dbPayload: any = {};
    if (teacher.name) dbPayload['nombre y apellidos'] = teacher.name;
    if (teacher.email) dbPayload['email'] = teacher.email;
    if (teacher.department) dbPayload['departamento'] = teacher.department;
    if (teacher.guard_group) dbPayload['grupo de guardia'] = teacher.guard_group;
    if (teacher.role) dbPayload['rol'] = teacher.role;
    if (teacher.horas_guardia !== undefined) dbPayload['horas_guardia'] = teacher.horas_guardia;
    if (teacher.active !== undefined) dbPayload['activo'] = teacher.active;

    const { error } = await supabase.from('Profesores').update(dbPayload).eq('id', id);
    if (error) {
        if (teacher.role) {
            await logSecurityEvent('ROLE_CHANGE_FAILED', 'CRITICAL', { attempted_role: teacher.role, error: error.message }, id, 'Profesores');
        }
        throw error;
    }
    invalidateCache(['teachers', 'teacher_by_email']);
    await logActivity('ADMIN_UPDATE_TEACHER', undefined, id);
    if (teacher.role) {
        await logSecurityEvent('ROLE_CHANGE_ATTEMPT', 'CRITICAL', { new_role: teacher.role }, id, 'Profesores');
    }
};

export const cloneTeacherSchedule = async (sourceId: string, targetId: string): Promise<void> => {
    // 1. Fetch source schedule from Horario_Personal
    const { data: schedule, error: schError } = await supabase
        .from('Horario_Personal')
        .select('*')
        .eq('profesor_id', sourceId);
    
    if (schError) throw schError;
    
    // 2. Clone Horario_Personal if exists
    if (schedule && schedule.length > 0) {
        const newEntries = schedule.map(entry => {
            const { id, created_at, ...rest } = entry;
            return {
                ...rest,
                profesor_id: targetId
            };
        });
        const { error: insError } = await supabase
            .from('Horario_Personal')
            .insert(newEntries);
        if (insError) throw insError;
    }

    // 3. Also clone from Grupos_Guardia (static schedules)
    const { data: guardGroups, error: ggError } = await supabase
        .from('Grupos_Guardia')
        .select('*')
        .eq('profesor_id', sourceId);
    
    if (!ggError && guardGroups && guardGroups.length > 0) {
        const newGG = guardGroups.map(entry => {
            const { id, ...rest } = entry;
            return {
                ...rest,
                profesor_id: targetId
            };
        });
        await supabase.from('Grupos_Guardia').insert(newGG);
    }
    
    // 4. Migrate Guards (statistics and historical data)
    await supabase.from('Guardias').update({ covering_teacher_id: targetId }).eq('covering_teacher_id', sourceId);
    await supabase.from('Guardias').update({ requesting_teacher_id: targetId }).eq('requesting_teacher_id', sourceId);

    // 5. Migrate Room Reservations
    await supabase.from('reservas_aulas').update({ profesor_id: targetId }).eq('profesor_id', sourceId);
    
    invalidateCache([
        'teachers', 'teacher_by_email',
        'personal_schedule', 'all_personal_schedules',
        'guard_group_schedules', 'auto_guard_groups',
        'room_reservations', 'quick_reservations',
        'guards'
    ]);
    await logActivity('ADMIN_CLONE_SCHEDULE', undefined, targetId);
};

export const deleteTeacher = async (id: string): Promise<void> => {
    await logSecurityEvent('ADMIN_DELETE_TEACHER', 'CRITICAL', { teacher_id: id }, id, 'Profesores');
    const { error } = await supabase.from('Profesores').delete().eq('id', id);
    if (error) throw error;
    invalidateCache(['teachers', 'teacher_by_email']);
    await logActivity('ADMIN_DELETE_TEACHER', undefined, id);
};

export const uploadTeacherPhoto = async (teacherId: string, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${teacherId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`; // In bucket 'Fotos'

    const { error: uploadError } = await supabase.storage
        .from('Fotos')
        .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    // Update the teacher record
    const { error: updateError } = await supabase
        .from('Profesores')
        .update({ 'foto': filePath })
        .eq('id', teacherId);

    if (updateError) throw updateError;

    invalidateCache(['teachers', 'teacher_by_email']);
    await logActivity('UPDATE_TEACHER_PHOTO', undefined, teacherId);
    return filePath;
};

export const updateTeacherPhotoUrl = async (teacherId: string, url: string): Promise<void> => {
    const { error: updateError } = await supabase
        .from('Profesores')
        .update({ 'foto': url })
        .eq('id', teacherId);

    if (updateError) throw updateError;
    invalidateCache(['teachers', 'teacher_by_email']);
    await logActivity('UPDATE_TEACHER_PHOTO', undefined, teacherId);
};

export const updateTeacherAvatarSeed = async (teacherId: string, seed: string): Promise<void> => {
    const { error: updateError, count } = await supabase
        .from('Profesores')
        // Si el usuario elige un avatar de la IA, queremos forzosamente que se elimine cualquier
        // foto previa subida manualmente para que predomine la semilla de código.
        .update({ 'avatar_seed': seed, 'foto': null })
        .eq('id', teacherId)
        .select();  // necesario para que Supabase devuelva el count real

    if (updateError) throw updateError;

    // RLS puede bloquear silenciosamente (count=0 sin error).
    // Si no se modificó ninguna fila, lanzamos un error claro.
    if (count !== null && count === 0) {
        console.error(`updateTeacherAvatarSeed: UPDATE bloqueado por RLS. teacherId=${teacherId}`);
        throw new Error('No tienes permiso para actualizar este perfil. Contacta con el administrador.');
    }
    invalidateCache(['teachers', 'teacher_by_email']);
};

export const deleteTeacherPhoto = async (teacherId: string): Promise<void> => {
    const { error: updateError } = await supabase
        .from('Profesores')
        .update({ 'foto': null })
        .eq('id', teacherId);

    if (updateError) throw updateError;
    invalidateCache(['teachers', 'teacher_by_email']);
    await logActivity('DELETE_TEACHER_PHOTO', undefined, teacherId);
};

export const upsertTeachers = async (teachers: any[]): Promise<void> => {
    const { error } = await supabase.from('Profesores').upsert(teachers, { onConflict: 'email' });
    if (error) throw error;
    invalidateCache(['teachers', 'teacher_by_email']);
};

// ─── INFRASTRUCTURE BULK ─────────────────────────────────

export const bulkCreateAulas = async (names: string[]): Promise<void> => {
    const payloads = names.map(name => ({ aulas: name }));
    const { error } = await supabase.from('Aulas').upsert(payloads, { onConflict: 'aulas' });
    if (error) throw error;
    invalidateCache('meta_options');
};

export const bulkCreateMaterias = async (names: string[]): Promise<void> => {
    const payloads = names.map(name => ({ materias: name }));
    const { error } = await supabase.from('Materias').upsert(payloads, { onConflict: 'materias' });
    if (error) throw error;
    invalidateCache('meta_options');
};

export const bulkCreateGrupos = async (names: string[]): Promise<void> => {
    const payloads = names.map(name => ({ grupos: name }));
    const { error } = await supabase.from('Grupos').upsert(payloads, { onConflict: 'grupos' });
    if (error) throw error;
    invalidateCache('meta_options');
};

// ─── GUARD GROUPS ────────────────────────────────────────

const mapGuardGroupSchedule = (g: any): GuardGroupSchedule => ({
    id: g.id,
    profesor_id: g.profesor_id,
    dia_semana: g.dia_semana,
    franja_id: g.franja_id,
    horas: g.horas ?? 1,
    teacher: g.teacher ? {
        id: g.teacher.id,
        name: g.teacher['nombre y apellidos'],
        avatar_url: g.teacher.foto,
        avatar_seed: g.teacher.avatar_seed,
        email: g.teacher.email,
        department: g.teacher.departamento,
        guard_group: g.teacher['grupo de guardia'],
        horas_guardia: g.teacher.horas_guardia ?? 1
    } : undefined,
    time_slot: g.time_slot ? {
        id: g.time_slot['id franja'],
        label: g.time_slot['franja'],
        start_time: g.time_slot['hora inicio'],
        end_time: g.time_slot['hora fin']
    } : undefined
});

export const getGuardGroupSchedules = async (): Promise<GuardGroupSchedule[]> => {
    return getCached('guard_group_schedules', async () => {
        const { data, error } = await supabase
            .from('Grupos_Guardia')
            .select(`
                id,
                profesor_id,
                dia_semana,
                franja_id,
                horas,
                teacher:Profesores!Grupos_Guardia_profesor_id_fkey(id, "nombre y apellidos", foto, avatar_seed, email, departamento, "grupo de guardia", horas_guardia, activo),
                time_slot:"Franjas horarias"!Grupos_Guardia_franja_id_fkey("id franja", franja, "hora inicio", "hora fin")
            `);

        if (error) {
            console.error('Error fetching schedules:', error);
            return [];
        }
        if (!data) return [];
        
        // Filtramos los registros cuyos profesores están de baja (activo === false)
        return (data as any[]).filter(d => !d.teacher || d.teacher.activo !== false).map(mapGuardGroupSchedule);
    }, 30);
};

export const createGuardGroupSchedule = async (schedule: Partial<GuardGroupSchedule>): Promise<GuardGroupSchedule> => {
    const dbPayload = {
        profesor_id: schedule.profesor_id,
        dia_semana: schedule.dia_semana,
        franja_id: schedule.franja_id,
        horas: schedule.horas ?? 1
    };

    const { data, error } = await supabase.from('Grupos_Guardia').insert(dbPayload).select().single();
    if (error) throw error;
    invalidateCache(['guard_group_schedules', 'auto_guard_groups']);
    return mapGuardGroupSchedule(data);
};

export const deleteGuardGroupSchedule = async (id: string): Promise<void> => {
    const { error } = await supabase.from('Grupos_Guardia').delete().eq('id', id);
    if (error) throw error;
    invalidateCache(['guard_group_schedules', 'auto_guard_groups']);
};

// ─── PERSONAL SCHEDULE ─────────────────────────────────

export const getPersonalSchedule = async (teacherId: string): Promise<PersonalScheduleEntry[]> => {
    const key = `personal_schedule:${teacherId}`;
    return getCached(key, async () => {
        const { data, error } = await supabase
            .from('Horario_Personal')
            .select(`
                *,
                materia:Materias (*),
                grupo:Grupos (*),
                aula:Aulas (*)
            `)
            .eq('profesor_id', teacherId);

        if (error) {
            console.error('Error fetching personal schedule:', error);
            return [];
        }

        // Map IDs to match interface (e.g., "id materias" to "id")
        return (data || []).map(entry => ({
            ...entry,
            materia: entry.materia ? {
                id: entry.materia['id materias'],
                name: entry.materia.materias
            } : undefined,
            grupo: entry.grupo ? {
                id: entry.grupo['id grupos'],
                name: entry.grupo.grupos
            } : undefined,
            aula: entry.aula ? {
                id: entry.aula['id aulas'],
                name: entry.aula.aulas
            } : undefined
        }));
    }, 30);
};

export const getAllPersonalSchedules = async (): Promise<PersonalScheduleEntry[]> => {
    return getCached('all_personal_schedules', async () => {
        let allData: any[] = [];
        let hasMore = true;
        let from = 0;
        const step = 999;

        while (hasMore) {
            const { data, error } = await supabase
                .from('Horario_Personal')
                .select(`
                    id,
                    profesor_id,
                    dia_semana,
                    franja_id,
                    materia_id,
                    grupo_id,
                    aula_id,
                    tipo,
                    created_at,
                    materia:Materias (*),
                    grupo:Grupos (*),
                    aula:Aulas (*),
                    teacher:Profesores!Horario_Personal_profesor_id_fkey(activo)
                `)
                .range(from, from + step);

            if (error) {
                console.error('Error fetching all personal schedules:', error);
                return [];
            }

            if (data && data.length > 0) {
                // Filltramos las entradas cuyos profesores están de baja
                const filteredData = data.filter((d: any) => !d.teacher || d.teacher.activo !== false);
                allData = [...allData, ...filteredData];
            }

            if (!data || data.length <= step) {
                hasMore = false;
            } else {
                from += step + 1;
            }
        }

        return allData.map((entry: any) => {
            // Handle potential array or object from Supabase joins
            const materiaData = Array.isArray(entry.materia) ? entry.materia[0] : entry.materia;
            const grupoData = Array.isArray(entry.grupo) ? entry.grupo[0] : entry.grupo;
            const aulaData = Array.isArray(entry.aula) ? entry.aula[0] : entry.aula;

            return {
                ...entry,
                materia: materiaData ? {
                    id: materiaData['id materias'],
                    name: materiaData.materias
                } : undefined,
                grupo: grupoData ? {
                    id: grupoData['id grupos'],
                    name: grupoData.grupos
                } : undefined,
                aula: aulaData ? {
                    id: aulaData['id aulas'],
                    name: aulaData.aulas
                } : undefined
            };
        });
    }, 30);
};

export const getAuditData = async (): Promise<{lectivoIds: Set<string>, guardiaIds: Set<string>}> => {
    return getCached('audit_data', async () => {
        try {
            const lectivoIds = new Set<string>();
            const guardiaIds = new Set<string>();
            
            let hasMore = true;
            let from = 0;
            const step = 999;

            while (hasMore) {
                const { data, error } = await supabase
                    .from('Horario_Personal')
                    .select('profesor_id, tipo')
                    .range(from, from + step);
                
                if (error) throw error;

                (data || []).forEach(row => {
                    if (row.tipo === 'Lectivo') lectivoIds.add(row.profesor_id);
                    if (row.tipo === 'Guardia') guardiaIds.add(row.profesor_id);
                });

                if (!data || data.length <= step) {
                    hasMore = false;
                } else {
                    from += step + 1;
                }
            }

            return { lectivoIds, guardiaIds };
        } catch (error) {
            console.error('getAuditData error:', error);
            return { lectivoIds: new Set(), guardiaIds: new Set() };
        }
    }, 30);
};

export const createPersonalScheduleEntry = async (entry: Partial<PersonalScheduleEntry>): Promise<void> => {
    const { error } = await supabase.from('Horario_Personal').insert({
        profesor_id: entry.profesor_id,
        dia_semana: entry.dia_semana,
        franja_id: entry.franja_id,
        materia_id: entry.materia_id || null,
        grupo_id: entry.grupo_id || null,
        aula_id: entry.aula_id || null,
        tipo: entry.tipo || 'Lectivo'
    });
    if (error) throw error;
    invalidateCache(['personal_schedule', 'all_personal_schedules', 'auto_guard_groups', 'audit_data']);
};

export const updatePersonalScheduleEntry = async (id: string, entry: Partial<PersonalScheduleEntry>): Promise<void> => {
    const { error } = await supabase.from('Horario_Personal').update({
        profesor_id: entry.profesor_id,
        dia_semana: entry.dia_semana,
        franja_id: entry.franja_id,
        materia_id: entry.materia_id || null,
        grupo_id: entry.grupo_id || null,
        aula_id: entry.aula_id || null,
        tipo: entry.tipo || 'Lectivo'
    }).eq('id', id);
    if (error) throw error;
    invalidateCache(['personal_schedule', 'all_personal_schedules', 'auto_guard_groups', 'audit_data']);
};

export const deletePersonalScheduleEntry = async (id: string): Promise<void> => {
    const { error } = await supabase.from('Horario_Personal').delete().eq('id', id);
    if (error) throw error;
    invalidateCache(['personal_schedule', 'all_personal_schedules', 'auto_guard_groups', 'audit_data']);
};

export const deletePersonalScheduleEntries = async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return;
    const { error } = await supabase.from('Horario_Personal').delete().in('id', ids);
    if (error) throw error;
    invalidateCache(['personal_schedule', 'all_personal_schedules', 'auto_guard_groups', 'audit_data']);
};

export const getAutoGuardGroups = async (): Promise<GuardGroupSchedule[]> => {
    return getCached('auto_guard_groups', async () => {
        let allData: any[] = [];
        let hasMore = true;
        let from = 0;
        const step = 999;

        while (hasMore) {
            const { data, error } = await supabase
                .from('Horario_Personal')
                .select(`
                    id,
                    profesor_id,
                    dia_semana,
                    franja_id,
                    tipo,
                    teacher:Profesores!Horario_Personal_profesor_id_fkey(
                        id,
                        "nombre y apellidos",
                        foto,
                        avatar_seed,
                        email,
                        departamento,
                        "grupo de guardia",
                        horas_guardia,
                        activo
                    ),
                    time_slot:"Franjas horarias"!Horario_Personal_franja_id_fkey(
                        "id franja",
                        franja,
                        "hora inicio",
                        "hora fin"
                    )
                `)
                .eq('tipo', 'Guardia')
                .order('dia_semana')
                .order('franja_id')
                .range(from, from + step);

            if (error) {
                console.error('getAutoGuardGroups: Error fetching auto guard groups:', error);
                return [];
            }

            if (data && data.length > 0) {
                // Filltramos las entradas cuyos profesores están de baja
                const filteredData = data.filter((d: any) => !d.teacher || d.teacher.activo !== false);
                allData = [...allData, ...filteredData];
            }

            if (!data || data.length <= step) {
                hasMore = false;
            } else {
                from += step + 1;
            }
        }

        return allData.map((entry: any): GuardGroupSchedule => {
            const t = Array.isArray(entry.teacher) ? entry.teacher[0] : entry.teacher;
            const sf = Array.isArray(entry.time_slot) ? entry.time_slot[0] : entry.time_slot;

            return {
                id: entry.id,
                profesor_id: entry.profesor_id,
                dia_semana: entry.dia_semana,
                franja_id: entry.franja_id,
                horas: 1,
                teacher: t ? {
                    id: t.id,
                    name: t['nombre y apellidos'],
                    avatar_url: t.foto,
                    avatar_seed: t.avatar_seed,
                    email: t.email,
                    department: t.departamento,
                    guard_group: t['grupo de guardia'],
                    horas_guardia: t.horas_guardia ?? 1,
                } : undefined,
                time_slot: sf ? {
                    id: sf['id franja'],
                    label: sf['franja'],
                    start_time: sf['hora inicio'],
                    end_time: sf['hora fin']
                } : undefined
            };
        });
    }, 30);
};

export const bulkCreatePersonalSchedule = async (entries: any[]): Promise<void> => {
    const { error } = await supabase.from('Horario_Personal').insert(entries);
    if (error) throw error;
    invalidateCache(['personal_schedule', 'all_personal_schedules', 'auto_guard_groups', 'audit_data']);
};

export const bulkCreateGuardSchedules = async (entries: any[]): Promise<void> => {
    const { error } = await supabase.from('Grupos_Guardia').insert(entries);
    if (error) throw error;
    invalidateCache(['guard_group_schedules', 'auto_guard_groups']);
};

// ─── GUARDS ─────────────────────────────────────────────

const GUARDS_SELECT = `
  "ID Guardia",
  "Fecha",
  "Franja horaria",
  "Profesor ausente",
  "Materia ausente",
  "Grupo atendido",
  "Aula",
  "Observaciones",
  "Estado",
  "Profesor de guardia",
  "Tipo de Guardia",
  "Tarea dejada",
  "Archivo de tarea",
  requesting_teacher:Profesores!"Guardias_Profesor ausente_fkey1"(id, "nombre y apellidos", foto, avatar_seed, email),
  covering_teacher:Profesores!"Guardias_Profesor de guardia_fkey"(id, "nombre y apellidos", foto, avatar_seed, email),
  time_slot:"Franjas horarias"!"Guardias_Franja horaria_fkey"("id franja", franja, "hora inicio", "hora fin"),
  group:Grupos!"Guardias_Grupo atendido_fkey"("id grupos", grupos),
  subject:Materias!"Guardias_Materia ausente_fkey"("id materias", materias),
  classroom:Aulas!"Guardias_Aula_fkey"("id aulas", aulas)
`;

const mapGuard = (g: any): Guard => ({
    id: g['ID Guardia'],
    date: g['Fecha'],
    time_slot_id: g['Franja horaria'],
    classroom_id: g['Aula'],
    group_id: g['Grupo atendido'],
    subject_id: g['Materia ausente'],
    requesting_teacher_id: g['Profesor ausente'],
    covering_teacher_id: g['Profesor de guardia'],
    status: g['Estado'] as GuardStatus,
    type: (g['Tipo de Guardia'] as GuardType) || GuardType.ORDINARY,
    observations: g['Observaciones'],
    has_task: g['Tarea dejada'],
    task_file_url: g['Archivo de tarea'],
    requesting_teacher: g.requesting_teacher
        ? { id: g.requesting_teacher.id, name: g.requesting_teacher['nombre y apellidos'], avatar_url: g.requesting_teacher.foto, avatar_seed: g.requesting_teacher.avatar_seed, email: g.requesting_teacher.email, department: '', guard_group: '' }
        : undefined,
    covering_teacher: g.covering_teacher
        ? { id: g.covering_teacher.id, name: g.covering_teacher['nombre y apellidos'], avatar_url: g.covering_teacher.foto, avatar_seed: g.covering_teacher.avatar_seed, email: g.covering_teacher.email, department: '', guard_group: '' }
        : undefined,
    time_slot: g.time_slot
        ? { id: g.time_slot['id franja'], label: g.time_slot['franja'], start_time: g.time_slot['hora inicio'], end_time: g.time_slot['hora fin'] }
        : undefined,
    group: g.group
        ? { id: g.group['id grupos'], name: g.group['grupos'] }
        : undefined,
    subject: g.subject
        ? { id: g.subject['id materias'], name: g.subject['materias'] }
        : undefined,
    classroom: g.classroom
        ? { id: g.classroom['id aulas'], name: g.classroom['aulas'] }
        : { id: g['Aula'], name: g['Aula'] },
});

export const getGuards = async (): Promise<Guard[]> => {
    return getCached('guards', async () => {
        const { data, error } = await supabase
            .from('Guardias')
            .select(GUARDS_SELECT)
            .order('Fecha', { ascending: false })
            .order('Franja horaria', { ascending: true });

        if (error || !data) {
            console.error('Error cargando guardias:', error);
            return [];
        }
        return data.map(mapGuard);
    }, 5);
};

// ─── ID GENERATOR ───────────────────────────────────────

export const generateGuardId = async (): Promise<string> => {
    const { data, error } = await supabase
        .from('Guardias')
        .select('"ID Guardia"')
        .order('ID Guardia', { ascending: false })
        .limit(1);

    if (error) {
        console.error('generateGuardId: Error al obtener el último ID:', error);
    }

    let nextNumber = 1;
    if (!error && data && data.length > 0) {
        const lastId = (data[0] as any)['ID Guardia'];
        if (lastId && typeof lastId === 'string') {
            const parts = lastId.split('-');
            // Formato esperado: G-XXX o G-XXX-YYY
            if (parts.length >= 2) {
                const numberPart = parseInt(parts[1]);
                if (!isNaN(numberPart)) {
                    nextNumber = numberPart + 1;
                }
            }
        }
    }

    const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const newId = `G-${nextNumber.toString().padStart(3, '0')}-${randomPart}`;
    console.log('generateGuardId: Nuevo ID generado:', newId);
    return newId;
};

// ─── GUARD MUTATIONS ────────────────────────────────────

export const createGuard = async (guard: Partial<Guard>): Promise<any> => {
    const newId = await generateGuardId();
    const dbPayload: any = {
        'ID Guardia': newId,
        'Fecha': guard.date,
        'Franja horaria': guard.time_slot_id,
        'Aula': guard.classroom_id || null,
        'Grupo atendido': guard.group_id || null,
        'Materia ausente': guard.subject_id || null,
        'Profesor ausente': guard.requesting_teacher_id !== undefined ? guard.requesting_teacher_id : null,
        'Estado': guard.status || GuardStatus.AVAILABLE,
        'Tipo de Guardia': guard.type,
        'Tarea dejada': guard.has_task || 'NO',
        'Observaciones': sanitizeInput(guard.observations) || null,
        'Archivo de tarea': guard.task_file_url || null,
    };
    if (guard.covering_teacher_id) {
        dbPayload['Profesor de guardia'] = guard.covering_teacher_id;
    }

    console.log('supabaseClient: Intentando crear guardia con payload:', dbPayload);

    const { data, error } = await supabase.from('Guardias').insert(dbPayload).select().single();
    if (error) {
        console.error('supabaseClient: Error exacto al insertar guardia:', error);
        throw error;
    }

    invalidateCache('guards');
    await logActivity('ADMIN_CREATE_GUARD', newId);
    return data;
};

export const logActivity = async (action: string, guardId?: string, userId?: string) => {
    // During tests, also log to console as requested
    console.log(`[ACTIVITY LOGGER] ${new Date().toISOString()} | User: ${userId} | Action: ${action} | Guard: ${guardId}`);

    try {
        await supabase.from('Activity_Logs').insert({
            user_id: userId,
            action,
            guard_id: guardId,
            created_at: new Date().toISOString()
        });
    } catch (err) {
        console.error('Error logging activity:', err);
    }
};

export const updateGuardStatus = async (
    guardId: string,
    status: GuardStatus,
    teacherId?: string,
    currentTeacherId?: string, // Who is performing the action
    bypassConcurrency: boolean = false
): Promise<{ success: boolean; message?: string }> => {

    // Optimistic Concurrency Check:
    // If we're setting it to ASSIGNED, only do it if currently AVAILABLE
    if (status === GuardStatus.ASSIGNED && !bypassConcurrency) {
        const { data: current, error: checkError } = await supabase
            .from('Guardias')
            .select('Estado')
            .eq('ID Guardia', guardId)
            .single();

        if (checkError || (current && current.Estado !== GuardStatus.AVAILABLE)) {
            await logActivity('PICKUP_FAILED_CONCURRENCY', guardId, currentTeacherId);
            return { success: false, message: 'Lo sentimos, esta guardia acaba de ser cubierta por otro compañero.' };
        }
    }

    const updateData: any = { 'Estado': status };
    if (teacherId) updateData['Profesor de guardia'] = teacherId;
    // Clear covering teacher if setting back to available
    if (status === GuardStatus.AVAILABLE) updateData['Profesor de guardia'] = null;

    const { data, error } = await supabase.from('Guardias').update(updateData).eq('ID Guardia', guardId).select();
    if (error) throw error;
    if (!data || data.length === 0) {
        console.error('updateGuardStatus failed: No rows updated. Possibly blocked by RLS or guardId not found.', guardId);
        return { success: false, message: 'No se pudo actualizar la guardia (posible fallo de permisos o guardia no encontrada).' };
    }

    invalidateCache('guards');

    // Log the successful action
    const actionLabel = status === GuardStatus.ASSIGNED ? 'PICKUP_GUARD' :
        status === GuardStatus.COMPLETED ? 'COMPLETE_GUARD' :
            'RELEASE_GUARD';

    await logActivity(actionLabel, guardId, currentTeacherId || teacherId);

    return { success: true };
};

export const batchUpdateGuardStatus = async (
    guardIds: string[],
    status: GuardStatus,
    currentTeacherId?: string
): Promise<void> => {
    if (guardIds.length === 0) return;

    const { error } = await supabase
        .from('Guardias')
        .update({ 'Estado': status })
        .in('ID Guardia', guardIds);

    if (error) throw error;

    invalidateCache('guards');

    for (const guardId of guardIds) {
        await logActivity('AUTO_COMPLETE_GUARD', guardId, currentTeacherId || 'sistema');
    }
};

export const updateGuardDetails = async (guardId: string, guard: Partial<Guard>): Promise<void> => {
    const dbPayload = {
        'Fecha': guard.date,
        'Franja horaria': guard.time_slot_id,
        'Aula': guard.classroom_id,
        'Grupo atendido': guard.group_id,
        'Materia ausente': guard.subject_id,
        'Tipo de Guardia': guard.type,
        'Tarea dejada': guard.has_task,
        'Observaciones': sanitizeInput(guard.observations),
        'Archivo de tarea': guard.task_file_url,
    };

    const { error } = await supabase.from('Guardias').update(dbPayload).eq('ID Guardia', guardId);
    if (error) throw error;
    invalidateCache('guards');
};

export const deleteGuard = async (guardId: string): Promise<void> => {
    const { error } = await supabase.from('Guardias').delete().eq('ID Guardia', guardId);
    if (error) throw error;
    invalidateCache('guards');
    await logActivity('ADMIN_DELETE_GUARD', guardId);
};

// ─── STORAGE ─────────────────────────────────────────────

export const uploadTaskFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `tasks/${fileName}`;

    const { error } = await supabase.storage
        .from('guardias-tareas')
        .upload(filePath, file);

    if (error) throw error;

    return filePath;
};

export const getTaskFileUrl = (path: string) => {
    const { data } = supabase.storage.from('guardias-tareas').getPublicUrl(path);
    return data.publicUrl;
};

// ─── META OPTIONS ───────────────────────────────────────

export const getMetaOptions = async (): Promise<MetaOptions> => {
    return getCached('meta_options', async () => {
        const results = await Promise.allSettled([
            supabase.from('Franjas horarias').select('*').order('hora inicio', { ascending: true }),
            supabase.from('Aulas').select('*').order('aulas', { ascending: true }),
            supabase.from('Grupos').select('*').order('grupos', { ascending: true }),
            supabase.from('Materias').select('*').order('materias', { ascending: true }),
        ]);

        const extract = (r: PromiseSettledResult<any>) =>
            r.status === 'fulfilled' && r.value.data ? r.value.data : [];

        const slots = extract(results[0]).map((s: any) => ({
            id: s['id franja'],
            label: s['franja'],
            start_time: s['hora inicio'],
            end_time: s['hora fin'],
        }));

        const classrooms = extract(results[1]).map((c: any) => ({
            id: c['id aulas'],
            name: c['aulas'],
            location: c['ubicación'],
        }));

        const groups = extract(results[2]).map((g: any) => ({
            id: g['id grupos'],
            name: g['grupos'],
            education_level: g['enseñanza'],
        }));

        const subjects = extract(results[3]).map((s: any) => ({
            id: s['id materias'],
            name: s['materias'],
            padre_id: s['padre_id'],
        }));

        return { slots, classrooms, groups, subjects };
    }, 60);
};

// ─── META MUTATIONS ──────────────────────────────────────

export const updateClassroom = async (id: string, name: string): Promise<void> => {
    const { error } = await supabase.from('Aulas').update({ 'aulas': name }).eq('id aulas', id);
    if (error) throw error;
    invalidateCache('meta_options');
};

export const deleteClassroom = async (id: string): Promise<void> => {
    const { error } = await supabase.from('Aulas').delete().eq('id aulas', id);
    if (error) throw error;
    invalidateCache('meta_options');
};

export const updateGroup = async (id: string, name: string): Promise<void> => {
    const { error } = await supabase.from('Grupos').update({ 'grupos': name }).eq('id grupos', id);
    if (error) throw error;
    invalidateCache('meta_options');
};

export const deleteGroup = async (id: string): Promise<void> => {
    const { error } = await supabase.from('Grupos').delete().eq('id grupos', id);
    if (error) throw error;
    invalidateCache('meta_options');
};

export const updateSubject = async (id: string, name: string): Promise<void> => {
    const { error } = await supabase.from('Materias').update({ 'materias': name }).eq('id materias', id);
    if (error) throw error;
    invalidateCache('meta_options');
};

export const deleteSubject = async (id: string): Promise<void> => {
    const { error } = await supabase.from('Materias').delete().eq('id materias', id);
    if (error) throw error;
    invalidateCache('meta_options');
};

// ─── NEW CREATE FUNCTIONS ────────────────────────────────

export const generateClassroomId = async (): Promise<string> => {
    const { data, error } = await supabase.from('Aulas').select('"id aulas"');
    if (error) {
        console.error('generateClassroomId: Error selecting:', error);
        throw error;
    }
    if (!data || data.length === 0) return 'A001';
    const nums = data.map(d => {
        const val = String(Object.values(d)[0] || '');
        const match = val.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
    });
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    console.log('generateClassroomId: Max found', max);
    return `A${(max + 1).toString().padStart(3, '0')}`;
};

export const generateGroupId = async (): Promise<string> => {
    const { data, error } = await supabase.from('Grupos').select('"id grupos"');
    if (error) throw error;
    if (!data || data.length === 0) return 'G001';
    const nums = data.map(d => {
        const val = String(Object.values(d)[0] || '');
        const match = val.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
    });
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `G${(max + 1).toString().padStart(3, '0')}`;
};

export const generateSubjectId = async (): Promise<string> => {
    const { data, error } = await supabase.from('Materias').select('"id materias"');
    if (error) throw error;
    if (!data || data.length === 0) return 'M001';
    const nums = data.map(d => {
        const val = String(Object.values(d)[0] || '');
        const match = val.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
    });
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `M${(max + 1).toString().padStart(3, '0')}`;
};

export const generateTimeSlotId = async (): Promise<string> => {
    const { data, error } = await supabase.from('Franjas horarias').select('"id franja"');
    if (error) {
        console.error('generateTimeSlotId: Error selecting:', error);
        throw error;
    }
    if (!data || data.length === 0) return 'F001';
    const nums = data.map(d => {
        const val = String(Object.values(d)[0] || '');
        const match = val.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
    });
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    console.log('generateTimeSlotId: Max found', max, 'Returning', `F${(max + 1).toString().padStart(3, '0')}`);
    return `F${(max + 1).toString().padStart(3, '0')}`;
};

export const createClassroom = async (name: string): Promise<void> => {
    const id = await generateClassroomId();
    const { error } = await supabase.from('Aulas').insert({ 'id aulas': id, 'aulas': name });
    if (error) throw error;
    invalidateCache('meta_options');
};

export const createGroup = async (name: string): Promise<void> => {
    const id = await generateGroupId();
    const { error } = await supabase.from('Grupos').insert({ 'id grupos': id, 'grupos': name });
    if (error) throw error;
    invalidateCache('meta_options');
};

/**
 * findOrCreateMixedGroup
 * Busca un grupo por nombre exacto en la tabla Grupos.
 * Si existe, devuelve su ID. Si no, lo crea y devuelve el nuevo ID.
 * Se usa para grupos mixtos generados automáticamente por los profesores 
 * (ej: "ESO1 A+B+C").
 */
export const findOrCreateMixedGroup = async (name: string): Promise<string> => {
    // 1. Buscar si ya existe
    const { data: existing, error: searchError } = await supabase
        .from('Grupos')
        .select('"id grupos"')
        .eq('grupos', name)
        .limit(1);
    
    if (searchError) throw searchError;
    
    if (existing && existing.length > 0) {
        return existing[0]['id grupos'];
    }
    
    // 2. No existe → crear nuevo
    const id = await generateGroupId();
    const { error: insertError } = await supabase
        .from('Grupos')
        .insert({ 'id grupos': id, 'grupos': name });
    
    if (insertError) throw insertError;
    invalidateCache('meta_options');
    return id;
};

export const createSubject = async (name: string, padre_id?: string): Promise<void> => {
    const id = await generateSubjectId();
    const payload: any = { 'id materias': id, 'materias': name };
    if (padre_id) payload.padre_id = padre_id;
    const { error } = await supabase.from('Materias').insert(payload);
    if (error) throw error;
    invalidateCache('meta_options');
};

export const createTimeSlot = async (slot: Partial<TimeSlot>): Promise<void> => {
    const id = await generateTimeSlotId();
    const start = slot.start_time?.length === 5 ? `${slot.start_time}:00` : slot.start_time;
    const end = slot.end_time?.length === 5 ? `${slot.end_time}:00` : slot.end_time;

    const { error } = await supabase.from('Franjas horarias').insert({
        'id franja': id,
        'franja': slot.label,
        'hora inicio': start,
        'hora fin': end
    });
    if (error) throw error;
    invalidateCache('meta_options');
};

export const updateTimeSlot = async (id: string, slot: Partial<TimeSlot>): Promise<void> => {
    const { error } = await supabase.from('Franjas horarias').update({
        'franja': slot.label,
        'hora inicio': slot.start_time,
        'hora fin': slot.end_time
    }).eq('id franja', id);
    if (error) throw error;
    invalidateCache('meta_options');
};

export const deleteTimeSlot = async (id: string): Promise<void> => {
    const { error } = await supabase.from('Franjas horarias').delete().eq('id franja', id);
    if (error) throw error;
    invalidateCache('meta_options');
};

// ─── REALTIME ───────────────────────────────────────────

export const subscribeToGuards = (onDataChange: () => void) => {
    const channel = supabase
        .channel('guardias-realtime')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'Guardias' },
            () => {
                invalidateCache('guards');
                onDataChange();
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

// ─── CALENDAR ───────────────────────────────────────────

export const getCalendarDays = async (): Promise<CalendarDay[]> => {
    return getCached('calendar_days', async () => {
        const { data, error } = await supabase
            .from('Calendario')
            .select('*')
            .order('fecha', { ascending: true });

        if (error) {
            console.error('Error fetching calendar:', error);
            return [];
        }

        return (data || []).map((d: any) => ({
            id: String(d.id),
            fecha: d.fecha,
            es_lectivo: d.es_lectivo,
            descripcion: d.descripcion,
        }));
    }, 60);
};

export const updateCalendarDay = async (fecha: string, es_lectivo: boolean, descripcion?: string): Promise<void> => {
    const { error } = await supabase
        .from('Calendario')
        .update({ es_lectivo, descripcion: descripcion || null })
        .eq('fecha', fecha);

    if (error) throw error;
    invalidateCache(['calendar_days', 'school_day']);
};

export const isSchoolDay = async (dateStr: string): Promise<boolean> => {
    return getCached(`school_day:${dateStr}`, async () => {
        const { data, error } = await supabase
            .from('Calendario')
            .select('es_lectivo')
            .eq('fecha', dateStr)
            .maybeSingle();

        if (error) {
            console.error('Error checking school day:', error);
            return true; // Default to lectivo if error
        }

        // If no entry exists (e.g. summer), treat as non-school day
        if (!data) return false;
        return data.es_lectivo;
    }, 60);
};

// ─── CALENDAR EVENTS ───────────────────────────────────

export const getCalendarEvents = async (): Promise<CalendarEvent[]> => {
    return getCached('calendar_events', async () => {
        const { data, error } = await supabase
            .from('calendar_events')
            .select(`
                *,
                creator:Profesores(*)
            `)
            .order('date', { ascending: true });

        if (error) {
            console.error('Error fetching calendar events:', error);
            return [];
        }

        return (data || []).map((e: any) => ({
            ...e,
            creator: e.creator ? mapTeacher(e.creator) : undefined
        }));
    }, 10);
};

export const createCalendarEvent = async (event: Partial<CalendarEvent>): Promise<void> => {
    const { error } = await supabase
        .from('calendar_events')
        .insert({
            date: event.date,
            title: sanitizeInput(event.title),
            description: sanitizeInput(event.description),
            file_url: event.file_url,
            creator_id: event.creator_id,
            category: event.category || 'General'
        });

    if (error) throw error;
    invalidateCache('calendar_events');
};

export const deleteCalendarEvent = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

    if (error) throw error;
    invalidateCache('calendar_events');
};

export const uploadCalendarFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `calendar-files/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('guardia-tasks') // Reuse existing bucket or create a new one
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
        .from('guardia-tasks')
        .getPublicUrl(filePath);

    return data.publicUrl;
};

// ─── ROOM RESERVATIONS ──────────────────────────────────
import { RoomReservation } from '../types';

export const getRoomReservations = async (): Promise<RoomReservation[]> => {
    return getCached('room_reservations', async () => {
        const { data: resData, error: resError } = await supabase
            .from('reservas_aulas')
            .select(`
                *,
                classroom:Aulas!reservas_aulas_aula_id_fkey ("id aulas", aulas, "ubicación")
            `);
        
        if (resError) {
            console.error('Error fetching room reservations:', resError);
            return [];
        }

        const { data: teachersData, error: teachersError } = await supabase
            .from('Profesores')
            .select('*');

        if (teachersError) {
            console.error('Error fetching teachers for reservations:', teachersError);
            return [];
        }

        const teachersMap = new Map();
        (teachersData || []).forEach((t: any) => {
            if (t.user_id) {
                teachersMap.set(t.user_id, mapTeacher(t));
            }
        });

        return (resData || [])
            .map((d: any) => {
                const matchedTeacher = d.profesor_id ? teachersMap.get(d.profesor_id) : null;
                return {
                    ...d,
                    teacher: matchedTeacher || undefined,
                    classroom: d.classroom ? {
                        id: d.classroom['id aulas'],
                        name: d.classroom.aulas,
                        location: d.classroom['ubicación']
                    } : undefined
                };
            })
            .filter((d: any) => !d.teacher || d.teacher.active !== false);
    }, 5);
};

export const createRoomReservation = async (reservation: Partial<RoomReservation>): Promise<void> => {
    let finalProfesorId = reservation.profesor_id;
    if (!finalProfesorId) {
        const session = await supabase.auth.getSession();
        finalProfesorId = session?.data?.session?.user?.id;
    }

    if (!finalProfesorId) throw new Error("No se pudo identificar al usuario para la reserva.");

    const { error } = await supabase.from('reservas_aulas').insert({
        aula_id: reservation.aula_id,
        profesor_id: finalProfesorId,
        fecha: reservation.fecha,
        tramo_horario: reservation.tramo_horario,
        motivo: sanitizeInput(reservation.motivo),
        anual: reservation.anual || false
    });
    if (error) throw error;
    invalidateCache('room_reservations');
};

export const deleteRoomReservation = async (id: string): Promise<void> => {
    const { error } = await supabase.from('reservas_aulas').delete().eq('id', id);
    if (error) throw error;
    invalidateCache('room_reservations');
};

// ─── QUICK (DAILY) ROOM RESERVATIONS ────────────────────
// Quick reservations use motivo = 'RAPIDA:TeacherName' to differentiate
// from normal reservations. They auto-expire at end of day.

export const getQuickReservationsForDate = async (fecha: string): Promise<RoomReservation[]> => {
    return getCached(`quick_reservations:${fecha}`, async () => {
        const { data, error } = await supabase
            .from('reservas_aulas')
            .select(`
                *,
                classroom:Aulas!reservas_aulas_aula_id_fkey ("id aulas", aulas, "ubicación")
            `)
            .eq('fecha', fecha)
            .like('motivo', 'RAPIDA:%');

        if (error) {
            console.error('Error fetching quick reservations:', error);
            return [];
        }

        return (data || []).map((d: any) => ({
            ...d,
            classroom: d.classroom ? {
                id: d.classroom['id aulas'],
                name: d.classroom.aulas,
                location: d.classroom['ubicación']
            } : undefined
        }));
    }, 5);
};

export const createQuickReservation = async (
    aulaId: string,
    fecha: string,
    tramoHorario: string,
    teacherName: string
): Promise<void> => {
    const session = await supabase.auth.getSession();
    const userId = session?.data?.session?.user?.id;
    if (!userId) throw new Error('No autenticado');

    const { error } = await supabase.from('reservas_aulas').insert({
        aula_id: aulaId,
        profesor_id: userId,
        fecha,
        tramo_horario: tramoHorario,
        motivo: `RAPIDA:${sanitizeInput(teacherName)}`,
        anual: false
    });
    if (error) throw error;
    invalidateCache(['room_reservations', 'quick_reservations']);
};

export const cleanupExpiredQuickReservations = async (): Promise<number> => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
        .from('reservas_aulas')
        .delete()
        .like('motivo', 'RAPIDA:%')
        .lt('fecha', today)
        .select('id');

    if (error) {
        console.error('Error cleaning up quick reservations:', error);
        return 0;
    }
    invalidateCache(['room_reservations', 'quick_reservations']);
    return data?.length || 0;
};

export const resetQuickReservationsForDate = async (fecha: string): Promise<void> => {
    const { error } = await supabase
        .from('reservas_aulas')
        .delete()
        .eq('fecha', fecha)
        .like('motivo', 'RAPIDA:%');
    if (error) throw error;
    invalidateCache(['room_reservations', 'quick_reservations']);
};

// ─── LIBRE DISPOSICIÓN ──────────────────────────────────

export type LdTipo = 'ordinario' | 'causa_sobrevenida';

export interface LibreDisposicion {
    id: string;
    profesor_id: string;
    fecha: string;
    tipo: LdTipo;
    creado_at?: string;
    teacher?: Teacher;
}

/** Devuelve todos los registros de libre disposición. */
export const getLibreDisposicion = async (): Promise<LibreDisposicion[]> => {
    return getCached('libre_disposicion', async () => {
        const { data, error } = await supabase
            .from('libre_disposicion')
            .select(`
                *,
                teacher:Profesores!libre_disposicion_profesor_id_fkey("nombre y apellidos", id, email, departamento, "grupo de guardia", foto, avatar_seed, rol, horas_guardia, activo)
            `)
            .order('fecha', { ascending: true });

        if (error) {
            console.error('getLibreDisposicion error:', error);
            return [];
        }

        return (data || []).map((d: any) => ({
            id: d.id,
            profesor_id: d.profesor_id,
            fecha: d.fecha,
            tipo: (d.tipo || 'ordinario') as LdTipo,
            creado_at: d.creado_at,
            teacher: d.teacher ? mapTeacher(d.teacher) : undefined,
        }));
    }, 5);
};

/**
 * Registra un día de libre disposición para un profesor y genera
 * automáticamente las guardias correspondientes en la tabla Guardias.
 */
export const createLibreDisposicion = async (
    profesorId: string,
    fecha: string, // 'YYYY-MM-DD'
    tipo: LdTipo = 'ordinario'
): Promise<void> => {
    // 1. Insertar la entrada de libre disposición
    const { error: ldError } = await supabase
        .from('libre_disposicion')
        .insert({ profesor_id: profesorId, fecha, tipo });

    if (ldError) throw ldError;

    // 2. Determinar el día de la semana en español
    const date = new Date(fecha + 'T00:00:00');
    const DOW_MAP: Record<number, string> = {
        1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
        4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 0: 'Domingo',
    };
    const diaSemana = DOW_MAP[date.getDay()];
    if (!diaSemana || date.getDay() === 0 || date.getDay() === 6) return; // no lectivo

    // 3. Obtener el horario personal del profesor para ese día de la semana
    const { data: schedule, error: schError } = await supabase
        .from('Horario_Personal')
        .select('franja_id, materia_id, grupo_id, aula_id, tipo')
        .eq('profesor_id', profesorId)
        .eq('dia_semana', diaSemana)
        .in('tipo', ['Lectivo', 'Guardia']); // Las horas lectivas y de guardia asignada generan ausencia

    if (schError) {
        console.error('createLibreDisposicion: error fetching schedule', schError);
        return;
    }

    if (!schedule || schedule.length === 0) return; // sin horario, sin guardias

    // 4. Generar un ID de guardia por cada franja y insertar
    for (const slot of schedule) {
        // Verificar si la guardia ya existe para evitar duplicados por concurrencia
        const { data: existingGuard } = await supabase
            .from('Guardias')
            .select('"ID Guardia"')
            .eq('Fecha', fecha)
            .eq('Franja horaria', slot.franja_id)
            .eq('Profesor ausente', profesorId)
            .maybeSingle();

        if (existingGuard) {
            console.log(`Guardia ya existente para ${profesorId} el ${fecha} a las ${slot.franja_id}. Omitiendo inserción.`);
            continue;
        }

        const newId = await generateGuardId();
        const isGuard = slot.tipo === 'Guardia';
        const { error: gError } = await supabase.from('Guardias').insert({
            'ID Guardia': newId,
            'Fecha': fecha,
            'Franja horaria': slot.franja_id,
            'Profesor ausente': profesorId,
            'Materia ausente': isGuard ? 'M_GUARDIA' : (slot.materia_id || null),
            'Grupo atendido': isGuard ? null : (slot.grupo_id || null),
            'Aula': isGuard ? null : (slot.aula_id || null),
            'Estado': 'Pendiente/disponible',
            'Tipo de Guardia': 'Ordinaria',
            'Tarea dejada': 'NO',
        });
        
        if (gError) {
            // Si el error es violación de unicidad (23505), lo ignoramos de forma segura como fallback
            if (gError.code === '23505') {
                console.warn(`Conflicto de restricción única (23505) omitido para ${profesorId} el ${fecha} a las ${slot.franja_id}.`);
                continue;
            }
            console.error('createLibreDisposicion: error creating guard for slot', slot.franja_id, gError);
            throw gError; // Lanzar el error para que el proceso batch se detenga y notifique
        }
    }

    invalidateCache(['libre_disposicion', 'guards']);
    await logActivity('ADMIN_LIBRE_DISPOSICION', undefined, profesorId);
};

/**
 * Elimina un registro de libre disposición Y las guardias asociadas que se
 * generaron automáticamente (solo las que aún no han sido cubiertas).
 */
export const deleteLibreDisposicion = async (id: string): Promise<void> => {
    // 1. Obtener los datos del registro antes de borrarlo
    const { data: ldRecord, error: fetchError } = await supabase
        .from('libre_disposicion')
        .select('profesor_id, fecha')
        .eq('id', id)
        .single();

    if (fetchError) throw fetchError;

    const { profesor_id, fecha } = ldRecord;

    // 2. Eliminar las guardias generadas para ese profesor y fecha
    //    que TODAVÍA no han sido cubiertas (Pendiente/disponible)
    //    — las guardias ya cubiertas se conservan para el historial.
    const { error: guardError } = await supabase
        .from('Guardias')
        .delete()
        .eq('Profesor ausente', profesor_id)
        .eq('Fecha', fecha)
        .eq('Estado', 'Pendiente/disponible');

    if (guardError) {
        console.error('deleteLibreDisposicion: error deleting guardias', guardError);
        // No lanzamos error aquí para que el registro LD se borre igualmente
    }

    // 3. Eliminar el registro de libre disposición
    const { error } = await supabase.from('libre_disposicion').delete().eq('id', id);
    if (error) throw error;
    invalidateCache(['libre_disposicion', 'guards']);
};

// ─── CONFIGURACIÓN CENTRO ───────────────────────────────

/** Devuelve el cupo máximo diario de libre disposición. */
export const getCupoMaximo = async (): Promise<number> => {
    return getCached('config:cupo_maximo', async () => {
        const { data, error } = await supabase
            .from('configuracion_centro')
            .select('valor')
            .eq('key', 'cupo_maximo')
            .maybeSingle();

        if (error || !data) return 5;
        return parseInt(data.valor, 10) || 5;
    }, 60);
};

/** Actualiza el cupo máximo diario. */
export const setCupoMaximo = async (valor: number): Promise<void> => {
    const { error } = await supabase
        .from('configuracion_centro')
        .upsert({ key: 'cupo_maximo', valor: String(valor) }, { onConflict: 'key' });

    if (error) throw error;
    invalidateCache('config:cupo_maximo');
};

/** Devuelve el máximo de días de libre disposición por profesor por curso. */
export const getMaxLdPerTeacher = async (): Promise<number> => {
    return getCached('config:max_ld_profesor', async () => {
        const { data, error } = await supabase
            .from('configuracion_centro')
            .select('valor')
            .eq('key', 'max_ld_profesor')
            .maybeSingle();

        if (error || !data) return 4;
        return parseInt(data.valor, 10) || 4;
    }, 60);
};

/** Actualiza el máximo de días de libre disposición por profesor por curso. */
export const setMaxLdPerTeacher = async (valor: number): Promise<void> => {
    const { error } = await supabase
        .from('configuracion_centro')
        .upsert({ key: 'max_ld_profesor', valor: String(valor) }, { onConflict: 'key' });

    if (error) throw error;
    invalidateCache('config:max_ld_profesor');
};


/** Restablece la base de datos al inicio del curso escolar. */
export const resetSchoolYear = async (options: {
    clearGuards: boolean;
    clearSchedules: boolean;
    clearCalendar: boolean;
    clearLogs: boolean;
    clearTeachers: boolean;
    clearInfra: boolean;
    currentUserEmail: string;
}): Promise<void> => {
    const { error } = await supabase.rpc('reset_school_year', {
        clear_guards: options.clearGuards,
        clear_schedules: options.clearSchedules,
        clear_calendar: options.clearCalendar,
        clear_logs: options.clearLogs,
        clear_teachers: options.clearTeachers,
        clear_infra: options.clearInfra,
        current_user_email: options.currentUserEmail
    });
    if (error) throw error;
    clearAllCache();
};

/** Genera las fechas de un rango para el nuevo curso escolar en la tabla "Calendario". */
export const generateCalendarRange = async (startDate: string, endDate: string): Promise<void> => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const daysToInsert: any[] = [];

    let current = new Date(start);
    while (current <= end) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        const dow = current.getDay();
        const isWeekend = dow === 0 || dow === 6;

        daysToInsert.push({
            fecha: dateStr,
            es_lectivo: !isWeekend,
            descripcion: isWeekend ? 'Fin de semana' : null
        });

        current.setDate(current.getDate() + 1);
    }

    const { error } = await supabase
        .from('Calendario')
        .upsert(daysToInsert, { onConflict: 'fecha' });

    if (error) {
        console.error('Error generating calendar range:', error);
        throw error;
    }
    invalidateCache(['calendar_days', 'school_day']);
};


