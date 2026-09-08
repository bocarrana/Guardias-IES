import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Guard, GuardStatus, GuardType, MetaOptions, Teacher } from '../types';
import { 
    Search, User, Briefcase, CheckCircle, Clock, FilePlus, Mail, Award, 
    Users, CalendarDays, SlidersHorizontal, Trophy, ArrowDownAZ, Building2, X, Check 
} from 'lucide-react';
import { getStorageUrl } from '../services/supabaseClient';
import TeacherAvatar from './TeacherAvatar';
import TeacherScheduleViewer from './TeacherScheduleViewer';
import { canEditTeacherProfile, isJefaturaRole, getRoleStyle, getRoleDisplayName, isPantallaRole } from '../utils/roles';

interface TeacherDirectoryProps {
    teachers: Teacher[];
    guards: Guard[];
    meta: MetaOptions;
    currentUser: Teacher | null;
    onRefresh?: () => void;
    initialSearchQuery?: string;
}

export type TeacherViewMode = 'ranking' | 'name' | 'department';

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
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    
    // Persistent View Mode ('ranking' | 'name' | 'department')
    const [viewMode, setViewMode] = useState<TeacherViewMode>(() => {
        try {
            const saved = localStorage.getItem('teacher_directory_view_mode');
            if (saved === 'ranking' || saved === 'name' || saved === 'department') {
                return saved;
            }
        } catch {
            // fallback
        }
        return 'ranking';
    });

    const handleSelectViewMode = (mode: TeacherViewMode) => {
        setViewMode(mode);
        try {
            localStorage.setItem('teacher_directory_view_mode', mode);
        } catch {
            // ignore
        }
    };

    const departments = useMemo(() => {
        const deps = new Set(teachers.filter(t => !isPantallaRole(t.role)).map(t => t.department).filter(Boolean));
        return Array.from(deps).sort((a, b) => (a as string).localeCompare(b as string, 'es', { sensitivity: 'base' }));
    }, [teachers]);

    const filtered = useMemo(() => {
        const visibleTeachers = teachers.filter(t => {
            if (isPantallaRole(t.role)) return false;
            const matchesSearch = !searchQuery || 
                t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.department || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.role || '').toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesDept = !selectedDepartment || t.department === selectedDepartment;

            return matchesSearch && matchesDept;
        });

        const mapped = visibleTeachers.map((t) => {
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
        });

        if (viewMode === 'name') {
            // 2. Por Nombre (A-Z) teniendo en cuenta el nombre primero
            return mapped.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
        } else if (viewMode === 'department') {
            // 3. Por Departamento
            return mapped.sort((a, b) => {
                const deptA = a.department || 'Sin Departamento';
                const deptB = b.department || 'Sin Departamento';
                const deptDiff = deptA.localeCompare(deptB, 'es', { sensitivity: 'base' });
                if (deptDiff !== 0) return deptDiff;
                return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
            });
        } else {
            // 1. Por Ranking (Guardias ordinarias descendente)
            return mapped.sort((a, b) => {
                if (b.ordinary !== a.ordinary) return b.ordinary - a.ordinary;
                return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
            });
        }
    }, [teachers, guards, searchQuery, selectedDepartment, viewMode]);

    const getViewModeLabel = () => {
        if (viewMode === 'ranking') return { label: 'Por Ranking', icon: Trophy, color: '#fbbf24' };
        if (viewMode === 'name') return { label: 'Por Nombre (A-Z)', icon: ArrowDownAZ, color: 'var(--brand-400)' };
        return { 
            label: selectedDepartment ? `Dpto: ${selectedDepartment}` : 'Por Departamento', 
            icon: Building2, 
            color: '#a855f7' 
        };
    };

    const currentModeInfo = getViewModeLabel();
    const CurrentModeIcon = currentModeInfo.icon;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Search & Actions Bar */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Search Input */}
                <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
                    <Search style={{
                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                        width: 16, height: 16, color: 'var(--slate-500)',
                    }} />
                    <input
                        type="text"
                        placeholder="Buscar profesorado por nombre, departamento..."
                        className="input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: 38, width: '100%' }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            style={{
                                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                background: 'transparent', border: 'none', color: 'var(--text-muted)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center'
                            }}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* View Options Modal Trigger Button */}
                <button
                    onClick={() => setIsViewModalOpen(true)}
                    className="btn btn-secondary"
                    style={{
                        height: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '0 16px',
                        borderRadius: 10,
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    }}
                >
                    <SlidersHorizontal size={16} style={{ color: 'var(--brand-400)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Vista:</span>
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: currentModeInfo.color,
                        background: 'rgba(255,255,255,0.05)',
                        padding: '3px 8px',
                        borderRadius: 6,
                    }}>
                        <CurrentModeIcon size={14} />
                        {currentModeInfo.label}
                    </span>
                </button>

                {/* Department quick filter if in department mode or if filtered */}
                {viewMode === 'department' && (
                    <div style={{ minWidth: 200 }}>
                        <select
                            className="select"
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            style={{ width: '100%', height: '42px', color: 'var(--text-primary)' }}
                        >
                            <option value="">Todos los departamentos</option>
                            {departments.map((dept) => (
                                <option key={dept as string} value={dept as string}>{dept as string}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Summary & Active Filters */}
            <div style={{
                display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: 16,
            }}>
                <span style={{
                    fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)', letterSpacing: '0.08em',
                }}>
                    DOCENTES: <span style={{ color: 'var(--brand-400)', fontWeight: 800 }}>{filtered.length}</span>
                </span>

                <div style={{ width: 1, height: 14, background: 'var(--border-subtle)' }} />

                <span style={{
                    fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6
                }}>
                    MODO: 
                    <span style={{ 
                        color: currentModeInfo.color, 
                        fontWeight: 700,
                        background: 'rgba(255,255,255,0.04)',
                        padding: '2px 8px',
                        borderRadius: 4,
                        border: '1px solid var(--border-subtle)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5
                    }}>
                        <CurrentModeIcon size={12} />
                        {viewMode === 'ranking' && 'RANKING DE GUARDIAS'}
                        {viewMode === 'name' && 'ORDEN ALFABÉTICO (A-Z)'}
                        {viewMode === 'department' && (selectedDepartment ? `DPTO: ${selectedDepartment.toUpperCase()}` : 'TODOS LOS DEPARTAMENTOS')}
                    </span>
                </span>

                {selectedDepartment && (
                    <button
                        onClick={() => setSelectedDepartment('')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                            fontSize: '0.68rem',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-mono)'
                        }}
                    >
                        Quitar filtro dpto <X size={11} />
                    </button>
                )}
            </div>

            {/* Unified View Options Modal */}
            <AnimatePresence>
                {isViewModalOpen && (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 16,
                            background: 'rgba(0, 0, 0, 0.75)',
                            backdropFilter: 'blur(8px)',
                        }}
                        onClick={() => setIsViewModalOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '100%',
                                maxWidth: 540,
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 16,
                                overflow: 'hidden',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{
                                padding: '20px 24px',
                                borderBottom: '1px solid var(--border-subtle)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'rgba(255,255,255,0.02)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: 10,
                                        background: 'var(--brand-900-subtle)',
                                        border: '1px solid var(--brand-500)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--brand-400)'
                                    }}>
                                        <SlidersHorizontal size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--heading-color)', margin: 0 }}>
                                            Opciones de Vista del Profesorado
                                        </h3>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                                            Selecciona cómo deseas organizar las tarjetas
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsViewModalOpen(false)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        padding: 6,
                                        borderRadius: 8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Body: 3 View Options */}
                            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {/* 1. Por Ranking */}
                                <div
                                    onClick={() => handleSelectViewMode('ranking')}
                                    style={{
                                        padding: 16,
                                        borderRadius: 12,
                                        border: `2px solid ${viewMode === 'ranking' ? '#fbbf24' : 'var(--border-subtle)'}`,
                                        background: viewMode === 'ranking' ? 'rgba(251, 191, 36, 0.08)' : 'rgba(255,255,255,0.02)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 14,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <div style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 10,
                                        background: 'rgba(251, 191, 36, 0.15)',
                                        border: '1px solid rgba(251, 191, 36, 0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fbbf24',
                                        flexShrink: 0,
                                        marginTop: 2
                                    }}>
                                        <Trophy size={20} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--heading-color)' }}>
                                                    1. Por Ranking de Guardias
                                                </span>
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    fontWeight: 700,
                                                    fontFamily: 'var(--font-mono)',
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    background: 'rgba(251, 191, 36, 0.2)',
                                                    color: '#fbbf24',
                                                    letterSpacing: '0.04em'
                                                }}>
                                                    PODIO 🥇🥈🥉
                                                </span>
                                            </div>
                                            {viewMode === 'ranking' && (
                                                <div style={{
                                                    width: 20, height: 20, borderRadius: '50%',
                                                    background: '#fbbf24', color: '#000',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <Check size={14} strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '6px 0 0', lineHeight: 1.4 }}>
                                            Ordena al profesorado por mayor número de guardias ordinarias cubiertas. Muestra medallas de podio en los 3 primeros puestos.
                                        </p>
                                    </div>
                                </div>

                                {/* 2. Por Nombre */}
                                <div
                                    onClick={() => handleSelectViewMode('name')}
                                    style={{
                                        padding: 16,
                                        borderRadius: 12,
                                        border: `2px solid ${viewMode === 'name' ? 'var(--brand-500)' : 'var(--border-subtle)'}`,
                                        background: viewMode === 'name' ? 'var(--brand-900-subtle)' : 'rgba(255,255,255,0.02)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 14,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <div style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 10,
                                        background: 'var(--brand-900-subtle)',
                                        border: '1px solid var(--brand-500)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--brand-400)',
                                        flexShrink: 0,
                                        marginTop: 2
                                    }}>
                                        <ArrowDownAZ size={20} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--heading-color)' }}>
                                                    2. Por Nombre (Orden Alfabético)
                                                </span>
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    fontWeight: 700,
                                                    fontFamily: 'var(--font-mono)',
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    background: 'var(--brand-900-subtle)',
                                                    color: 'var(--brand-400)',
                                                    letterSpacing: '0.04em'
                                                }}>
                                                    A &rarr; Z
                                                </span>
                                            </div>
                                            {viewMode === 'name' && (
                                                <div style={{
                                                    width: 20, height: 20, borderRadius: '50%',
                                                    background: 'var(--brand-400)', color: '#000',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <Check size={14} strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '6px 0 0', lineHeight: 1.4 }}>
                                            Ordena de la A a la Z según el nombre de pila. Directorio limpio para localizar a cualquier compañero rápidamente.
                                        </p>
                                    </div>
                                </div>

                                {/* 3. Por Departamento */}
                                <div
                                    onClick={() => handleSelectViewMode('department')}
                                    style={{
                                        padding: 16,
                                        borderRadius: 12,
                                        border: `2px solid ${viewMode === 'department' ? '#a855f7' : 'var(--border-subtle)'}`,
                                        background: viewMode === 'department' ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255,255,255,0.02)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 12,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                        <div style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 10,
                                            background: 'rgba(168, 85, 247, 0.15)',
                                            border: '1px solid rgba(168, 85, 247, 0.3)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#a855f7',
                                            flexShrink: 0,
                                            marginTop: 2
                                        }}>
                                            <Building2 size={20} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--heading-color)' }}>
                                                        3. Por Departamento
                                                    </span>
                                                    <span style={{
                                                        fontSize: '0.65rem',
                                                        fontWeight: 700,
                                                        fontFamily: 'var(--font-mono)',
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                        background: 'rgba(168, 85, 247, 0.2)',
                                                        color: '#c084fc',
                                                        letterSpacing: '0.04em'
                                                    }}>
                                                        DEPARTAMENTOS
                                                    </span>
                                                </div>
                                                {viewMode === 'department' && (
                                                    <div style={{
                                                        width: 20, height: 20, borderRadius: '50%',
                                                        background: '#a855f7', color: '#fff',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        <Check size={14} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>
                                            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '6px 0 0', lineHeight: 1.4 }}>
                                                Agrupa o filtra al profesorado por departamentos didácticos y áreas de especialidad.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Sub-selector for Department */}
                                    {viewMode === 'department' && (
                                        <div 
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                marginTop: 4,
                                                paddingTop: 12,
                                                borderTop: '1px dashed rgba(168, 85, 247, 0.25)',
                                            }}
                                        >
                                            <label style={{
                                                display: 'block',
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                color: '#c084fc',
                                                marginBottom: 6,
                                                fontFamily: 'var(--font-mono)',
                                                textTransform: 'uppercase'
                                            }}>
                                                Filtrar por departamento específico:
                                            </label>
                                            <select
                                                className="select"
                                                value={selectedDepartment}
                                                onChange={(e) => setSelectedDepartment(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    fontSize: '0.85rem',
                                                    color: 'var(--text-primary)',
                                                    background: 'var(--bg-main)',
                                                    borderColor: 'rgba(168, 85, 247, 0.4)'
                                                }}
                                            >
                                                <option value="">Todos los departamentos ({departments.length})</option>
                                                {departments.map((dept) => (
                                                    <option key={dept as string} value={dept as string}>{dept as string}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div style={{
                                padding: '16px 24px',
                                borderTop: '1px solid var(--border-subtle)',
                                background: 'rgba(255,255,255,0.02)',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 10
                            }}>
                                <button
                                    onClick={() => setIsViewModalOpen(false)}
                                    className="btn btn-primary"
                                    style={{
                                        padding: '8px 20px',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        borderRadius: 8,
                                    }}
                                >
                                    Aplicar y Ver
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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

                        // Only show podium medals when in ranking mode and not filtered by department/search
                        const rankMedal = (viewMode === 'ranking' && idx < 3 && !selectedDepartment && !searchQuery) ? (
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
