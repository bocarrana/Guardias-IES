import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Coffee,
    Download,
    Eye,
    Filter,
    HelpCircle,
    Info,
    MapPin,
    Pencil,
    Printer,
    RotateCcw,
    Save,
    Search,
    Shield,
    Trash2,
    User,
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
    findTeacherByName,
    normalizeText,
    formatShortTeacherName,
} from '../../services/recreoZonesService';
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

    // Tabs
    const [activeRecreoTab, setActiveRecreoTab] = useState<'1' | '2'>('1');

    // Grids for current month
    const [grid1, setGrid1] = useState<RecreoGrid>({});
    const [grid2, setGrid2] = useState<RecreoGrid>({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

    // Modal state for editing a cell
    const [editingCell, setEditingCell] = useState<{ zoneId: string; day: DayOfWeek } | null>(null);
    const [teacherSearch, setTeacherSearch] = useState<string>('');
    const [showAllTeachersInModal, setShowAllTeachersInModal] = useState<boolean>(false);

    // Edit mode toggle
    const [isEditMode, setIsEditMode] = useState<boolean>(false);

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
    const handleSave = async () => {
        try {
            await Promise.all([
                saveMonthlyRecreoGrid(selectedYear, selectedMonth, '1', grid1),
                saveMonthlyRecreoGrid(selectedYear, selectedMonth, '2', grid2)
            ]);
            setHasUnsavedChanges(false);
            toast.success('Cuadrante mensual guardado en la nube', {
                description: `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} sincronizado en todos los dispositivos.`
            });
        } catch (err) {
            console.error('Error saving recreo quadrant:', err);
            toast.error('Error al sincronizar el cuadrante en la nube');
        }
    };

    // Clear schedule
    const handleClear = async () => {
        if (!window.confirm(`¿Estás seguro de vaciar el cuadrante del ${activeRecreoTab === '1' ? '1.er' : '2.º'} recreo para ${MONTH_NAMES[selectedMonth - 1]}?`)) {
            return;
        }
        await clearMonthlyRecreoGrid(selectedYear, selectedMonth, activeRecreoTab);
        setActiveGrid({});
        setHasUnsavedChanges(false);
        toast.info('Cuadrante restablecido');
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

    const activeColorTheme = activeRecreoTab === '1' ? '#f43f5e' : '#3b82f6';
    const activeHeaderBg = activeRecreoTab === '1' ? 'rgba(244, 63, 94, 0.12)' : 'rgba(59, 130, 246, 0.12)';

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            fontFamily: 'var(--font-sans)',
            paddingBottom: '40px',
        }}>
            {/* Top Banner Header */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(59, 130, 246, 0.04))',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
                padding: '10px 18px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: 'var(--shadow-sm)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 10px rgba(6, 182, 212, 0.25)',
                        flexShrink: 0,
                    }}>
                        <Coffee size={18} color="#ffffff" />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                Gestión Mensual de Zonas de Recreo
                            </h2>
                            <span style={{
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: 'rgba(6, 182, 212, 0.15)',
                                color: 'var(--brand-500)',
                                border: '1px solid rgba(6, 182, 212, 0.25)',
                            }}>
                                Panel de Jefatura
                            </span>
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            Asigna y organiza los profesores de guardia a cada una de las 5 zonas del centro para cada mes.
                        </p>
                    </div>
                </div>

                {/* Main Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setShowPrintModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 14px',
                            borderRadius: '10px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        <Printer size={14} color="var(--brand-500)" />
                        <span>Imprimir / PDF</span>
                    </button>
                </div>
            </div>

            {/* Navigation Bar: Month Selector + Recreo 1/2 Toggle + Actions */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                background: 'var(--bg-card)',
                padding: '8px 14px',
                borderRadius: '14px',
                border: '1px solid var(--border-subtle)',
            }}>
                {/* Month Navigator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                        onClick={handlePrevMonth}
                        title="Mes anterior"
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                            background: 'rgba(255, 255, 255, 0.04)',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <ChevronLeft size={15} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 150, justifyContent: 'center' }}>
                        <Calendar size={15} color="var(--brand-500)" />
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                        </span>
                    </div>

                    <button
                        onClick={handleNextMonth}
                        title="Mes siguiente"
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                            background: 'rgba(255, 255, 255, 0.04)',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <ChevronRight size={15} />
                    </button>
                </div>

                {/* 1º Recreo vs 2º Recreo Pill Switcher */}
                <div style={{
                    display: 'flex',
                    background: 'var(--bg-main)',
                    padding: '3px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    gap: 3,
                }}>
                    <button
                        onClick={() => setActiveRecreoTab('1')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '5px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
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
                            gap: 5,
                            padding: '5px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
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

                {/* Admin Actions: Edit / Adjust, Save, Clear */}
                {isAdmin && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '5px 12px',
                                borderRadius: '8px',
                                background: isEditMode ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                border: isEditMode ? '1px solid var(--brand-500)' : '1px solid var(--border-subtle)',
                                color: isEditMode ? 'var(--brand-400)' : 'var(--text-primary)',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            <Pencil size={14} />
                            <span>{isEditMode ? 'Finalizar ajuste' : 'Ajustar / Editar'}</span>
                        </button>

                        {hasUnsavedChanges && (
                            <button
                                onClick={handleSave}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '5px 12px',
                                    borderRadius: '8px',
                                    background: 'var(--brand-500)',
                                    color: '#000000',
                                    fontWeight: 800,
                                    border: 'none',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 10px rgba(6, 182, 212, 0.35)',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <Save size={14} />
                                <span>Guardar</span>
                            </button>
                        )}

                        <button
                            onClick={handleClear}
                            title="Vaciar este cuadrante"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '5px 10px',
                                borderRadius: '8px',
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#f87171',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            <Trash2 size={14} />
                            <span>Vaciar</span>
                        </button>
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* CUADRANTE MENSUAL (JEFATURA / ADMIN)                     */}
            {/* ======================================================== */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                                {isAdmin ? (isEditMode ? '✏️ Modo edición activo: Clic en cualquier celda para cambiar el profesor' : 'ℹ️ Pulsa en "Ajustar / Editar" para modificar asignaciones') : '🔒 Modo solo consulta'}
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

                                                

                                                return (
                                                    <td
                                                        key={day}
                                                        onClick={() => {
        if (isAdmin) {
            if (!isEditMode) setIsEditMode(true);
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
                                                            background: isCurrentUserCell ? 'rgba(245, 158, 11, 0.18)' : (isEditMode && isAdmin ? 'rgba(6, 182, 212, 0.04)' : 'transparent'),
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
                                                                e.currentTarget.style.background = isCurrentUserCell ? 'rgba(245, 158, 11, 0.18)' : (isEditMode && isAdmin ? 'rgba(6, 182, 212, 0.04)' : 'transparent');
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
                                                                    {formatShortTeacherName(teacherName)}
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
                </div>

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
                                                onClick={() => handleAssignTeacher(editingCell.zoneId, editingCell.day, formatShortTeacherName(t.name))}
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
