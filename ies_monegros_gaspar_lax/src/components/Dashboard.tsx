import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Guard, GuardGroupSchedule, GuardStatus, GuardType, Teacher } from '../types';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, Users, CheckCircle, Clock, ShieldAlert, Download, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { canAccessAdminPanel, isPantallaRole } from '../utils/roles';
import { getStorageUrl } from '../services/supabaseClient';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';
import tvAvatar from '../assets/tv-avatar.png';

interface DashboardProps {
    guards: Guard[];
    teachers: Teacher[];
    currentUser: Teacher | null;
    guardGroupSchedules: GuardGroupSchedule[];
}

const CHART_COLORS = {
    brand: '#06b6d4',
    accent: '#a855f7',
    success: '#4ade80',
    warning: '#facc15',
    danger: '#f87171',
    slate: '#64748b',
};

const getSpanishDayName = (dateStr: string): string => {
    const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const parts = dateStr.split('-');
    if (parts.length < 3) return '';
    const [year, month, day] = parts.map(Number);
    const dateObj = new Date(year, month - 1, day);
    return DAYS_ES[dateObj.getDay()];
};

const getTeacherAvatarUrl = (t: Teacher) => {
    if (!t) return '';
    if (isPantallaRole(t.role)) return tvAvatar;
    const seed = t.avatar_seed || t.email || t.id || 'seed';
    try {
        const avatar = createAvatar(avataaars, {
            seed: seed,
            backgroundColor: ['transparent'],
        });
        return avatar.toDataUri();
    } catch (error) {
        console.error("Error generating avatar locally in dashboard:", error);
        return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><circle cx="100" cy="100" r="100" fill="%2364748b"/></svg>`;
    }
};

const getTeacherPhotoUrl = (t: Teacher) => {
    if (!t) return '';
    if (t.avatar_url && !t.avatar_url.startsWith('http')) {
        return getStorageUrl(t.avatar_url, 'Fotos');
    }
    if (t.avatar_url && t.avatar_url.startsWith('http')) {
        return t.avatar_url;
    }
    return getTeacherAvatarUrl(t);
};

// ── Custom Bar Label (Avatar atop Ordinaria bar using index lookup) ──────
const renderCustomBarLabel = (props: any, barData: any[], groupId: string) => {
    const { x, y, width, index } = props;
    const dataPoint = barData[index];
    if (!dataPoint || !dataPoint.teacher) return null;

    const avatarUrl = getTeacherAvatarUrl(dataPoint.teacher);
    const avatarSize = 32; // Increased size by ~30% (from 24 to 32)
    const clipId = `avatar-clip-${groupId}-${dataPoint.teacher.id}`;

    return (
        <g key={clipId} style={{ cursor: 'pointer' }}>
            <defs>
                <clipPath id={clipId}>
                    <circle 
                        cx={x + width / 2} 
                        cy={y - avatarSize / 2 - 4} 
                        r={avatarSize / 2} 
                    />
                </clipPath>
            </defs>
            {/* Circle border */}
            <circle 
                cx={x + width / 2} 
                cy={y - avatarSize / 2 - 4} 
                r={avatarSize / 2 + 1} 
                fill="var(--bg-card)" 
                stroke="var(--border-subtle)" 
                strokeWidth={1.5}
            />
            {/* Avatar image cropped */}
            <image
                href={avatarUrl}
                x={x + width / 2 - avatarSize / 2}
                y={y - avatarSize - 4}
                width={avatarSize}
                height={avatarSize}
                clipPath={`url(#${clipId})`}
            />
            {/* Tooltip on hover */}
            <title>{dataPoint.fullName}</title>
        </g>
    );
};

const getSchoolYearBounds = (date: Date) => {
    const month = date.getMonth(); // 0-indexed: 8 is September (Septiembre)
    const year = date.getFullYear();
    const startYear = month >= 8 ? year : year - 1;
    const endYear = startYear + 1;
    return {
        min: `${startYear}-09-01`,
        max: `${endYear}-06-30`,
        startYear,
        endYear,
    };
};

const getShortSlotLabel = (dayName: string, slotLabel: string, slotId: string): string => {
    const dayInitial = {
        'Lunes': 'L',
        'Martes': 'M',
        'Miércoles': 'X',
        'Jueves': 'J',
        'Viernes': 'V'
    }[dayName] || dayName[0];
    
    let num = '';
    const labelLower = slotLabel.toLowerCase();
    if (labelLower.includes('primera') || slotId === '1') num = '1';
    else if (labelLower.includes('segunda') || slotId === '2') num = '2';
    else if (labelLower.includes('tercera') || slotId === '3') num = '3';
    else if (labelLower.includes('recreo') || labelLower.includes('patio')) num = 'R';
    else if (labelLower.includes('cuarta') || slotId === '4') num = '4';
    else if (labelLower.includes('quinta') || slotId === '5') num = '5';
    else if (labelLower.includes('sexta') || slotId === '6') num = '6';
    else {
        const digits = slotId.replace(/\D/g, '') || slotLabel.replace(/\D/g, '');
        num = digits || slotId;
    }
    return `${dayInitial}${num}`;
};

import { MonthDayPicker } from './MonthDayPicker';

const formatDateForPdf = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const Dashboard: React.FC<DashboardProps> = ({ guards, teachers, currentUser, guardGroupSchedules }) => {
    // ── Estado de Visualización (Admin/Jefatura) ──────
    const [showAllGroups, setShowAllGroups] = useState<boolean>(() => {
        if (!currentUser) return false;
        const mySchedules = guardGroupSchedules.filter(s => s.profesor_id === currentUser.id);
        const isAdminOrJefatura = canAccessAdminPanel(currentUser);
        return mySchedules.length === 0 && isAdminOrJefatura;
    });

    // ── Límite y Estado de Fechas para Exportación PDF ──────
    const today = useMemo(() => new Date(), []);
    const bounds = useMemo(() => getSchoolYearBounds(today), [today]);

    const defaultStartDate = useMemo(() => {
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const candidate = `${yyyy}-${mm}-01`;
        if (candidate >= bounds.min && candidate <= bounds.max) {
            return candidate;
        }
        return bounds.min;
    }, [today, bounds]);

    const defaultEndDate = useMemo(() => {
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const candidate = `${yyyy}-${mm}-${dd}`;
        if (candidate >= bounds.min && candidate <= bounds.max) {
            return candidate;
        }
        return bounds.max;
    }, [today, bounds]);

    const [startDate, setStartDate] = useState<string>(defaultStartDate);
    const [endDate, setEndDate] = useState<string>(defaultEndDate);

    // ── KPIs (Totales para cada profesor o globales del centro) ──────────────
    const kpis = useMemo(() => {
        if (!currentUser) return [];

        const isAdminOrJefatura = canAccessAdminPanel(currentUser);
        const useGlobal = showAllGroups && isAdminOrJefatura;

        if (useGlobal) {
            // Filtrar guardias del centro dentro del rango de fechas seleccionado
            const rangeGuards = guards.filter(g => g.date >= startDate && g.date <= endDate);
            const realized = rangeGuards.filter(g => g.status === GuardStatus.COMPLETED).length;
            const pending = rangeGuards.filter(g => g.status !== GuardStatus.COMPLETED).length;
            const ordinaryTotal = rangeGuards.filter(g => g.status === GuardStatus.COMPLETED && g.type === GuardType.ORDINARY).length;
            const coexistenceTotal = rangeGuards.filter(g => g.status === GuardStatus.COMPLETED && g.type === GuardType.COEXISTENCE).length;
            const requested = rangeGuards.length;

            return [
                { label: 'Totales', value: realized + pending, icon: ShieldAlert, color: CHART_COLORS.brand, glow: 'rgba(6,182,212,0.25)' },
                { label: 'Realizadas', value: realized, icon: CheckCircle, color: CHART_COLORS.success, glow: 'rgba(74,222,128,0.25)' },
                { label: 'Pendientes', value: pending, icon: Clock, color: CHART_COLORS.warning, glow: 'rgba(250,204,21,0.25)' },
                { label: 'Ordinarias', value: ordinaryTotal, icon: TrendingUp, color: CHART_COLORS.accent, glow: 'rgba(168,85,247,0.25)' },
                { label: 'Convivencia', value: coexistenceTotal, icon: Users, color: CHART_COLORS.danger, glow: 'rgba(248,113,113,0.25)' },
                { label: 'Creadas', value: requested, icon: ShieldAlert, color: CHART_COLORS.slate, glow: 'rgba(100,116,139,0.25)' },
            ];
        } else {
            // Estadísticas individuales del profesor actual
            const myGuards = guards.filter(g =>
                g.covering_teacher_id === currentUser.id ||
                g.requesting_teacher_id === currentUser.id
            );

            const realized = myGuards.filter(g => g.covering_teacher_id === currentUser.id && g.status === GuardStatus.COMPLETED).length;
            const pending = myGuards.filter(g => g.covering_teacher_id === currentUser.id && g.status !== GuardStatus.COMPLETED).length;

            const ordinaryTotal = myGuards.filter(g =>
                g.covering_teacher_id === currentUser.id &&
                g.type === GuardType.ORDINARY
            ).length;

            const coexistenceTotal = myGuards.filter(g =>
                g.covering_teacher_id === currentUser.id &&
                g.type === GuardType.COEXISTENCE
            ).length;

            const requested = myGuards.filter(g => g.requesting_teacher_id === currentUser.id).length;

            return [
                { label: 'Totales', value: realized + pending, icon: ShieldAlert, color: CHART_COLORS.brand, glow: 'rgba(6,182,212,0.25)' },
                { label: 'Realizadas', value: realized, icon: CheckCircle, color: CHART_COLORS.success, glow: 'rgba(74,222,128,0.25)' },
                { label: 'Pendientes', value: pending, icon: Clock, color: CHART_COLORS.warning, glow: 'rgba(250,204,21,0.25)' },
                { label: 'Ordinarias', value: ordinaryTotal, icon: TrendingUp, color: CHART_COLORS.accent, glow: 'rgba(168,85,247,0.25)' },
                { label: 'Convivencia', value: coexistenceTotal, icon: Users, color: CHART_COLORS.danger, glow: 'rgba(248,113,113,0.25)' },
                { label: 'Creadas', value: requested, icon: ShieldAlert, color: CHART_COLORS.slate, glow: 'rgba(100,116,139,0.25)' },
            ];
        }
    }, [guards, currentUser, showAllGroups, startDate, endDate]);

    // ── Grupos de guardias procesados ─────────────────
    const groupsData = useMemo(() => {
        if (!currentUser) return [];

        const isUserAdminOrJefatura = canAccessAdminPanel(currentUser);
        
        let targetSchedules = guardGroupSchedules;
        if (!showAllGroups || !isUserAdminOrJefatura) {
            // Filtrar solo los grupos donde el usuario está asignado
            const mySchedules = guardGroupSchedules.filter(s => s.profesor_id === currentUser.id);
            const myKeys = new Set(mySchedules.map(s => `${s.dia_semana}-${s.franja_id}`));
            targetSchedules = guardGroupSchedules.filter(s => myKeys.has(`${s.dia_semana}-${s.franja_id}`));
        }

        // Agrupar por dia_semana y franja_id
        const groupsMap: Record<string, {
            dia_semana: string;
            franja_id: string;
            time_slot_label: string;
            teachers: Teacher[];
        }> = {};

        targetSchedules.forEach(s => {
            const key = `${s.dia_semana}-${s.franja_id}`;
            if (!groupsMap[key]) {
                groupsMap[key] = {
                    dia_semana: s.dia_semana,
                    franja_id: s.franja_id,
                    time_slot_label: s.time_slot?.label || s.franja_id,
                    teachers: [],
                };
            }
            if (s.teacher && !groupsMap[key].teachers.some(t => t.id === s.teacher?.id)) {
                groupsMap[key].teachers.push(s.teacher);
            }
        });

        const DAY_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        return Object.values(groupsMap)
            .sort((a, b) => {
                const dayA = DAY_ORDER.indexOf(a.dia_semana);
                const dayB = DAY_ORDER.indexOf(b.dia_semana);
                if (dayA !== dayB) return dayA - dayB;
                return a.franja_id.localeCompare(b.franja_id);
            })
            .map(group => {
                // Filtrar solo las guardias realizadas por los profesores de este grupo en este horario específico
                const groupGuards = guards.filter(g => 
                    getSpanishDayName(g.date) === group.dia_semana && 
                    g.time_slot_id === group.franja_id &&
                    g.status === GuardStatus.COMPLETED &&
                    g.covering_teacher_id &&
                    group.teachers.some(t => t.id === g.covering_teacher_id)
                );

                const ordinaryCount = groupGuards.filter(g => g.type === GuardType.ORDINARY).length;
                const coexistenceCount = groupGuards.filter(g => g.type === GuardType.COEXISTENCE).length;
                const pieData = [
                    { name: 'Ordinaria', value: ordinaryCount },
                    { name: 'Convivencia', value: coexistenceCount },
                ].filter(d => d.value > 0);

                const barData = group.teachers.map(teacher => {
                    const teacherOrdinary = groupGuards.filter(g => 
                        g.covering_teacher_id === teacher.id && 
                        g.type === GuardType.ORDINARY
                    ).length;

                    const teacherCoexistence = groupGuards.filter(g => 
                        g.covering_teacher_id === teacher.id && 
                        g.type === GuardType.COEXISTENCE
                    ).length;

                    return {
                        name: teacher.name.split(' ').slice(0, 2).join(' '),
                        fullName: teacher.name,
                        Ordinaria: teacherOrdinary,
                        Convivencia: teacherCoexistence,
                        teacher,
                    };
                }).sort((a, b) => (b.Ordinaria + b.Convivencia) - (a.Ordinaria + a.Convivencia));

                return {
                    ...group,
                    pieData,
                    barData,
                    totalGuards: groupGuards.length,
                };
            });
    }, [guards, guardGroupSchedules, currentUser, showAllGroups]);

    // ── Estadísticas Globales para Admin y Jefatura ───
    const globalStats = useMemo(() => {
        if (!currentUser || !canAccessAdminPanel(currentUser) || !showAllGroups) {
            return { pieData: [], barData: [], totalCompleted: 0 };
        }

        const getHourIndex = (slotLabel: string, franjaId: string): string | null => {
            const labelLower = slotLabel.toLowerCase();
            if (labelLower.includes('recreo') || labelLower.includes('patio')) return null;
            
            if (labelLower.includes('primera') || franjaId === '1') return '1';
            if (labelLower.includes('segunda') || franjaId === '2') return '2';
            if (labelLower.includes('tercera') || franjaId === '3') return '3';
            if (labelLower.includes('cuarta') || franjaId === '4') return '4';
            if (labelLower.includes('quinta') || franjaId === '5') return '5';
            if (labelLower.includes('sexta') || franjaId === '6') return '6';
            
            const digits = franjaId.replace(/\D/g, '') || slotLabel.replace(/\D/g, '');
            if (digits && ['1', '2', '3', '4', '5', '6'].includes(digits)) {
                return digits;
            }
            return null;
        };

        const findSlotLabel = (slotId: string): string => {
            const found = guardGroupSchedules.find(s => s.franja_id === slotId);
            return found?.time_slot?.label || slotId;
        };

        const completedGuards = guards.filter(g => {
            const isInRange = g.date >= startDate && g.date <= endDate;
            if (!isInRange || g.status !== GuardStatus.COMPLETED) return false;
            
            const slotLabel = g.time_slot?.label || findSlotLabel(g.time_slot_id);
            const hourIndex = getHourIndex(slotLabel, g.time_slot_id);
            return hourIndex !== null;
        });

        const ordinaryTotal = completedGuards.filter(g => g.type === GuardType.ORDINARY).length;
        const coexistenceTotal = completedGuards.filter(g => g.type === GuardType.COEXISTENCE).length;
        const pieData = [
            { name: 'Ordinaria', value: ordinaryTotal },
            { name: 'Convivencia', value: coexistenceTotal }
        ].filter(d => d.value > 0);

        const DAY_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const DAY_INITIALS: Record<string, string> = {
            'Lunes': 'L',
            'Martes': 'M',
            'Miércoles': 'X',
            'Jueves': 'J',
            'Viernes': 'V'
        };
        const DAY_HOURS = ['1', '2', '3', '4', '5', '6'];

        const allSlotsMap: Record<string, {
            day: string;
            hour: string;
            ordinarias: number;
            convivencias: number;
            shortLabel: string;
            fullName: string;
            sortKey: number;
        }> = {};

        // Pregenerar exactamente los 30 slots lectivos estándar (L1-V6)
        DAY_ORDER.forEach((dayName, dayIndex) => {
            DAY_HOURS.forEach((hourStr) => {
                const key = `${dayName}-${hourStr}`;
                const shortLabel = `${DAY_INITIALS[dayName]}${hourStr}`;
                const hourWord = {
                    '1': 'Primera hora',
                    '2': 'Segunda hora',
                    '3': 'Tercera hora',
                    '4': 'Cuarta hora',
                    '5': 'Quinta hora',
                    '6': 'Sexta hora'
                }[hourStr] || `${hourStr}ª hora`;
                
                allSlotsMap[key] = {
                    day: dayName,
                    hour: hourStr,
                    ordinarias: 0,
                    convivencias: 0,
                    shortLabel,
                    fullName: `${dayName} - ${hourWord}`,
                    sortKey: dayIndex * 10 + parseInt(hourStr)
                };
            });
        });

        completedGuards.forEach(g => {
            const dayName = getSpanishDayName(g.date);
            const slotLabel = g.time_slot?.label || findSlotLabel(g.time_slot_id);
            const hourIndex = getHourIndex(slotLabel, g.time_slot_id);
            if (hourIndex) {
                const key = `${dayName}-${hourIndex}`;
                if (allSlotsMap[key]) {
                    if (g.type === GuardType.COEXISTENCE) {
                        allSlotsMap[key].convivencias++;
                    } else {
                        allSlotsMap[key].ordinarias++;
                    }
                }
            }
        });

        const barData = Object.values(allSlotsMap)
            .sort((a, b) => a.sortKey - b.sortKey)
            .map(slot => ({
                name: slot.shortLabel,
                fullName: slot.fullName,
                Ordinaria: slot.ordinarias,
                Convivencia: slot.convivencias
            }));

        return {
            pieData,
            barData,
            totalCompleted: completedGuards.length
        };
    }, [guards, guardGroupSchedules, currentUser, startDate, endDate, showAllGroups]);

    // ── Custom Tooltip ────────────────────────────────
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        const tooltipTitle = payload[0].payload?.fullName || label;
        return (
            <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
            }}>
                {tooltipTitle && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{tooltipTitle}</p>}
                {payload.map((p: any, i: number) => (
                    <p key={i} style={{ fontSize: '0.85rem', fontWeight: 700, color: p.color || 'var(--text-primary)' }}>
                        {p.name}: {p.value}
                    </p>
                ))}
            </div>
        );
    };

    // ── Export PDF ────────────────────────────────────
    const handleExportPDF = () => {
        if (!currentUser) return;

        const isUserAdminOrJefatura = canAccessAdminPanel(currentUser);
        const mySchedules = guardGroupSchedules.filter(s => s.profesor_id === currentUser.id);
        const myKeys = new Set(mySchedules.map(s => `${s.dia_semana}-${s.franja_id}`));

        // 1. Filtrar los profesores según permisos y botón activo
        let allowedTeachers: Teacher[] = [];

        if (showAllGroups && isUserAdminOrJefatura) {
            allowedTeachers = teachers;
        } else {
            // Filtrar solo profesores que comparten algún grupo de guardia con el profesor actual
            const myGroupsSchedules = guardGroupSchedules.filter(s => myKeys.has(`${s.dia_semana}-${s.franja_id}`));
            
            const uniqueTeachersMap = new Map<string, Teacher>();
            myGroupsSchedules.forEach(s => {
                if (s.teacher) {
                    uniqueTeachersMap.set(s.teacher.id, s.teacher);
                }
            });
            // Siempre incluirse a sí mismo
            uniqueTeachersMap.set(currentUser.id, currentUser);
            
            allowedTeachers = Array.from(uniqueTeachersMap.values());
        }

        const allowedTeacherIds = new Set(allowedTeachers.map(t => t.id));

        // 2. Filtrar las guardias en el rango de fechas seleccionado
        const rangeGuards = guards.filter(g => {
            const isInRange = g.date >= startDate && g.date <= endDate;
            if (!isInRange) return false;

            // Si no estamos mostrando todos los grupos, la guardia debe ser en uno de nuestros grupos asignados
            if (!(showAllGroups && isUserAdminOrJefatura)) {
                const dayName = getSpanishDayName(g.date);
                const groupKey = `${dayName}-${g.time_slot_id}`;
                if (!myKeys.has(groupKey)) return false;
            }

            const isMatch = allowedTeacherIds.has(g.covering_teacher_id || '') || allowedTeacherIds.has(g.requesting_teacher_id);
            return isMatch;
        });

        // 3. Obtener y ordenar los grupos de guardia que se van a exportar
        let targetSchedules = guardGroupSchedules;
        if (!(showAllGroups && isUserAdminOrJefatura)) {
            targetSchedules = guardGroupSchedules.filter(s => myKeys.has(`${s.dia_semana}-${s.franja_id}`));
        }

        // Agrupar horarios por dia_semana y franja_id para definir los grupos
        const groupsMap: Record<string, {
            dia_semana: string;
            franja_id: string;
            time_slot_label: string;
            teachers: Teacher[];
        }> = {};

        targetSchedules.forEach(s => {
            const key = `${s.dia_semana}-${s.franja_id}`;
            if (!groupsMap[key]) {
                groupsMap[key] = {
                    dia_semana: s.dia_semana,
                    franja_id: s.franja_id,
                    time_slot_label: s.time_slot?.label || s.franja_id,
                    teachers: [],
                };
            }
            if (s.teacher && !groupsMap[key].teachers.some(t => t.id === s.teacher?.id)) {
                groupsMap[key].teachers.push(s.teacher);
            }
        });

        const DAY_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const sortedGroups = Object.values(groupsMap).sort((a, b) => {
            const dayA = DAY_ORDER.indexOf(a.dia_semana);
            const dayB = DAY_ORDER.indexOf(b.dia_semana);
            if (dayA !== dayB) return dayA - dayB;
            return a.franja_id.localeCompare(b.franja_id);
        });

        // 4. Generar PDF
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Título del PDF
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Informe de Guardias por Grupos', 14, 22);

        // Subtítulos de metadatos
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        const periodStr = `Período: ${formatDateForPdf(startDate)} – ${formatDateForPdf(endDate)}`;
        doc.text(periodStr, 14, 30);

        const ambitStr = (showAllGroups && isUserAdminOrJefatura)
            ? 'Ámbito: Todo el Profesorado (Todos los Grupos)'
            : 'Ámbito: Mis Grupos de Guardia';
        doc.text(ambitStr, 14, 36);

        let currentY = 45;

        // Iterar sobre cada grupo y generar su tabla
        sortedGroups.forEach((group) => {
            // Filtrar guardias pertenecientes a este grupo específico
            const groupGuards = rangeGuards.filter(g => 
                getSpanishDayName(g.date) === group.dia_semana && 
                g.time_slot_id === group.franja_id
            );

            // Identificar todos los profesores asignados + los que hicieron apoyos externos (coberturas puntuales)
            const groupTeachers = [...group.teachers];
            groupGuards.forEach(g => {
                if (g.status === GuardStatus.COMPLETED && g.covering_teacher_id) {
                    const covTeacher = teachers.find(t => t.id === g.covering_teacher_id);
                    if (covTeacher && !groupTeachers.some(t => t.id === covTeacher.id)) {
                        groupTeachers.push(covTeacher);
                    }
                }
            });

            // Si no hay profesores en el grupo ni guardias registradas, no dibujamos tabla para este grupo
            if (groupTeachers.length === 0) return;

            // Mapear los profesores a filas de tabla
            const rows = groupTeachers
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(t => {
                    const ordinarias = groupGuards.filter(g => 
                        g.status === GuardStatus.COMPLETED && 
                        g.covering_teacher_id === t.id && 
                        g.type === GuardType.ORDINARY
                    ).length;

                    const convivencia = groupGuards.filter(g => 
                        g.status === GuardStatus.COMPLETED && 
                        g.covering_teacher_id === t.id && 
                        g.type === GuardType.COEXISTENCE
                    ).length;

                    const solicitadas = groupGuards.filter(g => 
                        g.requesting_teacher_id === t.id
                    ).length;

                    const isAssigned = group.teachers.some(at => at.id === t.id);
                    const displayName = isAssigned ? t.name : `${t.name} (Apoyo externo)`;

                    return [
                        displayName,
                        t.department || '',
                        ordinarias.toString(),
                        convivencia.toString(),
                        (ordinarias + convivencia).toString(),
                        solicitadas.toString()
                    ];
                });

            // Evitar cabeceras huérfanas al final de la página
            const tableHeightEstimate = 20 + (rows.length * 8); // Estimación del alto de la tabla en mm
            if (currentY + tableHeightEstimate > 275) {
                doc.addPage();
                currentY = 20;
            }

            // Título de la tabla de este grupo
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text(`${group.dia_semana} — ${group.time_slot_label}`, 14, currentY);
            currentY += 4;

            autoTable(doc, {
                startY: currentY,
                head: [['Nombre del Profesor', 'Departamento', 'Ordinarias (Realizadas)', 'Convivencia (Realizadas)', 'Total Realizadas', 'Ausencias (Solicitadas)']],
                body: rows,
                theme: 'grid',
                headStyles: { fillColor: [6, 182, 212] }, // var(--brand-500)
                alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
                styles: { fontSize: 8.5, cellPadding: 4 },
                margin: { left: 14, right: 14 },
            });

            // Actualizar el valor de la posición Y para el siguiente bloque
            currentY = (doc as any).lastAutoTable.finalY + 12;
        });

        // 5. Agregar números de página al pie
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            const pageHeight = doc.internal.pageSize.getHeight();
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(150, 150, 150);
            doc.text('Guardias IES — Informe Detallado de Guardias', 14, pageHeight - 8);
            doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
        }

        doc.save(`informe_guardias_${startDate}_al_${endDate}.pdf`);
    };

    const cardAnim = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* ── Barra de Control Unificada ── */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
                background: 'var(--bg-sidebar)',
                padding: '12px 20px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
            }}>
                {/* Lado izquierdo: Filtros de grupos */}
                {currentUser && canAccessAdminPanel(currentUser) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: '0.8rem', color: 'transparent', userSelect: 'none' }}>
                            &nbsp;
                        </span>
                        <div style={{ display: 'flex', gap: 6, height: 34, alignItems: 'center' }}>
                            <button
                                onClick={() => setShowAllGroups(false)}
                                className={`btn ${!showAllGroups ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ padding: '4px 10px', fontSize: '0.75rem', height: '100%', display: 'flex', alignItems: 'center' }}
                            >
                                Mis Grupos
                            </button>
                            <button
                                onClick={() => setShowAllGroups(true)}
                                className={`btn ${showAllGroups ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ padding: '4px 10px', fontSize: '0.75rem', height: '100%', display: 'flex', alignItems: 'center' }}
                            >
                                Todos los Grupos
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: '0.8rem', color: 'transparent', userSelect: 'none' }}>
                            Título:
                        </span>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700, height: 34, display: 'flex', alignItems: 'center' }}>
                            Estadísticas de Guardia
                        </div>
                    </div>
                )}

                {/* Lado derecho: Selector de Fechas y Exportación */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    flexWrap: 'wrap',
                }}>
                    <MonthDayPicker
                        label="Desde:"
                        value={startDate}
                        startYear={bounds.startYear}
                        endYear={bounds.endYear}
                        onChange={setStartDate}
                        align="right"
                    />
                    <MonthDayPicker
                        label="Hasta:"
                        value={endDate}
                        startYear={bounds.startYear}
                        endYear={bounds.endYear}
                        onChange={setEndDate}
                        align="right"
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: '0.8rem', color: 'transparent', userSelect: 'none' }}>
                            Acción:
                        </span>
                        <button
                            onClick={handleExportPDF}
                            className="btn btn-primary"
                            style={{
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                height: 34,
                            }}
                        >
                            <Download size={14} />
                            Exportar PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* ── KPI Row ────────────────────────────── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 16,
            }}>
                {kpis.map((kpi, idx) => (
                    <motion.div
                        key={kpi.label}
                        {...cardAnim}
                        transition={{ delay: idx * 0.06 }}
                        className="kpi-card"
                        style={{ '--kpi-accent': kpi.color, '--kpi-glow': kpi.glow } as React.CSSProperties}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 12,
                        }}>
                            <span style={{
                                fontSize: '0.65rem',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                color: 'var(--text-muted)',
                            }}>
                                {kpi.label}
                            </span>
                            <kpi.icon style={{ width: 18, height: 18, color: kpi.color, filter: `drop-shadow(0 0 6px ${kpi.glow})` }} />
                        </div>
                        <p style={{
                            fontSize: '1.2rem',
                            fontWeight: 800,
                            color: 'var(--heading-color)',
                            lineHeight: 1,
                            letterSpacing: '-0.02em',
                        }}>
                            {kpi.value}
                        </p>
                    </motion.div>
                ))}
            </div>



            {/* ── Ventanas Gráficas por Grupo y Fila ──── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* ── Fila Global de Estadísticas (Solo Admin/Jefatura) ── */}
                {currentUser && canAccessAdminPanel(currentUser) && showAllGroups && (
                    <motion.div
                        {...cardAnim}
                        className="card"
                        style={{
                            padding: 24,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 20,
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.07) 0%, var(--bg-card) 100%)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            boxShadow: '0 8px 32px 0 rgba(99, 102, 241, 0.05)',
                        }}
                    >
                        {/* Cabecera de la Fila Global */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid var(--border-subtle)',
                            paddingBottom: 12,
                        }}>
                            <h3 style={{
                                fontSize: '1rem',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                margin: 0,
                                color: 'var(--heading-color)'
                            }}>
                                <span style={{
                                    width: 4, height: 20, borderRadius: 2,
                                    background: 'var(--brand-500)',
                                    boxShadow: `0 0 8px var(--brand-500)`,
                                }} />
                                Estadísticas Globales del Centro (Todos los Grupos)
                            </h3>
                            <span style={{
                                fontSize: '0.75rem',
                                padding: '4px 10px',
                                borderRadius: 12,
                                background: 'rgba(168,85,247,0.1)',
                                color: 'var(--accent-400)',
                                fontWeight: 600,
                            }}>
                                {globalStats.totalCompleted} {globalStats.totalCompleted === 1 ? 'Guardia realizada' : 'Guardias realizadas'} en total
                            </span>
                        </div>

                        {/* Gráficos Globales */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                            gap: 24,
                        }}>
                            {/* Distribución Global (Circular) */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
                                    Distribución Global por Tipo de Guardia
                                </h4>
                                {globalStats.pieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie
                                                data={globalStats.pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={75}
                                                paddingAngle={4}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {globalStats.pieData.map((d, i) => (
                                                    <Cell 
                                                        key={i} 
                                                        fill={d.name === 'Ordinaria' ? CHART_COLORS.brand : CHART_COLORS.accent} 
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend
                                                verticalAlign="bottom"
                                                iconType="circle"
                                                iconSize={8}
                                                formatter={(val: string) => (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{val}</span>
                                                )}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                        Sin guardias realizadas en este periodo
                                    </div>
                                )}
                            </div>

                            {/* Totales por Grupo/Franja (Histograma) */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
                                    Guardias Realizadas por Franja Horaria
                                </h4>
                                {globalStats.barData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={globalStats.barData} barGap={1} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                                            <XAxis 
                                                dataKey="name" 
                                                tick={{ fill: 'var(--text-muted)', fontSize: 7.5, fontWeight: 600 }}
                                                interval={0}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis 
                                                allowDecimals={false} 
                                                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-main)', opacity: 0.2 }} />
                                            <Legend 
                                                verticalAlign="bottom"
                                                iconType="rect"
                                                iconSize={10}
                                                formatter={(val: string) => (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{val}</span>
                                                )}
                                            />
                                            <Bar 
                                                dataKey="Ordinaria" 
                                                name="Ordinaria" 
                                                fill={CHART_COLORS.brand} 
                                                radius={[2, 2, 0, 0]} 
                                                barSize={5}
                                            />
                                            <Bar 
                                                dataKey="Convivencia" 
                                                name="Convivencia" 
                                                fill={CHART_COLORS.accent} 
                                                radius={[2, 2, 0, 0]} 
                                                barSize={5}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                        Sin datos de franjas horarias
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {groupsData.length === 0 ? (
                    <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>
                            No estás asignado a ningún grupo de guardia en el horario activo.
                        </p>
                    </div>
                ) : (
                    groupsData.map((group, idx) => (
                        <motion.div
                            key={`${group.dia_semana}-${group.franja_id}`}
                            {...cardAnim}
                            transition={{ delay: idx * 0.1 }}
                            className="card"
                            style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}
                        >
                            {/* Cabecera del Grupo */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid var(--border-subtle)',
                                paddingBottom: 12,
                            }}>
                                <h3 style={{
                                    fontSize: '1rem',
                                    fontWeight: 800,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    margin: 0,
                                    color: 'var(--heading-color)'
                                }}>
                                    <span style={{
                                        width: 4, height: 20, borderRadius: 2,
                                        background: CHART_COLORS.brand,
                                        boxShadow: `0 0 8px ${CHART_COLORS.brand}`,
                                    }} />
                                    {group.dia_semana} - {group.time_slot_label}
                                </h3>
                                <span style={{
                                    fontSize: '0.75rem',
                                    padding: '4px 10px',
                                    borderRadius: 12,
                                    background: 'rgba(6,182,212,0.1)',
                                    color: 'var(--brand-400)',
                                    fontWeight: 600,
                                }}>
                                    {group.teachers.length} {group.teachers.length === 1 ? 'Profesor asignado' : 'Profesores asignados'}
                                </span>
                            </div>

                            {/* Fila de Gráficos (Circular e Histograma) */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                                gap: 24,
                            }}>
                                {/* Tipo de Guardia (Circular) */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
                                        Total Grupo de Guardia
                                    </h4>
                                    {group.pieData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={220}>
                                            <PieChart>
                                                <Pie
                                                    data={group.pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={75}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {group.pieData.map((d, i) => (
                                                        <Cell 
                                                            key={i} 
                                                            fill={d.name === 'Ordinaria' ? CHART_COLORS.brand : CHART_COLORS.accent} 
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend
                                                    verticalAlign="bottom"
                                                    iconType="circle"
                                                    iconSize={8}
                                                    formatter={(val: string) => (
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{val}</span>
                                                    )}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                            Sin guardias realizadas en esta franja
                                        </div>
                                    )}
                                </div>

                                {/* Comparativa por Profesor (Histograma de 2 colores con Avatar) */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
                                        Guardias Realizadas por profesor
                                    </h4>
                                    {group.barData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={220}>
                                            <BarChart data={group.barData} margin={{ top: 40, right: 10, left: -20, bottom: 5 }}>
                                                <XAxis 
                                                    dataKey="name" 
                                                    tick={false}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis 
                                                    allowDecimals={false} 
                                                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-main)', opacity: 0.2 }} />
                                                <Legend 
                                                    verticalAlign="bottom"
                                                    iconType="rect"
                                                    iconSize={10}
                                                    formatter={(val: string) => (
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{val}</span>
                                                    )}
                                                />
                                                <Bar 
                                                    dataKey="Ordinaria" 
                                                    name="Ordinaria" 
                                                    fill={CHART_COLORS.brand} 
                                                    radius={[4, 4, 0, 0]} 
                                                    barSize={16}
                                                    label={(barProps) => renderCustomBarLabel(barProps, group.barData, `${group.dia_semana}-${group.franja_id}`)}
                                                />
                                                <Bar 
                                                    dataKey="Convivencia" 
                                                    name="Convivencia" 
                                                    fill={CHART_COLORS.accent} 
                                                    radius={[4, 4, 0, 0]} 
                                                    barSize={16}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                            Sin profesores registrados
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Dashboard;
