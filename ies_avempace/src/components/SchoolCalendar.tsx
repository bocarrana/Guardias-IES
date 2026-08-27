import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, X, Save, CalendarDays, CheckSquare, Square,
    Trash2, UserPlus, Settings, Search, AlertTriangle, Check, Users,
} from 'lucide-react';
import { Teacher, CalendarDay, CalendarEvent, RoomReservation } from '../types';
import { canManageLibreDisposicion } from '../utils/roles';
import {
    getCalendarDays, updateCalendarDay, getCalendarEvents,
    getTeachers,
    getRoomReservations,
} from '../services/supabaseClient';
import {
    getLibreDisposicion, createLibreDisposicion, deleteLibreDisposicion,
    getCupoMaximo, setCupoMaximo, LibreDisposicion,
    getMaxLdPerTeacher,
} from '../services/supabaseClient';
import { toast } from 'sonner';
import CalendarEventsModal from './CalendarEventsModal';

interface SchoolCalendarProps {
    currentUser: Teacher | null;
}

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// ─── Helpers ────────────────────────────────────────────

const formatDisplayDate = (fecha: string) => {
    const d = new Date(fecha + 'T00:00:00');
    return `${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;
};

// ─── Sub-component: Day-info modal (privacy-safe for teachers) ───

interface DayInfoModalProps {
    fecha: string;
    count: number;
    cupoMax: number;
    onClose: () => void;
}
const DayInfoModal: React.FC<DayInfoModalProps> = ({ fecha, count, cupoMax, onClose }) => (
    <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1100, padding: 20,
        }}
    >
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            style={{
                background: 'var(--bg-card)', borderRadius: 18, padding: 32,
                maxWidth: 380, width: '100%', border: '1px solid var(--border-subtle)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                    📅 {formatDisplayDate(fecha)}
                </h3>
                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <X size={20} />
                </button>
            </div>

            <div style={{
                background: count >= cupoMax
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(34, 211, 238, 0.08)',
                border: `1px solid ${count >= cupoMax ? 'rgba(239,68,68,0.3)' : 'rgba(34,211,238,0.25)'}`,
                borderRadius: 12, padding: '18px 20px', textAlign: 'center',
            }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '2rem', fontWeight: 800, color: count >= cupoMax ? '#ef4444' : 'var(--color-primary)' }}>
                    {count} / {cupoMax}
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {count >= cupoMax
                        ? 'Cupo completo para este día'
                        : `Plazas de libre disposición ocupadas`}
                </p>
            </div>

            <p style={{ marginTop: 16, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Los datos personales son confidenciales.
            </p>
        </motion.div>
    </motion.div>
);

// ─── Main Component ──────────────────────────────────────

const SchoolCalendar: React.FC<SchoolCalendarProps> = ({ currentUser }) => {
    const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    });

    // Multi-select
    const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchLectivo, setBatchLectivo] = useState(false);
    const [batchDesc, setBatchDesc] = useState('');
    const [saving, setSaving] = useState(false);

    // Events
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [activeEventDate, setActiveEventDate] = useState<string | null>(null);

    const [infoDay, setInfoDay] = useState<string | null>(null);

    // Libre disposición — still needed for calendar day badges and info modal
    const [ldRecords, setLdRecords] = useState<LibreDisposicion[]>([]);
    const [cupoMax, setCupoMax] = useState(5);
    const [maxLdPerTeacher, setMaxLdPerTeacher] = useState(4);
    const [reservations, setReservations] = useState<RoomReservation[]>([]);

    const isAdmin = canManageLibreDisposicion(currentUser);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [days, evts, ld, cupo, maxLd, res] = await Promise.all([
                getCalendarDays(),
                getCalendarEvents(),
                getLibreDisposicion(),
                getCupoMaximo(),
                getMaxLdPerTeacher(),
                getRoomReservations(),
            ]);
            setCalendarDays(days);
            setEvents(evts);
            setLdRecords(ld);
            setCupoMax(cupo);
            setMaxLdPerTeacher(maxLd);
            setReservations(res);
        } catch (err) {
            console.error('Error loading calendar:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const dayMap = useMemo(() => {
        const map = new Map<string, CalendarDay>();
        calendarDays.forEach(d => map.set(d.fecha, d));
        return map;
    }, [calendarDays]);

    const ldCountByDay = useMemo(() => {
        const counts = new Map<string, number>();
        ldRecords.forEach(r => counts.set(r.fecha, (counts.get(r.fecha) || 0) + 1));
        return counts;
    }, [ldRecords]);

    const myUsageMap = useMemo(() => {
        if (!currentUser) return new Map<string, number>();
        const myRecs = ldRecords
            .filter(r => r.profesor_id === currentUser.id)
            .sort((a, b) => a.fecha.localeCompare(b.fecha));
        const m = new Map<string, number>();
        myRecs.forEach((r, idx) => m.set(r.fecha, idx + 1));
        return m;
    }, [ldRecords, currentUser]);

    const monthGrid = useMemo(() => {
        const { year, month } = currentMonth;
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        let startDow = firstDay.getDay() - 1;
        if (startDow < 0) startDow = 6;

        const days: (CalendarDay | null)[] = [];
        for (let i = 0; i < startDow; i++) days.push(null);

        for (let d = 1; d <= lastDay.getDate(); d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const calDay = dayMap.get(dateStr);
            if (calDay) {
                days.push(calDay);
            } else {
                days.push({ id: `out-${dateStr}`, fecha: dateStr, es_lectivo: false, descripcion: 'Fuera del periodo escolar' });
            }
        }
        return days;
    }, [currentMonth, dayMap]);

    const monthStats = useMemo(() => {
        const realDays = monthGrid.filter(d => d !== null) as CalendarDay[];
        return {
            total: realDays.length,
            lectivos: realDays.filter(d => d.es_lectivo).length,
            festivos: realDays.filter(d => !d.es_lectivo).length,
        };
    }, [monthGrid]);

    const navigateMonth = (delta: number) => {
        setCurrentMonth(prev => {
            let nm = prev.month + delta, ny = prev.year;
            if (nm > 11) { nm = 0; ny++; }
            if (nm < 0) { nm = 11; ny--; }
            return { year: ny, month: nm };
        });
    };

    const toggleDaySelection = (fecha: string) => {
        if (!isAdmin) return;
        setSelectedDays(prev => {
            const next = new Set(prev);
            next.has(fecha) ? next.delete(fecha) : next.add(fecha);
            return next;
        });
    };

    const selectAllWeekdays = () => {
        const editable = (monthGrid.filter(d => {
            if (!d || d.id.startsWith('out-')) return false;
            const dow = new Date(d.fecha + 'T00:00:00').getDay();
            return dow !== 0 && dow !== 6;
        }) as CalendarDay[]);
        setSelectedDays(new Set(editable.map(d => d.fecha)));
    };

    const selectAllDays = () => {
        const editable = (monthGrid.filter(d => d && !d.id.startsWith('out-')) as CalendarDay[]);
        setSelectedDays(new Set(editable.map(d => d.fecha)));
    };

    const clearSelection = () => setSelectedDays(new Set());

    const handleDayClick = (day: CalendarDay) => {
        if (day.id.startsWith('out-')) return;
        if (!day.es_lectivo) return; // no lectivo days show nothing LD-related
        const ldCount = ldCountByDay.get(day.fecha) || 0;
        if (ldCount > 0) {
            // Teachers only see anonymised info; admins open the event modal
            if (!isAdmin) {
                setInfoDay(day.fecha);
                return;
            }
        }
        setActiveEventDate(day.fecha);
    };

    const openBatchModal = (asLectivo: boolean) => { setBatchLectivo(asLectivo); setBatchDesc(''); setShowBatchModal(true); };

    const handleBatchSave = async () => {
        if (selectedDays.size === 0) return;
        
        if (!batchLectivo) {
            const hasLd = ldRecords.some(r => selectedDays.has(r.fecha));
            const hasEvts = events.some(e => selectedDays.has(e.date));
            const hasRes = reservations.some(r => selectedDays.has(r.fecha));
            if (hasLd || hasEvts || hasRes) {
                const confirmed = window.confirm("¡Atención! Uno o más días seleccionados tienen eventos, días de libre disposición o reservas de aulas registradas. Si los marcas como festivos, los profesores no podrán hacer uso de ellos. ¿Estás seguro de que deseas continuar?");
                if (!confirmed) return;
            }
        }

        setSaving(true);
        try {
            await Promise.all(
                Array.from(selectedDays).map(fecha =>
                    updateCalendarDay(fecha, batchLectivo, batchLectivo ? '' : batchDesc)
                )
            );
            setCalendarDays(prev =>
                prev.map(d => selectedDays.has(d.fecha)
                    ? { ...d, es_lectivo: batchLectivo, descripcion: batchLectivo ? undefined : (batchDesc || undefined) }
                    : d)
            );
            toast.success(`${selectedDays.size} día${selectedDays.size > 1 ? 's' : ''} actualizado${selectedDays.size > 1 ? 's' : ''} como ${batchLectivo ? 'lectivo' : 'no lectivo'}${selectedDays.size > 1 ? 's' : ''}`);
            setSelectedDays(new Set()); setShowBatchModal(false);
        } catch { toast.error('Error al guardar los cambios'); }
        finally { setSaving(false); }
    };

    const getDayStyle = (day: CalendarDay, isSelected: boolean) => {
        const date = new Date(day.fecha + 'T00:00:00');
        const dow = date.getDay();
        const isWeekend = dow === 0 || dow === 6;
        const isToday = day.fecha === new Date().toLocaleDateString('en-CA');
        const isOutside = day.id.startsWith('out-');
        const ldCount = ldCountByDay.get(day.fecha) || 0;
        const myUsage = myUsageMap.get(day.fecha) || 0;
        const isFull = day.es_lectivo && ldCount >= cupoMax && ldCount > 0;

        let bg = 'var(--bg-success-subtle, rgba(34, 197, 94, 0.15))';
        let color = 'var(--text-success, #22c55e)';
        let border = 'transparent';

        if (!day.es_lectivo) {
            bg = isWeekend
                ? 'var(--bg-muted, rgba(100, 116, 139, 0.15))'
                : 'var(--bg-danger-subtle, rgba(239, 68, 68, 0.15))';
            color = isWeekend ? 'var(--text-muted, #94a3b8)' : 'var(--text-danger, #ef4444)';
        }
        if (isOutside) { bg = 'var(--bg-muted, rgba(100, 116, 139, 0.08))'; color = 'var(--text-muted, #64748b)'; }
        if (isSelected) { border = '#f59e0b'; bg = 'rgba(245, 158, 11, 0.25)'; }
        else if (isFull && !isOutside) { border = 'rgba(239,68,68,0.6)'; }
        else if (myUsage > 0 && !isOutside) { border = 'var(--color-primary)'; bg = 'rgba(34,211,238,0.15)'; }
        else if (isToday) { border = 'var(--color-primary, #22d3ee)'; }

        return { bg, color, border, isToday, isWeekend, isOutside, isFull, ldCount, myUsage };
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <div className="loading-spinner" />
        </div>
    );

    const hasSelection = selectedDays.size > 0;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '20px', maxWidth: 900, margin: '0 auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CalendarDays size={28} style={{ color: 'var(--color-primary)' }} />
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Calendario Escolar</h2>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                        {monthStats.lectivos} lectivos
                    </span>
                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                        {monthStats.festivos} no lectivos
                    </span>
                </div>
            </div>

            {/* Month Navigator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
                {[{ delta: -1, Icon: ChevronLeft }, { delta: 1, Icon: ChevronRight }].map(({ delta, Icon }, idx) => (
                    idx === 0 ? (
                        <button key="prev" onClick={() => navigateMonth(-1)} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}>
                            <ChevronLeft size={18} />
                        </button>
                    ) : (
                        <button key="next" onClick={() => navigateMonth(1)} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}>
                            <ChevronRight size={18} />
                        </button>
                    )
                ))}
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, minWidth: 200, textAlign: 'center' }}>
                    {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
                </h3>
            </div>

            {/* Admin quick-select toolbar */}
            {isAdmin && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
                    {[
                        { label: 'Seleccionar Lun-Vie', action: selectAllWeekdays, Icon: CheckSquare },
                        { label: 'Seleccionar todo', action: selectAllDays, Icon: CheckSquare },
                    ].map(({ label, action, Icon }) => (
                        <button key={label} onClick={action} style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}>
                            <Icon size={14} /> {label}
                        </button>
                    ))}
                    {hasSelection && (
                        <button onClick={clearSelection} style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
                            <Trash2 size={14} /> Quitar selección ({selectedDays.size})
                        </button>
                    )}
                </div>
            )}

            {/* Calendar Grid */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: 12 }}>
                {/* Day name headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
                    {DAY_NAMES.map(name => (
                        <div key={name} style={{
                            padding: '6px 0',
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: (name === 'Sáb' || name === 'Dom') ? '#f87171' : 'var(--text-muted)'
                        }}>
                            {name}
                        </div>
                    ))}
                </div>

                {/* Days grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                    {monthGrid.map((day, i) => {
                        if (!day) return <div key={`empty-${i}`} style={{ aspectRatio: '1', minHeight: 50 }} />;

                        const isSelected = selectedDays.has(day.fecha);
                        const style = getDayStyle(day, isSelected);
                        const dayNum = new Date(day.fecha + 'T00:00:00').getDate();
                        const dayEvents = events.filter(e => e.date === day.fecha);

                        return (
                            <motion.div
                                key={day.fecha}
                                whileHover={!style.isOutside ? { scale: 1.05 } : {}}
                                whileTap={!style.isOutside ? { scale: 0.95 } : {}}
                                onClick={() => handleDayClick(day)}
                                onContextMenu={e => {
                                    if (isAdmin && !style.isOutside) { e.preventDefault(); toggleDaySelection(day.fecha); }
                                }}
                                title={day.descripcion || (day.es_lectivo ? 'Día lectivo' : 'No lectivo')}
                                style={{
                                    aspectRatio: '1', display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', borderRadius: 10,
                                    background: style.bg, color: style.color,
                                    border: `2px solid ${style.border}`,
                                    cursor: !style.isOutside ? 'pointer' : 'default',
                                    position: 'relative', transition: 'all 0.2s', minHeight: 50,
                                    ...(style.isFull ? { boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.35)' } : {}),
                                }}
                            >
                                {/* Individual selector for admins */}
                                {isAdmin && !style.isOutside && (
                                    <div onClick={e => { e.stopPropagation(); toggleDaySelection(day.fecha); }}
                                        style={{ position: 'absolute', top: 4, left: 4, zIndex: 10, cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 6, background: isSelected ? 'rgba(245,158,11,0.4)' : 'transparent', transition: 'all 0.2s' }}
                                        onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                                        onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
                                    >
                                        {isSelected ? <CheckSquare size={14} style={{ color: '#f59e0b' }} /> : <Square size={14} style={{ opacity: 0.3 }} />}
                                    </div>
                                )}

                                <span style={{ fontSize: '1rem', fontWeight: style.isToday ? 800 : 600 }}>{dayNum}</span>

                                {/* LD quota badge (only on lectivo days with registrations) */}
                                {day.es_lectivo && !style.isOutside && style.ldCount > 0 && (
                                    <span style={{
                                        position: 'absolute', bottom: 6, left: 6,
                                        fontSize: '0.6rem', fontWeight: 800,
                                        padding: '2px 5px', borderRadius: 6,
                                        background: style.isFull ? 'rgba(239,68,68,0.25)' : 'rgba(34,211,238,0.15)',
                                        color: style.isFull ? '#ef4444' : 'var(--color-primary)',
                                        border: `1px solid ${style.isFull ? 'rgba(239,68,68,0.4)' : 'rgba(34,211,238,0.3)'}`,
                                        lineHeight: 1, zIndex: 1,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    }}>
                                        {style.myUsage > 0 && (
                                            <span style={{ marginRight: 4, paddingRight: 4, borderRight: '1px solid currentColor', opacity: 0.8 }}>
                                                {style.myUsage}/{maxLdPerTeacher}
                                            </span>
                                        )}
                                        {style.ldCount}/{cupoMax}
                                    </span>
                                )}

                                {dayEvents.length > 0 && (
                                    <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', zIndex: 1 }}>
                                        {dayEvents.slice(0, 3).map(e => (
                                            <div key={e.id} style={{ width: 6, height: 6, borderRadius: '50%', background: style.color, boxShadow: '0 0 5px currentColor' }} />
                                        ))}
                                    </div>
                                )}

                                {day.descripcion && !style.isWeekend && !style.isOutside && (
                                    <span style={{ fontSize: '0.55rem', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1, opacity: 0.85 }}>
                                        {day.descripcion}
                                    </span>
                                )}
                                {style.isToday && !isSelected && (
                                    <span style={{ position: 'absolute', top: 2, right: 4, fontSize: '0.5rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                                        Hoy
                                    </span>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                {[
                    { bg: 'rgba(34, 197, 94, 0.15)', border: 'transparent', label: 'Lectivo' },
                    { bg: 'rgba(239, 68, 68, 0.15)', border: 'transparent', label: 'Festivo / No lectivo' },
                    { bg: 'rgba(100, 116, 139, 0.15)', border: 'transparent', label: 'Fin de semana' },
                    { bg: 'rgba(34, 211, 238, 0.15)', border: 'var(--color-primary, #22d3ee)', label: 'Lib. Disposición' },
                    { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(239, 68, 68, 0.6)', label: 'Cupo lleno' },
                    ...(isAdmin ? [{ bg: 'rgba(245, 158, 11, 0.25)', border: '#f59e0b', label: 'Seleccionado' }] : []),
                ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                            width: 14, height: 14, borderRadius: 4,
                            background: item.bg,
                            border: `1.5px solid ${item.border}`
                        }} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                    </div>
                ))}
            </div>

            {isAdmin && !hasSelection && (
                <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 10 }}>
                    Clic izquierdo → ver anotaciones · Clic derecho → seleccionar día
                </p>
            )}

            {/* Floating action bar */}
            <AnimatePresence>
                {isAdmin && hasSelection && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        style={{
                            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                            borderRadius: 16, padding: '14px 24px', display: 'flex', alignItems: 'center',
                            gap: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)',
                            zIndex: 999, flexWrap: 'wrap', justifyContent: 'center',
                        }}
                    >
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', whiteSpace: 'nowrap' }}>
                            {selectedDays.size} día{selectedDays.size > 1 ? 's' : ''} seleccionado{selectedDays.size > 1 ? 's' : ''}
                        </span>
                        <div style={{ width: 1, height: 24, background: 'var(--border-subtle)' }} />
                        <button onClick={() => openBatchModal(true)} style={{ padding: '8px 20px', borderRadius: 12, border: '1px solid #22c55e', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', whiteSpace: 'nowrap' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(34,197,94,0.1)'}>
                            <CheckSquare size={16} /> Marcar Lectivos
                        </button>
                        <button onClick={() => openBatchModal(false)} style={{ padding: '8px 20px', borderRadius: 12, border: '1px solid #ef4444', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', whiteSpace: 'nowrap' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}>
                            <X size={16} /> Marcar Festivos
                        </button>
                        <button onClick={clearSelection} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <X size={14} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Batch Confirmation Modal */}
            <AnimatePresence>
                {showBatchModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
                        onClick={() => setShowBatchModal(false)}
                    >
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, border: '1px solid var(--border-subtle)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{batchLectivo ? '✅ Marcar como Lectivos' : '🚫 Marcar como Festivos'}</h3>
                                <button onClick={() => setShowBatchModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><X size={20} /></button>
                            </div>
                            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, maxHeight: 120, overflowY: 'auto' }}>
                                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', margin: '0 0 6px 0' }}>{selectedDays.size} día{selectedDays.size > 1 ? 's' : ''} seleccionado{selectedDays.size > 1 ? 's' : ''}:</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{Array.from(selectedDays).sort().map(f => formatDisplayDate(f)).join(' · ')}</p>
                            </div>
                            {!batchLectivo && (
                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Motivo (se aplicará a todos)</label>
                                    <input type="text" value={batchDesc} onChange={e => setBatchDesc(e.target.value)} placeholder="Ej: Semana Santa, Pilar, Navidad..." style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--bg-input, var(--bg-card))', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => setShowBatchModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Cancelar</button>
                                <button onClick={handleBatchSave} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: batchLectivo ? '#22c55e' : '#ef4444', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? 0.7 : 1, transition: 'all 0.2s' }}>
                                    <Save size={16} />
                                    {saving ? `Guardando ${selectedDays.size} días...` : `Confirmar · ${selectedDays.size} día${selectedDays.size > 1 ? 's' : ''}`}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Calendar Events Modal */}
            <AnimatePresence>
                {activeEventDate && (
                    <CalendarEventsModal date={activeEventDate} currentUser={currentUser} onClose={() => setActiveEventDate(null)} onRefresh={fetchAll} />
                )}
            </AnimatePresence>

            {/* LD Info Modal (teacher view – privacy safe) */}
            <AnimatePresence>
                {infoDay && !isAdmin && (
                    <DayInfoModal fecha={infoDay} count={ldCountByDay.get(infoDay) || 0} cupoMax={cupoMax} onClose={() => setInfoDay(null)} />
                )}
            </AnimatePresence>


        </motion.div>
    );
};

export default SchoolCalendar;
