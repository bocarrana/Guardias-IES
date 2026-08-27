import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Teacher, Guard, MetaOptions, GuardType } from '../types';
import { isAdminRole, getRoleDisplayName, getRoleStyle, canEditTeacherProfile, getAssignableRoles } from '../utils/roles';
import {
    Users,
    ShieldAlert,
    Trash2,
    Edit2,
    Check,
    X,
    Search,
    AlertCircle,
    Building2,
    BookOpen,
    GraduationCap,
    Plus,
    Clock,
    Upload,
    Calendar,
    FileUp,
    FileSpreadsheet,
    Mail,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    List,
    Maximize2,
    Minimize2,
    Copy,
    UserPlus,
    Filter,
    ShieldCheck,
    UserMinus,
    Shield,
    Coffee
} from 'lucide-react';
import Papa from 'papaparse';
import { MonthDayPicker } from './MonthDayPicker';
import {
    updateTeacher,
    deleteTeacher,
    createTeacher,
    cloneTeacherSchedule,
    deleteGuard,
    updateClassroom,
    deleteClassroom,
    createClassroom,
    updateGroup,
    deleteGroup,
    createGroup,
    updateSubject,
    deleteSubject,
    createSubject,
    updateTimeSlot,
    deleteTimeSlot,
    createTimeSlot,
    updateGuardDetails,
    getAutoGuardGroups,
    getPersonalSchedule,
    getAllPersonalSchedules,
    createPersonalScheduleEntry,
    updatePersonalScheduleEntry,
    deletePersonalScheduleEntry,
    upsertTeachers,
    bulkCreateAulas,
    bulkCreateMaterias,
    bulkCreateGrupos,
    bulkCreatePersonalSchedule,
    bulkCreateGuardSchedules,
    getAuditData,
    resetSchoolYear,
    generateCalendarRange
} from '../services/supabaseClient';
import { TimeSlot, GuardGroupSchedule, PersonalScheduleEntry } from '../types';
import TeacherAvatar from './TeacherAvatar';
import InteractiveScheduleGrid from './InteractiveScheduleGrid';
import { toast } from 'sonner';
import { LOGO_LIGHT_URL, LOGO_DARK_URL } from '../config/supabase';
import { useTheme } from '../context/ThemeContext';

const DEPARTMENTS = [
    "Agraria",
    "Agrarias",
    "Artes Plásticas",
    "Biología y Geología",
    "Economía",
    "Educación Física",
    "Filosofía",
    "Física y Química",
    "FOL",
    "Francés",
    "Geografía e Historia",
    "Inglés",
    "Latín y Griego",
    "Lengua y Literatura Castellana",
    "Matemáticas",
    "Música",
    "No docente",
    "Orientación",
    "Procedimientos Sanitarios y Asistenciales",
    "Religión",
    "Servicios a la Comunidad",
    "Tecnología"
];

interface AdminPanelProps {
    teachers: Teacher[];
    guards: Guard[];
    meta: MetaOptions;
    onRefetch: () => Promise<void>;
    guardGroupSchedules: GuardGroupSchedule[];
    currentUser: Teacher;
}

type Tab = 'teachers' | 'guards' | 'infra' | 'schedules' | 'personal_schedule' | 'import_export' | 'audit';

const AdminPanel: React.FC<AdminPanelProps> = ({ teachers, guards, meta, onRefetch, guardGroupSchedules, currentUser }) => {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState<Tab>('teachers');
    const [search, setSearch] = useState('');

    // Common Form State
    const [isAdding, setIsAdding] = useState(false);

    // Reset School Year State
    const [clearGuards, setClearGuards] = useState(true);
    const [clearSchedules, setClearSchedules] = useState(true);
    const [clearCalendar, setClearCalendar] = useState(true);
    const [clearLogs, setClearLogs] = useState(true);
    const [clearTeachers, setClearTeachers] = useState(false);
    const [clearInfra, setClearInfra] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetConfirmationInput, setResetConfirmationInput] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    // Calendar Range Generation State
    const currentYear = new Date().getFullYear();
    const [calStartDate, setCalStartDate] = useState(`${currentYear}-09-01`);
    const [calEndDate, setCalEndDate] = useState(`${currentYear + 1}-06-30`);
    const [isGeneratingCal, setIsGeneratingCal] = useState(false);

    // Teacher selection for personal schedule view
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

    // Teacher Edit/Add State
    const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
    const [editTeacherForm, setEditTeacherForm] = useState<Partial<Teacher>>({});
    const [newTeacherForm, setNewTeacherForm] = useState<Partial<Teacher>>({
        name: '', department: '', email: '', role: 'Docente', horas_guardia: 1
    });

    // Guard Edit State
    const [editingGuardId, setEditingGuardId] = useState<string | null>(null);
    const [editGuardForm, setEditGuardForm] = useState<Partial<Guard>>({});
    const [selectedGuardIds, setSelectedGuardIds] = useState<Set<string>>(new Set());

    // Meta Edit State
    const [editingMetaId, setEditingMetaId] = useState<string | null>(null);
    const [editMetaValue, setEditMetaValue] = useState('');
    const [editSlotForm, setEditSlotForm] = useState<Partial<TimeSlot>>({});
    const [addingSubmateriaTo, setAddingSubmateriaTo] = useState<string | null>(null);
    const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

    // New Meta Forms
    const [newMetaName, setNewMetaName] = useState('');
    const [newSlotForm, setNewSlotForm] = useState<Partial<TimeSlot>>({
        label: '', start_time: '', end_time: ''
    });

    const [viewModeSchedules, setViewModeSchedules] = useState<'list' | 'grid'>('list');
    const [viewModePersonal, setViewModePersonal] = useState<'list' | 'grid'>('list');
    const [filterDayPersonal, setFilterDayPersonal] = useState<string>('');
    const [filterSlotPersonal, setFilterSlotPersonal] = useState<string>('');

    // Sort state: { key: column key, dir: 'asc' | 'desc' | null }
    const [sortTeachers, setSortTeachers] = useState<{ key: string; dir: 'asc' | 'desc' | null }>({ key: '', dir: null });
    const [sortSchedules, setSortSchedules] = useState<{ key: string; dir: 'asc' | 'desc' | null }>({ key: '', dir: null });
    const [sortPersonal, setSortPersonal] = useState<{ key: string; dir: 'asc' | 'desc' | null }>({ key: '', dir: null });
    const [sortAudit, setSortAudit] = useState<{ key: string; dir: 'asc' | 'desc' | null }>({ key: 'name', dir: 'asc' });

    const toggleSort = (setter: React.Dispatch<React.SetStateAction<{ key: string; dir: 'asc' | 'desc' | null }>>, key: string) => {
        setter(prev => {
            if (prev.key !== key) return { key, dir: 'asc' };
            if (prev.dir === 'asc') return { key, dir: 'desc' };
            if (prev.dir === 'desc') return { key: '', dir: null };
            return { key, dir: 'asc' };
        });
    };

    const SortIcon: React.FC<{ active: boolean; dir: 'asc' | 'desc' | null }> = ({ active, dir }) => (
        <span style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: 6, verticalAlign: 'middle', lineHeight: 0 }}>
            <ChevronUp size={14} strokeWidth={2.5} style={{ marginBottom: -3, color: active && dir === 'asc' ? 'var(--brand-400)' : 'var(--slate-500)', opacity: active && dir === 'asc' ? 1 : 0.5 }} />
            <ChevronDown size={14} strokeWidth={2.5} style={{ marginTop: -3, color: active && dir === 'desc' ? 'var(--brand-400)' : 'var(--slate-500)', opacity: active && dir === 'desc' ? 1 : 0.5 }} />
        </span>
    );

    const DAY_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

    const [isCloning, setIsCloning] = useState(false);
    const [cloneSourceId, setCloneSourceId] = useState('');
    const [cloneTargetId, setCloneTargetId] = useState('');

    const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

    // Schedules (Guard Duty)
    const [schedules, setSchedules] = useState<GuardGroupSchedule[]>([]);
    const [loadingSchedules, setLoadingSchedules] = useState(false);
    const [newScheduleTypeFilter, setNewScheduleTypeFilter] = useState<'Ordinaria' | 'Recreo' | ''>('');
    const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
    const [editScheduleTypeFilter, setEditScheduleTypeFilter] = useState<'Ordinaria' | 'Recreo' | ''>('');
    const [editScheduleForm, setEditScheduleForm] = useState<Partial<GuardGroupSchedule>>({});
    const [newScheduleForm, setNewScheduleForm] = useState<Partial<GuardGroupSchedule>>({
        profesor_id: '', dia_semana: 'Lunes', franja_id: ''
    });
    const [filterDay, setFilterDay] = useState<string>('');
    const [filterSlot, setFilterSlot] = useState<string>('');

    // Personal Schedule (Class Timetable)
    const [personalEntries, setPersonalEntries] = useState<PersonalScheduleEntry[]>([]);
    const [loadingPersonal, setLoadingPersonal] = useState(false);
    const [editingPersonalId, setEditingPersonalId] = useState<string | null>(null);
    const [editPersonalForm, setEditPersonalForm] = useState<Partial<PersonalScheduleEntry> & { submateria_id?: string }>({});
    const [auditData, setAuditData] = useState<{lectivoIds: Set<string>, guardiaIds: Set<string>}>({
        lectivoIds: new Set(),
        guardiaIds: new Set()
    });
    const [loadingAudit, setLoadingAudit] = useState(false);
    const [newPersonalForm, setNewPersonalForm] = useState<Partial<PersonalScheduleEntry> & { submateria_id?: string }>({
        profesor_id: '',
        dia_semana: 'Lunes',
        franja_id: '',
        materia_id: '',
        submateria_id: '',
        grupo_id: '',
        aula_id: '',
        tipo: 'Lectivo'
    });
    
    const toggleSubject = (id: string) => {
        setExpandedSubjects(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const fetchSchedules = async () => {
        setLoadingSchedules(true);
        const data = await getAutoGuardGroups();
        setSchedules(data);
        setLoadingSchedules(false);
    };

    const fetchPersonalEntries = async (id: string) => {
        setLoadingPersonal(true);
        if (!id) {
            const data = await getAllPersonalSchedules();
            setPersonalEntries((data || []).filter((e: PersonalScheduleEntry) => e.tipo === 'Lectivo'));
        } else {
            const data = await getPersonalSchedule(id);
            setPersonalEntries((data || []).filter((e: PersonalScheduleEntry) => e.tipo === 'Lectivo'));
        }
        setLoadingPersonal(false);
    };

    React.useEffect(() => {
        if (activeTab === 'schedules') fetchSchedules();
        
        if (activeTab === 'personal_schedule') {
            fetchPersonalEntries(selectedTeacherId);
        }

        if (activeTab === 'audit') {
            const loadAudit = async () => {
                setLoadingAudit(true);
                const data = await getAuditData();
                setAuditData(data);
                setLoadingAudit(false);
            };
            loadAudit();
        }
    }, [activeTab, selectedTeacherId]);

    // Filtered data
    const filteredTeachers = teachers.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
            (t.department || '').toLowerCase().includes(search.toLowerCase()) ||
            (t.role || '').toLowerCase().includes(search.toLowerCase());
        // HIERARCHY LOGIC:
        // 1. Admin (ex superadmin) sees everyone.
        // 2. Jefatura only sees 'Docente'/'Usuario' role and themselves.
        if (isAdminRole(currentUser.role)) return matchesSearch;
        
        const isSelf = t.id === currentUser.id;
        const isRegularUser = t.role === 'Docente' || t.role === 'Usuario';
        
        return matchesSearch && (isRegularUser || isSelf);
    });

    const filteredGuards = guards.filter(g =>
        (g.id.toLowerCase().includes(search.toLowerCase()) ||
            (g.requesting_teacher?.name || '').toLowerCase().includes(search.toLowerCase())) &&
        g.type !== GuardType.RECREO
    );

    const auditResults = teachers
        .filter(t => {
            const isActive = t.active !== false;
            // Exclude management team from audit as they might not have regular schedules
            const isNotDirectivo = t.guard_group !== 'Equipo Directivo';
            const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || 
                                 (t.email || '').toLowerCase().includes(search.toLowerCase());
            return isActive && isNotDirectivo && matchesSearch;
        })
        .map(t => {
            // If we are loading audit data, we assume they are okay to avoid flicker
            // or we could show a loading state in the table
            const hasPersonal = auditData.lectivoIds.has(t.id);
            const hasGuards = auditData.guardiaIds.has(t.id);
            
            return {
                id: t.id,
                name: t.name,
                email: t.email,
                missing_personal: !hasPersonal,
                missing_guards: !hasGuards,
                teacher: t
            };
        })
        .filter(r => r.missing_personal || r.missing_guards)
        .sort((a, b) => {
            if (!sortAudit.key || !sortAudit.dir) return 0;
            let va = '', vb = '';
            if (sortAudit.key === 'name') { va = a.name; vb = b.name; }
            else if (sortAudit.key === 'status') { 
                va = (a.missing_personal ? '1' : '0') + (a.missing_guards ? '1' : '0');
                vb = (b.missing_personal ? '1' : '0') + (b.missing_guards ? '1' : '0');
            }
            const cmp = va.localeCompare(vb);
            return sortAudit.dir === 'asc' ? cmp : -cmp;
        });

    // Handlers
    const handleCreateTeacher = async () => {
        if (!newTeacherForm.name || !newTeacherForm.email) {
            toast.error('Nombre y Email son obligatorios');
            return;
        }
        try {
            await createTeacher(newTeacherForm);
            toast.success('Profesor creado');
            setIsAdding(false);
            setNewTeacherForm({ name: '', department: '', email: '', role: 'Docente', horas_guardia: 1 });
            await onRefetch();
        } catch (err) {
            toast.error('Error al crear profesor');
        }
    };

    const handleUpdateTeacher = async (id: string) => {
        try {
            await updateTeacher(id, editTeacherForm);
            toast.success('Profesor actualizado');
            setEditingTeacherId(null);
            await onRefetch();
        } catch (err) {
            toast.error('Error al actualizar');
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            await updateTeacher(id, { active: !currentStatus });
            toast.success(currentStatus ? 'Profesor marcado como BAJA' : 'Profesor REACTIVADO');
            await onRefetch();
        } catch {
            toast.error('Error al cambiar estado');
        }
    };

    const handlePerformClone = async () => {
        if (!cloneSourceId || !cloneTargetId) {
            toast.error('Selecciona origen (quien se va) y destino (quien llega)');
            return;
        }
        if (cloneSourceId === cloneTargetId) {
            toast.error('Origen y destino deben ser diferentes');
            return;
        }

        const tid = toast.loading('Clonando horario de clases y guardias...');
        try {
            await cloneTeacherSchedule(cloneSourceId, cloneTargetId);
            toast.dismiss(tid);
            toast.success('Horario clonado con éxito');
            setIsCloning(false);
            setCloneSourceId('');
            setCloneTargetId('');
            await onRefetch();
        } catch (err) {
            console.error(err);
            toast.dismiss(tid);
            toast.error('Error al clonar horario');
        }
    };

    const handleDeleteTeacher = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar a este profesor?')) return;
        try {
            await deleteTeacher(id);
            toast.success('Profesor eliminado');
            await onRefetch();
        } catch (err) {
            toast.error('Error al eliminar. Puede que tenga guardias asociadas.');
        }
    };

    const handleDeleteGuard = async (id: string) => {
        if (!confirm('¿Eliminar esta guardia permanentemente?')) return;
        try {
            await deleteGuard(id);
            toast.success('Guardia eliminada');
            setSelectedGuardIds(prev => { const s = new Set(prev); s.delete(id); return s; });
            await onRefetch();
        } catch (err) {
            toast.error('Error al eliminar');
        }
    };

    const handleBulkDeleteGuards = async () => {
        const ids = Array.from(selectedGuardIds);
        if (!ids.length) return;
        if (!confirm(`¿Eliminar ${ids.length} guardia(s) permanentemente?`)) return;
        const tid = toast.loading(`Eliminando ${ids.length} guardias...`);
        try {
            await Promise.all(ids.map(id => deleteGuard(id)));
            toast.dismiss(tid);
            toast.success(`${ids.length} guardias eliminadas`);
            setSelectedGuardIds(new Set());
            await onRefetch();
        } catch (err) {
            toast.dismiss(tid);
            toast.error('Error durante la eliminación masiva');
        }
    };

    // Generic Meta Handlers
    const handleUpdateMeta = async (type: 'aula' | 'grupo' | 'materia' | 'franja', id: string) => {
        try {
            if (type === 'aula') await updateClassroom(id, editMetaValue);
            if (type === 'grupo') await updateGroup(id, editMetaValue);
            if (type === 'materia') await updateSubject(id, editMetaValue);
            if (type === 'franja') await updateTimeSlot(id, editSlotForm);
            toast.success('Dato actualizado');
            setEditingMetaId(null);
            await onRefetch();
        } catch (err) {
            toast.error('Error al actualizar');
        }
    };

    const handleDeleteMeta = async (type: 'aula' | 'grupo' | 'materia' | 'franja', id: string) => {
        if (!confirm(`¿Eliminar permanentemente este ${type}?`)) return;
        try {
            if (type === 'aula') await deleteClassroom(id);
            if (type === 'grupo') await deleteGroup(id);
            if (type === 'materia') await deleteSubject(id);
            if (type === 'franja') await deleteTimeSlot(id);
            toast.success(`${type} eliminado`);
            await onRefetch();
        } catch (err) {
            toast.error('Error al eliminar. Revisa si se está usando en alguna guardia o grupo.');
        }
    };

    const handleCreateMeta = async (type: 'aula' | 'grupo' | 'materia' | 'franja', padre_id?: string) => {
        if (type !== 'franja' && !newMetaName.trim()) {
            toast.error('El nombre no puede estar vacío');
            return;
        }
        if (type === 'franja' && (!newSlotForm.label || !newSlotForm.start_time || !newSlotForm.end_time)) {
            toast.error('Todos los campos de la franja son obligatorios');
            return;
        }

        try {
            if (type === 'aula') await createClassroom(newMetaName);
            if (type === 'grupo') await createGroup(newMetaName);
            if (type === 'materia') await createSubject(newMetaName, padre_id);
            if (type === 'franja') await createTimeSlot(newSlotForm);
            toast.success('Creado correctamente');
            setNewMetaName('');
            setNewSlotForm({ label: '', start_time: '', end_time: '' });
            setIsAdding(false);
            setAddingSubmateriaTo(null);
            await onRefetch();
        } catch (err: any) {
            console.error('Error creating meta:', err);
            const detail = err.details || err.message || '';
            const hint = err.hint ? ` (${err.hint})` : '';
            toast.error(`Error al crear: ${detail}${hint}`);
        }
    };

    const handleUpdateGuard = async (id: string) => {
        try {
            await updateGuardDetails(id, editGuardForm);
            toast.success('Guardia actualizada');
            setEditingGuardId(null);
            await onRefetch();
        } catch (err) {
            toast.error('Error al actualizar guardia');
        }
    };

    const handleDeleteSchedule = async (id: string) => {
        if (!confirm('¿Eliminar este horario de guardia?')) return;
        try {
            await deletePersonalScheduleEntry(id);
            toast.success('Horario eliminado');
            await fetchSchedules();
        } catch (err) {
            toast.error('Error al eliminar');
        }
    };

    const handleCreateSchedule = async () => {
        if (!newScheduleForm.profesor_id || !newScheduleForm.franja_id) {
            toast.error('Selecciona profesor y franja');
            return;
        }
        try {
            await createPersonalScheduleEntry({
                ...newScheduleForm,
                tipo: 'Guardia'
            });
            toast.success('Horario asignado');
            setNewScheduleForm({ ...newScheduleForm, profesor_id: '' });
            await fetchSchedules();
        } catch (err: any) {
            if (err.code === '23505') {
                toast.error('Este profesor ya tiene asignada esta franja horaria');
            } else {
                toast.error('Error al guardar horario');
            }
        }
    };

    const handleUpdateSchedule = async (id: string) => {
        if (!editScheduleForm.profesor_id || !editScheduleForm.franja_id || !editScheduleForm.dia_semana) {
            toast.error('Completa todos los campos');
            return;
        }
        try {
            await updatePersonalScheduleEntry(id, {
                ...editScheduleForm,
                tipo: 'Guardia'
            });
            toast.success('Horario actualizado');
            setEditingScheduleId(null);
            await fetchSchedules();
        } catch (err: any) {
            if (err.code === '23505') {
                toast.error('Este profesor ya tiene asignada esta franja horaria');
            } else {
                toast.error('Error al actualizar horario');
            }
        }
    };

    const handleCreatePersonalEntry = async () => {
        if (!newPersonalForm.profesor_id || !newPersonalForm.franja_id || !newPersonalForm.materia_id || !newPersonalForm.grupo_id || !newPersonalForm.aula_id) {
            toast.error('Completa todos los campos (Materia, Grupo, Aula y Franja)');
            return;
        }
        try {
            const finalMateriaId = newPersonalForm.submateria_id || newPersonalForm.materia_id;
            await createPersonalScheduleEntry({ 
                ...newPersonalForm, 
                materia_id: finalMateriaId 
            });
            toast.success('Clase añadida al horario');
            await fetchPersonalEntries(newPersonalForm.profesor_id || '');
        } catch (err: any) {
            if (err.code === '23505') {
                toast.error('Este profesor ya tiene una sesión asignada en esta franja (mismo tipo)');
            } else {
                toast.error('Error al guardar clase');
            }
        }
    };

    const handleUpdatePersonalEntry = async (id: string) => {
        if (!editPersonalForm.profesor_id || !editPersonalForm.franja_id || !editPersonalForm.dia_semana || !editPersonalForm.materia_id || !editPersonalForm.grupo_id || !editPersonalForm.aula_id) {
            toast.error('Completa todos los campos (Materia, Grupo, Aula, Franja y Profesor)');
            return;
        }
        try {
            const finalMateriaId = editPersonalForm.submateria_id || editPersonalForm.materia_id;
            await updatePersonalScheduleEntry(id, {
                ...editPersonalForm,
                materia_id: finalMateriaId,
                tipo: 'Lectivo'
            });
            toast.success('Clase actualizada');
            setEditingPersonalId(null);
            await fetchPersonalEntries(selectedTeacherId || '');
        } catch (err: any) {
            if (err.code === '23505') {
                toast.error('Este profesor ya tiene una sesión asignada en esta franja (mismo tipo)');
            } else {
                toast.error('Error al actualizar clase');
            }
        }
    };

    const handleDeletePersonalEntry = async (id: string) => {
        if (!confirm('¿Eliminar esta clase del horario?')) return;
        try {
            await deletePersonalScheduleEntry(id);
            toast.success('Clase eliminada');
            await fetchPersonalEntries(selectedTeacherId);
        } catch (err) {
            toast.error('Error al eliminar');
        }
    };

    const handleBulkImport = async (type: string, data: any[]) => {
        if (!data || data.length === 0) {
            toast.error('El archivo está vacío');
            return;
        }

        const tid = toast.loading(`Importando ${data.length} registros...`);
        try {
            if (type === 'teachers') {
                const isSigad = data[0] && 'DOCENTE' in data[0];
                let payloads;
                if (isSigad) {
                    const cleanString = (str: string) => {
                        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                    };

                    payloads = data
                        .filter(row => row.DOCENTE && row.DOCENTE !== 'DOCENTE' && !row.DOCENTE.includes('/') && !row.DOCENTE.includes('Página'))
                        .map(row => {
                            const rawDocente = row.DOCENTE || '';
                            const parts = rawDocente.split(',');
                            const surnamesStr = parts[0] || '';
                            const nameStr = parts[1] || '';

                            const surnameWords = surnamesStr.trim().split(/\s+/).filter(Boolean);
                            const nameWords = nameStr.trim().split(/\s+/).filter((w: string) => {
                                const cw = w.toLowerCase();
                                return cw !== 'de' && cw !== 'del' && cw !== 'la' && cw !== 'y' && cw !== 'las' && cw !== 'los' && cw !== 'el';
                            }).filter(Boolean);

                            const rawFirstSurname = surnameWords[0] || '';
                            const rawSecondSurname = surnameWords[1] || '';

                            const capitalize = (word: string) => {
                                if (!word) return '';
                                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                            };

                            const displayName = [...nameWords, ...surnameWords].map(capitalize).join(' ');

                            let email = '';
                            const rawEmail = (row.EMAIL || '').trim();
                            if (rawEmail) {
                                const userPart = rawEmail.includes('@') ? rawEmail.split('@')[0] : rawEmail;
                                email = `${userPart.toLowerCase()}@educa.aragon.es`;
                            } else {
                                const firstSurnameClean = cleanString(rawFirstSurname);
                                const secondSurnameClean = cleanString(rawSecondSurname);

                                let nameCode = '';
                                if (nameWords.length >= 2) {
                                    nameCode = cleanString(nameWords[0]).charAt(0) + cleanString(nameWords[1]).charAt(0);
                                } else if (nameWords.length === 1) {
                                    nameCode = cleanString(nameWords[0]).slice(0, 2);
                                }

                                const secondSurnameInitial = secondSurnameClean.charAt(0);
                                email = `${nameCode}${firstSurnameClean}${secondSurnameInitial}@educa.aragon.es`;
                            }

                            return {
                                'nombre y apellidos': displayName,
                                email: email,
                                departamento: 'SIN DEPARTAMENTO',
                                rol: 'Usuario',
                                horas_guardia: 1
                            };
                        });
                } else {
                    payloads = data.map(row => ({
                        'nombre y apellidos': row.nombre,
                        email: row.email,
                        departamento: row.departamento || '',
                        rol: row.rol || 'Usuario',
                        horas_guardia: parseInt(row.horas_guardia) || 1
                    }));
                }
                await upsertTeachers(payloads);
            } else if (type === 'infra') {
                const aulas = data.filter(r => r.tipo?.toLowerCase() === 'aula').map(r => r.nombre);
                const materias = data.filter(r => r.tipo?.toLowerCase() === 'materia').map(r => r.nombre);
                const grupos = data.filter(r => r.tipo?.toLowerCase() === 'grupo').map(r => r.nombre);

                if (aulas.length) await bulkCreateAulas(aulas);
                if (materias.length) await bulkCreateMaterias(materias);
                if (grupos.length) await bulkCreateGrupos(grupos);
            } else if (type === 'personal') {
                // This requires translating names to IDs
                const entries = data.map(row => {
                    const teacher = teachers.find(t => t.email?.toLowerCase() === row.email_profesor?.toLowerCase());
                    const slot = meta.slots.find(s => s.label.toLowerCase() === row.franja_nombre?.toLowerCase());
                    const subject = meta.subjects.find(s => s.name.toLowerCase() === row.materia?.toLowerCase());
                    const group = meta.groups.find(g => g.name.toLowerCase() === row.grupo?.toLowerCase());
                    const classroom = meta.classrooms.find(c => c.name.toLowerCase() === row.aula?.toLowerCase());

                    if (!teacher || !slot) return null;
                    return {
                        profesor_id: teacher.id,
                        dia_semana: row.dia_semana,
                        franja_id: slot.id,
                        materia_id: subject?.id || null,
                        grupo_id: group?.id || null,
                        aula_id: classroom?.id || null,
                        tipo: 'Lectivo'
                    };
                }).filter(Boolean);

                if (entries.length) await bulkCreatePersonalSchedule(entries);
            } else if (type === 'guards_quad') {
                const entries = data.map(row => {
                    const teacher = teachers.find(t => t.email?.toLowerCase() === row.email_profesor?.toLowerCase());
                    const slot = meta.slots.find(s => s.label.toLowerCase() === row.franja_nombre?.toLowerCase());
                    if (!teacher || !slot) return null;
                    return {
                        profesor_id: teacher.id,
                        dia_semana: row.dia_semana,
                        franja_id: slot.id
                    };
                }).filter(Boolean);

                if (entries.length) await bulkCreateGuardSchedules(entries);
            }

            toast.dismiss(tid);
            toast.success('Importación finalizada con éxito');
            await onRefetch();
        } catch (err) {
            console.error(err);
            toast.dismiss(tid);
            toast.error('Error durante la importación masiva');
        }
    };

    const handleResetSchoolYear = async () => {
        if (resetConfirmationInput !== 'RESTABLECER') {
            toast.error('Por favor, escribe RESTABLECER para confirmar');
            return;
        }
        setIsResetting(true);
        const tid = toast.loading('Restableciendo base de datos...');
        try {
            await resetSchoolYear({
                clearGuards,
                clearSchedules,
                clearCalendar,
                clearLogs,
                clearTeachers,
                clearInfra,
                currentUserEmail: currentUser.email || ''
            });
            toast.dismiss(tid);
            toast.success('Base de datos restablecida correctamente para el nuevo curso escolar');
            setIsResetModalOpen(false);
            setResetConfirmationInput('');
            await onRefetch();
        } catch (err: any) {
            console.error(err);
            toast.dismiss(tid);
            toast.error('Error al restablecer curso: ' + (err.message || err.details || ''));
        } finally {
            setIsResetting(false);
        }
    };

    const handleGenerateCalendar = async () => {
        if (!calStartDate || !calEndDate) {
            toast.error('Por favor, selecciona las fechas de inicio y fin');
            return;
        }
        if (new Date(calStartDate) > new Date(calEndDate)) {
            toast.error('La fecha de inicio debe ser anterior a la fecha de fin');
            return;
        }
        setIsGeneratingCal(true);
        const tid = toast.loading('Generando fechas de calendario...');
        try {
            await generateCalendarRange(calStartDate, calEndDate);
            toast.dismiss(tid);
            toast.success('Calendario escolar generado correctamente');
            if (onRefetch) await onRefetch();
        } catch (err: any) {
            console.error(err);
            toast.dismiss(tid);
            toast.error('Error al generar calendario: ' + (err.message || err.details || ''));
        } finally {
            setIsGeneratingCal(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: 8,
                background: 'var(--bg-sidebar)',
                padding: 4,
                borderRadius: 'var(--radius-lg)',
                width: 'fit-content',
                border: '1px solid var(--border-subtle)',
            }}>
                {[
                    { id: 'import_export', label: '🚀 IMPORTAR CSV', icon: FileSpreadsheet },
                    { id: 'teachers', label: 'Profesores', icon: Users },
                    { id: 'schedules', label: 'Horarios Guardia', icon: Clock },
                    { id: 'personal_schedule', label: 'Horarios Lectivos', icon: Calendar },
                    { id: 'guards', label: 'Guardias Profesorado', icon: ShieldAlert },
                    { id: 'infra', label: 'Infraestructura', icon: Building2 },
                    { id: 'audit', label: 'Auditoría', icon: ShieldCheck },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as Tab); setSearch(''); setEditingTeacherId(null); setEditingMetaId(null); setIsAdding(false); }}
                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                        style={{
                            padding: '8px 16px',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search + Action Bar */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                {activeTab !== 'infra' && activeTab !== 'personal_schedule' && activeTab !== 'schedules' && (
                    <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
                        <Search style={{
                            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                            width: 16, height: 16, color: 'var(--slate-500)',
                        }} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="input"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingLeft: 38 }}
                        />
                    </div>
                )}
                <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginLeft: 'auto',
                    fontFamily: 'var(--font-mono)'
                }}>
                    ESTADO: <span style={{ color: 'var(--brand-400)' }}>MODO ADMINISTRADOR</span>
                </div>
            </div>

            {/* Content List */}
            <div className="card" style={{ overflow: 'hidden', border: '1px solid var(--slate-800)' }}>
                {activeTab === 'import_export' ? (
                    <div style={{ padding: 40, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, background: 'var(--slate-900)' }}>
                        {[
                            {
                                title: 'Profesores',
                                desc: 'Carga masiva de docentes (nombre, email, departamento, rol, horas_guardia).',
                                onImport: (data: any[]) => handleBulkImport('teachers', data)
                            },
                            {
                                title: 'Infraestructura',
                                desc: 'Aulas, Materias y Grupos. Formato CSV con columnas: tipo, nombre.',
                                onImport: (data: any[]) => handleBulkImport('infra', data)
                            },
                            {
                                title: 'Horarios Lectivos',
                                desc: 'Clases personales (email_profesor, dia_semana, franja_nombre, materia, grupo, aula).',
                                onImport: (data: any[]) => handleBulkImport('personal', data)
                            },
                            {
                                title: 'Cuadrante Guardias',
                                desc: 'Asignaciones semanales de guardia (email_profesor, dia_semana, franja_nombre).',
                                onImport: (data: any[]) => handleBulkImport('guards_quad', data)
                            },
                        ].map((item, idx) => (
                            <div key={idx} style={{
                                padding: 24,
                                borderRadius: 'var(--radius-lg)',
                                border: '1px dashed var(--slate-700)',
                                background: 'var(--brand-950-subtle)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ padding: 8, borderRadius: 8, background: 'var(--brand-950)', color: 'var(--brand-400)' }}>
                                        <FileUp size={20} />
                                    </div>
                                    <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--brand-50)' }}>{item.title}</h3>
                                </div>
                                <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: 0, lineHeight: 1.5 }}>{item.desc}</p>

                                <label className="btn btn-ghost" style={{
                                    marginTop: 'auto',
                                    cursor: 'pointer',
                                    border: '1px solid var(--slate-700)',
                                    justifyContent: 'center',
                                    background: 'var(--slate-900)'
                                }}>
                                    Seleccionar CSV
                                    <input
                                        type="file"
                                        accept=".csv"
                                        hidden
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (event) => {
                                                    let text = event.target?.result as string;
                                                    if (text && text.includes('DOCENTE')) {
                                                        const lines = text.split(/\r?\n/);
                                                        const headerIdx = lines.findIndex(l => l.includes('DOCENTE'));
                                                        if (headerIdx > 0) {
                                                            text = lines.slice(headerIdx).join('\n');
                                                        }
                                                    }
                                                    Papa.parse(text, {
                                                        header: true,
                                                        skipEmptyLines: true,
                                                        complete: (results) => item.onImport(results.data)
                                                    });
                                                };
                                                reader.readAsText(file);
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        ))}

                        {/* Preparar Calendario Card */}
                        <div style={{
                            gridColumn: '1 / -1',
                            padding: 24,
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--slate-700)',
                            background: 'var(--brand-950-subtle)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ padding: 8, borderRadius: 8, background: 'var(--brand-950)', color: 'var(--brand-400)' }}>
                                    <Calendar size={20} />
                                </div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--brand-50)' }}>Preparar Calendario del Nuevo Curso</h3>
                            </div>
                            
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                                Genera automáticamente los días del periodo escolar seleccionado en la base de datos.
                                Los días de lunes a viernes se marcarán como lectivos por defecto, y los fines de semana como no lectivos (festivos).
                                Esto no sobrescribirá las descripciones o estados de los días que ya hayas configurado individualmente en el calendario.
                            </p>

                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'flex-end',
                                gap: 16,
                                marginTop: 8
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180, flex: 1 }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Fecha de Inicio</span>
                                    <MonthDayPicker 
                                        value={calStartDate} 
                                        onChange={setCalStartDate} 
                                        fullWidth
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180, flex: 1 }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Fecha de Fin</span>
                                    <MonthDayPicker 
                                        value={calEndDate} 
                                        onChange={setCalEndDate} 
                                        fullWidth
                                    />
                                </div>
                                <button
                                    onClick={handleGenerateCalendar}
                                    disabled={isGeneratingCal}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: 'var(--brand-500)',
                                        color: '#fff',
                                        fontSize: '0.9rem',
                                        fontWeight: 700,
                                        cursor: isGeneratingCal ? 'wait' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        height: 42,
                                        opacity: isGeneratingCal ? 0.7 : 1,
                                        transition: 'all 0.2s',
                                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isGeneratingCal) {
                                            e.currentTarget.style.background = 'var(--brand-600)';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isGeneratingCal) {
                                            e.currentTarget.style.background = 'var(--brand-500)';
                                            e.currentTarget.style.transform = 'none';
                                        }
                                    }}
                                >
                                    {isGeneratingCal ? 'Generando...' : 'Generar Calendario'}
                                </button>
                            </div>
                        </div>

                        {/* Danger Zone Card */}
                        <div style={{
                            gridColumn: '1 / -1',
                            marginTop: 24,
                            padding: 24,
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            background: 'rgba(239, 68, 68, 0.03)',
                            boxShadow: '0 4px 20px rgba(239, 68, 68, 0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ padding: 8, borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                                    <ShieldAlert size={20} />
                                </div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#f87171' }}>Zona de Peligro: Restablecer Curso Escolar</h3>
                            </div>
                            
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                                Esta sección te permite vaciar y limpiar la base de datos para prepararla para el nuevo año escolar.
                                Selecciona los elementos que deseas restablecer. Esta acción es <strong>irreversible</strong> y permanente.
                            </p>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                gap: 12,
                                marginTop: 8
                            }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.85rem' }}>
                                    <input type="checkbox" checked={clearGuards} onChange={(e) => setClearGuards(e.target.checked)} style={{ cursor: 'pointer' }} />
                                    <span>Limpiar Historial de Guardias</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.85rem' }}>
                                    <input type="checkbox" checked={clearSchedules} onChange={(e) => setClearSchedules(e.target.checked)} style={{ cursor: 'pointer' }} />
                                    <span>Limpiar Horarios y Cuadrantes</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.85rem' }}>
                                    <input type="checkbox" checked={clearCalendar} onChange={(e) => setClearCalendar(e.target.checked)} style={{ cursor: 'pointer' }} />
                                    <span>Limpiar Reservas y Calendario</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.85rem' }}>
                                    <input type="checkbox" checked={clearLogs} onChange={(e) => setClearLogs(e.target.checked)} style={{ cursor: 'pointer' }} />
                                    <span>Limpiar Registro de Actividad</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.85rem', color: '#f87171' }}>
                                    <input type="checkbox" checked={clearTeachers} onChange={(e) => setClearTeachers(e.target.checked)} style={{ cursor: 'pointer' }} />
                                    <span>Limpiar Profesores (excepto Admins)</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.85rem', color: '#f87171' }}>
                                    <input type="checkbox" checked={clearInfra} onChange={(e) => setClearInfra(e.target.checked)} style={{ cursor: 'pointer' }} />
                                    <span>Limpiar Infraestructura (aulas/materias)</span>
                                </label>
                            </div>

                            <button
                                onClick={() => {
                                    if (!clearGuards && !clearSchedules && !clearCalendar && !clearLogs && !clearTeachers && !clearInfra) {
                                        toast.error('Selecciona al menos una opción para restablecer');
                                        return;
                                    }
                                    setIsResetModalOpen(true);
                                }}
                                className="btn"
                                style={{
                                    marginTop: 8,
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#f87171',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                                    e.currentTarget.style.borderColor = '#ef4444';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                                }}
                            >
                                Restablecer Datos Seleccionados
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {['guards', 'infra'].includes(activeTab) && (
                            <div style={{ 
                                overflow: 'auto', 
                                maxHeight: 'calc(100vh - 200px)', 
                                background: 'var(--bg-card)', 
                                borderRadius: 16, 
                                border: '1px solid var(--border-subtle)',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 50 }}>
                                <tr style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-subtle)' }}>

                                    {activeTab === 'guards' && (
                                        <>
                                            <th style={{ ...thStyle, width: 44 }}>
                                                {/* Select-all */}
                                                <PremiumCheckbox
                                                    checked={filteredGuards.length > 0 && filteredGuards.every(g => selectedGuardIds.has(g.id))}
                                                    indeterminate={filteredGuards.some(g => selectedGuardIds.has(g.id)) && !filteredGuards.every(g => selectedGuardIds.has(g.id))}
                                                    onChange={checked => {
                                                        if (checked) setSelectedGuardIds(new Set(filteredGuards.map(g => g.id)));
                                                        else setSelectedGuardIds(new Set());
                                                    }}
                                                />
                                            </th>
                                            <th style={thStyle}>ID</th>
                                            <th style={thStyle}>Fecha</th>
                                            <th style={thStyle}>Profesor</th>
                                            <th style={thStyle}>Estado</th>
                                            <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
                                        </>
                                    )}
                                    {activeTab === 'infra' && (
                                        <>
                                            <th style={thStyle}>Categoría</th>
                                            <th style={thStyle}>Nombre / Valor</th>
                                            <th style={{ ...thStyle, textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                                                    <button 
                                                        onClick={() => setExpandedSubjects(new Set(meta.subjects.filter(s => !s.padre_id).map(s => s.id)))}
                                                        className="btn btn-ghost" 
                                                        style={{ ...iconBtnStyle, width: 'auto', padding: '0 8px', fontSize: '11px', color: 'var(--brand-400)' }}
                                                        title="Expandir todo"
                                                    >
                                                        <Maximize2 size={12} style={{ marginRight: 4 }} /> Todo
                                                    </button>
                                                    <button 
                                                        onClick={() => setExpandedSubjects(new Set())}
                                                        className="btn btn-ghost" 
                                                        style={{ ...iconBtnStyle, width: 'auto', padding: '0 8px', fontSize: '11px', color: 'var(--text-muted)' }}
                                                        title="Colapsar todo"
                                                    >
                                                        <Minimize2 size={12} style={{ marginRight: 4 }} /> Nada
                                                    </button>
                                                    <span>Acciones</span>
                                                </div>
                                            </th>
                                        </>
                                    )}
                                    {/* outer thead content - only for simple list tabs */}
                                </tr>
                                {activeTab === 'infra' && (
                                    <>
                                        {/* FORMULARIOS DE CREACIÓN RÁPIDA */}
                                        <tr style={{ background: 'var(--brand-950-subtle)', borderBottom: '2px solid var(--brand-500)' }}>
                                            <td style={{ ...tdStyle, verticalAlign: 'middle' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--brand-400)', fontSize: '0.7rem' }}>AÑADIR CATEGORÍA</div>
                                                <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>Escribe el nombre y elige tipo:</div>
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                    <input
                                                        placeholder="Nombre (ej: Aula 201, 1º ESO A, Matemáticas...)"
                                                        className="input"
                                                        value={newMetaName}
                                                        onChange={e => setNewMetaName(e.target.value)}
                                                        style={{ ...smallInput, flex: 1 }}
                                                    />
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button onClick={() => handleCreateMeta('aula')} className="btn btn-primary" style={metaBtnStyle} title="Añadir como Aula/Espacio">
                                                            <Building2 size={16} strokeWidth={2} />
                                                            <span>Aula</span>
                                                        </button>
                                                        <button onClick={() => handleCreateMeta('grupo')} className="btn btn-primary" style={metaBtnStyle} title="Añadir como Grupo de alumnos">
                                                            <GraduationCap size={16} strokeWidth={2} />
                                                            <span>Grupo</span>
                                                        </button>
                                                        <button onClick={() => handleCreateMeta('materia')} className="btn btn-primary" style={metaBtnStyle} title="Añadir como Departamento">
                                                            <BookOpen size={16} strokeWidth={2} />
                                                            <span>Departamento</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                            <td />
                                        </tr>
                                        <tr style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--brand-500)' }}>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <Clock size={14} />
                                                    <span style={{ fontWeight: 700, color: 'var(--brand-400)', fontSize: '0.7rem' }}>NUEVA FRANJA HORARIA</span>
                                                </div>
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                    <input placeholder="Ej: 1ª Hora" className="input" value={newSlotForm.label} onChange={e => setNewSlotForm({ ...newSlotForm, label: e.target.value })} style={{ ...smallInput, flex: 2 }} />
                                                    <input type="time" className="input" value={newSlotForm.start_time} onChange={e => setNewSlotForm({ ...newSlotForm, start_time: e.target.value })} style={{ ...smallInput, flex: 1 }} />
                                                    <input type="time" className="input" value={newSlotForm.end_time} onChange={e => setNewSlotForm({ ...newSlotForm, end_time: e.target.value })} style={{ ...smallInput, flex: 1 }} />
                                                    <button
                                                        onClick={() => handleCreateMeta('franja')}
                                                        className="btn btn-primary"
                                                        style={{ ...metaBtnStyle, background: 'var(--brand-500)', boxShadow: '0 0 15px var(--brand-500-40)' }}
                                                        title="Añadir nueva franja horaria"
                                                    >
                                                        <Plus size={18} strokeWidth={2.5} />
                                                        <span>Franja</span>
                                                    </button>
                                                </div>
                                            </td>
                                            <td />
                                        </tr>
                                    </>
                                )}
                            </thead>
                            <tbody>
                                <AnimatePresence mode="popLayout">

                                    {activeTab === 'guards' && (
                                        filteredGuards.map((g) => {
                                            const isSelected = selectedGuardIds.has(g.id);
                                            return (
                                                <motion.tr
                                                    key={g.id}
                                                    layout
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    style={{
                                                        borderBottom: '1px solid var(--border-subtle)',
                                                        background: isSelected ? 'rgba(34,211,238,0.05)' : undefined,
                                                        transition: 'background 0.15s',
                                                    }}
                                                >
                                                    {/* Checkbox */}
                                                    <td style={{ ...tdStyle, width: 44 }}>
                                                        <PremiumCheckbox
                                                            checked={isSelected}
                                                            onChange={checked => {
                                                                setSelectedGuardIds(prev => {
                                                                    const s = new Set(prev);
                                                                    if (checked) s.add(g.id); else s.delete(g.id);
                                                                    return s;
                                                                });
                                                            }}
                                                        />
                                                    </td>
                                                    <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--brand-400)' }}>{g.id}</td>
                                                    <td style={tdStyle}>
                                                        {editingGuardId === g.id ? (
                                                            <MonthDayPicker 
                                                                value={editGuardForm.date || ''} 
                                                                onChange={dateVal => setEditGuardForm({ ...editGuardForm, date: dateVal })} 
                                                                style={{ minWidth: 120 }}
                                                            />
                                                        ) : g.date}
                                                    </td>
                                                    <td style={tdStyle}>
                                                        {editingGuardId === g.id ? (
                                                            <select className="select" value={editGuardForm.requesting_teacher_id} onChange={e => setEditGuardForm({ ...editGuardForm, requesting_teacher_id: e.target.value })} style={smallInput}>
                                                                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                            </select>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <div style={{ fontWeight: 600 }}>{g.requesting_teacher?.name}</div>
                                                                <a
                                                                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${g.requesting_teacher?.email}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{ fontSize: '0.75rem', color: 'var(--brand-400)', opacity: 0.8, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Mail size={10} />
                                                                    {g.requesting_teacher?.email}
                                                                </a>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={tdStyle}>
                                                        {editingGuardId === g.id ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                <select className="select" value={editGuardForm.status} onChange={e => setEditGuardForm({ ...editGuardForm, status: e.target.value as any })} style={smallInput}>
                                                                    <option value="Pendiente/disponible">Pendiente</option>
                                                                    <option value="Realizada">Realizada</option>
                                                                </select>
                                                                <textarea className="input" placeholder="Observaciones..." value={editGuardForm.observations || ''} onChange={e => setEditGuardForm({ ...editGuardForm, observations: e.target.value })} style={{ ...smallInput, minHeight: 60 }} />
                                                            </div>
                                                        ) : (
                                                            <div style={{ color: g.status === 'Realizada' ? 'var(--success-400)' : 'var(--warning-400)', fontSize: '0.85rem' }}>
                                                                {g.status}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                            {editingGuardId === g.id ? (
                                                                <><button onClick={() => handleUpdateGuard(g.id)} className="btn btn-success" style={iconBtnStyle}><Check size={14} /></button>
                                                                    <button onClick={() => setEditingGuardId(null)} className="btn btn-ghost" style={iconBtnStyle}><X size={14} /></button></>
                                                            ) : (
                                                                <><button onClick={() => { setEditingGuardId(g.id); setEditGuardForm(g); }} className="btn btn-ghost" style={iconBtnStyle}><Edit2 size={14} /></button>
                                                                    <button onClick={() => handleDeleteGuard(g.id)} className="btn btn-danger-subtle" style={iconBtnStyle}><Trash2 size={14} /></button></>
                                                            )}
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}

                                    {activeTab === 'infra' && (
                                        <>
                                            {/* Franjas Horarias */}
                                            {meta.slots.map(s => (
                                                <tr key={s.id} style={{ borderBottom: '1px solid var(--slate-800)' }}>
                                                    <td style={tdStyle}><Clock size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Franja</td>
                                                    <td style={tdStyle}>
                                                        {editingMetaId === s.id ? (
                                                            <div style={{ display: 'flex', gap: 4 }}>
                                                                <input className="input" value={editSlotForm.label} onChange={e => setEditSlotForm({ ...editSlotForm, label: e.target.value })} style={smallInput} />
                                                                <input type="time" className="input" value={editSlotForm.start_time} onChange={e => setEditSlotForm({ ...editSlotForm, start_time: e.target.value })} style={smallInput} />
                                                                <input type="time" className="input" value={editSlotForm.end_time} onChange={e => setEditSlotForm({ ...editSlotForm, end_time: e.target.value })} style={smallInput} />
                                                            </div>
                                                        ) : `${s.label} (${s.start_time} - ${s.end_time})`}
                                                    </td>
                                                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                        {editingMetaId === s.id ? (
                                                            <><button onClick={() => handleUpdateMeta('franja', s.id)} className="btn btn-success" style={iconBtnStyle}><Check size={14} /></button>
                                                                <button onClick={() => setEditingMetaId(null)} className="btn btn-ghost" style={iconBtnStyle}><X size={14} /></button></>
                                                        ) : (
                                                            <><button onClick={() => { setEditingMetaId(s.id); setEditSlotForm(s); }} className="btn btn-ghost" style={iconBtnStyle}><Edit2 size={14} /></button>
                                                                <button onClick={() => handleDeleteMeta('franja', s.id)} className="btn btn-danger-subtle" style={iconBtnStyle}><Trash2 size={14} /></button></>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}

                                            {/* Aulas */}
                                            {meta.classrooms.map(c => (
                                                <tr key={c.id} style={{ borderBottom: '1px solid var(--slate-800)' }}>
                                                    <td style={tdStyle}><Building2 size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Aula</td>
                                                    <td style={tdStyle}>
                                                        {editingMetaId === c.id ? <input className="input" value={editMetaValue} onChange={e => setEditMetaValue(e.target.value)} style={smallInput} /> : c.name}
                                                    </td>
                                                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                        {editingMetaId === c.id ? (
                                                            <><button onClick={() => handleUpdateMeta('aula', c.id)} className="btn btn-success" style={iconBtnStyle}><Check size={14} /></button>
                                                                <button onClick={() => setEditingMetaId(null)} className="btn btn-ghost" style={iconBtnStyle}><X size={14} /></button></>
                                                        ) : (
                                                            <><button onClick={() => { setEditingMetaId(c.id); setEditMetaValue(c.name); }} className="btn btn-ghost" style={iconBtnStyle}><Edit2 size={14} /></button>
                                                                <button onClick={() => handleDeleteMeta('aula', c.id)} className="btn btn-danger-subtle" style={iconBtnStyle}><Trash2 size={14} /></button></>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* Grupos */}
                                            {meta.groups.map(g => (
                                                <tr key={g.id} style={{ borderBottom: '1px solid var(--slate-800)' }}>
                                                    <td style={tdStyle}><GraduationCap size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Grupo</td>
                                                    <td style={tdStyle}>
                                                        {editingMetaId === g.id ? <input className="input" value={editMetaValue} onChange={e => setEditMetaValue(e.target.value)} style={smallInput} /> : g.name}
                                                    </td>
                                                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                        {editingMetaId === g.id ? (
                                                            <><button onClick={() => handleUpdateMeta('grupo', g.id)} className="btn btn-success" style={iconBtnStyle}><Check size={14} /></button>
                                                                <button onClick={() => setEditingMetaId(null)} className="btn btn-ghost" style={iconBtnStyle}><X size={14} /></button></>
                                                        ) : (
                                                            <><button onClick={() => { setEditingMetaId(g.id); setEditMetaValue(g.name); }} className="btn btn-ghost" style={iconBtnStyle}><Edit2 size={14} /></button>
                                                                <button onClick={() => handleDeleteMeta('grupo', g.id)} className="btn btn-danger-subtle" style={iconBtnStyle}><Trash2 size={14} /></button></>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* Materias */}
                                            {/* Materias e Hijos */}
                                            {meta.subjects.filter(s => !s.padre_id).map(s => (
                                                <React.Fragment key={s.id}>
                                                    <tr style={{ 
                                                        borderBottom: '1px solid var(--border-subtle)',
                                                        background: expandedSubjects.has(s.id) ? 'rgba(34,211,238,0.02)' : 'transparent'
                                                    }}>
                                                        <td style={tdStyle}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <button 
                                                                    onClick={() => toggleSubject(s.id)}
                                                                    className="btn btn-ghost"
                                                                    style={{ padding: 4, width: 24, height: 24, minHeight: 'auto', color: 'var(--brand-400)' }}
                                                                >
                                                                    {expandedSubjects.has(s.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                                </button>
                                                                <BookOpen size={14} />
                                                                <span>Departamento</span>
                                                            </div>
                                                        </td>
                                                        <td onClick={() => toggleSubject(s.id)} style={{ ...tdStyle, cursor: 'pointer' }}>
                                                            {editingMetaId === s.id ? (
                                                                <input 
                                                                    className="input" 
                                                                    value={editMetaValue} 
                                                                    onClick={e => e.stopPropagation()} 
                                                                    onChange={e => setEditMetaValue(e.target.value)} 
                                                                    style={smallInput} 
                                                                />
                                                            ) : (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                                                                    {meta.subjects.some(child => child.padre_id === s.id) && (
                                                                        <span style={{ 
                                                                            fontSize: '0.65rem', 
                                                                            padding: '2px 6px', 
                                                                            borderRadius: 6, 
                                                                            background: 'var(--brand-950)', 
                                                                            color: 'var(--brand-400)',
                                                                            border: '1px solid var(--brand-500-20)'
                                                                        }}>
                                                                            {meta.subjects.filter(child => child.padre_id === s.id).length} materias
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                            {editingMetaId === s.id ? (
                                                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                                    <button onClick={() => handleUpdateMeta('materia', s.id)} className="btn btn-success" style={iconBtnStyle}><Check size={14} /></button>
                                                                    <button onClick={() => setEditingMetaId(null)} className="btn btn-ghost" style={iconBtnStyle}><X size={14} /></button>
                                                                </div>
                                                            ) : (
                                                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                                    <button onClick={() => { setAddingSubmateriaTo(addingSubmateriaTo === s.id ? null : s.id); setNewMetaName(''); }} className={`btn ${addingSubmateriaTo === s.id ? 'btn-danger-subtle' : 'btn-primary'}`} style={{ ...iconBtnStyle, width: 'auto', padding: '0 8px', fontSize: '12px' }}>
                                                                        {addingSubmateriaTo === s.id ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Materia</>}
                                                                    </button>
                                                                    <button onClick={() => { setEditingMetaId(s.id); setEditMetaValue(s.name); }} className="btn btn-ghost" style={iconBtnStyle}><Edit2 size={14} /></button>
                                                                    <button onClick={() => handleDeleteMeta('materia', s.id)} className="btn btn-danger-subtle" style={iconBtnStyle}><Trash2 size={14} /></button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {addingSubmateriaTo === s.id && (
                                                         <tr style={{ background: 'var(--brand-950-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                                                            <td style={{ ...tdStyle, paddingLeft: 40 }}><span style={{ opacity: 0.5 }}>↳</span> Nueva Materia</td>
                                                            <td style={tdStyle}>
                                                                <input autoFocus className="input" placeholder="Nombre... (ej: Módulo 1)" value={newMetaName} onChange={e => setNewMetaName(e.target.value)} style={smallInput} />
                                                            </td>
                                                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                                    <button onClick={() => handleCreateMeta('materia', s.id)} className="btn btn-success" style={iconBtnStyle}><Check size={14} /></button>
                                                                </div>
                                                            </td>
                                                         </tr>
                                                    )}
                                                     {expandedSubjects.has(s.id) && meta.subjects.filter(child => child.padre_id === s.id).map(child => (
                                                        <motion.tr 
                                                            key={child.id} 
                                                            initial={{ opacity: 0, y: -4 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}
                                                        >
                                                            <td style={{ ...tdStyle, paddingLeft: 40 }}><span style={{ opacity: 0.5 }}>↳</span> Materia</td>
                                                            <td style={tdStyle}>
                                                                {editingMetaId === child.id ? <input className="input" value={editMetaValue} onChange={e => setEditMetaValue(e.target.value)} style={smallInput} /> : child.name}
                                                            </td>
                                                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                                {editingMetaId === child.id ? (
                                                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                                        <button onClick={() => handleUpdateMeta('materia', child.id)} className="btn btn-success" style={iconBtnStyle}><Check size={14} /></button>
                                                                        <button onClick={() => setEditingMetaId(null)} className="btn btn-ghost" style={iconBtnStyle}><X size={14} /></button>
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                                        <button onClick={() => { setEditingMetaId(child.id); setEditMetaValue(child.name); }} className="btn btn-ghost" style={iconBtnStyle}><Edit2 size={14} /></button>
                                                                        <button onClick={() => handleDeleteMeta('materia', child.id)} className="btn btn-danger-subtle" style={iconBtnStyle}><Trash2 size={14} /></button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </motion.tr>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </>
                                    )}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'teachers' && (
                    <div style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', position: 'relative', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                        {/* Consola de Mando: Gestión Profesores */}
                        <div style={{ 
                            position: 'sticky', 
                            top: 0, 
                            zIndex: 100, 
                            background: 'var(--bg-panel)',
                            borderBottom: '2px solid var(--brand-500)',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%'
                        }}>
                            <div style={{ 
                                height: 72, 
                                padding: '0 24px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                background: 'rgba(15,23,42,0.7)',
                                backdropFilter: 'blur(20px)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <Users size={20} style={{ color: 'var(--brand-400)' }} />
                                    <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>Gestión de Claustro</h3>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                        <input 
                                            placeholder="Buscar profesor..." 
                                            className="input" 
                                            value={search} 
                                            onChange={e => setSearch(e.target.value)} 
                                            style={{ ...smallInput, height: 40, width: 200, paddingLeft: 36 }} 
                                        />
                                    </div>
                                    <div style={{
                                        background: 'rgba(34,211,238,0.1)',
                                        color: 'var(--brand-400)',
                                        padding: '0 16px',
                                        borderRadius: 12,
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        border: '1px solid rgba(34,211,238,0.3)',
                                        height: 36,
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        {filteredTeachers.length} PROFESORES
                                    </div>
                                </div>
                            </div>
                            
                            {/* Fila de Creación Rápida */}
                            <div style={{ 
                                height: 56,
                                padding: '0 24px', 
                                display: 'flex', 
                                alignItems: 'center',
                                gap: 12,
                                background: 'rgba(15,23,42,0.4)',
                                borderTop: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'center', 
                                    alignItems: 'center',
                                    opacity: 0.5,
                                    marginRight: 8
                                }}>
                                    <img 
                                        src={theme === 'dark' ? LOGO_DARK_URL : LOGO_LIGHT_URL} 
                                        alt="IES" 
                                        style={{ width: 24, height: 24, objectFit: 'contain' }} 
                                    />
                                </div>
                                <input placeholder="Nombre y Apellidos..." className="input" value={newTeacherForm.name} onChange={e => setNewTeacherForm({ ...newTeacherForm, name: e.target.value })} style={{ ...smallInput, flex: 2, height: 36 }} />
                                <input placeholder="Email institucional..." className="input" value={newTeacherForm.email} onChange={e => setNewTeacherForm({ ...newTeacherForm, email: e.target.value })} style={{ ...smallInput, flex: 1.5, height: 36, fontSize: '0.8rem', opacity: 0.8 }} />
                                <select
                                    className="select"
                                    value={newTeacherForm.department || ''}
                                    onChange={e => setNewTeacherForm({ ...newTeacherForm, department: e.target.value })}
                                    style={{ ...smallInput, flex: 1, height: 36 }}
                                >
                                    <option value="">Dpto...</option>
                                    {DEPARTMENTS.map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                                <select
                                    className="select"
                                    value={newTeacherForm.role}
                                    onChange={e => setNewTeacherForm({ ...newTeacherForm, role: e.target.value as any })}
                                    style={{ ...smallInput, width: 140, height: 36 }}
                                >
                                    {getAssignableRoles(currentUser).map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button 
                                        onClick={() => setIsCloning(true)}
                                        className="btn btn-ghost" 
                                        style={{ ...iconBtnStyle, height: 36, width: 36 }}
                                        title="Sustitución rápida"
                                    >
                                        <Copy size={16} />
                                    </button>
                                    <button onClick={handleCreateTeacher} className="btn btn-primary" style={{ ...iconBtnStyle, width: 'auto', padding: '0 16px', height: 36 }}>
                                        <Plus size={16} style={{ marginRight: 6 }} /> Añadir
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Listado de Profesores */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <table className="table" style={{ width: '100%', tableLayout: 'fixed' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 90, background: 'var(--bg-card)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                    <tr>
                                        <th style={{ ...thStyle, width: '10%', paddingLeft: 24 }}>FOTO</th>
                                        <th style={{ ...thStyle, width: '30%', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(setSortTeachers, 'name')}>NOMBRE Y DATOS <SortIcon active={sortTeachers.key === 'name'} dir={sortTeachers.dir} /></th>
                                        <th style={{ ...thStyle, width: '20%', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(setSortTeachers, 'department')}>DEPARTAMENTO <SortIcon active={sortTeachers.key === 'department'} dir={sortTeachers.dir} /></th>
                                        <th style={{ ...thStyle, width: '15%', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(setSortTeachers, 'role')}>ROL <SortIcon active={sortTeachers.key === 'role'} dir={sortTeachers.dir} /></th>
                                        <th style={{ ...thStyle, width: '10%', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(setSortTeachers, 'active')}>ESTADO <SortIcon active={sortTeachers.key === 'active'} dir={sortTeachers.dir} /></th>
                                        <th style={{ ...thStyle, width: '15%', textAlign: 'left' }}>ACCIONES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence mode="popLayout">
                                        {[...filteredTeachers].sort((a, b) => {
                                            if (!sortTeachers.key || !sortTeachers.dir) return 0;
                                            const k = sortTeachers.key as keyof Teacher;
                                            const va = String(a[k] ?? '').toLowerCase();
                                            const vb = String(b[k] ?? '').toLowerCase();
                                            const cmp = va.localeCompare(vb);
                                            return sortTeachers.dir === 'asc' ? cmp : -cmp;
                                        }).map((t) => (
                                            <motion.tr 
                                                key={t.id} 
                                                layout 
                                                initial={{ opacity: 0 }} 
                                                animate={{ opacity: t.active === false ? 0.6 : 1 }} 
                                                exit={{ opacity: 0 }} 
                                                style={{ 
                                                    borderBottom: '1px solid var(--border-subtle)',
                                                    background: t.active === false ? 'rgba(0,0,0,0.1)' : 'transparent'
                                                }}
                                            >
                                                <td style={{ ...tdStyle, paddingLeft: 24 }}>
                                                    <TeacherAvatar teacher={t} size={36} editable={true} onUpdate={onRefetch} />
                                                </td>
                                                <td style={tdStyle}>
                                                    {editingTeacherId === t.id ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                            <input className="input" value={editTeacherForm.name || ''} onChange={e => setEditTeacherForm({ ...editTeacherForm, name: e.target.value })} style={smallInput} />
                                                            <input className="input" value={editTeacherForm.email || ''} onChange={e => setEditTeacherForm({ ...editTeacherForm, email: e.target.value })} style={{ ...smallInput, height: 32, fontSize: '0.8rem', opacity: 0.8 }} />
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontWeight: 700 }}>{t.name}</span>
                                                            <a
                                                                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${t.email}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{ fontSize: '0.75rem', color: 'var(--brand-400)', opacity: 0.8, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <Mail size={10} />
                                                                {t.email}
                                                            </a>
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={tdStyle}>
                                                    {editingTeacherId === t.id ? (
                                                        <select
                                                            className="select"
                                                            value={editTeacherForm.department || ''}
                                                            onChange={e => setEditTeacherForm({ ...editTeacherForm, department: e.target.value })}
                                                            style={smallInput}
                                                        >
                                                            <option value="">Dpto...</option>
                                                            {DEPARTMENTS.map(dept => (
                                                                <option key={dept} value={dept}>{dept}</option>
                                                            ))}
                                                        </select>
                                                    ) : t.department}
                                                </td>
                                                <td style={tdStyle}>
                                                        {editingTeacherId === t.id ? (
                                                        <select
                                                            className="select"
                                                            value={editTeacherForm.role}
                                                            onChange={e => setEditTeacherForm({ ...editTeacherForm, role: e.target.value as any })}
                                                            style={{ ...smallInput, minWidth: 130 }}
                                                        >
                                                            {getAssignableRoles(currentUser).map(r => (
                                                                <option key={r} value={r}>{r}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span style={{
                                                            padding: '4px 12px',
                                                            borderRadius: 14,
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            display: 'inline-block',
                                                            ...getRoleStyle(t.role)
                                                        }}>
                                                            {getRoleDisplayName(t.role)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={tdStyle}>
                                                    <span style={{
                                                        padding: '4px 10px',
                                                        borderRadius: 6,
                                                        fontSize: '0.65rem',
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                        background: t.active === false ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                                        color: t.active === false ? '#ef4444' : '#22c55e',
                                                        border: `1px solid ${t.active === false ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
                                                    }}>
                                                        {t.active === false ? 'BAJA' : 'ACTIVO'}
                                                    </span>
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: 'left' }}>
                                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-start' }}>
                                                        {editingTeacherId === t.id ? (
                                                            <><button onClick={() => handleUpdateTeacher(t.id)} className="btn btn-success" style={iconBtnStyle}><Check size={14} /></button>
                                                                <button onClick={() => setEditingTeacherId(null)} className="btn btn-ghost" style={iconBtnStyle}><X size={14} /></button></>
                                                        ) : (
                                                            <>
                                                                {canEditTeacherProfile(currentUser, t) && (
                                                                    <>
                                                                        <button 
                                                                            onClick={() => handleToggleActive(t.id, t.active !== false)} 
                                                                            className={`btn ${t.active === false ? 'btn-success-subtle' : 'btn-ghost'}`} 
                                                                            style={{...iconBtnStyle, color: t.active === false ? '#22c55e' : '#ef4444'}}
                                                                            title={t.active === false ? 'Reactivar Profesor' : 'Marcar como Baja'}
                                                                        >
                                                                            {t.active === false ? <UserPlus size={14} /> : <UserMinus size={14} />}
                                                                        </button>
                                                                        <button onClick={() => { setEditingTeacherId(t.id); setEditTeacherForm(t); }} className="btn btn-ghost" style={iconBtnStyle}><Edit2 size={14} /></button>
                                                                        <button onClick={() => handleDeleteTeacher(t.id)} className="btn btn-danger-subtle" style={iconBtnStyle}><Trash2 size={14} /></button>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'schedules' && (
                    <div style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', position: 'relative', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                        {/* Consola de Mando: Horarios Guardia */}
                        <div style={{ 
                            position: 'sticky', 
                            top: 0, 
                            zIndex: 100, 
                            background: 'var(--bg-panel)',
                            borderBottom: '2px solid var(--brand-500)',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%'
                        }}>
                            {/* Fila Superior: Selector y Modos */}
                            <div style={{ 
                                height: 72, 
                                padding: '0 24px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                background: 'rgba(15,23,42,0.7)',
                                backdropFilter: 'blur(20px)',
                                borderBottom: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            width: 32, 
                                            height: 32, 
                                            borderRadius: 8, 
                                            background: 'rgba(34,211,238,0.1)',
                                            color: 'var(--brand-400)'
                                        }}>
                                            <Users size={18} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1 }}>Filtro Profesor</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <select
                                                    className="select"
                                                    value={selectedTeacherId}
                                                    onChange={e => setSelectedTeacherId(e.target.value)}
                                                    style={{ ...smallInput, height: 32, width: '220px', margin: 0, padding: '0 8px', border: 'none', background: 'transparent', fontWeight: 700, fontSize: '0.9rem' }}
                                                >
                                                    <option value="">-- Todos los Profesores --</option>
                                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ 
                                        display: 'flex', 
                                        background: 'rgba(0,0,0,0.3)', 
                                        borderRadius: 10, 
                                        padding: 3, 
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        height: 38,
                                        alignItems: 'center'
                                    }}>
                                        <button
                                            onClick={() => setViewModeSchedules('grid')}
                                            style={{
                                                padding: '0 16px', height: '100%', borderRadius: 8, border: 'none', 
                                                fontSize: '0.7rem', fontWeight: 700, transition: 'all 0.2s',
                                                background: viewModeSchedules === 'grid' ? 'var(--brand-500)' : 'transparent',
                                                color: viewModeSchedules === 'grid' ? 'white' : 'var(--text-secondary)',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                textTransform: 'uppercase', letterSpacing: '0.5px'
                                            }}
                                        >Matriz</button>
                                        <button
                                            onClick={() => setViewModeSchedules('list')}
                                            style={{
                                                padding: '0 16px', height: '100%', borderRadius: 8, border: 'none', 
                                                fontSize: '0.7rem', fontWeight: 700, transition: 'all 0.2s',
                                                background: viewModeSchedules === 'list' ? 'var(--brand-500)' : 'transparent',
                                                color: viewModeSchedules === 'list' ? 'white' : 'var(--text-secondary)',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                textTransform: 'uppercase', letterSpacing: '0.5px'
                                            }}
                                        >Lista</button>
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    {(() => {
                                        const activeSchedules = schedules.filter(s => !selectedTeacherId || s.profesor_id === selectedTeacherId);
                                        const recreosCount = activeSchedules.filter(s => s.time_slot?.label?.toLowerCase().includes('recreo')).length;
                                        const ordinariasCount = activeSchedules.length - recreosCount;
                                        return (
                                            <>
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                    padding: '5px 12px', borderRadius: 20,
                                                    background: 'rgba(52,211,153,0.12)',
                                                    border: '1px solid rgba(52,211,153,0.28)',
                                                    color: '#34d399',
                                                }}>
                                                    <Shield size={11}/>
                                                    <span style={{ fontSize: '1rem', fontWeight: 900, lineHeight: 1 }}>{ordinariasCount}</span>
                                                    <span style={{ fontSize: '0.65rem', opacity: 0.7, fontWeight: 600 }}>guardias</span>
                                                </div>
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                    padding: '5px 12px', borderRadius: 20,
                                                    background: 'rgba(251,191,36,0.12)',
                                                    border: '1px solid rgba(251,191,36,0.28)',
                                                    color: '#fbbf24',
                                                }}>
                                                    <Coffee size={11}/>
                                                    <span style={{ fontSize: '1rem', fontWeight: 900, lineHeight: 1 }}>{recreosCount}</span>
                                                    <span style={{ fontSize: '0.65rem', opacity: 0.7, fontWeight: 600 }}>recreos</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Fila Inferior: Filtros y Creación (Solo en Lista) */}
                            {viewModeSchedules === 'list' && (
                                <div style={{ 
                                    height: 56,
                                    padding: '0 24px', 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    gap: 12,
                                    background: 'rgba(15,23,42,0.4)',
                                    borderTop: '1px solid rgba(255,255,255,0.05)'
                                }}>


                                    <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--brand-400)', fontWeight: 800, textTransform: 'uppercase' }}>Añadir:</span>
                                        <select className="select" value={newScheduleForm.profesor_id} onChange={e => setNewScheduleForm({ ...newScheduleForm, profesor_id: e.target.value })} style={{ ...smallInput, flex: 2, height: 36 }}>
                                            <option value="">Elegir profesor...</option>
                                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <select className="select" value={newScheduleForm.dia_semana} onChange={e => setNewScheduleForm({ ...newScheduleForm, dia_semana: e.target.value })} style={{ ...smallInput, flex: 1, height: 36 }}>
                                            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                        <select className="select" value={newScheduleTypeFilter} onChange={e => { setNewScheduleTypeFilter(e.target.value as any); setNewScheduleForm({ ...newScheduleForm, franja_id: '' }); }} style={{ ...smallInput, flex: 1, height: 36 }}>
                                            <option value="">Tipo...</option>
                                            <option value="Ordinaria">Ordinaria</option>
                                            <option value="Recreo">Recreo</option>
                                        </select>
                                        <select className="select" value={newScheduleForm.franja_id} onChange={e => setNewScheduleForm({ ...newScheduleForm, franja_id: e.target.value })} style={{ ...smallInput, flex: 1, height: 36 }}>
                                            <option value="">Franja...</option>
                                            {meta.slots.filter(s => {
                                                if (newScheduleTypeFilter === 'Recreo') return s.label?.toLowerCase().includes('recreo');
                                                if (newScheduleTypeFilter === 'Ordinaria') return !s.label?.toLowerCase().includes('recreo');
                                                return true;
                                            }).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                        </select>
                                        <button 
                                            onClick={handleCreateSchedule} 
                                            className="btn btn-primary" 
                                            style={{ height: 36, width: 72, padding: 0, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 700 }}
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Contenido: Matriz o Lista */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {viewModeSchedules === 'grid' && selectedTeacherId ? (
                                <div style={{ padding: 20 }}>
                                    <InteractiveScheduleGrid
                                        slots={meta.slots}
                                        stickyOffset={0}
                                        interactiveBreakSlots={true}
                                        showRowHeaders={true}
                                        getItem={(day, slotId) => schedules.find(s => s.profesor_id === selectedTeacherId && s.dia_semana === day && s.franja_id === slotId)}
                                        renderItemContent={(existing, day, slot) => (
                                            <>
                                                <div style={{ fontWeight: 700 }}>{slot.label}</div>
                                                <div style={{ opacity: 0.6, fontSize: '0.65rem' }}>{slot.start_time?.slice(0, 5)}</div>
                                            </>
                                        )}
                                        onSlotClick={async (existing, day, slot) => {
                                            if (existing) {
                                                await deletePersonalScheduleEntry(existing.id);
                                            } else {
                                                await createPersonalScheduleEntry({ 
                                                    profesor_id: selectedTeacherId, 
                                                    dia_semana: day, 
                                                    franja_id: slot.id,
                                                    tipo: 'Guardia' 
                                                });
                                            }
                                            fetchSchedules();
                                        }}
                                    />
                                </div>
                            ) : viewModeSchedules === 'grid' ? (
                                <div style={{ padding: 60, textAlign: 'center' }}>
                                    <Users size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                                    <p style={{ opacity: 0.6 }}>Selecciona un profesor arriba para ver su matriz de guardias</p>
                                </div>
                            ) : (
                                <table className="table" style={{ width: '100%', tableLayout: 'fixed' }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 90, background: 'var(--bg-card)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                        <tr>
                                            <th style={{ ...thStyle, width: '33%', paddingLeft: 20, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(setSortSchedules, 'teacher')}>PROFESOR <SortIcon active={sortSchedules.key === 'teacher'} dir={sortSchedules.dir} /></th>
                                            <th style={{ ...thStyle, width: '15%', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(setSortSchedules, 'dia')}>DÍA <SortIcon active={sortSchedules.key === 'dia'} dir={sortSchedules.dir} /></th>
                                            <th style={{ ...thStyle, width: '22%', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(setSortSchedules, 'franja')}>FRANJA <SortIcon active={sortSchedules.key === 'franja'} dir={sortSchedules.dir} /></th>
                                            <th style={{ ...thStyle, width: '15%', cursor: 'default', userSelect: 'none' }}>TIPO</th>
                                            <th style={{ ...thStyle, width: '15%', textAlign: 'right', paddingRight: 20 }}>ACCIONES</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingSchedules ? (
                                            <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', padding: 40 }}>Cargando horarios...</td></tr>
                                        ) : (
                                            schedules
                                                .filter(s => {
                                                    const matchesTeacher = !selectedTeacherId || s.profesor_id === selectedTeacherId;
                                                    const matchesSearch = !search || s.teacher?.name.toLowerCase().includes(search.toLowerCase());
                                                    return matchesTeacher && matchesSearch;
                                                })
                                                .sort((a, b) => {
                                                    if (!sortSchedules.key || !sortSchedules.dir) return 0;
                                                    let va = '', vb = '';
                                                    if (sortSchedules.key === 'teacher') { va = a.teacher?.name?.toLowerCase() || ''; vb = b.teacher?.name?.toLowerCase() || ''; }
                                                    else if (sortSchedules.key === 'dia') { return sortSchedules.dir === 'asc' ? DAY_ORDER.indexOf(a.dia_semana) - DAY_ORDER.indexOf(b.dia_semana) : DAY_ORDER.indexOf(b.dia_semana) - DAY_ORDER.indexOf(a.dia_semana); }
                                                    else if (sortSchedules.key === 'franja') { va = a.time_slot?.label?.toLowerCase() || ''; vb = b.time_slot?.label?.toLowerCase() || ''; }
                                                    const cmp = va.localeCompare(vb);
                                                    return sortSchedules.dir === 'asc' ? cmp : -cmp;
                                                })
                                                .map(sch => (
                                                <tr key={sch.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                                    <td style={{ ...tdStyle, paddingLeft: 20 }}>
                                                        {editingScheduleId === sch.id ? (
                                                            <select className="select" value={editScheduleForm.profesor_id || ''} onChange={e => setEditScheduleForm({ ...editScheduleForm, profesor_id: e.target.value })} style={{ ...smallInput, width: '100%' }}>
                                                                <option value="">Elegir profesor...</option>
                                                                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                            </select>
                                                        ) : (
                                                            sch.teacher?.name
                                                        )}
                                                    </td>
                                                    <td style={tdStyle}>
                                                        {editingScheduleId === sch.id ? (
                                                            <select className="select" value={editScheduleForm.dia_semana || ''} onChange={e => setEditScheduleForm({ ...editScheduleForm, dia_semana: e.target.value })} style={{ ...smallInput, width: '100%' }}>
                                                                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                                            </select>
                                                        ) : (
                                                            sch.dia_semana
                                                        )}
                                                    </td>
                                                    <td style={tdStyle}>
                                                        {editingScheduleId === sch.id ? (
                                                            <select className="select" value={editScheduleForm.franja_id || ''} onChange={e => setEditScheduleForm({ ...editScheduleForm, franja_id: e.target.value })} style={{ ...smallInput, width: '100%' }}>
                                                                <option value="">Franja...</option>
                                                                {meta.slots.filter(s => {
                                                                    if (editScheduleTypeFilter === 'Recreo') return s.label?.toLowerCase().includes('recreo');
                                                                    if (editScheduleTypeFilter === 'Ordinaria') return !s.label?.toLowerCase().includes('recreo');
                                                                    return true;
                                                                }).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                                            </select>
                                                        ) : (
                                                            sch.time_slot?.label
                                                        )}
                                                    </td>
                                                    <td style={tdStyle}>
                                                        {editingScheduleId === sch.id ? (
                                                            <select className="select" value={editScheduleTypeFilter} onChange={e => {
                                                                setEditScheduleTypeFilter(e.target.value as any);
                                                                setEditScheduleForm({ ...editScheduleForm, franja_id: '' });
                                                            }} style={{ ...smallInput, width: '100%' }}>
                                                                <option value="">Tipo...</option>
                                                                <option value="Ordinaria">Ordinaria</option>
                                                                <option value="Recreo">Recreo</option>
                                                            </select>
                                                        ) : (
                                                            (() => {
                                                                const isRecreo = sch.time_slot?.label?.toLowerCase().includes('recreo');
                                                                return (
                                                                    <div style={{ 
                                                                        display: 'inline-flex', 
                                                                        alignItems: 'center', 
                                                                        gap: 6, 
                                                                        padding: '2px 8px', 
                                                                        borderRadius: 12, 
                                                                        background: isRecreo ? 'rgba(251,191,36,0.1)' : 'rgba(52,211,153,0.1)', 
                                                                        border: `1px solid ${isRecreo ? 'rgba(251,191,36,0.2)' : 'rgba(52,211,153,0.2)'}`,
                                                                        color: isRecreo ? '#fbbf24' : '#34d399', 
                                                                        fontSize: '0.75rem', 
                                                                        fontWeight: 600 
                                                                    }}>
                                                                        {isRecreo ? <Coffee size={12} /> : <Shield size={12} />}
                                                                        {isRecreo ? 'Recreo' : 'Ordinaria'}
                                                                    </div>
                                                                );
                                                            })()
                                                        )}
                                                    </td>
                                                    <td style={{ ...tdStyle, textAlign: 'right', paddingRight: 20 }}>
                                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                            {editingScheduleId === sch.id ? (
                                                                <>
                                                                    <button onClick={() => handleUpdateSchedule(sch.id)} className="btn btn-success" style={iconBtnStyle}><Check size={14} /></button>
                                                                    <button onClick={() => setEditingScheduleId(null)} className="btn btn-ghost" style={iconBtnStyle}><X size={14} /></button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button onClick={() => { 
                                                                        setEditingScheduleId(sch.id); 
                                                                        setEditScheduleForm(sch); 
                                                                        setEditScheduleTypeFilter(sch.time_slot?.label?.toLowerCase().includes('recreo') ? 'Recreo' : 'Ordinaria');
                                                                    }} className="btn btn-ghost" style={iconBtnStyle}><Edit2 size={14} /></button>
                                                                    <button onClick={() => handleDeleteSchedule(sch.id)} className="btn btn-danger-subtle" style={iconBtnStyle}><Trash2 size={14} /></button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                        {schedules.filter(s => {
                                            const matchesTeacher = !selectedTeacherId || s.profesor_id === selectedTeacherId;
                                            const matchesSearch = !search || s.teacher?.name.toLowerCase().includes(search.toLowerCase());
                                            return matchesTeacher && matchesSearch;
                                        }).length === 0 && !loadingSchedules && (
                                            <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', padding: 40, opacity: 0.5 }}>No se han encontrado guardias con estos filtros.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'personal_schedule' && (
                    <div style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', position: 'relative', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                        {/* Consola de Mando: Horario Personal */}
                        <div style={{ 
                            position: 'sticky', 
                            top: 0, 
                            zIndex: 100, 
                            background: 'var(--bg-panel)',
                            borderBottom: '2px solid var(--brand-500)',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%'
                        }}>
                            {/* Fila Superior: Selector y Modos */}
                            <div style={{ 
                                height: 72, 
                                padding: '0 24px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                background: 'rgba(15,23,42,0.7)',
                                backdropFilter: 'blur(20px)',
                                borderBottom: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ver/Editar:</span>
                                        <select
                                            className="select"
                                            value={selectedTeacherId}
                                            onChange={e => setSelectedTeacherId(e.target.value)}
                                            style={{ ...smallInput, height: 40, width: '240px', margin: 0, border: '1px solid rgba(255,255,255,0.1)' }}
                                        >
                                            <option value="">-- Todos los Profesores --</option>
                                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>

                                    <div style={{ 
                                        display: 'flex', 
                                        background: 'rgba(0,0,0,0.3)', 
                                        borderRadius: 10, 
                                        padding: 3, 
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        height: 40,
                                        alignItems: 'center'
                                    }}>
                                        <button
                                            onClick={() => setViewModePersonal('grid')}
                                            style={{
                                                padding: '0 20px', height: '100%', borderRadius: 8, border: 'none', 
                                                fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.2s',
                                                background: viewModePersonal === 'grid' ? 'var(--brand-500)' : 'transparent',
                                                color: viewModePersonal === 'grid' ? 'white' : 'var(--text-secondary)',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                boxShadow: viewModePersonal === 'grid' ? '0 4px 12px rgba(34,211,238,0.3)' : 'none'
                                            }}
                                        >Matriz</button>
                                        <button
                                            onClick={() => setViewModePersonal('list')}
                                            style={{
                                                padding: '0 20px', height: '100%', borderRadius: 8, border: 'none', 
                                                fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.2s',
                                                background: viewModePersonal === 'list' ? 'var(--brand-500)' : 'transparent',
                                                color: viewModePersonal === 'list' ? 'white' : 'var(--text-secondary)',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                boxShadow: viewModePersonal === 'list' ? '0 4px 12px rgba(34,211,238,0.3)' : 'none'
                                            }}
                                        >Lista</button>
                                    </div>
                                </div>

                                <div style={{
                                    background: 'rgba(34,211,238,0.1)',
                                    color: 'var(--brand-400)',
                                    padding: '0 20px',
                                    borderRadius: 12,
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                    border: '1px solid rgba(34,211,238,0.3)',
                                    height: 40,
                                    display: 'flex',
                                    alignItems: 'center',
                                    letterSpacing: '0.5px'
                                }}>
                                    {personalEntries.length} SESIONES
                                </div>
                            </div>

                            {/* Fila Inferior: Filtros (solo lista) y Configuración (siempre) */}
                            <div style={{ 
                                minHeight: 56,
                                padding: '8px 24px', 
                                display: 'flex', 
                                alignItems: 'center',
                                gap: 16,
                                background: 'rgba(15,23,42,0.4)',
                                borderTop: '1px solid rgba(255,255,255,0.05)',
                                flexWrap: 'wrap'
                            }}>


                                {selectedTeacherId && (
                                    <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 8, minWidth: 'fit-content' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--brand-400)', fontWeight: 800, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                            {viewModePersonal === 'grid' ? '🪣 CONFIGURAR PINCEL:' : '➕ AÑADIR SESIÓN:'}
                                        </span>
                                        <select className="select" value={newPersonalForm.materia_id} onChange={e => setNewPersonalForm({ ...newPersonalForm, materia_id: e.target.value, submateria_id: '' })} style={{ ...smallInput, flex: 2, height: 36 }}>
                                            <option value="">Departamento...</option>
                                            {meta.subjects.filter(s => !s.padre_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        {newPersonalForm.materia_id && meta.subjects.some(s => s.padre_id === newPersonalForm.materia_id) && (
                                            <select className="select" value={newPersonalForm.submateria_id} onChange={e => setNewPersonalForm({ ...newPersonalForm, submateria_id: e.target.value })} style={{ ...smallInput, flex: 1.5, height: 36 }}>
                                                <option value="">Materia...</option>
                                                {meta.subjects.filter(s => s.padre_id === newPersonalForm.materia_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        )}
                                        <select className="select" value={newPersonalForm.grupo_id} onChange={e => setNewPersonalForm({ ...newPersonalForm, grupo_id: e.target.value })} style={{ ...smallInput, flex: 1, height: 36 }}>
                                            <option value="">Grupo...</option>
                                            {meta.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                        </select>
                                        <select className="select" value={newPersonalForm.aula_id} onChange={e => setNewPersonalForm({ ...newPersonalForm, aula_id: e.target.value })} style={{ ...smallInput, flex: 1, height: 36 }}>
                                            <option value="">Aula...</option>
                                            {meta.classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        {viewModePersonal === 'list' && (
                                            <button onClick={handleCreatePersonalEntry} className="btn btn-primary" style={{ height: 36, width: 44, padding: 0, borderRadius: 8, flexShrink: 0 }}>
                                                <Plus size={20} />
                                            </button>
                                        )}
                                        {viewModePersonal === 'grid' && (
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 500, fontStyle: 'italic', marginLeft: 8 }}>
                                                TIP: Haz clic en las celdas para pintar
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Contenido: Matriz o Lista */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {loadingPersonal ? (
                                <div style={{ padding: 40, textAlign: 'center', opacity: 0.5 }}>Cargando sesiones...</div>
                            ) : viewModePersonal === 'grid' && selectedTeacherId ? (
                                <div style={{ padding: 20 }}>
                                    <InteractiveScheduleGrid
                                        slots={meta.slots}
                                        getItem={(day, slotId) => personalEntries.find(e => e.profesor_id === selectedTeacherId && e.dia_semana === day && e.franja_id === slotId)}
                                        showRowHeaders={true}
                                        stickyOffset={0}
                                        renderItemContent={(existing) => (
                                            existing ? (
                                                <>
                                                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.75rem' }}>{existing.materia?.name}</div>
                                                    <div style={{ opacity: 0.8, fontSize: '0.7rem' }}>{existing.grupo?.name}</div>
                                                    <div style={{ opacity: 0.6, fontSize: '0.6rem' }}>{existing.aula?.name}</div>
                                                </>
                                            ) : (
                                                <div style={{ opacity: 0.2 }}><Plus size={14} style={{ margin: '0 auto' }} /></div>
                                            )
                                        )}
                                        onSlotClick={async (existing, day, slot) => {
                                            if (existing) {
                                                await deletePersonalScheduleEntry(existing.id);
                                            } else if (newPersonalForm.materia_id && newPersonalForm.grupo_id) {
                                                const finalMateriaId = newPersonalForm.submateria_id || newPersonalForm.materia_id;
                                                await createPersonalScheduleEntry({
                                                    profesor_id: selectedTeacherId,
                                                    dia_semana: day,
                                                    franja_id: slot.id,
                                                    materia_id: finalMateriaId,
                                                    grupo_id: newPersonalForm.grupo_id,
                                                    aula_id: newPersonalForm.aula_id,
                                                    tipo: 'Lectivo'
                                                });
                                            } else {
                                                toast.error('Selecciona Departamento y Grupo primero');
                                            }
                                            fetchPersonalEntries(selectedTeacherId);
                                        }}
                                    />
                                </div>
                            ) : viewModePersonal === 'list' ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 90, background: 'var(--bg-card)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                        <tr style={{ borderBottom: '2px solid var(--slate-800)' }}>
                                            <th style={{ ...thStyle, width: '9%', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(setSortPersonal, 'dia')}>DÍA <SortIcon active={sortPersonal.key === 'dia'} dir={sortPersonal.dir} /></th>
                                            <th style={{ ...thStyle, width: '14%', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(setSortPersonal, 'franja')}>FRANJA <SortIcon active={sortPersonal.key === 'franja'} dir={sortPersonal.dir} /></th>
                                            <th style={{ ...thStyle, width: '25%', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(setSortPersonal, 'profesor')}>PROFESOR <SortIcon active={sortPersonal.key === 'profesor'} dir={sortPersonal.dir} /></th>
                                            <th style={{ ...thStyle, width: '22%', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(setSortPersonal, 'materia')}>MATERIA <SortIcon active={sortPersonal.key === 'materia'} dir={sortPersonal.dir} /></th>
                                            <th style={{ ...thStyle, width: '10%', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(setSortPersonal, 'grupo')}>GRUPO <SortIcon active={sortPersonal.key === 'grupo'} dir={sortPersonal.dir} /></th>
                                            <th style={{ ...thStyle, width: '10%', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(setSortPersonal, 'aula')}>AULA <SortIcon active={sortPersonal.key === 'aula'} dir={sortPersonal.dir} /></th>
                                            <th style={{ ...thStyle, width: '10%', textAlign: 'right' }}>ACCIONES</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {personalEntries
                                            .filter(e => {
                                                const matchesTeacher = !selectedTeacherId || e.profesor_id === selectedTeacherId;
                                                return matchesTeacher;
                                            })
                                            .sort((a, b) => {
                                                if (sortPersonal.key && sortPersonal.dir) {
                                                    let va = '', vb = '';
                                                    const teacherA = teachers.find(t => t.id === a.profesor_id);
                                                    const teacherB = teachers.find(t => t.id === b.profesor_id);
                                                    if (sortPersonal.key === 'dia') return sortPersonal.dir === 'asc' ? DAY_ORDER.indexOf(a.dia_semana) - DAY_ORDER.indexOf(b.dia_semana) : DAY_ORDER.indexOf(b.dia_semana) - DAY_ORDER.indexOf(a.dia_semana);
                                                    if (sortPersonal.key === 'franja') { va = meta.slots.find(s => s.id === a.franja_id)?.label?.toLowerCase() || ''; vb = meta.slots.find(s => s.id === b.franja_id)?.label?.toLowerCase() || ''; }
                                                    else if (sortPersonal.key === 'profesor') { va = teacherA?.name?.toLowerCase() || ''; vb = teacherB?.name?.toLowerCase() || ''; }
                                                    else if (sortPersonal.key === 'materia') { va = a.materia?.name?.toLowerCase() || ''; vb = b.materia?.name?.toLowerCase() || ''; }
                                                    else if (sortPersonal.key === 'grupo') { va = a.grupo?.name?.toLowerCase() || ''; vb = b.grupo?.name?.toLowerCase() || ''; }
                                                    else if (sortPersonal.key === 'aula') { va = a.aula?.name?.toLowerCase() || ''; vb = b.aula?.name?.toLowerCase() || ''; }
                                                    const cmp = va.localeCompare(vb);
                                                    return sortPersonal.dir === 'asc' ? cmp : -cmp;
                                                }
                                                // Default sort: day then slot
                                                if (a.dia_semana !== b.dia_semana) return DAY_ORDER.indexOf(a.dia_semana) - DAY_ORDER.indexOf(b.dia_semana);
                                                return (a.franja_id || '').localeCompare(b.franja_id || '');
                                            })
                                            .map(entry => {
                                                const teacher = teachers.find(t => t.id === entry.profesor_id);
                                                return (
                                                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--slate-800/50)' }}>
                                                        <td style={tdStyle}>
                                                            {editingPersonalId === entry.id ? (
                                                                <select className="select" value={editPersonalForm.dia_semana || ''} onChange={e => setEditPersonalForm({ ...editPersonalForm, dia_semana: e.target.value })} style={{ ...smallInput, width: '100%' }}>
                                                                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                                                </select>
                                                            ) : entry.dia_semana}
                                                        </td>
                                                        <td style={tdStyle}>
                                                            {editingPersonalId === entry.id ? (
                                                                <select className="select" value={editPersonalForm.franja_id || ''} onChange={e => setEditPersonalForm({ ...editPersonalForm, franja_id: e.target.value })} style={{ ...smallInput, width: '100%' }}>
                                                                    <option value="">Franja...</option>
                                                                    {meta.slots.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                                                </select>
                                                            ) : (
                                                                meta.slots.find(s => s.id === entry.franja_id)?.label || entry.franja_id
                                                            )}
                                                        </td>
                                                        <td style={{ ...tdStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {editingPersonalId === entry.id ? (
                                                                <select className="select" value={editPersonalForm.profesor_id || ''} onChange={e => setEditPersonalForm({ ...editPersonalForm, profesor_id: e.target.value })} style={{ ...smallInput, width: '100%' }}>
                                                                    <option value="">Profesor...</option>
                                                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                                </select>
                                                            ) : (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <TeacherAvatar teacher={teacher || { name: entry.profesor_id } as any} size={24} />
                                                                    {teacher?.name || entry.profesor_id}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ ...tdStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {editingPersonalId === entry.id ? (
                                                                <div style={{ display: 'flex', gap: 4 }}>
                                                                    <select className="select" value={editPersonalForm.materia_id || ''} onChange={e => setEditPersonalForm({ ...editPersonalForm, materia_id: e.target.value, submateria_id: '' })} style={{ ...smallInput, flex: 1, minWidth: 80 }}>
                                                                        <option value="">Departamento...</option>
                                                                        {meta.subjects.filter(s => !s.padre_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                                    </select>
                                                                    {editPersonalForm.materia_id && meta.subjects.some(s => s.padre_id === editPersonalForm.materia_id) && (
                                                                        <select className="select" value={editPersonalForm.submateria_id || ''} onChange={e => setEditPersonalForm({ ...editPersonalForm, submateria_id: e.target.value })} style={{ ...smallInput, flex: 1, minWidth: 80 }}>
                                                                            <option value="">Materia...</option>
                                                                            {meta.subjects.filter(s => s.padre_id === editPersonalForm.materia_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                                        </select>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                entry.materia?.name
                                                            )}
                                                        </td>
                                                        <td style={tdStyle}>
                                                            {editingPersonalId === entry.id ? (
                                                                <select className="select" value={editPersonalForm.grupo_id || ''} onChange={e => setEditPersonalForm({ ...editPersonalForm, grupo_id: e.target.value })} style={{ ...smallInput, width: '100%' }}>
                                                                    <option value="">Grupo...</option>
                                                                    {meta.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                                                </select>
                                                            ) : entry.grupo?.name}
                                                        </td>
                                                        <td style={tdStyle}>
                                                            {editingPersonalId === entry.id ? (
                                                                <select className="select" value={editPersonalForm.aula_id || ''} onChange={e => setEditPersonalForm({ ...editPersonalForm, aula_id: e.target.value })} style={{ ...smallInput, width: '100%' }}>
                                                                    <option value="">Aula...</option>
                                                                    {meta.classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                                </select>
                                                            ) : entry.aula?.name}
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                                {editingPersonalId === entry.id ? (
                                                                    <>
                                                                        <button onClick={() => handleUpdatePersonalEntry(entry.id)} className="btn btn-success" style={iconBtnStyle}><Check size={14} /></button>
                                                                        <button onClick={() => setEditingPersonalId(null)} className="btn btn-ghost" style={iconBtnStyle}><X size={14} /></button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <button onClick={() => {
                                                                            setEditingPersonalId(entry.id);
                                                                            const isSubmateria = meta.subjects.find(s => s.id === entry.materia_id)?.padre_id;
                                                                            setEditPersonalForm({ 
                                                                                ...entry, 
                                                                                materia_id: isSubmateria ? isSubmateria : entry.materia_id,
                                                                                submateria_id: isSubmateria ? entry.materia_id : ''
                                                                            });
                                                                        }} className="btn btn-ghost" style={iconBtnStyle}><Edit2 size={14} /></button>
                                                                        <button
                                                                            onClick={async () => {
                                                                                await handleDeletePersonalEntry(entry.id);
                                                                            }}
                                                                            className="btn btn-danger-subtle"
                                                                            style={iconBtnStyle}
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        {personalEntries.length === 0 && (
                                            <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', opacity: 0.5, padding: 40 }}>No se han encontrado registros.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                <div style={{ padding: 60, textAlign: 'center' }}>
                                    <Users size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                                    <p style={{ opacity: 0.6 }}>Selecciona un profesor arriba para ver su matriz de horarios</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', position: 'relative', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(15,23,42,0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Auditoría de Documentación</h2>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                                        Listado de profesores activos que aún no tienen su horario completo.
                                    </p>
                                </div>
                                <div style={{ background: 'rgba(34,211,238,0.1)', color: 'var(--brand-400)', padding: '8px 16px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 700, border: '1px solid rgba(34,211,238,0.2)' }}>
                                    {loadingAudit ? 'CARGANDO...' : `${auditResults.length} PROFESORES PENDIENTES`}
                                </div>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                            {loadingAudit && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div className="spinner" style={{ width: 40, height: 40, border: '4px solid rgba(34,211,238,0.1)', borderTopColor: 'var(--brand-400)', borderRadius: '50%' }}></div>
                                </div>
                            )}
                            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-panel)' }}>
                                    <tr>
                                        <th style={{ ...thStyle, width: '40%', paddingLeft: 32, cursor: 'pointer' }} onClick={() => toggleSort(setSortAudit, 'name')}>PROFESOR <SortIcon active={sortAudit.key === 'name'} dir={sortAudit.dir} /></th>
                                        <th style={{ ...thStyle, width: '35%', cursor: 'pointer' }} onClick={() => toggleSort(setSortAudit, 'status')}>ESTADO <SortIcon active={sortAudit.key === 'status'} dir={sortAudit.dir} /></th>
                                        <th style={{ ...thStyle, width: '25%', textAlign: 'right', paddingRight: 32 }}>ACCIONES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditResults.map(res => (
                                        <tr key={res.id} style={{ borderBottom: '1px solid var(--slate-800/50)', transition: 'background 0.2s', background: 'transparent' }}>
                                            <td style={{ ...tdStyle, paddingLeft: 32 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <TeacherAvatar teacher={res.teacher} size={32} />
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{res.name}</span>
                                                        <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{(res.email || '')}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <span style={{ 
                                                        padding: '4px 10px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                                                        background: res.missing_personal ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                                                        color: res.missing_personal ? 'var(--red-400)' : 'var(--green-400)',
                                                        border: `1px solid ${res.missing_personal ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`
                                                    }}>
                                                        {res.missing_personal ? '❌ Lectivo' : '✅ Lectivo'}
                                                    </span>
                                                    <span style={{ 
                                                        padding: '4px 10px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                                                        background: res.missing_guards ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                                                        color: res.missing_guards ? 'var(--red-400)' : 'var(--green-400)',
                                                        border: `1px solid ${res.missing_guards ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`
                                                    }}>
                                                        {res.missing_guards ? '❌ Guardias' : '✅ Guardias'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'right', paddingRight: 32 }}>
                                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                    <button 
                                                        onClick={() => { setSelectedTeacherId(res.id); setActiveTab('personal_schedule'); setViewModePersonal('grid'); }}
                                                        className="btn btn-ghost" 
                                                        style={{ fontSize: '0.7rem', padding: '0 12px', height: 32, borderRadius: 8, fontWeight: 700 }}
                                                    >
                                                        Rellenar Lectivo
                                                    </button>
                                                    <button 
                                                        onClick={() => { setSelectedTeacherId(res.id); setActiveTab('schedules'); setViewModeSchedules('grid'); }}
                                                        className="btn btn-ghost" 
                                                        style={{ fontSize: '0.7rem', padding: '0 12px', height: 32, borderRadius: 8, fontWeight: 700 }}
                                                    >
                                                        Rellenar Guardias
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {auditResults.length === 0 && (
                                        <tr>
                                            <td colSpan={3} style={{ padding: 60, textAlign: 'center' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, opacity: 0.5 }}>
                                                    <ShieldCheck size={48} color="var(--green-400)" />
                                                    <p style={{ fontWeight: 700 }}>¡Todo al día! No hay profesores con documentación pendiente.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </>
        )}
            </div>
            <AnimatePresence>
                {activeTab === 'guards' && selectedGuardIds.size > 0 && (
                    <motion.div
                        key="bulk-bar"
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                        style={{
                            position: 'fixed',
                            bottom: 28,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 8000,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            padding: '12px 20px',
                            borderRadius: 14,
                            background: 'rgba(15, 23, 42, 0.95)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
                            backdropFilter: 'blur(16px)',
                            minWidth: 340,
                        }}
                    >
                        <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: 'rgba(239,68,68,0.15)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Trash2 size={14} color="#f87171" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                                {selectedGuardIds.size} guardia{selectedGuardIds.size > 1 ? 's' : ''} seleccionada{selectedGuardIds.size > 1 ? 's' : ''}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 1 }}>
                                Esta acción es permanente e irreversible
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedGuardIds(new Set())}
                            style={{
                                padding: '6px 14px', borderRadius: 8,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: '#64748b', cursor: 'pointer',
                                fontSize: '0.8rem', fontWeight: 600,
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleBulkDeleteGuards}
                            style={{
                                padding: '6px 18px', borderRadius: 8,
                                background: 'rgba(239,68,68,0.2)',
                                border: '1px solid rgba(239,68,68,0.4)',
                                color: '#f87171', cursor: 'pointer',
                                fontSize: '0.8rem', fontWeight: 700,
                                display: 'flex', alignItems: 'center', gap: 6,
                            }}
                        >
                            <Trash2 size={13} />
                            Eliminar {selectedGuardIds.size}
                        </button>
                    </motion.div>
                )}
                {isCloning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9999,
                            background: 'rgba(2, 6, 23, 0.85)',
                            backdropFilter: 'blur(12px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="card"
                            style={{
                                width: '100%', maxWidth: 500, padding: 32,
                                border: '1px solid var(--slate-800)',
                                background: 'var(--bg-card)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                                <div style={{ 
                                    padding: 12, borderRadius: 12, 
                                    background: 'var(--brand-950)', color: 'var(--brand-400)',
                                    border: '1px solid var(--brand-500/20)'
                                }}>
                                    <Copy size={24} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Sustitución de Profesor</h2>
                                    <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '4px 0 0' }}>
                                        Copia los horarios de un profesor a otro. Recoge y continua sus estadisticos.
                                    </p>
                                </div>
                                <button onClick={() => setIsCloning(false)} className="btn btn-ghost" style={iconBtnStyle}><X size={16} /></button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        1. Profesor titular (El que causa baja)
                                    </label>
                                    <select 
                                        className="select" 
                                        value={cloneSourceId} 
                                        onChange={e => setCloneSourceId(e.target.value)}
                                        style={{ height: 48 }}
                                    >
                                        <option value="">-- Seleccionar origen --</option>
                                        {teachers.filter(t => t.active === false).sort((a,b)=>a.name.localeCompare(b.name)).map(t => (
                                            <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                                        ))}
                                    </select>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--brand-400)', margin: 0 }}>
                                        Se leerán todas sus clases y tramos de guardia.
                                    </p>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <ChevronDown style={{ opacity: 0.4 }} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        2. Profesor sustituto (Interino/sustituto)
                                    </label>
                                    <select 
                                        className="select" 
                                        value={cloneTargetId} 
                                        onChange={e => setCloneTargetId(e.target.value)}
                                        style={{ height: 48 }}
                                    >
                                        <option value="">-- Seleccionar destino --</option>
                                        {teachers.filter(t => t.active !== false && !guardGroupSchedules?.some(s => s.profesor_id === t.id)).sort((a,b)=>a.name.localeCompare(b.name)).map(t => (
                                            <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                                        ))}
                                    </select>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--brand-400)', margin: 0 }}>
                                        Se le asignarán las mismas sesiones que al titular.
                                    </p>
                                </div>

                                <div style={{ 
                                    padding: 16, borderRadius: 12, 
                                    background: 'rgba(234, 179, 8, 0.05)', 
                                    border: '1px solid rgba(234, 179, 8, 0.2)',
                                    marginTop: 8
                                }}>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <AlertCircle size={18} style={{ color: '#eab308', flexShrink: 0 }} />
                                        <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                            <strong>Nota:</strong> Esta acción no borra el horario del titular, solo lo duplica en el sustituto. 
                                            Si el sustituto ya tenía clases en esas horas, se mantendrá el registro original (no se duplicará si es idéntico).
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                                    <button 
                                        onClick={() => setIsCloning(false)} 
                                        className="btn btn-ghost" 
                                        style={{ flex: 1, height: 48 }}
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={handlePerformClone} 
                                        className="btn btn-primary" 
                                        style={{ flex: 2, height: 48, fontWeight: 700 }}
                                        disabled={!cloneSourceId || !cloneTargetId}
                                    >
                                        Confirmar Clonado
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal de Confirmación de Restablecimiento */}
            <AnimatePresence>
                {isResetModalOpen && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24
                    }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="card"
                            style={{
                                width: '100%',
                                maxWidth: 480,
                                padding: 24,
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                background: '#090d16',
                                borderRadius: 24,
                                boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(239, 68, 68, 0.15)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 16
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
                                <ShieldAlert size={24} color="#ef4444" />
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#f87171' }}>¡ADVERTENCIA CRÍTICA!</h2>
                            </div>

                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                                Estás a punto de borrar permanentemente los siguientes datos de la base de datos:
                            </p>

                            <ul style={{ fontSize: '0.8rem', color: '#f87171', margin: '0 0 0 16px', padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {clearGuards && <li>Historial completo de guardias (ausencias y coberturas).</li>}
                                {clearSchedules && <li>Horarios personales (clases lectivas) y asignaciones semanales de guardia.</li>}
                                {clearCalendar && <li>Reservas de aulas, días de libre disposición y eventos.</li>}
                                {clearLogs && <li>Historial de actividad de los usuarios.</li>}
                                {clearTeachers && <li>Todos los profesores (excepto administradores/jefatura).</li>}
                                {clearInfra && <li>Toda la infraestructura (aulas, materias, grupos de clase).</li>}
                            </ul>

                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                                Esta operación <strong>NO se puede deshacer</strong>.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                    Escribe <span style={{ color: '#ef4444', fontWeight: 800 }}>RESTABLECER</span> para confirmar:
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Escribe la palabra aquí..."
                                    value={resetConfirmationInput}
                                    onChange={(e) => setResetConfirmationInput(e.target.value)}
                                    style={{ borderColor: resetConfirmationInput === 'RESTABLECER' ? '#22c55e' : 'var(--border-subtle)' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                                <button
                                    onClick={() => {
                                        setIsResetModalOpen(false);
                                        setResetConfirmationInput('');
                                    }}
                                    className="btn btn-ghost"
                                    style={{ flex: 1, justifyContent: 'center' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleResetSchoolYear}
                                    disabled={resetConfirmationInput !== 'RESTABLECER' || isResetting}
                                    className="btn"
                                    style={{
                                        flex: 1,
                                        justifyContent: 'center',
                                        background: resetConfirmationInput === 'RESTABLECER' ? '#ef4444' : 'var(--slate-800)',
                                        color: 'white',
                                        opacity: resetConfirmationInput === 'RESTABLECER' ? 1 : 0.5,
                                        cursor: resetConfirmationInput === 'RESTABLECER' ? 'pointer' : 'not-allowed'
                                    }}
                                >
                                    {isResetting ? 'Restableciendo...' : 'Confirmar e Iniciar'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const thStyle: React.CSSProperties = { padding: '12px 10px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '12px 10px', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'left' };
const iconBtnStyle: React.CSSProperties = { padding: 4, width: 32, height: 32, minHeight: 'auto' };
const smallInput: React.CSSProperties = {
    padding: '0 12px',
    fontSize: '0.875rem',
    height: 36,
    minHeight: 36,
    boxSizing: 'border-box',
    border: '1px solid var(--border-subtle)',
    width: '100%',
    minWidth: '130px',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap'
};
const metaBtnStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    padding: '0 16px',
    height: 36,
    minHeight: 36,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 600,
    borderRadius: 8,
    boxSizing: 'border-box',
    border: 'none',
    minWidth: 'auto'
};

export default AdminPanel;

/* ─── PremiumCheckbox ──────────────────────────────────────────────────────── */
const PremiumCheckbox: React.FC<{
    checked: boolean;
    indeterminate?: boolean;
    onChange: (checked: boolean) => void;
}> = ({ checked, indeterminate = false, onChange }) => {
    const ref = React.useRef<HTMLInputElement>(null);
    React.useEffect(() => {
        if (ref.current) ref.current.indeterminate = indeterminate;
    }, [indeterminate]);

    return (
        <label
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                width: 20,
                height: 20,
                position: 'relative',   // ← contiene el input sr-only
            }}
        >
            {/* Screen-reader-only input: usa clip+overflow para ocultarlo robustamente */}
            <input
                ref={ref}
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                style={{
                    position: 'absolute',
                    width: 1,
                    height: 1,
                    padding: 0,
                    margin: -1,
                    overflow: 'hidden',
                    clip: 'rect(0,0,0,0)',
                    whiteSpace: 'nowrap',
                    border: 0,
                    opacity: 0,
                    pointerEvents: 'none',
                }}
            />
            {/* Visual custom checkbox */}
            <div
                style={{
                    width: 18, height: 18, borderRadius: 5,
                    border: (checked || indeterminate)
                        ? '2px solid rgba(34,211,238,0.9)'
                        : '2px solid rgba(51,65,85,0.8)',
                    background: (checked || indeterminate)
                        ? 'linear-gradient(135deg, rgba(34,211,238,0.25), rgba(6,182,212,0.15))'
                        : 'rgba(15,23,42,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    boxShadow: (checked || indeterminate)
                        ? '0 0 8px rgba(34,211,238,0.3)'
                        : 'none',
                    flexShrink: 0,
                    pointerEvents: 'none',  // el click lo captura el label
                }}
            >
                {indeterminate && !checked && (
                    <div style={{
                        width: 8, height: 2, borderRadius: 1,
                        background: 'rgba(34,211,238,0.9)',
                    }} />
                )}
                {checked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="rgba(34,211,238,1)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>
        </label>
    );
};
