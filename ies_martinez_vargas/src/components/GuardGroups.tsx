import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Shield, Search, UserPlus, RotateCcw } from 'lucide-react';
import { Teacher, MetaOptions, GuardGroupSchedule, Guard, GuardStatus } from '../types';
import {
    deleteGuardGroupSchedule, createGuardGroupSchedule, getGuardGroupSchedules, supabase, deleteGuard
} from '../services/supabaseClient';
import { toast } from 'sonner';
import TeacherAvatar from './TeacherAvatar';
import { canAccessAdminPanel, isAdminRole, isJefaturaRole } from '../utils/roles';

interface GuardGroupsProps {
    teachers: Teacher[];
    meta: MetaOptions;
    currentUser: Teacher | null;
    guardGroupSchedules?: GuardGroupSchedule[];
    onRefetch?: () => Promise<void>;
    guards?: Guard[];
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

const GuardGroups: React.FC<GuardGroupsProps> = ({
    teachers, meta, currentUser, guardGroupSchedules, onRefetch, guards
}) => {
    const isAdmin = canAccessAdminPanel(currentUser);

    const [schedules, setSchedules] = useState<GuardGroupSchedule[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = React.useCallback(async () => {
        if (guardGroupSchedules) {
            setSchedules(guardGroupSchedules);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await getGuardGroupSchedules();
            setSchedules(data);
        } catch (err: any) {
            setError(err.message || 'Error al cargar los datos');
            toast.error('Error de red al cargar grupos de guardia');
        } finally {
            setLoading(false);
        }
    }, [guardGroupSchedules]);

    useEffect(() => {
        fetchData();

        // Suscripción Realtime para cambios en Horario_Personal
        const channel = supabase
            .channel('guard-groups-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Grupos_Guardia' }, () => {
                if (onRefetch) onRefetch();
                else fetchData();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchData, onRefetch]);

    const getTeachersForSlot = useMemo(() => (day: string, slotId: string) =>
        schedules.filter(s => s.dia_semana === day && s.franja_id === slotId),
        [schedules]);

    const weekDates = useMemo(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        const diff = monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
        monday.setDate(diff);

        const DAYS_ES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const dates: Record<string, string> = {};
        for (let i = 0; i < 5; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const dayNum = String(d.getDate()).padStart(2, '0');
            dates[DAYS_ES[i]] = `${year}-${month}-${dayNum}`;
        }
        return dates;
    }, []);

    const getTeacherGuardAbsence = useMemo(() => (teacherId: string, day: string, slotId: string) => {
        if (!guards) return undefined;
        const targetDate = weekDates[day];
        if (!targetDate) return undefined;
        return guards.find(g =>
            g.requesting_teacher_id === teacherId &&
            g.date === targetDate &&
            g.time_slot_id === slotId &&
            g.subject_id === 'M_GUARDIA' &&
            g.status !== GuardStatus.COMPLETED
        );
    }, [guards, weekDates]);

    const isTeacherAbsent = useMemo(() => (teacherId: string, day: string, slotId: string) => {
        return !!getTeacherGuardAbsence(teacherId, day, slotId);
    }, [getTeacherGuardAbsence]);

    const kpis = useMemo(() => {
        const totalCells = meta.slots.length * DAYS.length;
        const filledCells = meta.slots.reduce((acc, slot) =>
            acc + DAYS.filter(d => schedules.some(s => s.dia_semana === d && s.franja_id === slot.id)).length,
            0);
        const uniqueTeachers = new Set(schedules.map(s => s.profesor_id)).size;
        return { totalCells, filledCells, uniqueTeachers, totalAssignments: schedules.length };
    }, [schedules, meta.slots]);

    const [selectedSlot, setSelectedSlot] = useState<{ day: string; slotId: string } | null>(null);

    const handleRemoveTeacher = async (id: string) => {
        if (!window.confirm('¿Eliminar esta guardia del horario del profesor?')) return;
        try {
            await deleteGuardGroupSchedule(id);
            toast.success('Asignación eliminada');
            await fetchData();
        } catch (err: any) {
            toast.error(err.message || 'Error al eliminar');
        }
    };

    const handleRevertAbsence = async (guardId: string) => {
        if (!window.confirm('¿Deseas revertir esta ausencia y volver a habilitar al profesor para las guardias?')) return;
        try {
            await deleteGuard(guardId);
            toast.success('Ausencia de guardia revertida');
            if (onRefetch) {
                await onRefetch();
            } else {
                await fetchData();
            }
        } catch (err: any) {
            toast.error(err.message || 'Error al revertir la ausencia');
        }
    };

    const slotLabel = meta.slots.find(s => s.id === selectedSlot?.slotId);
    const modalTeachers = selectedSlot
        ? getTeachersForSlot(selectedSlot.day, selectedSlot.slotId)
        : [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            <div className="card glass" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: '50%',
                            background: 'rgba(6,182,212,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--brand-500)'
                        }}>
                            <Shield size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                                Grupos de Guardias
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.85rem' }}>
                                Vista dinámica generada desde los horarios personales del profesorado.
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={kpiStyle}>
                            <div style={{ ...kpiValue, color: 'var(--brand-400)' }}>{kpis.filledCells}/{kpis.totalCells}</div>
                            <div style={kpiLabel}>Franjas Cubiertas</div>
                        </div>
                        <div style={kpiStyle}>
                            <div style={{ ...kpiValue, color: '#a855f7' }}>{kpis.uniqueTeachers}</div>
                            <div style={kpiLabel}>Profesores</div>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div style={{ padding: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <X size={20} />
                        <div>
                            <div style={{ fontWeight: 600 }}>Error de red</div>
                            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>{error}</div>
                        </div>
                    </div>
                    <button className="btn glass" onClick={fetchData} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                        Reintentar
                    </button>
                </div>
            )}

            <div className="card glass p-0" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 220px)', position: 'relative' }}>
                {loading && (
                    <div style={{
                        position: 'absolute', inset: 0, 
                        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
                    }}>
                        <div className="custom-loader text-brand-500">Cargando...</div>
                    </div>
                )}
                <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr style={{ background: 'var(--bg-sidebar)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', position: 'relative' }}>
                            <th style={{ ...thStyle, width: '15%' }}>Franja</th>
                            {DAYS.map(day => (
                                <th key={day} style={{ ...thStyle, textAlign: 'center', width: '17%' }}>{day}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {meta.slots.map((slot, rowIndex) => {
                            const brk = slot.label?.toLowerCase().includes('recreo') || 
                                        slot.label?.toLowerCase().includes('descanso');
                            
                            return (
                                <tr 
                                    key={slot.id} 
                                    style={{ 
                                        borderBottom: rowIndex < meta.slots.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                                        background: brk ? 'rgba(251,191,36,0.02)' : 'transparent'
                                    }}
                                >
                                    <td style={{ 
                                        padding: 16, 
                                        background: brk ? 'rgba(251,191,36,0.05)' : 'var(--bg-sidebar)', 
                                        textAlign: 'center', 
                                        borderRight: '1px solid var(--border-subtle)' 
                                    }}>
                                        <div style={{ 
                                            fontWeight: 700, 
                                            color: brk ? '#fbbf24' : 'var(--text-primary)', 
                                            fontSize: '0.85rem' 
                                        }}>
                                            {slot.label}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                                        </div>
                                    </td>

                                    {DAYS.map(day => {
                                        const slotTeachers = getTeachersForSlot(day, slot.id);
                                        const hasTeachers = slotTeachers.length > 0;
                                        return (
                                            <td 
                                                key={`${day}-${slot.id}`} 
                                                onClick={() => setSelectedSlot({ day, slotId: slot.id })}
                                                style={{ 
                                                    padding: 6, 
                                                    verticalAlign: 'top', 
                                                    borderRight: '1px solid var(--border-subtle)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex', flexWrap: 'wrap', gap: 4, minHeight: 60, padding: 8, borderRadius: 8,
                                                        background: hasTeachers 
                                                            ? (brk ? 'rgba(251,191,36,0.1)' : 'rgba(6,182,212,0.05)') 
                                                            : (brk ? 'rgba(251,191,36,0.03)' : 'rgba(0,0,0,0.02)'),
                                                        alignItems: 'center', justifyContent: 'flex-start',
                                                        pointerEvents: 'none',
                                                        border: brk && hasTeachers ? '1px solid rgba(251,191,36,0.2)' : '1px solid transparent'
                                                    }}
                                                >
                                                    {slotTeachers.map(sched => {
                                                        const absence = getTeacherGuardAbsence(sched.profesor_id, day, slot.id);
                                                        const isAbsent = !!absence;
                                                        const isAdmin = isAdminRole(currentUser?.role) || isJefaturaRole(currentUser?.role);
                                                        const canRevert = isAbsent && (currentUser?.id === sched.profesor_id || isAdmin);
                                                        const handleRevert = () => {
                                                            if (absence) {
                                                                handleRevertAbsence(absence.id);
                                                            }
                                                        };
                                                        return (
                                                            <TeacherAvatar 
                                                                key={sched.id} 
                                                                teacher={sched.teacher as Teacher} 
                                                                size={28} 
                                                                showViewer={false} 
                                                                isAbsent={isAbsent}
                                                                canRevert={canRevert}
                                                                onRevert={handleRevert}
                                                            />
                                                        );
                                                    })}
                                                    {!hasTeachers && (
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.5, width: '100%', textAlign: 'center' }}>—</span>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {createPortal(
                <AnimatePresence>
                    {selectedSlot && (
                        <motion.div
                            key="guard-modal-overlay"
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            style={modalOverlayStyle}
                            onClick={e => { if (e.target === e.currentTarget) setSelectedSlot(null); }}
                        >
                            <motion.div
                                key="guard-modal-content"
                                initial={{ y: 20, opacity: 0 }} 
                                animate={{ y: 0, opacity: 1 }} 
                                exit={{ y: 20, opacity: 0 }}
                                className="card glass" 
                                style={{ width: '100%', maxWidth: 450, padding: 0, position: 'relative', background: 'var(--bg-card)', borderRadius: 24, overflow: 'hidden' }}
                            >
                                <div style={{ padding: 24, borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>{selectedSlot.day}</h2>
                                        <p style={{ color: 'var(--brand-500)', fontSize: '0.9rem', margin: 0 }}>{slotLabel?.label}</p>
                                    </div>
                                    <button onClick={() => setSelectedSlot(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                        <X size={24} />
                                    </button>
                                </div>
                                <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {isAdmin && (
                                        <div style={{ padding: 16, background: 'rgba(6,182,212,0.05)', borderRadius: 12, border: '1px solid rgba(6,182,212,0.1)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                                <UserPlus size={16} className="text-brand-500" />
                                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-500)' }}>Añadir profesor a este grupo</span>
                                            </div>
                                            <div style={{ position: 'relative' }}>
                                                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                                                    <Search size={14} />
                                                </div>
                                                <select
                                                    className="btn glass"
                                                    style={{ 
                                                        width: '100%', 
                                                        textAlign: 'left', 
                                                        paddingLeft: 36, 
                                                        fontSize: '0.85rem',
                                                        appearance: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                    defaultValue=""
                                                    onChange={async (e) => {
                                                        const teacherId = e.target.value;
                                                        if (!teacherId || !selectedSlot) return;
                                                        try {
                                                            await createGuardGroupSchedule({
                                                                profesor_id: teacherId,
                                                                dia_semana: selectedSlot.day,
                                                                franja_id: selectedSlot.slotId,
                                                            });
                                                            toast.success('Profesor añadido correctamente');
                                                            e.target.value = "";
                                                            fetchData();
                                                        } catch (err: any) {
                                                            if (err.code === '23505') { // Postgres unique constraint violation
                                                                toast.error('Este profesor ya está asignado a este grupo de guardia');
                                                            } else {
                                                                toast.error('Error al añadir: ' + err.message);
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <option value="" disabled>Buscar profesor...</option>
                                                    {teachers
                                                        .filter(t => !modalTeachers.some(mt => mt.profesor_id === t.id))
                                                        .sort((a,b) => a.name.localeCompare(b.name))
                                                        .map(t => (
                                                            <option key={t.id} value={t.id}>{t.name} ({t.department})</option>
                                                        ))
                                                    }
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: 8, 
                                        maxHeight: 400, 
                                        overflowY: 'auto',
                                        padding: '4px',
                                        margin: '0 -4px'
                                    }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, paddingLeft: 4 }}>
                                            Profesores asignados ({modalTeachers.length})
                                        </div>
                                        {modalTeachers.map(sched => {
                                            const absence = selectedSlot ? getTeacherGuardAbsence(sched.profesor_id, selectedSlot.day, selectedSlot.slotId) : undefined;
                                            const isAbsent = !!absence;
                                            return (
                                                <div key={sched.id} className="list-item-hover" style={listItemStyle}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                                                        <TeacherAvatar 
                                                            teacher={sched.teacher as Teacher} 
                                                            size={40} 
                                                            showViewer={false} 
                                                            isAbsent={isAbsent} 
                                                        />
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {sched.teacher?.name}
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--brand-400)', fontWeight: 500 }}>
                                                                    {sched.teacher?.department}
                                                                </div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                    <Mail size={10} style={{ opacity: 0.7 }} />
                                                                    <span style={{ opacity: 0.9 }}>{sched.teacher?.email}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isAbsent && (currentUser?.id === sched.profesor_id || isAdmin) && (
                                                        <button 
                                                            className="btn" 
                                                            style={{ 
                                                                padding: 8, 
                                                                borderRadius: 8, 
                                                                marginLeft: 8,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: '#eab308',
                                                                background: 'rgba(234, 179, 8, 0.1)',
                                                                border: '1px solid rgba(234, 179, 8, 0.2)'
                                                            }} 
                                                            onClick={() => handleRevertAbsence(absence.id)}
                                                            title="Revertir ausencia de guardia"
                                                        >
                                                            <RotateCcw size={16} />
                                                        </button>
                                                    )}
                                                    {isAdmin && (
                                                        <button 
                                                            className="btn btn-danger-subtle" 
                                                            style={{ padding: 8, borderRadius: 8, marginLeft: 8 }} 
                                                            onClick={() => handleRemoveTeacher(sched.id)}
                                                            title="Quitar de este grupo"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {modalTeachers.length === 0 && (
                                            <div style={{ 
                                                padding: '32px 16px', 
                                                textAlign: 'center', 
                                                background: 'rgba(255,255,255,0.02)', 
                                                borderRadius: 12, 
                                                border: '2px dashed var(--border-subtle)',
                                                color: 'var(--text-secondary)',
                                                fontSize: '0.85rem'
                                            }}>
                                                No hay profesores asignados en esta franja
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            <style>{`
                .list-item-hover {
                    transition: all 0.2s ease;
                }
                .list-item-hover:hover {
                    background: rgba(255,255,255,0.06) !important;
                    transform: translateX(4px);
                    border-color: var(--brand-500) !important;
                }
            `}</style>
        </div>
    );
};

const thStyle: React.CSSProperties = { padding: 12, background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' };
const kpiStyle: React.CSSProperties = { padding: '8px 16px', background: 'var(--bg-sidebar)', borderRadius: 10, border: '1px solid var(--border-subtle)', textAlign: 'center', minWidth: 100 };
const kpiValue: React.CSSProperties = { fontSize: '1.2rem', fontWeight: 900, lineHeight: 1 };
const kpiLabel: React.CSSProperties = { fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 };
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 };
const listItemStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border-subtle)' };

export default GuardGroups;
