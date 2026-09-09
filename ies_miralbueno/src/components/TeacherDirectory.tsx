import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Guard, GuardStatus, GuardType, MetaOptions, Teacher } from '../types';
import { Search, User, Briefcase, CheckCircle, Clock, FilePlus, Mail, Award, Users, CalendarDays } from 'lucide-react';
import { getStorageUrl } from '../services/supabaseClient';
import TeacherAvatar from './TeacherAvatar';
import TeacherScheduleViewer from './TeacherScheduleViewer';
import { canEditTeacherProfile, isJefaturaRole, getRoleStyle, getRoleDisplayName } from '../utils/roles';

interface TeacherDirectoryProps {
    teachers: Teacher[];
    guards: Guard[];
    meta: MetaOptions;
    currentUser: Teacher | null;
    onRefresh?: () => void;
    initialSearchQuery?: string;
}

const RankMedal = ({ rank }: { rank: number }) => {
    const colors = [
        { main: '#fbbf24', stroke: '#b45309', ribbon1: '#6366f1', ribbon2: '#4338ca', text: '#fff' }, // Oro
        { main: '#e2e8f0', stroke: '#94a3b8', ribbon1: '#6366f1', ribbon2: '#4338ca', text: '#334155' }, // Plata
        { main: '#d97706', stroke: '#92400e', ribbon1: '#6366f1', ribbon2: '#4338ca', text: '#fff' }  // Bronce
    ];
    const { main, stroke, ribbon1, ribbon2, text } = colors[rank];

    return (
        <svg width="34" height="38" viewBox="0 0 32 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 3px 5px rgba(0,0,0,0.4))' }}>
            {/* Left Ribbon */}
            <path d="M10 16 L5 34 L11 29 L16 34 L16 16 Z" fill={ribbon1} stroke={ribbon2} strokeWidth="1" strokeLinejoin="round" />
            
            {/* Right Ribbon */}
            <path d="M22 16 L27 34 L21 29 L16 34 L16 16 Z" fill={ribbon1} stroke={ribbon2} strokeWidth="1" strokeLinejoin="round" />
            
            {/* Coin Base */}
            <circle cx="16" cy="14" r="12" fill={main} stroke={stroke} strokeWidth="2" />
            
            {/* Inner Ring (for 3D effect) */}
            <circle cx="16" cy="14" r="9.5" fill="transparent" stroke={stroke} strokeWidth="0.5" opacity="0.6" />
            
            {/* Number */}
            <text x="16" y="18.5" fill={text} fontSize="13" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">{rank + 1}</text>
        </svg>
    );
};

const TeacherDirectory: React.FC<TeacherDirectoryProps> = ({ teachers, guards, meta, currentUser, onRefresh, initialSearchQuery }) => {
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('');
    const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);

    const departments = useMemo(() => {
        const deps = new Set(teachers.map(t => t.department).filter(Boolean));
        return Array.from(deps).sort();
    }, [teachers]);

    const filtered = useMemo(() => {
        const visibleTeachers = teachers.filter(t => {
            const matchesSearch = !searchQuery || 
                t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.department || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.role || '').toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesDept = !selectedDepartment || t.department === selectedDepartment;

            return matchesSearch && matchesDept;
        });

        return visibleTeachers.map((t) => {
            const myGuards = guards.filter(
                (g) => g.covering_teacher_id === t.id || g.requesting_teacher_id === t.id
            );
            const ordinary = myGuards.filter(
                (g) => g.status === GuardStatus.COMPLETED && g.covering_teacher_id === t.id && g.type === GuardType.ORDINARY
            ).length;
            const coexistence = myGuards.filter(
                (g) => g.status === GuardStatus.COMPLETED && g.covering_teacher_id === t.id && g.type === GuardType.COEXISTENCE
            ).length;
            const requested = myGuards.filter((g) => g.requesting_teacher_id === t.id).length;

            return { ...t, ordinary, coexistence, requested, total: ordinary + coexistence };
        }).sort((a, b) => b.ordinary - a.ordinary);
    }, [teachers, guards, searchQuery, selectedDepartment]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Search & Filters */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
                    <Search style={{
                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                        width: 16, height: 16, color: 'var(--slate-500)',
                    }} />
                    <input
                        type="text"
                        placeholder="Buscar profesorado..."
                        className="input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: 38, width: '100%' }}
                    />
                </div>

                <div style={{ minWidth: 200 }}>
                    <select
                        className="select"
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        style={{ width: '100%', height: '42px', color: 'var(--text-primary)' }}
                    >
                        <option value="">Todos los departamentos</option>
                        {departments.map((dept) => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary */}
            <div style={{
                display: 'flex', gap: 12, flexWrap: 'wrap',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: 16,
            }}>
                <span style={{
                    fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)', letterSpacing: '0.08em',
                }}>
                    REGISTROS: <span style={{ color: 'var(--brand-400)', fontWeight: 700 }}>{filtered.length}</span>
                </span>
            </div>

            {/* Teacher Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16,
            }}>
                <AnimatePresence mode="popLayout">
                    {filtered.map((teacher, idx) => {
                        const avatarUrl = teacher.avatar_url
                            ? getStorageUrl(teacher.avatar_url, 'Fotos')
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.name)}&background=0f172a&color=22d3ee&size=80`;

                        const rankMedal = idx < 3 ? (
                            <RankMedal rank={idx} />
                        ) : null;

                        return (
                            <motion.div
                                key={teacher.id}
                                layout
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.03 }}
                                className="card"
                                style={{
                                    padding: 20,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 16,
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Rank Medal */}
                                {rankMedal && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 10,
                                        right: 12,
                                        zIndex: 10
                                    }}>
                                        {rankMedal}
                                    </div>
                                )}

                                {/* Teacher Info */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <TeacherAvatar
                                        teacher={teacher}
                                        size={52}
                                        editable={canEditTeacherProfile(currentUser, teacher) || currentUser?.id === teacher.id}
                                        onUpdate={onRefresh}
                                    />
                                    <div style={{ minWidth: 0, flex: 1, paddingRight: rankMedal ? 32 : 0 }}>
                                        <h3 style={{
                                            fontSize: '0.95rem',
                                            fontWeight: 800,
                                            color: 'var(--heading-color)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {teacher.name}
                                        </h3>
                                        {teacher.department && (
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 2,
                                                marginTop: 4,
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <Briefcase style={{ width: 12, height: 12, color: 'var(--text-muted)' }} />
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        color: 'var(--text-secondary)',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                        {teacher.department}
                                                    </span>
                                                </div>
                                                <a
                                                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${teacher.email}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        fontSize: '0.7rem',
                                                        color: 'var(--brand-400)',
                                                        opacity: 0.8,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        textDecoration: 'none'
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Mail style={{ width: 12, height: 12 }} />
                                                    {teacher.email}
                                                </a>
                                            </div>
                                        )}
                                        {teacher.role && (
                                            <span style={{
                                                display: 'inline-block',
                                                marginTop: 6,
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                fontFamily: 'var(--font-mono)',
                                                letterSpacing: '0.06em',
                                                textTransform: 'uppercase',
                                                ...getRoleStyle(teacher.role)
                                            }}>
                                                {getRoleDisplayName(teacher.role)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Stats Row */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr',
                                    gap: 8,
                                    borderTop: '1px solid var(--border-subtle)',
                                    paddingTop: 14,
                                }}>
                                    {[
                                        { icon: Award, value: teacher.ordinary, label: 'Ordinarias', color: 'var(--brand-400)' },
                                        { icon: Users, value: teacher.coexistence, label: 'Convivencia', color: 'var(--purple-400)' },
                                        { icon: FilePlus, value: teacher.requested, label: 'Creadas', color: 'var(--slate-400)' },
                                    ].map((stat) => (
                                        <div key={stat.label} style={{ textAlign: 'center' }}>
                                            <stat.icon style={{
                                                width: 14, height: 14,
                                                color: stat.color,
                                                margin: '0 auto 4px',
                                                display: 'block',
                                            }} />
                                            <p style={{
                                                fontSize: '1.1rem',
                                                fontWeight: 900,
                                                color: 'var(--heading-color)',
                                                lineHeight: 1,
                                            }}>
                                                {stat.value}
                                            </p>
                                            <p style={{
                                                fontSize: '0.55rem',
                                                fontFamily: 'var(--font-mono)',
                                                color: 'var(--text-muted)',
                                                marginTop: 4,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em',
                                            }}>
                                                {stat.label}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {/* Ver Horario button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setViewingTeacher(teacher); }}
                                    style={{
                                        width: '100%',
                                        marginTop: 4,
                                        padding: '7px 0',
                                        borderRadius: 8,
                                        border: '1px solid var(--border-subtle)',
                                        background: 'transparent',
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-900-subtle)';
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--brand-500)';
                                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--brand-400)';
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
                                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                                    }}
                                >
                                    <CalendarDays size={13} />
                                    Ver horario completo
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {filtered.length === 0 && (
                    <div style={{
                        gridColumn: '1/-1',
                        textAlign: 'center',
                        padding: 64,
                        borderRadius: 'var(--radius-lg)',
                        border: '1px dashed var(--border-subtle)',
                        background: 'var(--bg-sidebar)',
                    }}>
                        <User style={{ width: 48, height: 48, color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                            NO SE ENCONTRARON PROFESORES
                        </p>
                    </div>
                )}
            </div>

            {/* ── Full-screen schedule viewer ─────────────── */}
            {viewingTeacher && (
                <TeacherScheduleViewer
                    teacher={viewingTeacher}
                    meta={meta}
                    onClose={() => setViewingTeacher(null)}
                />
            )}
        </div>
    );
};

export default TeacherDirectory;
