import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Coffee,
    Copy,
    Download,
    Eye,
    Filter,
    HelpCircle,
    Info,
    Map as MapIcon,
    MapPin,
    Printer,
    RotateCcw,
    Save,
    Search,
    Shield,
    Sparkles,
    Trash2,
    User,
    UserCheck,
    Users,
    X,
} from 'lucide-react';
import { Teacher, MetaOptions, GuardGroupSchedule } from '../../types';
import { canAccessAdminPanel } from '../../utils/roles';
import TeacherAvatar from '../TeacherAvatar';
import {
    RECREO_ZONES,
    DAYS_OF_WEEK,
    DayOfWeek,
    RecreoGrid,
    getMonthlyRecreoGrid,
    saveMonthlyRecreoGrid,
    clearMonthlyRecreoGrid,
    copyMonthlyRecreoGrid,
    getTodayRecreoAssignments,
    findTeacherByName,
    normalizeText,
} from '../../services/recreoZonesService';
import { RecreoMap } from './RecreoMap';
import { RecreoPrintView } from './RecreoPrintView';
import { toast } from 'sonner';

interface RecreoZonesManagerProps {
    currentUser: Teacher | null;
    teachers: Teacher[];
    meta?: MetaOptions;
    guardGroupSchedules?: GuardGroupSchedule[];
}

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const RecreoZonesManager: React.FC<RecreoZonesManagerProps> = ({
    currentUser,
    teachers,
    meta,
    guardGroupSchedules = [],
}) => {
    const isAdmin = canAccessAdminPanel(currentUser);

    // Date navigation state
    const today = new Date();
    const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1); // 1-12

    // Tabs & views
    const [activeRecreoTab, setActiveRecreoTab] = useState<'1' | '2'>('1');
    const [activeViewMode, setActiveViewMode] = useState<'matrix' | 'map' | 'today'>('matrix');

    // Grids for current month
    const [grid1, setGrid1] = useState<RecreoGrid>({});
    const [grid2, setGrid2] = useState<RecreoGrid>({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

    // Modal state for editing a cell
    const [editingCell, setEditingCell] = useState<{ zoneId: string; day: DayOfWeek } | null>(null);
    const [teacherSearch, setTeacherSearch] = useState<string>('');
    const [showAllTeachersInModal, setShowAllTeachersInModal] = useState<boolean>(false);

    // Teacher highlight filter
    const [filterTeacherId, setFilterTeacherId] = useState<string>('');

    // Print view modal
    const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

    // Load data when month/year changes
    useEffect(() => {
        const loadedGrid1 = getMonthlyRecreoGrid(selectedYear, selectedMonth, '1');
        const loadedGrid2 = getMonthlyRecreoGrid(selectedYear, selectedMonth, '2');
        setGrid1(loadedGrid1);
        setGrid2(loadedGrid2);
        setHasUnsavedChanges(false);
    }, [selectedYear, selectedMonth]);

    const activeGrid = activeRecreoTab === '1' ? grid1 : grid2;
    const setActiveGrid = activeRecreoTab === '1' ? setGrid1 : setGrid2;

    // Helper to find the matching recreo slot ID
    const targetRecreoSlot = useMemo(() => {
        if (!meta?.slots?.length) return undefined;
        const recreoSlots = meta.slots.filter(s =>
            s.label?.toLowerCase().includes('recreo') || s.label?.toLowerCase().includes('descanso')
        );
        if (activeRecreoTab === '1') {
            return recreoSlots.find(s => s.label.toLowerCase().includes('1') || s.label.toLowerCase().includes('primer') || (s.start_time && parseInt(s.start_time) < 13)) || recreoSlots[0];
        } else {
            return recreoSlots.find(s => s.label.toLowerCase().includes('2') || s.label.toLowerCase().includes('segund') || (s.start_time && parseInt(s.start_time) >= 13)) || recreoSlots[1] || recreoSlots[0];
        }
    }, [meta, activeRecreoTab]);

    // Handle teacher assignment to cell
    const handleAssignTeacher = (zoneId: string, day: DayOfWeek, teacherName: string) => {
        const cellKey = `${zoneId}_${day}`;
        const updatedGrid = { ...activeGrid, [cellKey]: teacherName };

        if (!teacherName) {
            delete updatedGrid[cellKey];
        }

        setActiveGrid(updatedGrid);
        setHasUnsavedChanges(true);
        setEditingCell(null);
        setTeacherSearch('');
        setShowAllTeachersInModal(false);
    };

    // Save current schedule
    const handleSave = () => {
        saveMonthlyRecreoGrid(selectedYear, selectedMonth, '1', grid1);
        saveMonthlyRecreoGrid(selectedYear, selectedMonth, '2', grid2);
        setHasUnsavedChanges(false);
        toast.success('Cuadrante mensual guardado correctamente', {
            description: `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} actualizado.`
        });
    };

    // Clear schedule
    const handleClear = () => {
        if (!window.confirm(`¿Estás seguro de vaciar el cuadrante del ${activeRecreoTab === '1' ? '1.er' : '2.º'} recreo para ${MONTH_NAMES[selectedMonth - 1]}?`)) {
            return;
        }
        clearMonthlyRecreoGrid(selectedYear, selectedMonth, activeRecreoTab);
        setActiveGrid({});
        setHasUnsavedChanges(false);
        toast.info('Cuadrante restablecido');
    };

    // Copy previous month
    const handleCopyPreviousMonth = () => {
        let prevMonth = selectedMonth - 1;
        let prevYear = selectedYear;
        if (prevMonth < 1) {
            prevMonth = 12;
            prevYear -= 1;
        }

        const copied = copyMonthlyRecreoGrid(prevYear, prevMonth, selectedYear, selectedMonth, activeRecreoTab);
        setActiveGrid(copied);
        setHasUnsavedChanges(true);
        toast.success(`Copiado cuadrante de ${MONTH_NAMES[prevMonth - 1]} ${prevYear}`);
    };

    // Month Navigation
    const handlePrevMonth = () => {
        if (selectedMonth === 1) {
            setSelectedMonth(12);
            setSelectedYear(y => y - 1);
        } else {
            setSelectedMonth(m => m - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 12) {
            setSelectedMonth(1);
            setSelectedYear(y => y + 1);
        } else {
            setSelectedMonth(m => m + 1);
        }
    };

    // Teachers specifically assigned to this Recreo slot & day in the school timetable
    const slotDutyTeachers = useMemo(() => {
        if (!editingCell || !targetRecreoSlot) return [];
        return guardGroupSchedules
            .filter(s => s.dia_semana === editingCell.day && s.franja_id === targetRecreoSlot.id)
            .map(s => s.teacher || teachers.find(t => t.id === s.profesor_id))
            .filter(Boolean) as Teacher[];
    }, [editingCell, targetRecreoSlot, guardGroupSchedules, teachers]);

    // Filtered teachers for assignment popup
    const modalAvailableTeachers = useMemo(() => {
        // By default, only show teachers destined for this recreo slot on this day
        let pool = (slotDutyTeachers.length > 0 && !showAllTeachersInModal) ? slotDutyTeachers : teachers;

        if (!teacherSearch.trim()) return pool;
        const q = normalizeText(teacherSearch);
        return pool.filter(t => normalizeText(t.name).includes(q) || normalizeText(t.department || '').includes(q));
    }, [slotDutyTeachers, showAllTeachersInModal, teachers, teacherSearch]);

    // Statistics: Count of recreo assignments per teacher in the active month
    const teacherStats = useMemo(() => {
        const counts: Record<string, number> = {};
        const countFromGrid = (grid: RecreoGrid) => {
            Object.values(grid).forEach(name => {
                if (!name) return;
                const teacher = findTeacherByName(name, teachers);
                const key = teacher ? teacher.id : name;
                counts[key] = (counts[key] || 0) + 1;
            });
        };
        countFromGrid(grid1);
        countFromGrid(grid2);
        return counts;
    }, [grid1, grid2, teachers]);

    // Today's assignments data
    const todayData = useMemo(() => {
        return getTodayRecreoAssignments(teachers);
    }, [teachers, grid1, grid2]);

    const activeColorTheme = activeRecreoTab === '1' ? '#f43f5e' : '#3b82f6';
    const activeHeaderBg = activeRecreoTab === '1' ? 'rgba(244, 63, 94, 0.12)' : 'rgba(59, 130, 246, 0.12)';

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            width: '100%',
            fontFamily: 'var(--font-sans)',
            paddingBottom: '40px',
        }}>
            {/* Top Banner Header */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(59, 130, 246, 0.04))',
                border: '1px solid var(--border-subtle)',
                borderRadius: '24px',
                padding: '24px 28px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '18px',
                boxShadow: 'var(--shadow-md)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 16,
                        background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(6, 182, 212, 0.3)',
                    }}>
                        <Coffee size={26} color="#ffffff" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                                Gestión Mensual de Zonas de Recreo
                            </h2>
                            <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: 'rgba(6, 182, 212, 0.15)',
                                color: 'var(--brand-500)',
                                border: '1px solid rgba(6, 182, 212, 0.25)',
                            }}>
                                Panel de Jefatura
                            </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Asigna y organiza los profesores de guardia a cada una de las 5 zonas del centro para cada mes.
                        </p>
                    </div>
                </div>

                {/* Main Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setShowPrintModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 18px',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        <Printer size={16} color="var(--brand-500)" />
                        <span>Imprimir / PDF</span>
                    </button>

                    {isAdmin && (
                        <button
                            onClick={handleSave}
                            disabled={!hasUnsavedChanges}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px 20px',
                                borderRadius: '12px',
                                background: hasUnsavedChanges ? 'var(--brand-500)' : 'rgba(255, 255, 255, 0.05)',
                                color: hasUnsavedChanges ? '#000000' : 'var(--text-muted)',
                                border: '1px solid var(--border-subtle)',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                cursor: hasUnsavedChanges ? 'pointer' : 'not-allowed',
                                boxShadow: hasUnsavedChanges ? '0 4px 16px rgba(6, 182, 212, 0.3)' : 'none',
                                transition: 'all 0.2s',
                            }}
                        >
                            <Save size={16} />
                            <span>{hasUnsavedChanges ? 'Guardar Cambios' : 'Guardado'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Bar: Month Selector + View Mode Switcher + Recreo 1/2 Toggle */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                background: 'var(--bg-card)',
                padding: '14px 20px',
                borderRadius: '20px',
                border: '1px solid var(--border-subtle)',
            }}>
                {/* Month Navigator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                        onClick={handlePrevMonth}
                        title="Mes anterior"
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            border: '1px solid var(--border-subtle)',
                            background: 'rgba(255, 255, 255, 0.04)',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 170, justifyContent: 'center' }}>
                        <Calendar size={18} color="var(--brand-500)" />
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                        </span>
                    </div>

                    <button
                        onClick={handleNextMonth}
                        title="Mes siguiente"
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            border: '1px solid var(--border-subtle)',
                            background: 'rgba(255, 255, 255, 0.04)',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* View Mode Switcher */}
                <div style={{
                    display: 'flex',
                    background: 'var(--bg-main)',
                    padding: '4px',
                    borderRadius: '14px',
                    border: '1px solid var(--border-subtle)',
                    gap: 4,
                }}>
                    {[
                        { id: 'matrix', label: 'Cuadrante Mensual', icon: Users },
                        { id: 'map', label: 'Mapa de Zonas', icon: MapIcon },
                        { id: 'today', label: 'Hoy en el Recreo', icon: Sparkles },
                    ].map(v => {
                        const isActive = activeViewMode === v.id;
                        return (
                            <button
                                key={v.id}
                                onClick={() => setActiveViewMode(v.id as any)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '8px 14px',
                                    borderRadius: '10px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: isActive ? 'var(--brand-500)' : 'transparent',
                                    color: isActive ? '#000000' : 'var(--text-secondary)',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <v.icon size={15} />
                                <span>{v.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* 1º Recreo vs 2º Recreo Pill Switcher */}
                <div style={{
                    display: 'flex',
                    background: 'var(--bg-main)',
                    padding: '4px',
                    borderRadius: '14px',
                    border: '1px solid var(--border-subtle)',
                    gap: 4,
                }}>
                    <button
                        onClick={() => setActiveRecreoTab('1')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 16px',
                            borderRadius: '10px',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer',
                            background: activeRecreoTab === '1' ? '#f43f5e' : 'transparent',
                            color: activeRecreoTab === '1' ? '#ffffff' : 'var(--text-secondary)',
                            transition: 'all 0.2s',
                        }}
                    >
                        <span>☕ 1.ᵉʳ Recreo</span>
                    </button>
                    <button
                        onClick={() => setActiveRecreoTab('2')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 16px',
                            borderRadius: '10px',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer',
                            background: activeRecreoTab === '2' ? '#3b82f6' : 'transparent',
                            color: activeRecreoTab === '2' ? '#ffffff' : 'var(--text-secondary)',
                            transition: 'all 0.2s',
                        }}
                    >
                        <span>☕ 2.º Recreo</span>
                    </button>
                </div>
            </div>

            {/* ======================================================== */}
            {/* VIEW 1: MATRIX / CUADRANTE MENSUAL                       */}
            {/* ======================================================== */}
            {activeViewMode === 'matrix' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Toolbar under matrix: Filter by Teacher + Copy/Reset actions */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 12,
                    }}>
                        {/* Highlight teacher search */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: '360px' }}>
                            <div style={{
                                position: 'relative',
                                width: '100%',
                            }}>
                                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="Resaltar a un profesor..."
                                    value={filterTeacherId}
                                    onChange={e => setFilterTeacherId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px 8px 36px',
                                        borderRadius: '12px',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                    }}
                                />
                                {filterTeacherId && (
                                    <button
                                        onClick={() => setFilterTeacherId('')}
                                        style={{
                                            position: 'absolute',
                                            right: 10,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--text-muted)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Admin helpers */}
                        {isAdmin && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button
                                    onClick={handleCopyPreviousMonth}
                                    title="Copiar asignaciones del mes anterior"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '7px 14px',
                                        borderRadius: '10px',
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Copy size={14} />
                                    <span>Copiar mes anterior</span>
                                </button>

                                <button
                                    onClick={handleClear}
                                    title="Vaciar este cuadrante"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '7px 14px',
                                        borderRadius: '10px',
                                        background: 'rgba(239, 68, 68, 0.08)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        color: '#f87171',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Trash2 size={14} />
                                    <span>Vaciar</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Matrix Table Container */}
                    <div style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-lg)',
                    }}>
                        {/* Table Header with Recreo Title */}
                        <div style={{
                            padding: '16px 24px',
                            background: activeHeaderBg,
                            borderBottom: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    background: activeColorTheme,
                                    boxShadow: `0 0 10px ${activeColorTheme}`,
                                }} />
                                <span style={{
                                    fontSize: '1rem',
                                    fontWeight: 900,
                                    color: 'var(--text-primary)',
                                    letterSpacing: '0.04em',
                                    textTransform: 'uppercase',
                                }}>
                                    GUARDIAS – {activeRecreoTab === '1' ? 'PRIMER RECREO' : 'SEGUNDO RECREO'} ({MONTH_NAMES[selectedMonth - 1]} {selectedYear})
                                </span>
                            </div>

                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                {isAdmin ? '✏️ Clic en cualquier celda para asignar o cambiar' : '🔒 Modo solo consulta'}
                            </span>
                        </div>

                        {/* Interactive Grid */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                minWidth: '780px',
                            }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                                        <th style={{
                                            padding: '14px 18px',
                                            textAlign: 'left',
                                            fontSize: '0.8rem',
                                            fontWeight: 800,
                                            color: 'var(--text-muted)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            width: '22%',
                                        }}>
                                            Zona de Vigilancia
                                        </th>
                                        {DAYS_OF_WEEK.map(day => (
                                            <th
                                                key={day}
                                                style={{
                                                    padding: '14px 12px',
                                                    textAlign: 'center',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 800,
                                                    color: 'var(--text-primary)',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.03em',
                                                    borderLeft: '1px solid var(--border-subtle)',
                                                }}
                                            >
                                                {day}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {RECREO_ZONES.map((zone, zIdx) => (
                                        <tr
                                            key={zone.id}
                                            style={{
                                                borderBottom: zIdx === RECREO_ZONES.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                                                transition: 'background 0.2s',
                                            }}
                                        >
                                            {/* Row Header (Zone) */}
                                            <td style={{
                                                padding: '16px 18px',
                                                background: 'rgba(255, 255, 255, 0.01)',
                                                borderRight: '1px solid var(--border-subtle)',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{
                                                        width: 12,
                                                        height: 12,
                                                        borderRadius: '4px',
                                                        background: zone.color,
                                                        flexShrink: 0,
                                                    }} />
                                                    <div>
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                            {zone.name}
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                                            {zone.description}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 5 Day Cells */}
                                            {DAYS_OF_WEEK.map(day => {
                                                const cellKey = `${zone.id}_${day}`;
                                                const teacherName = activeGrid[cellKey] || '';
                                                const teacherObj = teacherName ? findTeacherByName(teacherName, teachers) : undefined;

                                                // Highlight logic: current logged-in user or filter query
                                                const isCurrentUserCell = currentUser && teacherName && (
                                                    normalizeText(teacherName).includes(normalizeText(currentUser.name)) ||
                                                    normalizeText(currentUser.name).includes(normalizeText(teacherName))
                                                );

                                                const isFilterMatch = filterTeacherId && teacherName && normalizeText(teacherName).includes(normalizeText(filterTeacherId));

                                                return (
                                                    <td
                                                        key={day}
                                                        onClick={() => {
                                                            if (isAdmin) {
                                                                setEditingCell({ zoneId: zone.id, day });
                                                                setTeacherSearch('');
                                                                setShowAllTeachersInModal(false);
                                                            }
                                                        }}
                                                        style={{
                                                            padding: '12px 10px',
                                                            textAlign: 'center',
                                                            borderLeft: '1px solid var(--border-subtle)',
                                                            cursor: isAdmin ? 'pointer' : 'default',
                                                            background: isFilterMatch
                                                                ? 'rgba(6, 182, 212, 0.25)'
                                                                : isCurrentUserCell
                                                                ? 'rgba(245, 158, 11, 0.18)'
                                                                : 'transparent',
                                                            transition: 'all 0.15s ease',
                                                            position: 'relative',
                                                        }}
                                                        onMouseEnter={e => {
                                                            if (isAdmin) {
                                                                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.08)';
                                                            }
                                                        }}
                                                        onMouseLeave={e => {
                                                            if (isAdmin) {
                                                                e.currentTarget.style.background = isFilterMatch
                                                                    ? 'rgba(6, 182, 212, 0.25)'
                                                                    : isCurrentUserCell
                                                                    ? 'rgba(245, 158, 11, 0.18)'
                                                                    : 'transparent';
                                                            }
                                                        }}
                                                    >
                                                        {teacherName ? (
                                                            <div style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 8,
                                                                padding: '6px 12px',
                                                                borderRadius: '12px',
                                                                background: isCurrentUserCell ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                                                                border: isCurrentUserCell ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
                                                                maxWidth: '100%',
                                                            }}>
                                                                {teacherObj ? (
                                                                    <TeacherAvatar teacher={teacherObj} size={24} showViewer={false} />
                                                                ) : (
                                                                    <User size={14} color="var(--text-muted)" />
                                                                )}
                                                                <span style={{
                                                                    fontSize: '0.85rem',
                                                                    fontWeight: isCurrentUserCell ? 800 : 600,
                                                                    color: isCurrentUserCell ? '#f59e0b' : 'var(--text-primary)',
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                }}>
                                                                    {teacherName}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div style={{
                                                                fontSize: '0.75rem',
                                                                color: 'var(--text-muted)',
                                                                fontStyle: 'italic',
                                                                opacity: 0.6,
                                                            }}>
                                                                {isAdmin ? '+ Asignar' : '—'}
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Teacher Summary / Dedicated Hours Breakdown */}
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '20px',
                        border: '1px solid var(--border-subtle)',
                        padding: '18px 22px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <UserCheck size={18} color="var(--brand-500)" />
                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                Resumen de Vigilancias Asignadas ({MONTH_NAMES[selectedMonth - 1]} {selectedYear})
                            </h4>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {teachers.slice(0, 18).map(t => {
                                const count = teacherStats[t.id] || teacherStats[t.name] || 0;
                                if (count === 0) return null;
                                return (
                                    <div
                                        key={t.id}
                                        onClick={() => setFilterTeacherId(filterTeacherId === t.name ? '' : t.name)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '5px 10px',
                                            borderRadius: '10px',
                                            background: filterTeacherId === t.name ? 'rgba(6, 182, 212, 0.2)' : 'var(--bg-main)',
                                            border: `1px solid ${filterTeacherId === t.name ? 'var(--brand-500)' : 'var(--border-subtle)'}`,
                                            fontSize: '0.78rem',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <TeacherAvatar teacher={t} size={20} showViewer={false} />
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.name.split(' ')[0]} {t.name.split(' ')[1] || ''}</span>
                                        <span style={{
                                            padding: '1px 6px',
                                            borderRadius: 6,
                                            background: 'var(--brand-500)',
                                            color: '#000',
                                            fontWeight: 800,
                                            fontSize: '0.7rem',
                                        }}>
                                            {count} sem.
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* VIEW 2: INTERACTIVE MAP VIEW                             */}
            {/* ======================================================== */}
            {activeViewMode === 'map' && (
                <RecreoMap
                    recreoTitle={activeRecreoTab === '1' ? 'Primer Recreo' : 'Segundo Recreo'}
                    assignments={activeRecreoTab === '1' ? todayData.recreo1 : todayData.recreo2}
                />
            )}

            {/* ======================================================== */}
            {/* VIEW 3: TODAY'S DUTIES VIEW (HOY EN EL RECREO)           */}
            {/* ======================================================== */}
            {activeViewMode === 'today' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Header Banner */}
                    <div style={{
                        padding: '16px 20px',
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.03))',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 12,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Sparkles size={20} color="#f59e0b" />
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    Vigilancia de Recreo de Hoy ({todayData.dayName || 'Fin de semana'})
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Profesores asignados a cada zona en los recreos del día de hoy.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setActiveViewMode('map')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 14px',
                                borderRadius: '10px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            <MapIcon size={14} color="var(--brand-500)" /> Ver en Mapa
                        </button>
                    </div>

                    {/* 2 Columns: 1º Recreo and 2º Recreo */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
                        {/* 1.er Recreo Column */}
                        <div style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '20px',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 14,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f43f5e' }} />
                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    1.ᵉʳ Recreo (11:15 - 11:45)
                                </h4>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {todayData.recreo1.map(({ zone, teacherName, teacher }) => (
                                    <div
                                        key={zone.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 14px',
                                            borderRadius: '14px',
                                            background: 'var(--bg-main)',
                                            border: '1px solid var(--border-subtle)',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 8, height: 28, borderRadius: 4, background: zone.color }} />
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                    {zone.name}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                    {zone.locations[0]}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {teacher ? (
                                                <TeacherAvatar teacher={teacher} size={28} showViewer={false} />
                                            ) : (
                                                <User size={16} color="var(--text-muted)" />
                                            )}
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                {teacherName || 'Sin asignar'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2.º Recreo Column */}
                        <div style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '20px',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 14,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }} />
                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    2.º Recreo (13:35 - 14:00)
                                </h4>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {todayData.recreo2.map(({ zone, teacherName, teacher }) => (
                                    <div
                                        key={zone.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 14px',
                                            borderRadius: '14px',
                                            background: 'var(--bg-main)',
                                            border: '1px solid var(--border-subtle)',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 8, height: 28, borderRadius: 4, background: zone.color }} />
                                            <div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                    {zone.name}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                    {zone.locations[0]}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {teacher ? (
                                                <TeacherAvatar teacher={teacher} size={28} showViewer={false} />
                                            ) : (
                                                <User size={16} color="var(--text-muted)" />
                                            )}
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                {teacherName || 'Sin asignar'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* CELL EDITING MODAL (JEFATURA / ADMIN)                    */}
            {/* ======================================================== */}
            <AnimatePresence>
                {editingCell && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9990,
                        background: 'rgba(0, 0, 0, 0.7)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                    }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '24px',
                                width: '100%',
                                maxWidth: '460px',
                                padding: '24px',
                                boxShadow: 'var(--shadow-2xl)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                        Asignar Profesor a Zona
                                    </h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {RECREO_ZONES.find(z => z.id === editingCell.zoneId)?.name} · {editingCell.day} ({activeRecreoTab === '1' ? '1.er Recreo' : '2.º Recreo'})
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setEditingCell(null); setShowAllTeachersInModal(false); }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Guard Slot Filter Notice & Toggle */}
                            <div style={{
                                padding: '8px 12px',
                                borderRadius: '10px',
                                background: 'rgba(6, 182, 212, 0.08)',
                                border: '1px solid rgba(6, 182, 212, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '0.78rem',
                            }}>
                                <span style={{ color: 'var(--brand-400)', fontWeight: 600 }}>
                                    {!showAllTeachersInModal && slotDutyTeachers.length > 0
                                        ? `🎯 Mostrando los ${slotDutyTeachers.length} profesores asignados a este recreo`
                                        : `👥 Mostrando todos los profesores del claustro`}
                                </span>
                                {slotDutyTeachers.length > 0 && (
                                    <button
                                        onClick={() => setShowAllTeachersInModal(!showAllTeachersInModal)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--brand-500)',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            textDecoration: 'underline',
                                            fontSize: '0.75rem',
                                        }}
                                    >
                                        {showAllTeachersInModal ? 'Filtrar por recreo' : 'Ver todo el claustro'}
                                    </button>
                                )}
                            </div>

                            {/* Search bar */}
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="Buscar profesor por nombre o dpto..."
                                    value={teacherSearch}
                                    onChange={e => setTeacherSearch(e.target.value)}
                                    autoFocus
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px 10px 38px',
                                        borderRadius: '12px',
                                        background: 'var(--bg-main)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            {/* Teacher List */}
                            <div style={{
                                maxHeight: '280px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                            }}>
                                {/* Option to unassign/clear cell */}
                                <button
                                    onClick={() => handleAssignTeacher(editingCell.zoneId, editingCell.day, '')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '8px 12px',
                                        borderRadius: '10px',
                                        background: 'rgba(239, 68, 68, 0.08)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        color: '#f87171',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                    }}
                                >
                                    <Trash2 size={16} />
                                    <span>Dejar celda vacía / Sin asignar</span>
                                </button>

                                {modalAvailableTeachers.length === 0 ? (
                                    <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        No se han encontrado profesores con ese filtro.
                                        {!showAllTeachersInModal && (
                                            <button
                                                onClick={() => setShowAllTeachersInModal(true)}
                                                style={{
                                                    display: 'block',
                                                    margin: '8px auto 0',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--brand-500)',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    textDecoration: 'underline',
                                                }}
                                            >
                                                Buscar en todo el claustro
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    modalAvailableTeachers.map(t => {
                                        const currentName = activeGrid[`${editingCell.zoneId}_${editingCell.day}`] || '';
                                        const isSelected = currentName === t.name;

                                        return (
                                            <button
                                                key={t.id}
                                                onClick={() => handleAssignTeacher(editingCell.zoneId, editingCell.day, t.name)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '8px 12px',
                                                    borderRadius: '12px',
                                                    background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                                    border: `1px solid ${isSelected ? 'var(--brand-500)' : 'var(--border-subtle)'}`,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease',
                                                    textAlign: 'left',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <TeacherAvatar teacher={t} size={30} showViewer={false} />
                                                    <div>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                            {t.name}
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                            {t.department || 'Profesorado'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {isSelected && (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--brand-500)', fontWeight: 800 }}>
                                                        Asignado
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Print Modal */}
            {showPrintModal && (
                <RecreoPrintView
                    year={selectedYear}
                    monthName={MONTH_NAMES[selectedMonth - 1]}
                    grid1={grid1}
                    grid2={grid2}
                    onClose={() => setShowPrintModal(false)}
                />
            )}
        </div>
    );
};
