import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { X, Coffee, Shield, BookOpen, MapPin } from 'lucide-react';
import { Teacher, MetaOptions, PersonalScheduleEntry, GuardGroupSchedule } from '../types';
import { getPersonalSchedule } from '../services/supabaseClient';
import TeacherAvatar from './TeacherAvatar';
import ClassroomMapModal from './ClassroomMapModal';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const isBreak = (label?: string) => label?.toLowerCase().includes('recreo');

interface Props {
    teacher: Teacher;
    meta: MetaOptions;
    onClose: () => void;
}

const TeacherScheduleViewer: React.FC<Props> = ({ teacher, meta, onClose }) => {
    const [lectivo, setLectivo]   = useState<PersonalScheduleEntry[]>([]);
    const [guardias, setGuardias] = useState<PersonalScheduleEntry[]>([]);
    const [loading, setLoading]   = useState(true);
    const [mapRoomId, setMapRoomId] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const pData = await getPersonalSchedule(teacher.id);
                setLectivo(pData.filter(e => e.tipo === 'Lectivo'));
                setGuardias(pData.filter(e => e.tipo === 'Guardia'));
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [teacher.id]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const breakSlotIds = new Set(meta.slots.filter(s => isBreak(s.label)).map(s => s.id));
    const slotCounts = {
        lectivoTotal: lectivo.length,
        guardiasOrd:  guardias.filter(g => !breakSlotIds.has(g.franja_id)).length,
        guardiasRec:  guardias.filter(g =>  breakSlotIds.has(g.franja_id)).length,
    };

    return ReactDOM.createPortal(
        /* ── Backdrop ─────────────────────────────────── */
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 9000,
                background: 'rgba(2,8,20,0.88)',
                backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            {/* ── Panel ──────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                onClick={e => e.stopPropagation()}
                style={{
                    width: 'calc(100vw - 40px)', height: 'calc(100vh - 40px)',
                    maxWidth: 1280,
                    background: 'linear-gradient(160deg, #0b1628 0%, #080f1e 60%, #050a14 100%)',
                    borderRadius: 20,
                    border: '1px solid rgba(34,211,238,0.12)',
                    boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* ── Header ──────────────────────────────── */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 20,
                    padding: '20px 28px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.02)',
                    flexShrink: 0,
                }}>
                    <TeacherAvatar teacher={teacher} size={52} editable={false} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{
                            margin: 0, fontSize: '1.15rem', fontWeight: 800,
                            color: '#f1f5f9', letterSpacing: '-0.01em',
                        }}>
                            {teacher.name}
                        </h2>
                        <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'rgba(148,163,184,0.8)' }}>
                            {teacher.department || 'Sin departamento'}
                        </p>
                    </div>

                    {/* Pills de estadísticas */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <Pill icon={<BookOpen size={11}/>} value={slotCounts.lectivoTotal} label="clases" color="#22d3ee" />
                        <Pill icon={<Shield size={11}/>}   value={slotCounts.guardiasOrd} label="guardias" color="#34d399" />
                        <Pill icon={<Coffee size={11}/>}   value={slotCounts.guardiasRec} label="recreos"  color="#fbbf24" />
                    </div>

                    {/* Close */}
                    <button
                        onClick={onClose}
                        style={{
                            width: 34, height: 34, borderRadius: 8,
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#94a3b8', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s',
                            flexShrink: 0,
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)';
                            (e.currentTarget as HTMLElement).style.color = '#f87171';
                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.3)';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                            (e.currentTarget as HTMLElement).style.color = '#94a3b8';
                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                        }}
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* ── Grid ────────────────────────────────── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
                    {loading ? (
                        <div style={{
                            height: '100%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: '#475569', fontSize: '0.85rem',
                        }}>
                            Cargando horario…
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '110px repeat(5, 1fr)',
                            gap: 8,
                        }}>
                            {/* ── Day headers ── */}
                            <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#050a14' }} /> {/* empty corner */}
                            {DAYS.map(day => (
                                <div key={day} style={{
                                    textAlign: 'center', fontSize: '0.68rem', fontWeight: 800,
                                    textTransform: 'uppercase', letterSpacing: '0.1em',
                                    color: '#22d3ee', paddingBottom: 8,
                                    borderBottom: '2px solid rgba(34,211,238,0.15)',
                                    marginBottom: 4,
                                    position: 'sticky', top: 0, zIndex: 10, background: '#050a14',
                                    paddingTop: 8,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                }}>
                                    {day}
                                </div>
                            ))}

                            {/* ── Rows ── */}
                            {meta.slots.map(slot => {
                                const brk = isBreak(slot.label);
                                return (
                                    <React.Fragment key={slot.id}>
                                        {/* Slot label */}
                                        <div style={{
                                            display: 'flex', flexDirection: 'column',
                                            justifyContent: 'center', alignItems: 'flex-end',
                                            paddingRight: 12, gap: 2,
                                            minHeight: brk ? 30 : 68,
                                            borderRight: `2px solid ${brk ? 'rgba(251,191,36,0.12)' : 'rgba(34,211,238,0.12)'}`,
                                        }}>
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: 4,
                                                fontSize: brk ? '0.6rem' : '0.72rem',
                                                fontWeight: 700,
                                                color: brk ? 'rgba(251,191,36,0.55)' : 'rgba(148,163,184,0.85)',
                                                lineHeight: 1.1,
                                            }}>
                                                {brk && <Coffee size={9} style={{ opacity: 0.6 }} />}
                                                <span style={{ textAlign: 'right' }}>{slot.label}</span>
                                            </div>
                                            {!brk && (
                                                <div style={{ fontSize: '0.58rem', color: '#334155' }}>
                                                    {slot.start_time?.slice(0, 5)}{slot.end_time ? `–${slot.end_time.slice(0, 5)}` : ''}
                                                </div>
                                            )}
                                        </div>

                                        {/* Day cells */}
                                        {DAYS.map(day => {
                                            const cls   = lectivo.find(e => e.dia_semana === day && e.franja_id === slot.id);
                                            const guard = guardias.find(e => e.dia_semana === day && e.franja_id === slot.id);

                                            if (brk) return <BreakCell key={day} hasGuard={!!guard} />;
                                            return <CombinedCell key={day} cls={cls} guard={!!guard} onClassroomClick={(id) => setMapRoomId(id)} />;
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Legend ──────────────────────────────── */}
                <div style={{
                    display: 'flex', gap: 20, alignItems: 'center',
                    padding: '12px 28px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(255,255,255,0.01)',
                    flexShrink: 0,
                }}>
                    <LegendItem color="#22d3ee" label="Clase lectiva" />
                    <LegendItem color="#34d399" label="Disponible para guardia" />
                    <LegendItem color="#fbbf24" label="Recreo (disponible guardia)" />
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: '0.65rem', color: '#1e293b' }}>Solo lectura · ESC para cerrar</span>
                </div>
            </motion.div>

            {/* Map Modal */}
            <ClassroomMapModal 
                roomId={mapRoomId}
                meta={meta}
                onClose={() => setMapRoomId(null)}
            />
        </motion.div>,
        document.body   // ← Portal: escapa cualquier stacking context del Layout
    );
};

/* ── Sub-components ──────────────────────────────────────────── */

const Pill = ({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) => (
    <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 20,
        background: `${color}12`,
        border: `1px solid ${color}28`,
        color,
    }}>
        {icon}
        <span style={{ fontSize: '1rem', fontWeight: 900, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: '0.65rem', opacity: 0.7, fontWeight: 600 }}>{label}</span>
    </div>
);

const CombinedCell = ({ cls, guard, onClassroomClick }: { cls?: PersonalScheduleEntry; guard: boolean, onClassroomClick?: (id: string) => void }) => {
    const hasClass = !!cls;
    return (
        <div style={{
            minHeight: 68, borderRadius: 10,
            border: `1px solid ${hasClass ? 'rgba(34,211,238,0.3)' : guard ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.05)'}`,
            background: hasClass
                ? 'linear-gradient(135deg, rgba(34,211,238,0.08) 0%, rgba(34,211,238,0.04) 100%)'
                : guard
                    ? 'rgba(52,211,153,0.04)'
                    : 'rgba(255,255,255,0.015)',
            padding: '8px 6px',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            gap: 3, position: 'relative', overflow: 'hidden',
        }}>
            {/* Subtle glow top edge when has class */}
            {hasClass && (
                <div style={{
                    position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
                    background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.5), transparent)',
                }} />
            )}

            {hasClass ? (
                <>
                    <div style={{
                        fontWeight: 800, fontSize: '0.65rem',
                        color: '#e2e8f0', textAlign: 'center', lineHeight: 1.2,
                    }}>
                        {cls!.materia?.name}
                    </div>
                    <div style={{ fontSize: '0.58rem', color: 'rgba(34,211,238,0.75)', fontWeight: 600 }}>
                        {cls!.grupo?.name}
                    </div>
                    {cls!.aula && (
                        <div 
                            onClick={cls!.aula.id ? (e) => { e.stopPropagation(); onClassroomClick?.(cls!.aula!.id); } : undefined}
                            style={{ 
                                fontSize: '0.53rem', 
                                color: '#374e68', 
                                fontWeight: 500,
                                cursor: cls!.aula.id ? 'pointer' : 'default',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                transition: 'all 0.2s'
                            }}
                            className={cls!.aula.id ? "hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:text-cyan-400" : ""}
                        >
                            <MapPin size={8} />
                            {cls!.aula.name}
                        </div>
                    )}
                </>
            ) : guard ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <Shield size={14} color="rgba(52,211,153,0.6)" />
                    <span style={{ fontSize: '0.52rem', color: 'rgba(52,211,153,0.5)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        Guardia
                    </span>
                </div>
            ) : (
                <div style={{ color: '#1e2d3d', fontSize: '0.8rem', fontWeight: 700 }}>—</div>
            )}

            {/* Guard badge overlay when has BOTH class + guard */}
            {hasClass && guard && (
                <div style={{
                    position: 'absolute', bottom: 4, right: 5,
                    background: 'rgba(52,211,153,0.2)', borderRadius: 4, padding: '1px 4px',
                    display: 'flex', alignItems: 'center', gap: 3,
                }}>
                    <Shield size={8} color="rgba(52,211,153,0.8)" />
                </div>
            )}
        </div>
    );
};

const BreakCell = ({ hasGuard }: { hasGuard: boolean }) => (
    <div style={{
        minHeight: 30, borderRadius: 6,
        border: hasGuard ? '1px solid rgba(251,191,36,0.4)' : '1px dashed rgba(251,191,36,0.1)',
        background: hasGuard ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.02)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    }}>
        <Coffee size={10} color={hasGuard ? 'rgba(251,191,36,0.7)' : 'rgba(251,191,36,0.2)'} />
        {hasGuard && (
            <span style={{ fontSize: '0.55rem', color: 'rgba(251,191,36,0.65)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ✓
            </span>
        )}
    </div>
);

const LegendItem = ({ color, label }: { color: string; label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 10, height: 10, borderRadius: 3, background: `${color}35`, border: `1px solid ${color}60` }} />
        <span style={{ fontSize: '0.65rem', color: '#334155', fontWeight: 500 }}>{label}</span>
    </div>
);

export default TeacherScheduleViewer;
