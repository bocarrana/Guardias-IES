import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, UserPlus, Settings, Search, X, Save,
    Trash2, AlertTriangle, Check, CalendarDays,
    ChevronDown, ChevronUp, Filter, RefreshCw,
    BadgeCheck, Clock, TrendingUp, Shield,
    Download, FileSpreadsheet, FileText,
} from 'lucide-react';
import { Teacher } from '../types';
import {
    getLibreDisposicion, createLibreDisposicion, deleteLibreDisposicion,
    getCupoMaximo, setCupoMaximo, LibreDisposicion, LdTipo,
    getCalendarDays,
    getMaxLdPerTeacher, setMaxLdPerTeacher,
} from '../services/supabaseClient';
import { getTeachers } from '../services/supabaseClient';
import { canManageLibreDisposicion } from '../utils/roles';
import { CalendarDay } from '../types';
import { toast } from 'sonner';
import { exportLdPDF, exportLdExcel, ExportGrouping, ExportFormat } from '../utils/ldExport';
import { MonthDayPicker } from './MonthDayPicker';

interface LibreDisposicionPanelProps {
    currentUser: Teacher | null;
}

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const formatDisplayDate = (fecha: string) => {
    const d = new Date(fecha + 'T00:00:00');
    const dayName = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()];
    return `${dayName} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} de ${d.getFullYear()}`;
};

const formatShortDate = (fecha: string) => {
    const d = new Date(fecha + 'T00:00:00');
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].substring(0, 3)} ${d.getFullYear()}`;
};

// El límite anual por profesor ahora es dinámico y se carga de la base de datos.

// ─── Stat Card ─────────────────────────────────────────────

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
    bg: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color, bg }) => (
    <div style={{
        background: bg,
        border: `1px solid ${color}`,
        borderRadius: 16,
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flex: 1,
        minWidth: 150,
    }}>
        <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `${color}22`,
            border: `1px solid ${color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
        }}>
            <div style={{ color }}>{icon}</div>
        </div>
        <div>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{label}</p>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--heading-color)', lineHeight: 1.2 }}>{value}</p>
        </div>
    </div>
);

// ─── Main Panel ────────────────────────────────────────────

const LibreDisposicionPanel: React.FC<LibreDisposicionPanelProps> = ({ currentUser }) => {
    const [maxLdPerTeacher, setMaxLdPerTeacherState] = useState(4);
    const MAX_LD_PER_TEACHER = maxLdPerTeacher;

    const [ldRecords, setLdRecords] = useState<LibreDisposicion[]>([]);
    const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [cupoMax, setCupoMaxState] = useState(5);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Form state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTeachers, setSelectedTeachers] = useState<Teacher[]>([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [newCupo, setNewCupo] = useState(5);
    const [savingCupo, setSavingCupo] = useState(false);
    const [newMaxLd, setNewMaxLd] = useState(4);
    const [savingMaxLd, setSavingMaxLd] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedTipo, setSelectedTipo] = useState<LdTipo>('ordinario');

    // List filters
    const [filterTeacher, setFilterTeacher] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [sortOrder, setSortOrder] = useState<'date_asc' | 'date_desc' | 'name'>('date_desc');
    const [showAssignSection, setShowAssignSection] = useState(true);

    // Export menu
    const [showExportMenu, setShowExportMenu] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    // Close export menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
                setShowExportMenu(false);
            }
        };
        if (showExportMenu) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showExportMenu]);

    const isAdmin = canManageLibreDisposicion(currentUser);

    const fetchAll = useCallback(async () => {
        try {
            const [ld, cupo, maxLd, days, tchrs] = await Promise.all([
                getLibreDisposicion(),
                getCupoMaximo(),
                getMaxLdPerTeacher(),
                getCalendarDays(),
                isAdmin ? getTeachers(true) : Promise.resolve([]),
            ]);
            setLdRecords(ld);
            setCupoMaxState(cupo);
            setNewCupo(cupo);
            setMaxLdPerTeacherState(maxLd);
            setNewMaxLd(maxLd);
            setCalendarDays(days);
            setTeachers(tchrs as Teacher[]);
        } catch (err) {
            console.error('Error loading LD panel:', err);
            toast.error('Error al cargar los datos');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [isAdmin]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchAll();
        toast.success('Datos actualizados');
    };

    // ── Derived data ──────────────────────────────────────

    const dayMap = useMemo(() => {
        const m = new Map<string, CalendarDay>();
        calendarDays.forEach(d => m.set(d.fecha, d));
        return m;
    }, [calendarDays]);

    const ldCountByDay = useMemo(() => {
        const c = new Map<string, number>();
        ldRecords.forEach(r => c.set(r.fecha, (c.get(r.fecha) || 0) + 1));
        return c;
    }, [ldRecords]);

    const filteredTeachers = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        const selectedIds = new Set(selectedTeachers.map(t => t.id));
        return teachers.filter(t => t.name?.toLowerCase().includes(q) && !selectedIds.has(t.id)).slice(0, 8);
    }, [teachers, searchQuery, selectedTeachers]);

    const teacherLdCounts = useMemo(() => {
        const counts = new Map<string, number>();
        selectedTeachers.forEach(t => {
            counts.set(t.id, ldRecords.filter(r => r.profesor_id === t.id).length);
        });
        return counts;
    }, [ldRecords, selectedTeachers]);

    // Build unique months from records for filter
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        ldRecords.forEach(r => {
            const [year, month] = r.fecha.split('-');
            months.add(`${year}-${month}`);
        });
        return Array.from(months).sort().reverse();
    }, [ldRecords]);

    // My records (for non-admin view)
    const myRecords = useMemo(() => {
        if (!currentUser) return [];
        return ldRecords
            .filter(r => r.profesor_id === currentUser.id)
            .sort((a, b) => a.fecha.localeCompare(b.fecha));
    }, [ldRecords, currentUser]);

    // Filtered & sorted records for the list
    const filteredRecords = useMemo(() => {
        let recs = isAdmin ? [...ldRecords] : [...myRecords];

        if (filterTeacher) {
            const q = filterTeacher.toLowerCase();
            recs = recs.filter(r => r.teacher?.name?.toLowerCase().includes(q));
        }
        if (filterMonth) {
            recs = recs.filter(r => r.fecha.startsWith(filterMonth));
        }

        if (sortOrder === 'date_asc') recs.sort((a, b) => a.fecha.localeCompare(b.fecha));
        else if (sortOrder === 'date_desc') recs.sort((a, b) => b.fecha.localeCompare(a.fecha));
        else recs.sort((a, b) => (a.teacher?.name || '').localeCompare(b.teacher?.name || ''));

        return recs;
    }, [ldRecords, myRecords, isAdmin, filterTeacher, filterMonth, sortOrder]);

    // Stats
    const stats = useMemo(() => {
        const uniqueTeachers = new Set(ldRecords.map(r => r.profesor_id)).size;
        const uniqueDays = new Set(ldRecords.map(r => r.fecha)).size;
        const daysFull = Array.from(ldCountByDay.values()).filter(c => c >= cupoMax).length;
        return { total: ldRecords.length, uniqueTeachers, uniqueDays, daysFull };
    }, [ldRecords, ldCountByDay, cupoMax]);

    // ── Handlers ──────────────────────────────────────────

    const handleAssign = async () => {
        if (selectedTeachers.length === 0 || !selectedDate) {
            toast.error('Selecciona al menos un profesor y una fecha.');
            return;
        }
        const day = dayMap.get(selectedDate);
        if (!day || !day.es_lectivo) {
            toast.error('No se puede asignar en un día no lectivo.');
            return;
        }
        const currentCount = ldCountByDay.get(selectedDate) || 0;
        if (currentCount + selectedTeachers.length > cupoMax) {
            toast.error(`No hay cupo suficiente para ${selectedTeachers.length} profesor(es). Disponibles: ${cupoMax - currentCount}.`);
            return;
        }

        // Per-teacher validation
        const errors: string[] = [];
        for (const t of selectedTeachers) {
            const tCount = ldRecords.filter(r => r.profesor_id === t.id).length;
            if (tCount >= MAX_LD_PER_TEACHER) errors.push(`${t.name} ya agotó su cupo (${MAX_LD_PER_TEACHER}/${MAX_LD_PER_TEACHER}).`);
            if (ldRecords.find(r => r.profesor_id === t.id && r.fecha === selectedDate)) errors.push(`${t.name} ya tiene libre disposición ese día.`);
        }
        if (errors.length > 0) {
            errors.forEach(e => toast.error(e));
            return;
        }

        setSaving(true);
        let ok = 0;
        try {
            for (const t of selectedTeachers) {
                await createLibreDisposicion(t.id, selectedDate, selectedTipo);
                ok++;
            }
            const tipoLabel = selectedTipo === 'causa_sobrevenida' ? ' (causa sobrevenida)' : '';
            toast.success(`✅ ${ok} profesor(es) asignados para el ${formatShortDate(selectedDate)}${tipoLabel}.`);
            setSelectedTeachers([]);
            setSearchQuery('');
            setSelectedDate('');
            setSelectedTipo('ordinario');
            await fetchAll();
        } catch (err: any) {
            toast.error(`Error tras ${ok} asignaciones: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string, fecha: string) => {
        const confirmed = window.confirm(
            `¿Eliminar el día de libre disposición de ${name} el ${formatShortDate(fecha)}?\n\nEsto también eliminará las guardias pendientes generadas automáticamente para ese día.`
        );
        if (!confirmed) return;
        setDeletingId(id);
        try {
            await deleteLibreDisposicion(id);
            toast.success(`Permiso de ${name} el ${formatShortDate(fecha)} eliminado.`);
            await fetchAll();
        } catch (err: any) {
            toast.error(`Error: ${err.message}`);
        } finally {
            setDeletingId(null);
        }
    };

    const handleSaveCupo = async () => {
        if (newCupo < 1 || newCupo > 30) {
            toast.error('El cupo debe estar entre 1 y 30.');
            return;
        }
        setSavingCupo(true);
        try {
            await setCupoMaximo(newCupo);
            setCupoMaxState(newCupo);
            toast.success(`Cupo máximo actualizado a ${newCupo}.`);
        } catch (err: any) {
            toast.error(`Error: ${err.message}`);
        } finally {
            setSavingCupo(false);
        }
    };

    const handleSaveMaxLd = async () => {
        if (newMaxLd < 1 || newMaxLd > 10) {
            toast.error('El límite anual debe estar entre 1 y 10.');
            return;
        }
        setSavingMaxLd(true);
        try {
            await setMaxLdPerTeacher(newMaxLd);
            setMaxLdPerTeacherState(newMaxLd);
            toast.success(`Límite anual por profesor actualizado a ${newMaxLd}.`);
        } catch (err: any) {
            toast.error(`Error: ${err.message}`);
        } finally {
            setSavingMaxLd(false);
        }
    };

    // ── Export handlers ───────────────────────────────────

    const handleExport = (format: ExportFormat, grouping: ExportGrouping) => {
        setShowExportMenu(false);
        try {
            const monthFilter = filterMonth || undefined;
            if (format === 'pdf') {
                exportLdPDF(ldRecords, grouping, monthFilter);
            } else {
                exportLdExcel(ldRecords, grouping, monthFilter);
            }
            toast.success(`Informe ${format.toUpperCase()} generado correctamente.`);
        } catch (err: any) {
            console.error('Export error:', err);
            toast.error(`Error al generar el informe: ${err.message}`);
        }
    };

    // ── Render ────────────────────────────────────────────

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <div className="loading-spinner" />
        </div>
    );

    const dateWarning = (() => {
        if (!selectedDate) return null;
        const day = dayMap.get(selectedDate);
        const count = ldCountByDay.get(selectedDate) || 0;
        const needed = selectedTeachers.length || 1;
        if (day && !day.es_lectivo) return { type: 'error', msg: 'Día no lectivo — no se puede asignar.' };
        if (count + needed > cupoMax) return { type: 'error', msg: `Cupo insuficiente (${count}/${cupoMax} ocupadas, necesitas ${needed}).` };
        return { type: 'ok', msg: `Plaza disponible (${count}/${cupoMax})` };
    })();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ maxWidth: 1000, margin: '0 auto' }}
        >
            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 14,
                        background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(139,92,246,0.25))',
                        border: '1px solid rgba(34,211,238,0.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 24px rgba(34,211,238,0.15)',
                    }}>
                        <Users size={26} style={{ color: 'var(--brand-400)' }} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--heading-color)' }}>
                            Gestión de Libre Disposición
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {isAdmin ? 'Panel de Administrador · Permisos y cupos' : 'Mis días de libre disposición'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '8px 16px', borderRadius: 10,
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-card)', color: 'var(--text-secondary)',
                        cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(34,211,238,0.4)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                >
                    <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                    Actualizar
                </button>
            </div>

            {/* ── Stats Row ── */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
                <StatCard
                    icon={<CalendarDays size={22} />}
                    label="Total permisos"
                    value={stats.total}
                    color="rgba(34,211,238,0.9)"
                    bg="rgba(34,211,238,0.06)"
                />
                <StatCard
                    icon={<Users size={22} />}
                    label="Docentes con LD"
                    value={stats.uniqueTeachers}
                    color="rgba(139,92,246,0.9)"
                    bg="rgba(139,92,246,0.06)"
                />
                <StatCard
                    icon={<TrendingUp size={22} />}
                    label="Días con permisos"
                    value={stats.uniqueDays}
                    color="rgba(34,197,94,0.9)"
                    bg="rgba(34,197,94,0.06)"
                />
                <StatCard
                    icon={<Shield size={22} />}
                    label="Cupo máx. diario"
                    value={cupoMax}
                    color="rgba(245,158,11,0.9)"
                    bg="rgba(245,158,11,0.06)"
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1.4fr' : '1fr', gap: 20 }}>

                {/* ── LEFT COLUMN: admin controls ── */}
                {isAdmin && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* Cupos y límites */}
                        <div style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 18, padding: 22,
                            display: 'flex', flexDirection: 'column', gap: 20
                        }}>
                            {/* Cupo máximo diario */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 9,
                                        background: 'rgba(139,92,246,0.15)',
                                        border: '1px solid rgba(139,92,246,0.3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Settings size={16} style={{ color: '#8b5cf6' }} />
                                    </div>
                                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--heading-color)' }}>Cupo máximo diario</span>
                                </div>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <input
                                        type="number" min={1} max={30}
                                        value={newCupo}
                                        onChange={e => setNewCupo(parseInt(e.target.value) || 1)}
                                        style={{
                                            width: 80, padding: '9px 12px', borderRadius: 10,
                                            border: '1px solid var(--border-subtle)',
                                            background: 'var(--bg-main)',
                                            color: 'var(--text-primary)', fontSize: '1.1rem',
                                            fontWeight: 800, textAlign: 'center', outline: 'none',
                                        }}
                                    />
                                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', flex: 1 }}>
                                        profesores/día<br />
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Actual: <strong style={{ color: 'var(--heading-color)' }}>{cupoMax}</strong></span>
                                    </span>
                                    <button
                                        onClick={handleSaveCupo}
                                        disabled={savingCupo || newCupo === cupoMax}
                                        style={{
                                            padding: '9px 16px', borderRadius: 10,
                                            border: 'none', background: '#8b5cf6', color: '#fff',
                                            fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                                            opacity: savingCupo || newCupo === cupoMax ? 0.5 : 1,
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <Save size={14} /> Guardar
                                    </button>
                                </div>
                            </div>

                            <div style={{ height: 1, background: 'var(--border-subtle)' }} />

                            {/* Límite anual por profesor */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 9,
                                        background: 'rgba(34,211,238,0.15)',
                                        border: '1px solid rgba(34,211,238,0.3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Clock size={16} style={{ color: 'var(--brand-400)' }} />
                                    </div>
                                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--heading-color)' }}>Límite anual por profesor</span>
                                </div>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <input
                                        type="number" min={1} max={10}
                                        value={newMaxLd}
                                        onChange={e => setNewMaxLd(parseInt(e.target.value) || 1)}
                                        style={{
                                            width: 80, padding: '9px 12px', borderRadius: 10,
                                            border: '1px solid var(--border-subtle)',
                                            background: 'var(--bg-main)',
                                            color: 'var(--text-primary)', fontSize: '1.1rem',
                                            fontWeight: 800, textAlign: 'center', outline: 'none',
                                        }}
                                    />
                                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', flex: 1 }}>
                                        días/curso<br />
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Actual: <strong style={{ color: 'var(--heading-color)' }}>{maxLdPerTeacher}</strong></span>
                                    </span>
                                    <button
                                        onClick={handleSaveMaxLd}
                                        disabled={savingMaxLd || newMaxLd === maxLdPerTeacher}
                                        style={{
                                            padding: '9px 16px', borderRadius: 10,
                                            border: 'none', background: 'var(--brand-500)', color: '#fff',
                                            fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                                            opacity: savingMaxLd || newMaxLd === maxLdPerTeacher ? 0.5 : 1,
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <Save size={14} /> Guardar
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Assign section */}
                        <div style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 18, overflow: 'visible',
                        }}>
                            <button
                                onClick={() => setShowAssignSection(s => !s)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '18px 22px',
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    color: 'var(--heading-color)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 9,
                                        background: 'rgba(34,211,238,0.12)',
                                        border: '1px solid rgba(34,211,238,0.3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <UserPlus size={16} style={{ color: 'var(--brand-400)' }} />
                                    </div>
                                    <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>Asignar permiso</span>
                                </div>
                                {showAssignSection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>

                            <AnimatePresence>
                                {showAssignSection && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                                        animate={{ 
                                            height: 'auto', 
                                            opacity: 1,
                                            transitionEnd: { overflow: 'visible' }
                                        }}
                                        exit={{ 
                                            height: 0, 
                                            opacity: 0,
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <div style={{ padding: '0 22px 22px' }}>
                                            <div style={{ height: 1, background: 'var(--border-subtle)', marginBottom: 18 }} />

                                            {/* Teacher search (multi-select) */}
                                            <div style={{ marginBottom: 14 }}>
                                                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Profesores
                                                    {selectedTeachers.length > 0 && (
                                                        <span style={{
                                                            fontSize: '0.68rem', fontWeight: 800,
                                                            background: 'rgba(34,211,238,0.12)', color: 'var(--brand-400)',
                                                            padding: '1px 8px', borderRadius: 10,
                                                            border: '1px solid rgba(34,211,238,0.2)',
                                                        }}>
                                                            {selectedTeachers.length} seleccionado{selectedTeachers.length !== 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </label>

                                                {/* Selected chips */}
                                                {selectedTeachers.length > 0 && (
                                                    <div style={{
                                                        display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10,
                                                    }}>
                                                        {selectedTeachers.map(t => {
                                                            const tCount = teacherLdCounts.get(t.id) || 0;
                                                            const isFull = tCount >= MAX_LD_PER_TEACHER;
                                                            return (
                                                                <div key={t.id} style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                                                    padding: '5px 8px 5px 10px', borderRadius: 8,
                                                                    background: isFull ? 'rgba(239,68,68,0.08)' : 'rgba(34,211,238,0.08)',
                                                                    border: `1px solid ${isFull ? 'rgba(239,68,68,0.3)' : 'rgba(34,211,238,0.25)'}`,
                                                                    fontSize: '0.78rem', fontWeight: 600,
                                                                    color: 'var(--text-primary)',
                                                                }}>
                                                                    <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {t.name}
                                                                    </span>
                                                                    <span style={{
                                                                        fontSize: '0.62rem', fontWeight: 800,
                                                                        color: isFull ? '#ef4444' : 'var(--brand-400)',
                                                                    }}>
                                                                        {tCount}/{MAX_LD_PER_TEACHER}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => setSelectedTeachers(prev => prev.filter(x => x.id !== t.id))}
                                                                        style={{
                                                                            background: 'none', border: 'none', cursor: 'pointer',
                                                                            color: 'var(--text-muted)', padding: 0,
                                                                            display: 'flex', alignItems: 'center',
                                                                        }}
                                                                    >
                                                                        <X size={13} />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                        <button
                                                            onClick={() => setSelectedTeachers([])}
                                                            style={{
                                                                background: 'none', border: 'none', cursor: 'pointer',
                                                                color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600,
                                                                padding: '4px 6px',
                                                            }}
                                                        >
                                                            Limpiar
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Search input (always visible) */}
                                                <div style={{ position: 'relative' }}>
                                                    <div style={{ position: 'relative' }}>
                                                        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                        <input
                                                            type="text"
                                                            value={searchQuery}
                                                            onChange={e => setSearchQuery(e.target.value)}
                                                            placeholder="Buscar y añadir profesores..."
                                                            style={{
                                                                width: '100%', padding: '10px 14px 10px 36px',
                                                                borderRadius: 10, border: '1px solid var(--border-subtle)',
                                                                background: 'var(--bg-main)',
                                                                color: 'var(--text-primary)', fontSize: '0.88rem',
                                                                outline: 'none', boxSizing: 'border-box',
                                                            }}
                                                        />
                                                    </div>
                                                    <AnimatePresence>
                                                        {filteredTeachers.length > 0 && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                                style={{
                                                                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                                                                    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                                                                    borderRadius: 10, overflow: 'hidden', marginTop: 4,
                                                                    boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
                                                                    maxHeight: 220, overflowY: 'auto',
                                                                }}
                                                            >
                                                                {filteredTeachers.map(t => {
                                                                    const tUsage = ldRecords.filter(r => r.profesor_id === t.id).length;
                                                                    return (
                                                                        <div
                                                                            key={t.id}
                                                                            onClick={() => { setSelectedTeachers(prev => [...prev, t]); setSearchQuery(''); }}
                                                                            style={{
                                                                                padding: '10px 14px', cursor: 'pointer',
                                                                                fontSize: '0.85rem', borderBottom: '1px solid var(--border-subtle)',
                                                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                                transition: 'background 0.15s',
                                                                            }}
                                                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover, rgba(255,255,255,0.04))'}
                                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                                        >
                                                                            <div>
                                                                                <div style={{ fontWeight: 600 }}>{t.name}</div>
                                                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.department}</div>
                                                                            </div>
                                                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                                                {t.active === false && (
                                                                                    <span style={{ 
                                                                                        fontSize: '0.6rem', fontWeight: 900, 
                                                                                        padding: '1px 5px', borderRadius: 4, 
                                                                                        background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                                                                                        border: '1px solid rgba(239,68,68,0.3)',
                                                                                        textTransform: 'uppercase'
                                                                                    }}>Baja</span>
                                                                                )}
                                                                                <span style={{
                                                                                    fontSize: '0.68rem', fontWeight: 800,
                                                                                    padding: '2px 7px', borderRadius: 6,
                                                                                    background: tUsage >= MAX_LD_PER_TEACHER ? 'rgba(239,68,68,0.15)' : 'rgba(34,211,238,0.12)',
                                                                                    color: tUsage >= MAX_LD_PER_TEACHER ? '#ef4444' : 'var(--brand-400)',
                                                                                    border: '1px solid currentColor',
                                                                                }}>
                                                                                    {tUsage}/{MAX_LD_PER_TEACHER}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>

                                            {/* Date */}
                                            <div style={{ marginBottom: 14 }}>
                                                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Fecha del permiso
                                                </label>
                                                <MonthDayPicker
                                                    value={selectedDate}
                                                    onChange={dateVal => {
                                                        setSelectedDate(dateVal);
                                                        if (dateVal) {
                                                            const day = dayMap.get(dateVal);
                                                            const isWeekend = new Date(dateVal + 'T00:00:00').getDay() % 6 === 0;
                                                            if ((day && !day.es_lectivo) || (!day && isWeekend)) {
                                                                toast.error('La fecha seleccionada no es un día lectivo.');
                                                                setSelectedDate('');
                                                            }
                                                        }
                                                    }}
                                                    fullWidth
                                                    position="top"
                                                />
                                            </div>

                                            {/* Tipo de libre disposición */}
                                            <div style={{ marginBottom: 14 }}>
                                                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Tipo de permiso
                                                </label>
                                                <div style={{
                                                    display: 'flex', borderRadius: 10,
                                                    border: '1px solid var(--border-subtle)',
                                                    overflow: 'hidden',
                                                }}>
                                                    {[
                                                        { value: 'ordinario' as LdTipo, label: 'Ordinario', icon: '📅' },
                                                        { value: 'causa_sobrevenida' as LdTipo, label: 'Causa sobrevenida', icon: '⚠️' },
                                                    ].map(opt => (
                                                        <button
                                                            key={opt.value}
                                                            onClick={() => setSelectedTipo(opt.value)}
                                                            style={{
                                                                flex: 1, padding: '9px 8px',
                                                                border: 'none', cursor: 'pointer',
                                                                fontSize: '0.8rem', fontWeight: 700,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                                                background: selectedTipo === opt.value
                                                                    ? (opt.value === 'causa_sobrevenida' ? 'rgba(251,191,36,0.15)' : 'rgba(34,211,238,0.12)')
                                                                    : 'var(--bg-main)',
                                                                color: selectedTipo === opt.value
                                                                    ? (opt.value === 'causa_sobrevenida' ? '#f59e0b' : 'var(--brand-400)')
                                                                    : 'var(--text-muted)',
                                                                transition: 'all 0.2s',
                                                                borderRight: opt.value === 'ordinario' ? '1px solid var(--border-subtle)' : 'none',
                                                            }}
                                                        >
                                                            <span>{opt.icon}</span>
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Warning/ok */}
                                            <AnimatePresence>
                                                {dateWarning && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: 8,
                                                            padding: '8px 12px', borderRadius: 8, marginBottom: 14,
                                                            background: dateWarning.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                                                            border: `1px solid ${dateWarning.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.2)'}`,
                                                        }}
                                                    >
                                                        {dateWarning.type === 'error'
                                                            ? <AlertTriangle size={14} color="#ef4444" />
                                                            : <Check size={14} color="#22c55e" />}
                                                        <span style={{ fontSize: '0.8rem', color: dateWarning.type === 'error' ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
                                                            {dateWarning.msg}
                                                        </span>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <button
                                                onClick={handleAssign}
                                                disabled={saving || selectedTeachers.length === 0 || !selectedDate || dateWarning?.type === 'error'}
                                                style={{
                                                    width: '100%', padding: '12px', borderRadius: 12,
                                                    background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                                                    border: 'none', color: '#0d1117', fontWeight: 800, fontSize: '0.9rem',
                                                    cursor: 'pointer',
                                                    opacity: (saving || selectedTeachers.length === 0 || !selectedDate || dateWarning?.type === 'error') ? 0.5 : 1,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                <UserPlus size={16} />
                                                {saving
                                                    ? `Asignando ${selectedTeachers.length} profesor(es)…`
                                                    : `Confirmar${selectedTeachers.length > 0 ? ` (${selectedTeachers.length})` : ''} y generar guardias`}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                {/* ── RIGHT COLUMN: records list ── */}
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 18, padding: 22,
                    display: 'flex', flexDirection: 'column', gap: 16,
                }}>
                    {/* List header + filters */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: 9,
                                    background: 'rgba(34,211,238,0.1)',
                                    border: '1px solid rgba(34,211,238,0.25)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <CalendarDays size={16} style={{ color: 'var(--brand-400)' }} />
                                </div>
                                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--heading-color)' }}>
                                    {isAdmin ? 'Historial de permisos' : 'Mis días de libre disposición'}
                                </span>
                                <span style={{
                                    padding: '2px 10px', borderRadius: 20,
                                    background: 'rgba(34,211,238,0.12)',
                                    color: 'var(--brand-400)',
                                    fontSize: '0.72rem', fontWeight: 800,
                                    border: '1px solid rgba(34,211,238,0.2)',
                                }}>
                                    {filteredRecords.length}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {/* Export button (admin only) */}
                                {isAdmin && ldRecords.length > 0 && (
                                    <div ref={exportMenuRef} style={{ position: 'relative' }}>
                                        <button
                                            onClick={() => setShowExportMenu(!showExportMenu)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 6,
                                                padding: '6px 12px', borderRadius: 8,
                                                border: '1px solid rgba(34,211,238,0.3)',
                                                background: 'rgba(34,211,238,0.08)',
                                                color: 'var(--brand-400)',
                                                cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = 'rgba(34,211,238,0.15)';
                                                e.currentTarget.style.borderColor = 'rgba(34,211,238,0.5)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = 'rgba(34,211,238,0.08)';
                                                e.currentTarget.style.borderColor = 'rgba(34,211,238,0.3)';
                                            }}
                                        >
                                            <Download size={14} />
                                            Exportar
                                            <ChevronDown size={12} style={{
                                                transform: showExportMenu ? 'rotate(180deg)' : 'none',
                                                transition: 'transform 0.2s',
                                            }} />
                                        </button>

                                        <AnimatePresence>
                                            {showExportMenu && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                                                    transition={{ duration: 0.15 }}
                                                    style={{
                                                        position: 'absolute', top: '100%', right: 0,
                                                        marginTop: 6, zIndex: 50,
                                                        background: 'var(--bg-card)',
                                                        border: '1px solid var(--border-subtle)',
                                                        borderRadius: 14, padding: 8,
                                                        minWidth: 240,
                                                        boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                                                        backdropFilter: 'blur(12px)',
                                                    }}
                                                >
                                                    {/* Section: PDF */}
                                                    <div style={{
                                                        padding: '6px 10px', fontSize: '0.68rem', fontWeight: 800,
                                                        color: 'var(--text-muted)', textTransform: 'uppercase',
                                                        letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6,
                                                    }}>
                                                        <FileText size={12} />
                                                        PDF
                                                    </div>
                                                    {[
                                                        { label: 'Agrupado por meses', grouping: 'month' as ExportGrouping },
                                                        { label: 'Agrupado por semanas', grouping: 'week' as ExportGrouping },
                                                    ].map(opt => (
                                                        <button
                                                            key={`pdf-${opt.grouping}`}
                                                            onClick={() => handleExport('pdf', opt.grouping)}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: 8,
                                                                width: '100%', padding: '9px 12px', borderRadius: 8,
                                                                border: 'none', background: 'transparent',
                                                                color: 'var(--text-primary)', fontSize: '0.82rem',
                                                                fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                                                                transition: 'background 0.15s',
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,211,238,0.08)'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            <span style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>PDF</span>
                                                            {opt.label}
                                                        </button>
                                                    ))}

                                                    {/* Divider */}
                                                    <div style={{ height: 1, background: 'var(--border-subtle)', margin: '6px 8px' }} />

                                                    {/* Section: Excel */}
                                                    <div style={{
                                                        padding: '6px 10px', fontSize: '0.68rem', fontWeight: 800,
                                                        color: 'var(--text-muted)', textTransform: 'uppercase',
                                                        letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6,
                                                    }}>
                                                        <FileSpreadsheet size={12} />
                                                        Excel
                                                    </div>
                                                    {[
                                                        { label: 'Agrupado por meses', grouping: 'month' as ExportGrouping },
                                                        { label: 'Agrupado por semanas', grouping: 'week' as ExportGrouping },
                                                    ].map(opt => (
                                                        <button
                                                            key={`excel-${opt.grouping}`}
                                                            onClick={() => handleExport('excel', opt.grouping)}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: 8,
                                                                width: '100%', padding: '9px 12px', borderRadius: 8,
                                                                border: 'none', background: 'transparent',
                                                                color: 'var(--text-primary)', fontSize: '0.82rem',
                                                                fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                                                                transition: 'background 0.15s',
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.08)'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            <span style={{ color: '#22c55e', fontSize: '0.7rem', fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>XLSX</span>
                                                            {opt.label}
                                                        </button>
                                                    ))}

                                                    {/* Filter notice */}
                                                    {filterMonth && (
                                                        <>
                                                            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '6px 8px' }} />
                                                            <div style={{
                                                                padding: '6px 10px', fontSize: '0.72rem',
                                                                color: 'var(--text-muted)', fontStyle: 'italic',
                                                                display: 'flex', alignItems: 'center', gap: 6,
                                                            }}>
                                                                <Filter size={11} />
                                                                Solo exportará: {(() => {
                                                                    const [y, m] = filterMonth.split('-');
                                                                    return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
                                                                })()}
                                                            </div>
                                                        </>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* Sort */}
                                <select
                                    value={sortOrder}
                                    onChange={e => setSortOrder(e.target.value as any)}
                                    style={{
                                        padding: '6px 10px', borderRadius: 8,
                                        border: '1px solid var(--border-subtle)',
                                        background: 'var(--bg-main)',
                                        color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600,
                                        outline: 'none', cursor: 'pointer',
                                    }}
                                >
                                    <option value="date_desc">Fecha (reciente primero)</option>
                                    <option value="date_asc">Fecha (antiguo primero)</option>
                                    {isAdmin && <option value="name">Por nombre</option>}
                                </select>
                            </div>
                        </div>

                        {/* Filters */}
                        {isAdmin && (
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
                                    <Filter size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="text"
                                        value={filterTeacher}
                                        onChange={e => setFilterTeacher(e.target.value)}
                                        placeholder="Filtrar por profesor..."
                                        style={{
                                            padding: '8px 12px 8px 30px',
                                            borderRadius: 8, border: '1px solid var(--border-subtle)',
                                            background: 'var(--bg-main)',
                                            color: 'var(--text-primary)', fontSize: '0.82rem',
                                            outline: 'none', width: '100%', boxSizing: 'border-box',
                                        }}
                                    />
                                </div>
                                <select
                                    value={filterMonth}
                                    onChange={e => setFilterMonth(e.target.value)}
                                    style={{
                                        padding: '8px 10px', borderRadius: 8,
                                        border: '1px solid var(--border-subtle)',
                                        background: 'var(--bg-main)',
                                        color: filterMonth ? 'var(--text-primary)' : 'var(--text-muted)',
                                        fontSize: '0.82rem', outline: 'none', cursor: 'pointer',
                                    }}
                                >
                                    <option value="">Todos los meses</option>
                                    {availableMonths.map(m => {
                                        const [year, month] = m.split('-');
                                        return (
                                            <option key={m} value={m}>
                                                {MONTH_NAMES[parseInt(month) - 1]} {year}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* List */}
                    <div style={{ overflowY: 'auto', maxHeight: 520, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {filteredRecords.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                                <CalendarDays size={40} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: 12 }} />
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                    {isAdmin
                                        ? (filterTeacher || filterMonth ? 'No hay resultados para los filtros actuales' : 'No hay permisos de libre disposición registrados')
                                        : 'No tienes días de libre disposición registrados'}
                                </p>
                                {(filterTeacher || filterMonth) && (
                                    <button
                                        onClick={() => { setFilterTeacher(''); setFilterMonth(''); }}
                                        style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--brand-400)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
                                    >
                                        Limpiar filtros →
                                    </button>
                                )}
                            </div>
                        ) : (() => {
                            // Build per-teacher usage map for badge
                            const teacherUsageMap = new Map<string, number>();
                            // Sort chronologically to compute correct usage index
                            const chronological = [...ldRecords].sort((a, b) => a.fecha.localeCompare(b.fecha));
                            chronological.forEach(r => {
                                teacherUsageMap.set(r.profesor_id, (teacherUsageMap.get(r.profesor_id) || 0) + 1);
                            });

                            // Build per-teacher cumulative counter for display
                            const perTeacherCounter = new Map<string, number>();

                            return filteredRecords.map(r => {
                                const usage = (perTeacherCounter.get(r.profesor_id) || 0) + 1;
                                perTeacherCounter.set(r.profesor_id, usage);
                                const totalUsage = ldRecords.filter(rec => rec.profesor_id === r.profesor_id).length;
                                const isLast = usage === totalUsage;
                                const dayLdCount = ldCountByDay.get(r.fecha) || 0;

                                return (
                                    <motion.div
                                        key={r.id}
                                        layout
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        style={{
                                            display: 'flex', alignItems: 'center',
                                            padding: '12px 16px', borderRadius: 12,
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px solid var(--border-subtle)',
                                            gap: 14,
                                            transition: 'border-color 0.2s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(34,211,238,0.2)'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                                    >
                                        {/* Counter badge */}
                                        <div style={{
                                            fontSize: '0.65rem', fontWeight: 800,
                                            background: totalUsage >= MAX_LD_PER_TEACHER ? 'rgba(239,68,68,0.15)' : 'rgba(34,211,238,0.1)',
                                            color: totalUsage >= MAX_LD_PER_TEACHER ? '#ef4444' : 'var(--brand-400)',
                                            padding: '3px 8px', borderRadius: 7,
                                            border: '1px solid currentColor',
                                            minWidth: 36, textAlign: 'center',
                                            flexShrink: 0,
                                        }}>
                                            {usage}/{MAX_LD_PER_TEACHER}
                                        </div>

                                        {/* Content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {isAdmin && (
                                                <div style={{
                                                    fontWeight: 700, fontSize: '0.88rem',
                                                    color: 'var(--heading-color)',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    marginBottom: 2,
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span>{r.teacher?.name || r.profesor_id}</span>
                                                        {r.teacher?.active === false && (
                                                            <span style={{ 
                                                                fontSize: '0.6rem', fontWeight: 900, 
                                                                padding: '1px 4px', borderRadius: 4, 
                                                                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                                                border: '1px solid rgba(239,68,68,0.2)',
                                                                textTransform: 'uppercase'
                                                            }}>Baja</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                        {formatDisplayDate(r.fecha)}
                                                    </span>
                                                </div>
                                                {/* Tipo badge */}
                                                <span style={{
                                                    fontSize: '0.65rem', fontWeight: 800,
                                                    padding: '1px 7px', borderRadius: 6,
                                                    background: r.tipo === 'causa_sobrevenida' ? 'rgba(251,191,36,0.12)' : 'rgba(34,211,238,0.08)',
                                                    color: r.tipo === 'causa_sobrevenida' ? '#f59e0b' : 'var(--brand-400)',
                                                    border: `1px solid ${r.tipo === 'causa_sobrevenida' ? 'rgba(251,191,36,0.3)' : 'rgba(34,211,238,0.2)'}`,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.03em',
                                                }}>
                                                    {r.tipo === 'causa_sobrevenida' ? '⚠ Sobrevenida' : 'Ordinario'}
                                                </span>
                                                {/* Day occupancy badge */}
                                                <span style={{
                                                    fontSize: '0.68rem', fontWeight: 700,
                                                    padding: '1px 7px', borderRadius: 6,
                                                    background: dayLdCount >= cupoMax ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                                                    color: dayLdCount >= cupoMax ? '#ef4444' : '#22c55e',
                                                    border: `1px solid ${dayLdCount >= cupoMax ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.2)'}`,
                                                }}>
                                                    {dayLdCount}/{cupoMax} ese día
                                                </span>
                                                {isLast && (
                                                    <span style={{
                                                        fontSize: '0.65rem', fontWeight: 700,
                                                        padding: '1px 7px', borderRadius: 6,
                                                        background: 'rgba(139,92,246,0.1)',
                                                        color: '#a78bfa', border: '1px solid rgba(139,92,246,0.25)',
                                                    }}>
                                                        Último día
                                                    </span>
                                                )}
                                            </div>
                                            {!isAdmin && r.teacher?.department && (
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                                    {r.teacher.department}
                                                </div>
                                            )}
                                        </div>

                                        {/* Confirmed status */}
                                        <div style={{ flexShrink: 0 }}>
                                            <BadgeCheck size={16} style={{ color: '#22c55e', opacity: 0.8 }} />
                                        </div>

                                        {/* Delete (admin only) */}
                                        {isAdmin && (
                                            <button
                                                onClick={() => handleDelete(r.id, r.teacher?.name || r.profesor_id, r.fecha)}
                                                disabled={deletingId === r.id}
                                                style={{
                                                    background: 'rgba(239,68,68,0.08)',
                                                    border: '1px solid rgba(239,68,68,0.25)',
                                                    borderRadius: 8, padding: '6px 9px', cursor: 'pointer',
                                                    color: '#ef4444', display: 'flex', alignItems: 'center',
                                                    opacity: deletingId === r.id ? 0.4 : 1,
                                                    transition: 'all 0.2s', flexShrink: 0,
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </motion.div>
                                );
                            });
                        })()}
                    </div>

                    {/* My summary (non-admin) */}
                    {!isAdmin && currentUser && (
                        <div style={{
                            marginTop: 4,
                            padding: '14px 16px', borderRadius: 12,
                            background: myRecords.length >= MAX_LD_PER_TEACHER ? 'rgba(239,68,68,0.06)' : 'rgba(34,211,238,0.06)',
                            border: `1px solid ${myRecords.length >= MAX_LD_PER_TEACHER ? 'rgba(239,68,68,0.2)' : 'rgba(34,211,238,0.2)'}`,
                            display: 'flex', alignItems: 'center', gap: 12,
                        }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 50,
                                background: myRecords.length >= MAX_LD_PER_TEACHER ? 'rgba(239,68,68,0.15)' : 'rgba(34,211,238,0.12)',
                                border: `2px solid ${myRecords.length >= MAX_LD_PER_TEACHER ? '#ef4444' : 'var(--brand-400)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <span style={{
                                    fontSize: '1rem', fontWeight: 900,
                                    color: myRecords.length >= MAX_LD_PER_TEACHER ? '#ef4444' : 'var(--brand-400)',
                                }}>
                                    {myRecords.length}
                                </span>
                            </div>
                            <div>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: 'var(--heading-color)' }}>
                                    {myRecords.length >= MAX_LD_PER_TEACHER ? 'Has agotado tu cupo' : `Te quedan ${MAX_LD_PER_TEACHER - myRecords.length} día${MAX_LD_PER_TEACHER - myRecords.length !== 1 ? 's' : ''}`}
                                </p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {myRecords.length} de {MAX_LD_PER_TEACHER} días de libre disposición utilizados este curso
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default LibreDisposicionPanel;
