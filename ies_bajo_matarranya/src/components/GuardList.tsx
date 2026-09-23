import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Guard, GuardStatus, GuardType, Teacher, MetaOptions, GuardGroupSchedule, getGuardTaskType } from '../types';
import {
    User, Calendar, Clock, MapPin, CheckCircle, Zap,
    BookOpen, Shield, Pencil, Trash2, FileText, Search, Loader2, AlertTriangle,
    ChevronLeft, ChevronRight, X, Dices, ChevronDown, MessageSquare, FileCheck, RotateCw,
    Inbox, Paperclip, Layers, ExternalLink, Download, Filter, RotateCcw, Coffee
} from 'lucide-react';
import { getStorageUrl, getTaskFileUrl } from '../services/supabaseClient';
import TeacherAvatar from './TeacherAvatar';
import CrownLogo from './CrownLogo';
import ClassroomMapModal from './ClassroomMapModal';
import { toast } from 'sonner';
import { canAccessAdminPanel, isAdministracionRole, isPantallaRole, isAdminRole, isJefaturaRole } from '../utils/roles';
import { rankTeachers, filterGuardsForSlot } from '../utils/guardAssignment';
import { LOGO_DARK_URL } from '../config/supabase';
import { HelpBadge } from './help';

interface ScrollableAvatarsProps {
    children: React.ReactNode;
    isTV: boolean;
}

const ScrollableAvatars: React.FC<ScrollableAvatarsProps> = ({ children, isTV }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(false);

    const checkScroll = () => {
        const el = containerRef.current;
        if (!el || !isTV) return;
        setShowLeft(el.scrollLeft > 4);
        setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    };

    useEffect(() => {
        const el = containerRef.current;
        if (!el || !isTV) return;
        checkScroll();
        const handleResize = () => checkScroll();
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [isTV, children]);

    if (!isTV) {
        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', width: '100%' }}>
                {children}
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', minWidth: 0 }}>
            {showLeft && (
                <div style={{
                    position: 'absolute',
                    left: -2,
                    zIndex: 20,
                    color: 'var(--brand-400)',
                    background: 'linear-gradient(90deg, var(--bg-card) 60%, transparent)',
                    width: 24,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    pointerEvents: 'none',
                }}>
                    <ChevronLeft size={14} style={{ filter: 'drop-shadow(0 0 4px var(--brand-500))' }} />
                </div>
            )}
            
            <div 
                ref={containerRef}
                onScroll={checkScroll}
                className="no-scrollbar"
                style={{
                    display: 'flex',
                    flexWrap: 'nowrap',
                    gap: 8,
                    alignItems: 'center',
                    overflowX: 'auto',
                    width: '100%',
                    WebkitOverflowScrolling: 'touch',
                    padding: '6px 6px',
                }}
            >
                {children}
            </div>

            {showRight && (
                <div style={{
                    position: 'absolute',
                    right: -2,
                    zIndex: 20,
                    color: 'var(--brand-400)',
                    background: 'linear-gradient(270deg, var(--bg-card) 60%, transparent)',
                    width: 24,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    pointerEvents: 'none',
                }}>
                    <ChevronRight size={14} style={{ filter: 'drop-shadow(0 0 4px var(--brand-500))' }} />
                </div>
            )}
        </div>
    );
};

interface GuardListProps {
    guards: Guard[];
    currentUser: Teacher | null;
    loading: boolean;
    onPickup: (guardId: string) => void;
    onRelease: (guardId: string) => void;
    onComplete: (guardId: string) => void;
    onDelete: (guardId: string) => void;
    onEdit: (guard: Guard) => void;
    meta: MetaOptions;
    guardGroupSchedules: GuardGroupSchedule[];
    assignmentModes: Record<string, 'recommended' | 'random'>;
    onChangeAssignmentMode: (slotId: string, mode: 'recommended' | 'random') => void;
    onRefresh?: () => Promise<void> | void;
}

const getStatusBadgeClass = (status: GuardStatus) => {
    switch (status) {
        case GuardStatus.AVAILABLE: return 'badge-available';
        case GuardStatus.ASSIGNED: return 'badge-assigned';
        case GuardStatus.COMPLETED: return 'badge-completed';
    }
};

const getBorderColor = (status: GuardStatus) => {
    switch (status) {
        case GuardStatus.AVAILABLE: return 'var(--brand-400)';
        case GuardStatus.ASSIGNED: return 'var(--warning)';
        case GuardStatus.COMPLETED: return 'var(--text-muted)';
    }
};

const DAYS_ES_GLOBAL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const getFormattedDateParts = (dateStr: string, todayDateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return {
        dayName: days[dateObj.getDay()],
        dayNum: d,
        monthName: months[dateObj.getMonth()],
        isToday: dateStr === todayDateStr
    };
};

export const isGuardPassed = (guard: Guard, now: Date) => {
    if (!guard.time_slot?.start_time) return false;
    try {
        const [year, month, day] = guard.date.split('-').map(Number);
        let hours: number, minutes: number;
        if (guard.time_slot.end_time) {
            const parts = guard.time_slot.end_time.split(':').map(Number);
            hours = parts[0];
            minutes = parts[1];
        } else {
            const parts = guard.time_slot.start_time.split(':').map(Number);
            const startObj = new Date(year, month - 1, day, parts[0], parts[1]);
            const endObj = new Date(startObj.getTime() + 60 * 60 * 1000);
            hours = endObj.getHours();
            minutes = endObj.getMinutes();
        }
        const guardEnd = new Date(year, month - 1, day, hours, minutes);
        return now > guardEnd;
    } catch (e) {
        console.error("Error checking if guard is passed:", e);
        return false;
    }
};

const GuardList: React.FC<GuardListProps> = ({
    guards, currentUser, loading, onPickup, onRelease, onComplete, onDelete, onEdit, meta, guardGroupSchedules,
    assignmentModes, onChangeAssignmentMode, onRefresh
}) => {
    const [filter, setFilter] = useState<'today' | 'mine' | 'available' | 'history'>('today');
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [mapRoomId, setMapRoomId] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedObservationGuard, setSelectedObservationGuard] = useState<Guard | null>(null);

    // Estados para indicador En Vivo y botón de Actualización manual
    const [showLiveInfo, setShowLiveInfo] = useState(false);
    const [showRefreshInfo, setShowRefreshInfo] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleManualRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            if (onRefresh) {
                await onRefresh();
            }
            toast.success('Datos actualizados en tiempo real', { duration: 2000 });
        } catch (error) {
            console.error('Error al actualizar datos:', error);
            toast.error('Error al actualizar los datos');
        } finally {
            setTimeout(() => {
                setIsRefreshing(false);
            }, 600);
        }
    };

    // Auto-cerrar modal de observación tras 8 segundos
    useEffect(() => {
        if (!selectedObservationGuard) return;
        const timer = setTimeout(() => {
            setSelectedObservationGuard(null);
        }, 8000);
        return () => clearTimeout(timer);
    }, [selectedObservationGuard]);

    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
    const [onlyCompatible, setOnlyCompatible] = useState(false);
    const [openModeMenuSlotId, setOpenModeMenuSlotId] = useState<string | null>(null);
    const [highlightedGuardId, setHighlightedGuardId] = useState<string | null>(null);

    const handleScrollToGuard = (guard: Guard) => {
        setSelectedObservationGuard(null);
        if (selectedDate && selectedDate !== guard.date) {
            setSelectedDate(guard.date);
        }
        if (selectedSlotId && selectedSlotId !== guard.time_slot_id) {
            setSelectedSlotId(null);
        }
        if (filter === 'history' && guard.status !== GuardStatus.COMPLETED) {
            setFilter('today');
        }
        setHighlightedGuardId(guard.id);
        setTimeout(() => {
            const el = document.getElementById(`guard-card-${guard.id}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 250);

        setTimeout(() => {
            setHighlightedGuardId(null);
        }, 4500);
    };

    // Floating teacher tooltip state for TV / kiosk mode
    const [activeTeacherTooltip, setActiveTeacherTooltip] = useState<{
        teacher: Teacher;
        isAbsent?: boolean;
        coveredGuards?: Guard[];
        slotId: string;
    } | null>(null);
    const teacherTooltipTimerRef = useRef<any>(null);

    const handleAvatarTouch = (teacher: Teacher, isAbsent: boolean, slotId: string, coveredGuards: Guard[] = []) => {
        if (teacherTooltipTimerRef.current) {
            clearTimeout(teacherTooltipTimerRef.current);
        }
        setActiveTeacherTooltip({ teacher, isAbsent, coveredGuards, slotId });
        teacherTooltipTimerRef.current = setTimeout(() => {
            setActiveTeacherTooltip(null);
        }, 3000);
    };

    useEffect(() => {
        return () => {
            if (teacherTooltipTimerRef.current) {
                clearTimeout(teacherTooltipTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        setSelectedDate(null);
        setSelectedSlotId(null);
    }, [filter]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const currentDay = useMemo(() => {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return days[currentTime.getDay()];
    }, [currentTime]);

    const currentTimeStr = useMemo(() => {
        return currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }, [currentTime]);

    const todayDateStr = useMemo(() => {
        return currentTime.toLocaleDateString('en-CA');
    }, [currentTime]);

    const currentSlot = useMemo(() => {
        return meta.slots.find(slot => {
            if (!slot.start_time || !slot.end_time) return false;
            const start = slot.start_time.slice(0, 5);
            const end = slot.end_time.slice(0, 5);
            return currentTimeStr >= start && currentTimeStr <= end;
        });
    }, [meta.slots, currentTimeStr]);

    const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const carouselItems = useMemo(() => {
        const items: {
            slot: typeof meta.slots[0];
            day: string;
            date: string;
            isCurrent: boolean;
            labelSuffix: string | undefined;
        }[] = [];

        // 1. Generate items for all slots of TODAY
        const sortedSlots = [...meta.slots].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
        const todayIdx = currentTime.getDay();
        const todayName = DAYS_ES[todayIdx];
        const isWeekend = todayIdx === 0 || todayIdx === 6;

        const activeSlot = meta.slots.find(slot => {
            if (!slot.start_time || !slot.end_time) return false;
            const start = slot.start_time.slice(0, 5);
            const end = slot.end_time.slice(0, 5);
            return currentTimeStr >= start && currentTimeStr <= end;
        });

        sortedSlots.forEach(slot => {
            const isCurrent = !isWeekend && activeSlot ? slot.id === activeSlot.id : false;
            items.push({
                slot,
                day: todayName,
                date: todayDateStr,
                isCurrent,
                labelSuffix: undefined
            });
        });

        // 2. Identify future slots (date > todayDateStr) with active/pending guards
        const futureItems: typeof items = [];
        guards.forEach(g => {
            if (!g.date || !g.time_slot_id) return;
            if (g.date <= todayDateStr) return; // Exclude today and previous days
            if (g.status === GuardStatus.COMPLETED) return; // Exclude completed guards

            // Avoid duplicate combinations of (g.date, g.time_slot_id)
            const exists = futureItems.some(item => item.date === g.date && item.slot.id === g.time_slot_id);
            if (!exists) {
                const slot = meta.slots.find(s => s.id === g.time_slot_id);
                if (slot) {
                    const dateParts = g.date.split('-');
                    let dayName = '';
                    if (dateParts.length === 3) {
                        const dateObj = new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10));
                        dayName = DAYS_ES[dateObj.getDay()];
                    }
                    futureItems.push({
                        slot,
                        day: dayName,
                        date: g.date,
                        isCurrent: false,
                        labelSuffix: undefined
                    });
                }
            }
        });

        // Sort future items chronologically: date first, then slot start_time
        futureItems.sort((a, b) => {
            if (a.date !== b.date) {
                return a.date.localeCompare(b.date);
            }
            const startA = a.slot.start_time || '';
            const startB = b.slot.start_time || '';
            return startA.localeCompare(startB);
        });

        // 3. Combine today items and sorted future items
        return [...items, ...futureItems];
    }, [guards, meta.slots, todayDateStr, currentTime, currentTimeStr]);

    const [carouselStartIndex, setCarouselStartIndex] = useState(0);
    const hasInitializedCarousel = useRef(false);

    const defaultCarouselStart = useMemo(() => {
        const activeIdx = carouselItems.findIndex(item => item.isCurrent);
        if (activeIdx !== -1) {
            return Math.max(0, Math.min(activeIdx - 1, carouselItems.length - 3));
        }

        // Si no hay franja activa, comprobamos si ya ha terminado la jornada escolar
        if (meta.slots.length > 0) {
            const sortedSlots = [...meta.slots].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
            const lastSlot = sortedSlots[sortedSlots.length - 1];
            if (lastSlot && lastSlot.end_time) {
                const endTimeStr = lastSlot.end_time.slice(0, 5);
                if (currentTimeStr > endTimeStr) {
                    // Si ya ha pasado la última hora, enfocamos la última franja de hoy
                    const lastSlotIdx = carouselItems.findIndex(item => item.date === todayDateStr && item.slot.id === lastSlot.id);
                    if (lastSlotIdx !== -1) {
                        return Math.max(0, Math.min(lastSlotIdx, carouselItems.length - 3));
                    }
                }
            }
        }

        return 0;
    }, [carouselItems, meta.slots, currentTimeStr, todayDateStr]);

    // Inicialización del carrusel en la franja actual
    useEffect(() => {
        if (carouselItems.length > 0 && !hasInitializedCarousel.current) {
            setCarouselStartIndex(defaultCarouselStart);
            hasInitializedCarousel.current = true;
        }
    }, [carouselItems.length, defaultCarouselStart]);

    // Retorno automático a la vista principal y reseteo de scroll tras 10s de inactividad
    useEffect(() => {
        if (carouselItems.length === 0) return;

        let timer: any;

        const resetToDefaultView = () => {
            setCarouselStartIndex(defaultCarouselStart);
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            document.body.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            const scrollContainers = document.querySelectorAll('.custom-touch-scroll, main, #root, .layout-content');
            scrollContainers.forEach(el => {
                el.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            });
        };

        const resetInactivityTimer = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(resetToDefaultView, 10000);
        };

        // Iniciar temporizador
        resetInactivityTimer();

        // Detectar cualquier interacción del usuario (táctil, ratón, scroll, teclado)
        const events = ['touchstart', 'touchmove', 'scroll', 'mousedown', 'mousemove', 'keydown', 'click'];
        events.forEach(evt => window.addEventListener(evt, resetInactivityTimer, { passive: true }));

        return () => {
            if (timer) clearTimeout(timer);
            events.forEach(evt => window.removeEventListener(evt, resetInactivityTimer));
        };
    }, [carouselItems.length, defaultCarouselStart]);

    const activeStartIndex = Math.max(0, Math.min(carouselStartIndex, Math.max(0, carouselItems.length - 3)));
    const visibleItems = useMemo(() => {
        return carouselItems.slice(activeStartIndex, activeStartIndex + 3);
    }, [carouselItems, activeStartIndex]);

    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);
    const touchEndY = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
        touchStartY.current = e.targetTouches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
        touchEndY.current = e.targetTouches[0].clientY;
    };

    const handleTouchEnd = () => {
        if (touchStartX.current === null || touchEndX.current === null ||
            touchStartY.current === null || touchEndY.current === null) return;
        const diffX = touchStartX.current - touchEndX.current;
        const diffY = touchStartY.current - touchEndY.current;
        const swipeThreshold = 50; // pixels

        // Solo cambiar de franja si el gesto horizontal es dominante sobre el vertical
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
            if (diffX > 0) {
                // Swiped left -> avanzar franja
                setCarouselStartIndex(prev => Math.min(carouselItems.length - 3, prev + 1));
            } else {
                // Swiped right -> retroceder franja
                setCarouselStartIndex(prev => Math.max(0, prev - 1));
            }
        }
        // Reset
        touchStartX.current = null;
        touchStartY.current = null;
        touchEndX.current = null;
        touchEndY.current = null;
    };

    const sortScore = (s: GuardStatus) =>
        s === GuardStatus.AVAILABLE ? 1 : s === GuardStatus.ASSIGNED ? 2 : 3;

    const dateCounts = useMemo(() => {
        const countsMap: Record<string, number> = {};
        guards.forEach(g => {
            if (g.type === GuardType.RECREO || g.subject_id === 'M_GUARDIA') return;
            
            if (filter === 'today') {
                if (g.status === GuardStatus.COMPLETED) return;
                if (g.date < todayDateStr) return;
                if (g.date === todayDateStr && isGuardPassed(g, currentTime)) return;
            } else if (filter === 'available') {
                if (g.status !== GuardStatus.AVAILABLE) return;
                if (g.date < todayDateStr) return;
                if (g.date === todayDateStr && isGuardPassed(g, currentTime)) return;
            } else if (filter === 'history') {
                const isCompleted = g.status === GuardStatus.COMPLETED || 
                                    (g.status === GuardStatus.ASSIGNED && (g.date < todayDateStr || (g.date === todayDateStr && isGuardPassed(g, currentTime)))) ||
                                    (g.status === GuardStatus.AVAILABLE && (g.date < todayDateStr || (g.date === todayDateStr && isGuardPassed(g, currentTime))));
                if (!isCompleted) return;
            } else if (filter === 'mine') {
                if (!currentUser) return;
                const isMine = g.covering_teacher_id === currentUser.id || g.requesting_teacher_id === currentUser.id;
                if (!isMine) return;
            }

            if (onlyCompatible) {
                if (!currentUser) return;
                const [y, m, d] = g.date.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);
                const dayName = DAYS_ES_GLOBAL[dateObj.getDay()];
                const isCompatible = guardGroupSchedules.some(
                    gs => gs.profesor_id === currentUser.id && 
                          gs.dia_semana === dayName && 
                          gs.franja_id === g.time_slot_id
                );
                if (!isCompatible) return;
            }
            
            countsMap[g.date] = (countsMap[g.date] || 0) + 1;
        });
        return countsMap;
    }, [guards, filter, todayDateStr, currentUser, onlyCompatible, guardGroupSchedules, currentTime]);

    const availableDates = useMemo(() => {
        const dates = Object.keys(dateCounts);
        dates.sort((a, b) => {
            if (filter === 'history') {
                return b.localeCompare(a);
            }
            return a.localeCompare(b);
        });
        return dates;
    }, [dateCounts, filter]);

    const availableSlots = useMemo(() => {
        const uniqueSlotIds = new Set<string>();
        guards.forEach(g => {
            if (g.type === GuardType.RECREO || g.subject_id === 'M_GUARDIA') return;
            
            if (filter === 'today') {
                if (g.status === GuardStatus.COMPLETED) return;
                if (g.date < todayDateStr) return;
                if (g.date === todayDateStr && isGuardPassed(g, currentTime)) return;
            } else if (filter === 'available') {
                if (g.status !== GuardStatus.AVAILABLE) return;
                if (g.date < todayDateStr) return;
                if (g.date === todayDateStr && isGuardPassed(g, currentTime)) return;
            } else if (filter === 'history') {
                const isCompleted = g.status === GuardStatus.COMPLETED || 
                                    (g.status === GuardStatus.ASSIGNED && (g.date < todayDateStr || (g.date === todayDateStr && isGuardPassed(g, currentTime)))) ||
                                    (g.status === GuardStatus.AVAILABLE && (g.date < todayDateStr || (g.date === todayDateStr && isGuardPassed(g, currentTime))));
                if (!isCompleted) return;
            } else if (filter === 'mine') {
                if (!currentUser) return;
                const isMine = g.covering_teacher_id === currentUser.id || g.requesting_teacher_id === currentUser.id;
                if (!isMine) return;
            }

            if (onlyCompatible) {
                if (!currentUser) return;
                const [y, m, d] = g.date.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);
                const dayName = DAYS_ES_GLOBAL[dateObj.getDay()];
                const isCompatible = guardGroupSchedules.some(
                    gs => gs.profesor_id === currentUser.id && 
                          gs.dia_semana === dayName && 
                          gs.franja_id === g.time_slot_id
                );
                if (!isCompatible) return;
            }

            if (selectedDate && g.date !== selectedDate) return;

            uniqueSlotIds.add(g.time_slot_id);
        });

        return meta.slots
            .filter(slot => uniqueSlotIds.has(slot.id))
            .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
    }, [guards, filter, todayDateStr, currentUser, onlyCompatible, selectedDate, guardGroupSchedules, meta.slots, currentTime]);

    const filteredGuards = useMemo(() => {
        const sorted = [...guards]
            .filter((g) => {
                if (g.type === GuardType.RECREO) return false;
                if (g.subject_id === 'M_GUARDIA') return false;
                if (filter === 'today') {
                    if (g.status === GuardStatus.COMPLETED) return false;
                    if (g.date < todayDateStr) return false;
                    if (g.date === todayDateStr && isGuardPassed(g, currentTime)) return false;
                    return true;
                }
                if (filter === 'available') {
                    if (g.status !== GuardStatus.AVAILABLE) return false;
                    if (g.date < todayDateStr) return false;
                    if (g.date === todayDateStr && isGuardPassed(g, currentTime)) return false;
                    return true;
                }
                if (filter === 'history') {
                    const isCompleted = g.status === GuardStatus.COMPLETED || 
                                        (g.status === GuardStatus.ASSIGNED && (g.date < todayDateStr || (g.date === todayDateStr && isGuardPassed(g, currentTime)))) ||
                                        (g.status === GuardStatus.AVAILABLE && (g.date < todayDateStr || (g.date === todayDateStr && isGuardPassed(g, currentTime))));
                    return isCompleted;
                }
                if (filter === 'mine') {
                    if (!currentUser) return false;
                    const isMine = g.covering_teacher_id === currentUser.id || g.requesting_teacher_id === currentUser.id;
                    if (!isMine) return false;
                    return true;
                }
                return true;
            })
            .filter((g) => {
                if (selectedDate && g.date !== selectedDate) return false;
                if (selectedSlotId && g.time_slot_id !== selectedSlotId) return false;
                if (onlyCompatible) {
                    if (!currentUser) return false;
                    const [y, m, d] = g.date.split('-').map(Number);
                    const dateObj = new Date(y, m - 1, d);
                    const dayName = DAYS_ES_GLOBAL[dateObj.getDay()];
                    const isCompatible = guardGroupSchedules.some(
                        gs => gs.profesor_id === currentUser.id && 
                              gs.dia_semana === dayName && 
                              gs.franja_id === g.time_slot_id
                    );
                    if (!isCompatible) return false;
                }
                return true;
            })
            .filter((g) => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return (
                    g.id.toLowerCase().includes(q) ||
                    g.subject?.name?.toLowerCase().includes(q) ||
                    g.group?.name?.toLowerCase().includes(q) ||
                    g.requesting_teacher?.name?.toLowerCase().includes(q) ||
                    g.classroom?.name?.toLowerCase().includes(q) ||
                    g.date.includes(q)
                );
            });

        return sorted.sort((a, b) => {
            const statusDiff = sortScore(a.status) - sortScore(b.status);
            if (statusDiff !== 0) return statusDiff;

            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();

            if (dateA !== dateB) {
                if (filter === 'today' || filter === 'available') {
                    return dateA - dateB;
                }
                return dateB - dateA;
            }

            const timeA = a.time_slot?.start_time || '';
            const timeB = b.time_slot?.start_time || '';
            return timeA.localeCompare(timeB);
        });
    }, [guards, filter, searchQuery, currentUser, selectedDate, selectedSlotId, onlyCompatible, guardGroupSchedules, meta.slots, currentTime]);

    const counts = useMemo(() => {
        return {
            today: guards.filter(g => {
                if (g.subject_id === 'M_GUARDIA') return false;
                if (g.type === GuardType.RECREO) return false;
                if (g.status === GuardStatus.COMPLETED) return false;
                if (g.date < todayDateStr) return false;
                if (g.date === todayDateStr && isGuardPassed(g, currentTime)) return false;
                return true;
            }).length,
            available: guards.filter(g => {
                if (g.subject_id === 'M_GUARDIA') return false;
                if (g.type === GuardType.RECREO) return false;
                if (g.status !== GuardStatus.AVAILABLE) return false;
                if (g.date < todayDateStr) return false;
                if (g.date === todayDateStr && isGuardPassed(g, currentTime)) return false;
                return true;
            }).length,
            history: guards.filter(g => {
                if (g.subject_id === 'M_GUARDIA') return false;
                if (g.type === GuardType.RECREO) return false;
                if (g.type === GuardType.COEXISTENCE) return false;
                const isCompleted = g.status === GuardStatus.COMPLETED || 
                                    (g.status === GuardStatus.ASSIGNED && (g.date < todayDateStr || (g.date === todayDateStr && isGuardPassed(g, currentTime)))) ||
                                    (g.status === GuardStatus.AVAILABLE && (g.date < todayDateStr || (g.date === todayDateStr && isGuardPassed(g, currentTime))));
                return isCompleted;
            }).length,
            mine: guards.filter(g => {
                if (g.subject_id === 'M_GUARDIA') return false;
                if (g.type === GuardType.RECREO || !currentUser) return false;
                const isMine = g.covering_teacher_id === currentUser.id || g.requesting_teacher_id === currentUser.id;
                if (!isMine) return false;
                if (g.type === GuardType.COEXISTENCE && g.date < todayDateStr) return false;
                return true;
            }).length
        };
    }, [guards, todayDateStr, currentUser, currentTime]);

    const filters = [
        { key: 'today', label: 'Próximas', count: counts.today },
        { key: 'available', label: 'Pendientes', count: counts.available },
        { key: 'history', label: 'Historial', count: counts.history },
        ...(!isAdministracionRole(currentUser?.role) ? [{ key: 'mine', label: 'Mis Guardias', count: counts.mine }] : []),
    ];

    if (loading) {
        return (
            <div style={{
                height: 400, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)',
            }}>
                <Loader2 style={{ width: 48, height: 48, animation: 'spin 1s linear infinite', color: 'var(--brand-500)' }} />
                <p style={{ marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
                    CARGANDO DATOS...
                </p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: isPantallaRole(currentUser?.role) ? 0 : 20,
            height: isPantallaRole(currentUser?.role) ? '100%' : 'auto',
            minHeight: 0,
            width: '100%',
        }}>
            {/* DYNAMIC TIMELINE PANEL */}
            {/* DYNAMIC TIMELINE PANEL */}
            {carouselItems.length > 0 && (
                <div className={isPantallaRole(currentUser?.role) ? "" : "card glass"} style={{ 
                    borderLeft: isPantallaRole(currentUser?.role) ? 'none' : '4px solid var(--brand-500)', 
                    padding: isPantallaRole(currentUser?.role) ? '16px 20px' : 24,
                    flex: isPantallaRole(currentUser?.role) ? 1 : 'none',
                    borderRadius: isPantallaRole(currentUser?.role) ? 0 : 'var(--radius-lg)',
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    background: isPantallaRole(currentUser?.role) ? 'transparent' : undefined,
                    border: isPantallaRole(currentUser?.role) ? 'none' : undefined,
                    boxShadow: isPantallaRole(currentUser?.role) ? 'none' : undefined,
                    height: isPantallaRole(currentUser?.role) ? '100%' : 'auto',
                    overflow: 'hidden',
                }}>
                    <div style={{ marginBottom: isPantallaRole(currentUser?.role) ? 14 : 20 }}>
                        <h2 style={{ 
                            fontSize: isPantallaRole(currentUser?.role) ? '1.5rem' : '1.2rem', 
                            fontWeight: 800, 
                            margin: 0, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 12, 
                            justifyContent: 'space-between' 
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Zap size={isPantallaRole(currentUser?.role) ? 24 : 20} className="text-glow-brand" style={{ color: 'var(--brand-500)' }} />
                                {currentSlot ? `Entorno de Guardias — ${currentDay}` : 'Entorno próximas guardias'}
                                <HelpBadge helpKey={isPantallaRole(currentUser?.role) ? "tv_instructions" : "assignment_modes"} size="sm" />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {/* LIVE + MANUAL REFRESH PILL */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: isPantallaRole(currentUser?.role) ? '6px 12px' : '5px 10px',
                                    background: 'rgba(6, 182, 212, 0.05)',
                                    borderRadius: 'var(--radius-full)',
                                    border: '1px solid rgba(6, 182, 212, 0.15)',
                                    backdropFilter: 'blur(4px)',
                                    height: isPantallaRole(currentUser?.role) ? 38 : 32,
                                    boxSizing: 'border-box'
                                }}>
                                    {/* Indicador En Vivo (Sólo icono por defecto, expande texto al pulsar o hover) */}
                                    <button
                                        type="button"
                                        onClick={() => setShowLiveInfo(prev => !prev)}
                                        onMouseEnter={() => setShowLiveInfo(true)}
                                        onMouseLeave={() => setShowLiveInfo(false)}
                                        title="Conexión en tiempo real activa"
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: '2px 4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            cursor: 'pointer',
                                            borderRadius: 'var(--radius-full)',
                                            color: 'var(--text-primary)',
                                            outline: 'none',
                                        }}
                                    >
                                        <span style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            backgroundColor: '#22c55e',
                                            boxShadow: '0 0 8px #22c55e',
                                            display: 'inline-block',
                                        }} />
                                        <AnimatePresence>
                                            {showLiveInfo && (
                                                <motion.span
                                                    initial={{ opacity: 0, width: 0 }}
                                                    animate={{ opacity: 1, width: 'auto' }}
                                                    exit={{ opacity: 0, width: 0 }}
                                                    transition={{ duration: 0.18 }}
                                                    style={{
                                                        fontSize: isPantallaRole(currentUser?.role) ? '0.8rem' : '0.75rem',
                                                        fontWeight: 700,
                                                        color: '#22c55e',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    En vivo
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </button>

                                    {/* Separador sutil */}
                                    <div style={{ width: 1, height: 14, backgroundColor: 'rgba(6, 182, 212, 0.2)' }} />

                                    {/* Botón Actualizar (Sólo icono por defecto, expande texto al pulsar o hover) */}
                                    <button
                                        type="button"
                                        onClick={handleManualRefresh}
                                        onMouseEnter={() => setShowRefreshInfo(true)}
                                        onMouseLeave={() => setShowRefreshInfo(false)}
                                        title="Actualizar datos ahora"
                                        disabled={isRefreshing}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: '2px 4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            cursor: isRefreshing ? 'wait' : 'pointer',
                                            borderRadius: 'var(--radius-full)',
                                            color: isRefreshing ? 'var(--brand-400)' : 'var(--text-muted)',
                                            outline: 'none',
                                        }}
                                    >
                                        <RotateCw 
                                            size={isPantallaRole(currentUser?.role) ? 15 : 13} 
                                            style={{
                                                color: isRefreshing ? 'var(--brand-400)' : 'var(--text-muted)',
                                                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                                                transition: 'color 0.2s',
                                            }}
                                        />
                                        <AnimatePresence>
                                            {(showRefreshInfo || isRefreshing) && (
                                                <motion.span
                                                    initial={{ opacity: 0, width: 0 }}
                                                    animate={{ opacity: 1, width: 'auto' }}
                                                    exit={{ opacity: 0, width: 0 }}
                                                    transition={{ duration: 0.18 }}
                                                    style={{
                                                        fontSize: isPantallaRole(currentUser?.role) ? '0.8rem' : '0.75rem',
                                                        fontWeight: 700,
                                                        color: isRefreshing ? 'var(--brand-400)' : 'var(--text-secondary)',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    {isRefreshing ? 'Actualizando...' : 'Actualizar'}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </button>
                                </div>

                                {/* DYNAMIC DIGITAL CLOCK */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: isPantallaRole(currentUser?.role) ? '8px 16px' : '6px 14px',
                                    background: 'rgba(6, 182, 212, 0.05)',
                                    borderRadius: 'var(--radius-full)',
                                    border: '1px solid rgba(6, 182, 212, 0.15)',
                                    backdropFilter: 'blur(4px)',
                                    height: isPantallaRole(currentUser?.role) ? 38 : 32,
                                    boxSizing: 'border-box'
                                }}>
                                    <Clock size={isPantallaRole(currentUser?.role) ? 16 : 14} style={{ color: 'var(--brand-400)' }} />
                                    <span style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: isPantallaRole(currentUser?.role) ? '1.1rem' : '0.95rem',
                                        fontWeight: 700,
                                        color: 'var(--text-primary)',
                                        letterSpacing: '0.05em',
                                        minWidth: isPantallaRole(currentUser?.role) ? '100px' : '85px',
                                        textAlign: 'center',
                                        textShadow: '0 0 10px rgba(6, 182, 212, 0.3)'
                                    }}>
                                        {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        </h2>
                    </div>

                    <div style={{ 
                        position: 'relative', 
                        width: '100%', 
                        display: isPantallaRole(currentUser?.role) ? 'flex' : 'block',
                        flexDirection: 'column',
                        flex: isPantallaRole(currentUser?.role) ? 1 : 'none',
                        minHeight: 0,
                        padding: carouselItems.length > 3 ? '0 32px' : '0'
                    }}>
                        {/* Left Chevron Button */}
                        {carouselItems.length > 3 && activeStartIndex > 0 && (
                            <button
                                onClick={() => setCarouselStartIndex(prev => Math.max(0, prev - 1))}
                                style={{
                                    position: 'absolute',
                                    left: '2px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    zIndex: 10,
                                    width: 26,
                                    height: 64,
                                    borderRadius: 'var(--radius-full)',
                                    background: 'rgba(15, 23, 42, 0.85)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(6, 182, 212, 0.4)',
                                    color: 'var(--brand-400)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 12px rgba(6, 182, 212, 0.25)',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(6, 182, 212, 0.25)';
                                    e.currentTarget.style.borderColor = 'var(--brand-400)';
                                    e.currentTarget.style.color = '#fff';
                                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                                    e.currentTarget.style.boxShadow = '0 6px 24px rgba(6, 182, 212, 0.45)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.85)';
                                    e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)';
                                    e.currentTarget.style.color = 'var(--brand-400)';
                                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 12px rgba(6, 182, 212, 0.25)';
                                }}
                            >
                                <ChevronLeft size={18} />
                            </button>
                        )}

                        <div 
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${Math.min(visibleItems.length, 3)}, 1fr)`,
                                gap: isPantallaRole(currentUser?.role) ? 20 : 16,
                                flex: isPantallaRole(currentUser?.role) ? 1 : 'none',
                                minHeight: 0,
                                width: '100%',
                            }}
                        >
                            {visibleItems.map((item, idx) => {
                                const { slot, day, date, isCurrent, labelSuffix } = item;
                                const slotGuards = guards.filter(g => 
                                    g.date === date && 
                                    g.time_slot_id === slot.id &&
                                    g.subject_id !== 'M_GUARDIA'
                                );
                                const slotSchedules = guardGroupSchedules.filter(s => s.dia_semana === day && s.franja_id === slot.id);
                                const isTV = isPantallaRole(currentUser?.role);
                                const isRecreoSlot = slot.label?.toLowerCase().includes('recreo') ||
                                                    slot.label?.toLowerCase().includes('descanso');
                                const slotMode = assignmentModes[slot.id] || 'recommended';

                                // Lógica de Aviso Jefatura (Warning system)
                                const totalCreatedExcludingCoexistence = guards.filter(g => 
                                    g.date === date && 
                                    g.time_slot_id === slot.id && 
                                    g.type !== GuardType.COEXISTENCE &&
                                    g.type !== GuardType.RECREO &&
                                    g.status !== GuardStatus.COMPLETED &&
                                    g.subject_id !== 'M_GUARDIA'
                                ).length;
                                const numTeachersInPool = slotSchedules.length;
                                const showRiskWarning = totalCreatedExcludingCoexistence > numTeachersInPool;

                                return (
                                    <motion.div 
                                        key={`${date}-${slot.id}`}
                                        layout
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                        style={{
                                            padding: isPantallaRole(currentUser?.role) ? 16 : 16,
                                            background: isRecreoSlot 
                                                ? (isCurrent ? 'rgba(251, 191, 36, 0.12)' : 'rgba(251, 191, 36, 0.04)')
                                                : (isCurrent ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-card)'),
                                            borderRadius: 'var(--radius-md)',
                                            border: isRecreoSlot
                                                ? (isCurrent ? '2px solid #fbbf24' : '1px solid rgba(251, 191, 36, 0.35)')
                                                : (isCurrent ? '2px solid var(--brand-500)' : '1px solid var(--border-subtle)'),
                                            minWidth: 260,
                                            height: isPantallaRole(currentUser?.role) ? '100%' : 'auto',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            overflow: 'hidden',
                                            position: 'relative',
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    {isRecreoSlot ? (
                                                        <Coffee size={isPantallaRole(currentUser?.role) ? 18 : 14} style={{ color: isCurrent ? '#fde047' : '#fbbf24', flexShrink: 0 }} />
                                                    ) : (
                                                        <Clock size={isPantallaRole(currentUser?.role) ? 18 : 14} style={{ color: isCurrent ? 'var(--brand-400)' : 'var(--text-muted)', flexShrink: 0 }} />
                                                    )}
                                                    <span style={{
                                                        fontSize: isPantallaRole(currentUser?.role) ? '1.1rem' : '0.8rem',
                                                        fontWeight: 800,
                                                        color: isRecreoSlot
                                                            ? (isCurrent ? '#fde047' : '#fbbf24')
                                                            : (isCurrent ? 'var(--brand-400)' : 'var(--text-secondary)')
                                                    }}>
                                                        {slot.label} {isCurrent && '(AHORA)'}
                                                    </span>
                                                    {isRecreoSlot && (
                                                        <span style={{
                                                            background: 'rgba(251, 191, 36, 0.2)',
                                                            color: '#fef08a',
                                                            border: '1px solid rgba(251, 191, 36, 0.45)',
                                                            borderRadius: 6,
                                                            padding: '1px 6px',
                                                            fontSize: isPantallaRole(currentUser?.role) ? '0.72rem' : '0.62rem',
                                                            fontWeight: 800,
                                                            letterSpacing: '0.04em',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            Recreo
                                                        </span>
                                                    )}
                                                </div>
                                                {showRiskWarning && (
                                                    <motion.div 
                                                        title="¡CRÍTICO! Falta de cobertura (Aviso a Jefatura)"
                                                        initial={{ scale: 0.8 }}
                                                        animate={{ scale: [1, 1.2, 1] }}
                                                        transition={{ duration: 0.8, repeat: Infinity }}
                                                        style={{ 
                                                            background: 'rgba(239, 68, 68, 0.2)',
                                                            padding: '4px 8px',
                                                            borderRadius: 8,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                            border: '1px solid rgba(239, 68, 68, 0.5)',
                                                            cursor: 'help'
                                                        }}
                                                    >
                                                        <AlertTriangle size={14} color="#ef4444" />
                                                        <span className="blink-warning text-[8px] font-black text-[#ef4444] tracking-tighter">AVISO JEFATURA</span>
                                                    </motion.div>
                                                )}
                                                {labelSuffix && <span style={{ fontSize: '0.6rem', opacity: 0.6, fontStyle: 'normal', fontWeight: 700 }}>{labelSuffix}</span>}
                                            </div>

                                            <div style={{ 
                                                fontSize: isPantallaRole(currentUser?.role) ? '0.85rem' : '0.65rem', 
                                                color: isRecreoSlot ? '#fbbf24' : 'var(--brand-500)', 
                                                fontWeight: 700, 
                                                marginBottom: 10, 
                                                opacity: isRecreoSlot ? 0.95 : 0.8,
                                                flexShrink: 0
                                            }}>
                                                {day}, {new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                            </div>

                                            {/* Ausencias en esta franja */}
                                            <div style={{ 
                                                display: 'flex',
                                                flexDirection: 'column',
                                                flex: 1,
                                                minHeight: 0,
                                                overflow: 'hidden'
                                            }}>
                                                <p style={{ 
                                                    fontSize: isPantallaRole(currentUser?.role) ? '0.75rem' : '0.65rem', 
                                                    fontWeight: 700, 
                                                    textTransform: 'uppercase', 
                                                    color: 'var(--text-muted)', 
                                                    marginBottom: 8,
                                                    flexShrink: 0
                                                }}>
                                                    Ausencias
                                                </p>
                                                <div 
                                                    className="custom-touch-scroll"
                                                    style={{ 
                                                        display: 'flex', 
                                                        flexDirection: 'column', 
                                                        gap: 6,
                                                        flex: 1,
                                                        overflowY: 'auto',
                                                        WebkitOverflowScrolling: 'touch',
                                                        touchAction: 'pan-y',
                                                        minHeight: 0,
                                                        paddingRight: isPantallaRole(currentUser?.role) ? 4 : 0
                                                    }}
                                                >
                                                    {slotGuards.length === 0 ? (
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin ausencias</span>
                                                    ) : slotGuards.map(g => (
                                                        <div key={g.id} style={{ 
                                                            padding: isPantallaRole(currentUser?.role) ? 12 : 8, 
                                                            background: 'var(--bg-main)', 
                                                            borderRadius: 6, 
                                                            border: g.type === GuardType.COEXISTENCE ? '1px solid var(--brand-500)' : '1px solid var(--border-subtle)' 
                                                        }}>
                                                            <div style={{ fontSize: isPantallaRole(currentUser?.role) ? '1.1rem' : '0.8rem', fontWeight: 600 }}>{g.requesting_teacher?.name || 'Varios'}</div>
                                                            <div style={{ fontSize: isPantallaRole(currentUser?.role) ? '0.9rem' : '0.7rem', color: 'var(--text-secondary)' }}>
                                                                {g.type === GuardType.COEXISTENCE ? (g.subject?.name || 'Convivencia') : `${g.subject?.name || ''}${g.group?.name ? ` - ${g.group.name}` : ''}`}
                                                            </div>
                                                            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    {(() => {
                                                                        const isAdmin = isAdminRole(currentUser?.role) || isJefaturaRole(currentUser?.role);
                                                                        const isSelectable = (g.status === GuardStatus.AVAILABLE && currentUser && !isAdministracionRole(currentUser?.role)) || isAdmin;
                                                                        const badgeText = g.status === GuardStatus.AVAILABLE 
                                                                             ? 'PEND' 
                                                                             : g.status === GuardStatus.COMPLETED && !g.covering_teacher
                                                                             ? 'HECHO'
                                                                             : (g.covering_teacher?.name?.split(' ')[0] || 'ASIG');
                                                                        
                                                                        if (isSelectable) {
                                                                            return (
                                                                                <motion.span 
                                                                                    whileHover={{ scale: 1.1, filter: 'brightness(1.2)' }}
                                                                                    whileTap={{ scale: 0.95 }}
                                                                                    onClick={(e) => { e.stopPropagation(); onPickup(g.id); }}
                                                                                    onTouchStart={(e) => e.stopPropagation()}
                                                                                    onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onPickup(g.id); }}
                                                                                    title={isAdmin ? "Hacer clic para asignar o cambiar profesor de guardia" : "Hacer clic para recoger esta guardia"}
                                                                                    className={`badge ${getStatusBadgeClass(g.status)}`} 
                                                                                    style={{ 
                                                                                        fontSize: '0.55rem', 
                                                                                        padding: '1px 6px',
                                                                                        cursor: 'pointer',
                                                                                        userSelect: 'none',
                                                                                        boxShadow: '0 0 12px rgba(6, 182, 212, 0.4)',
                                                                                        borderColor: 'var(--brand-400)',
                                                                                    }}
                                                                                >
                                                                                    {badgeText}
                                                                                </motion.span>
                                                                            );
                                                                        }
                                                                        
                                                                        const isAssigned = g.status === GuardStatus.ASSIGNED;
                                                                        const showReleaseBubble = isPantallaRole(currentUser?.role) && isAssigned;

                                                                        return (
                                                                            <span 
                                                                                className={`badge ${getStatusBadgeClass(g.status)}`} 
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                onTouchStart={(e) => e.stopPropagation()}
                                                                                onTouchEnd={(e) => e.stopPropagation()}
                                                                                style={{ 
                                                                                    fontSize: '0.55rem', 
                                                                                    padding: '1px 6px',
                                                                                    position: 'relative',
                                                                                    overflow: 'visible',
                                                                                }}
                                                                            >
                                                                                {badgeText}
                                                                                {showReleaseBubble && (
                                                                                    <div
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            onRelease(g.id);
                                                                                        }}
                                                                                        onTouchStart={(e) => e.stopPropagation()}
                                                                                        onTouchEnd={(e) => {
                                                                                            e.stopPropagation();
                                                                                            e.preventDefault();
                                                                                            onRelease(g.id);
                                                                                        }}
                                                                                        style={{
                                                                                            position: 'absolute',
                                                                                            top: -6,
                                                                                            right: -6,
                                                                                            width: 14,
                                                                                            height: 14,
                                                                                            borderRadius: '50%',
                                                                                            background: '#ef4444',
                                                                                            border: '1.5px solid var(--bg-card)',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            justifyContent: 'center',
                                                                                            cursor: 'pointer',
                                                                                            color: '#ffffff',
                                                                                            boxShadow: '0 1px 5px rgba(239, 68, 68, 0.5)',
                                                                                            zIndex: 10,
                                                                                            padding: 0,
                                                                                            boxSizing: 'border-box',
                                                                                        }}
                                                                                        title="Soltar esta guardia"
                                                                                    >
                                                                                        <X size={8} strokeWidth={3} />
                                                                                    </div>
                                                                                )}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                    {g.classroom && (
                                                                        <div 
                                                                            onClick={(e) => { e.stopPropagation(); setMapRoomId(g.classroom?.id || null); }}
                                                                            onTouchStart={(e) => e.stopPropagation()}
                                                                            onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setMapRoomId(g.classroom?.id || null); }}
                                                                            style={{ 
                                                                                fontSize: isPantallaRole(currentUser?.role) ? '0.85rem' : '0.7rem', 
                                                                                color: 'var(--brand-400)',
                                                                                cursor: 'pointer',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: 4,
                                                                                fontWeight: 700,
                                                                                width: 'fit-content'
                                                                            }}
                                                                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--brand-300)'; e.currentTarget.style.textDecoration = 'underline'; }}
                                                                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--brand-400)'; e.currentTarget.style.textDecoration = 'none'; }}
                                                                        >
                                                                            <MapPin size={isPantallaRole(currentUser?.role) ? 14 : 12} />
                                                                            {g.classroom.name}
                                                                        </div>
                                                                    )}
                                                                    {(() => {
                                                                        const isCoexistence = g.type === GuardType.COEXISTENCE || 
                                                                                              g.subject_id === 'M_CONVIVENCIA' || 
                                                                                              g.subject?.name?.toLowerCase().includes('convivencia') || 
                                                                                              g.classroom?.name?.toLowerCase().includes('convivencia');
                                                                        if (isCoexistence) return null;

                                                                        const hasNotes = Boolean(g.observations && g.observations.trim().length > 0);
                                                                        const taskType = getGuardTaskType(g);
                                                                        const hasTask = taskType !== 'none';
                                                                        if (!hasNotes && !hasTask) return null;

                                                                        const isTV = isPantallaRole(currentUser?.role);
                                                                        const size = isTV ? 20 : 16;
                                                                        const iconSize = isTV ? 11 : 9;

                                                                        let badgeColor = '#f97316';
                                                                        let badgeBg = 'rgba(249, 115, 22, 0.15)';
                                                                        let badgeBorder = '#f97316';
                                                                        let badgeShadow = '0 0 6px rgba(249, 115, 22, 0.4)';
                                                                        let badgeTitle = 'Tarea en bandeja física';
                                                                        let IconComponent = Inbox;

                                                                        if (taskType === 'both') {
                                                                            badgeColor = '#a855f7';
                                                                            badgeBg = 'rgba(168, 85, 247, 0.15)';
                                                                            badgeBorder = '#a855f7';
                                                                            badgeShadow = '0 0 6px rgba(168, 85, 247, 0.4)';
                                                                            badgeTitle = 'Tarea en bandeja física y archivo adjunto';
                                                                            IconComponent = Layers;
                                                                        } else if (taskType === 'file') {
                                                                            badgeColor = '#06b6d4';
                                                                            badgeBg = 'rgba(6, 182, 212, 0.15)';
                                                                            badgeBorder = '#06b6d4';
                                                                            badgeShadow = '0 0 6px rgba(6, 182, 212, 0.4)';
                                                                            badgeTitle = 'Tarea en archivo digital';
                                                                            IconComponent = Paperclip;
                                                                        } else if (taskType === 'tray') {
                                                                            badgeColor = '#f97316';
                                                                            badgeBg = 'rgba(249, 115, 22, 0.15)';
                                                                            badgeBorder = '#f97316';
                                                                            badgeShadow = '0 0 6px rgba(249, 115, 22, 0.4)';
                                                                            badgeTitle = 'Tarea en bandeja física';
                                                                            IconComponent = Inbox;
                                                                        } else if (hasNotes) {
                                                                            badgeColor = '#10b981';
                                                                            badgeBg = 'rgba(16, 185, 129, 0.15)';
                                                                            badgeBorder = '#10b981';
                                                                            badgeShadow = '0 0 6px rgba(16, 185, 129, 0.4)';
                                                                            badgeTitle = 'Observaciones del docente';
                                                                            IconComponent = MessageSquare;
                                                                        }

                                                                        return (
                                                                            <motion.button 
                                                                                type="button"
                                                                                whileHover={{ scale: 1.2, filter: 'brightness(1.25)' }}
                                                                                whileTap={{ scale: 0.9 }}
                                                                                onClick={(e) => { 
                                                                                    e.stopPropagation(); 
                                                                                    setSelectedObservationGuard(g); 
                                                                                }}
                                                                                onTouchStart={(e) => e.stopPropagation()}
                                                                                onTouchEnd={(e) => { 
                                                                                    e.stopPropagation(); 
                                                                                    e.preventDefault(); 
                                                                                    setSelectedObservationGuard(g); 
                                                                                }}
                                                                                title={badgeTitle}
                                                                                style={{ 
                                                                                    display: 'inline-flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'center',
                                                                                    width: `${size}px`,
                                                                                    height: `${size}px`,
                                                                                    minWidth: `${size}px`,
                                                                                    minHeight: `${size}px`,
                                                                                    maxWidth: `${size}px`,
                                                                                    maxHeight: `${size}px`,
                                                                                    aspectRatio: '1 / 1',
                                                                                    borderRadius: '50%',
                                                                                    color: badgeColor,
                                                                                    background: badgeBg,
                                                                                    border: `1.5px solid ${badgeBorder}`,
                                                                                    boxShadow: badgeShadow,
                                                                                    cursor: 'pointer',
                                                                                    padding: 0,
                                                                                    margin: 0,
                                                                                    boxSizing: 'border-box',
                                                                                    flexShrink: 0,
                                                                                    lineHeight: 0
                                                                                }}
                                                                            >
                                                                                <IconComponent size={iconSize} strokeWidth={2.4} />
                                                                            </motion.button>
                                                                        );
                                                                    })()}
                                                                </div>
                                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                                    {g.covering_teacher_id === currentUser?.id && !isPantallaRole(currentUser?.role) && g.status === GuardStatus.ASSIGNED && (
                                                                        <button 
                                                                            onClick={() => onRelease(g.id)} 
                                                                            style={{ 
                                                                                background: 'rgba(239, 68, 68, 0.1)', 
                                                                                border: '1px solid rgba(239, 68, 68, 0.3)', 
                                                                                color: '#f87171', 
                                                                                fontSize: '0.6rem', 
                                                                                cursor: 'pointer', 
                                                                                fontWeight: 600,
                                                                                minHeight: 'unset',
                                                                                padding: '2px 6px',
                                                                                borderRadius: '4px',
                                                                                boxShadow: '0 0 10px rgba(239, 68, 68, 0.15)',
                                                                                transition: 'all 0.2s',
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
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
                                                                            SOLTAR
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Guardia disponible */}
                                        <div style={{ 
                                            marginTop: 'auto',
                                            paddingTop: isPantallaRole(currentUser?.role) ? 10 : 8,
                                            borderTop: '1px solid var(--border-subtle)',
                                            flexShrink: 0
                                        }}>
                                            <div style={{ 
                                                 display: 'flex', 
                                                 alignItems: 'center', 
                                                 gap: 10,
                                                 marginBottom: 10
                                             }}>
                                                 <span style={{ 
                                                     fontSize: isTV ? '0.95rem' : '0.75rem', 
                                                     fontWeight: 800, 
                                                     textTransform: 'uppercase', 
                                                     color: isRecreoSlot ? '#fbbf24' : 'var(--text-muted)'
                                                 }}>
                                                     {isRecreoSlot ? 'Prof. Recreo' : 'Prof. Guardia'}
                                                 </span>
                                                 {isTV && !isRecreoSlot && slotSchedules.length > 0 && (
                                                     <motion.div
                                                         whileHover={{ scale: 1.05 }}
                                                         whileTap={{ scale: 0.95 }}
                                                         onClick={(e) => {
                                                             e.stopPropagation();
                                                             const nextMode = slotMode === 'random' ? 'recommended' : 'random';
                                                             onChangeAssignmentMode(slot.id, nextMode);
                                                             toast.info(
                                                                 nextMode === 'random' 
                                                                     ? 'Asignación Aleatoria' 
                                                                     : 'Asignación Recomendada',
                                                                 { 
                                                                     id: `mode-${slot.id}`, 
                                                                     duration: 1500,
                                                                     position: 'bottom-center'
                                                                 }
                                                             );
                                                         }}
                                                         style={{
                                                             width: 26,
                                                             height: 26,
                                                             minWidth: 26,
                                                             minHeight: 26,
                                                             flexShrink: 0,
                                                             borderRadius: '50%',
                                                             display: 'flex',
                                                             alignItems: 'center',
                                                             justifyContent: 'center',
                                                             cursor: 'pointer',
                                                             border: '2px solid transparent',
                                                             backgroundImage: slotMode === 'recommended'
                                                                 ? 'linear-gradient(#0f172a, #0f172a), linear-gradient(45deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #a855f7)'
                                                                 : 'linear-gradient(#0f172a, #0f172a), linear-gradient(45deg, #06b6d4, #3b82f6)',
                                                             backgroundOrigin: 'border-box',
                                                             backgroundClip: 'content-box, border-box',
                                                             backgroundColor: '#0f172a',
                                                             boxShadow: slotMode === 'random'
                                                                 ? '0 0 8px rgba(6, 182, 212, 0.4)'
                                                                 : 'none',
                                                             padding: 0
                                                         }}
                                                     >
                                                         {slotMode === 'random' ? (
                                                             <Dices size={12} style={{ color: 'var(--brand-400)' }} />
                                                         ) : (
                                                             <div style={{
                                                                 width: 14,
                                                                 height: 14,
                                                                 display: 'flex',
                                                                 alignItems: 'center',
                                                                 justifyContent: 'center',
                                                                 overflow: 'hidden'
                                                             }}>
                                                                 <CrownLogo size={14} />
                                                             </div>
                                                         )}
                                                     </motion.div>
                                                 )}
                                             </div>
                                            <div style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'space-between',
                                                width: '100%',
                                                gap: 8,
                                                minWidth: 0
                                            }}>
                                                <ScrollableAvatars isTV={isPantallaRole(currentUser?.role)}>
                                                    {(() => {
                                                        const groupTeachers = slotSchedules.map(s => s.teacher).filter(t => t && !isPantallaRole(t.role)) as Teacher[];
                                                        const isRecreoSlot = slot.label?.toLowerCase().includes('recreo') ||
                                                                            slot.label?.toLowerCase().includes('descanso');
                                                        const slotMode = assignmentModes[slot.id] || 'recommended';
                                                        const shouldRank = !isRecreoSlot && slotMode === 'recommended';
                                                        const slotGuards = filterGuardsForSlot(guards, slot.id, date);
                                                        const ranked = shouldRank ? rankTeachers(groupTeachers, slotGuards) : null;

                                                        const hueMap = new Map<string, number>();
                                                        if (ranked) {
                                                            ranked.forEach(r => hueMap.set(r.teacher.id, r.hue));
                                                        }

                                                        const filteredSchedules = slotSchedules.filter(s => s.teacher && !isPantallaRole(s.teacher.role));
                                                        const sortedSchedules = ranked
                                                            ? [...filteredSchedules].sort((a, b) => {
                                                                const rankA = ranked.findIndex(r => r.teacher.id === a.profesor_id);
                                                                const rankB = ranked.findIndex(r => r.teacher.id === b.profesor_id);
                                                                return (rankA === -1 ? 999 : rankA) - (rankB === -1 ? 999 : rankB);
                                                            })
                                                            : filteredSchedules;

                                                        if (filteredSchedules.length === 0) {
                                                            return <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-</span>;
                                                        }

                                                        return sortedSchedules.map(s => {
                                                            if (!s.teacher) return null;
                                                            const t = s.teacher;
                                                            
                                                            const guardAbsence = guards.find(g =>
                                                                g.date === date &&
                                                                g.time_slot_id === slot.id &&
                                                                g.requesting_teacher_id === t.id &&
                                                                g.subject_id === 'M_GUARDIA' &&
                                                                g.status !== GuardStatus.COMPLETED
                                                            );
                                                            
                                                            const isAbsent = guards.some(g =>
                                                                g.date === date &&
                                                                g.time_slot_id === slot.id &&
                                                                g.requesting_teacher_id === t.id
                                                            );
                                                            
                                                            const isAdmin = isAdminRole(currentUser?.role) || isJefaturaRole(currentUser?.role);
                                                            const canRevert = !!guardAbsence && (currentUser?.id === t.id || isAdmin || isPantallaRole(currentUser?.role));
                                                            
                                                            const handleRevert = () => {
                                                                if (guardAbsence) {
                                                                    if (window.confirm('¿Deseas revertir esta ausencia y volver a habilitar al profesor para las guardias?')) {
                                                                        onDelete(guardAbsence.id);
                                                                    }
                                                                }
                                                            };

                                                            const hue = hueMap.get(t.id);
                                                            const glowColor = hue !== undefined && !isAbsent
                                                                ? `hsl(${hue}, 85%, 55%)`
                                                                : undefined;
      
                                                            const teacherCoveredGuards = guards.filter(g =>
                                                                g.date === date &&
                                                                g.time_slot_id === slot.id &&
                                                                g.covering_teacher_id === t.id &&
                                                                g.status !== GuardStatus.AVAILABLE
                                                            );

                                                            return (
                                                                <div 
                                                                    key={s.id}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (isPantallaRole(currentUser?.role)) {
                                                                            handleAvatarTouch(t, isAbsent, slot.id, teacherCoveredGuards);
                                                                        }
                                                                    }}
                                                                    onTouchStart={(e) => e.stopPropagation()}
                                                                    onTouchMove={(e) => e.stopPropagation()}
                                                                    onTouchEnd={(e) => {
                                                                        e.stopPropagation();
                                                                        if (isPantallaRole(currentUser?.role)) {
                                                                            handleAvatarTouch(t, isAbsent, slot.id, teacherCoveredGuards);
                                                                        }
                                                                    }}
                                                                    style={{ 
                                                                        display: 'inline-block',
                                                                        cursor: isPantallaRole(currentUser?.role) ? 'pointer' : 'default'
                                                                    }}
                                                                >
                                                                    <TeacherAvatar
                                                                        teacher={t}
                                                                        size={isPantallaRole(currentUser?.role) ? 50 : 36}
                                                                        allMembers={groupTeachers}
                                                                        isAbsent={isAbsent}
                                                                        canRevert={canRevert}
                                                                        onRevert={handleRevert}
                                                                        glowColor={glowColor}
                                                                        showViewer={!isPantallaRole(currentUser?.role)}
                                                                    />
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </ScrollableAvatars>
                                            </div>

                                            {/* Floating teacher info card in TV mode */}
                                            <AnimatePresence>
                                                {isPantallaRole(currentUser?.role) && activeTeacherTooltip && activeTeacherTooltip.slotId === slot.id && (() => {
                                                    const slotGuards = filterGuardsForSlot(guards, slot.id, date);
                                                    const ordinaryCount = slotGuards.filter(g =>
                                                        g.status === GuardStatus.COMPLETED &&
                                                        g.covering_teacher_id === activeTeacherTooltip.teacher.id &&
                                                        g.type === GuardType.ORDINARY
                                                    ).length;
                                                    const coexistenceCount = slotGuards.filter(g =>
                                                        g.status === GuardStatus.COMPLETED &&
                                                        g.covering_teacher_id === activeTeacherTooltip.teacher.id &&
                                                        g.type === GuardType.COEXISTENCE
                                                    ).length;

                                                    return (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                            transition={{ duration: 0.15 }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onTouchStart={(e) => e.stopPropagation()}
                                                            onTouchEnd={(e) => e.stopPropagation()}
                                                            style={{
                                                                position: 'absolute',
                                                                bottom: 80,
                                                                left: 10,
                                                                right: 10,
                                                                zIndex: 100,
                                                                background: 'rgba(15, 23, 42, 0.96)',
                                                                backdropFilter: 'blur(16px)',
                                                                WebkitBackdropFilter: 'blur(16px)',
                                                                border: '1.5px solid rgba(6, 182, 212, 0.5)',
                                                                borderRadius: 12,
                                                                padding: '10px 14px',
                                                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 0 16px rgba(6, 182, 212, 0.3)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 12,
                                                                pointerEvents: 'auto'
                                                            }}
                                                        >
                                                            <div style={{ position: 'relative', width: 42, height: 42, flexShrink: 0 }}>
                                                                <TeacherAvatar
                                                                    teacher={activeTeacherTooltip.teacher}
                                                                    size={42}
                                                                    showViewer={false}
                                                                    isAbsent={activeTeacherTooltip.isAbsent}
                                                                />
                                                                {ordinaryCount > 0 && (
                                                                    <div style={{
                                                                        position: 'absolute',
                                                                        top: -4,
                                                                        right: -4,
                                                                        background: 'var(--brand-500)',
                                                                        color: 'white',
                                                                        fontSize: '0.62rem',
                                                                        fontWeight: 900,
                                                                        borderRadius: '50%',
                                                                        width: 16,
                                                                        height: 16,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                                                        border: '1.5px solid var(--bg-card)',
                                                                        zIndex: 10
                                                                    }}>
                                                                        {ordinaryCount}
                                                                    </div>
                                                                )}
                                                                {coexistenceCount > 0 && (
                                                                    <div style={{
                                                                        position: 'absolute',
                                                                        bottom: -4,
                                                                        right: -4,
                                                                        background: '#a855f7',
                                                                        color: 'white',
                                                                        fontSize: '0.62rem',
                                                                        fontWeight: 900,
                                                                        borderRadius: '50%',
                                                                        width: 16,
                                                                        height: 16,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                                                        border: '1.5px solid var(--bg-card)',
                                                                        zIndex: 10
                                                                    }}>
                                                                        {coexistenceCount}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, textAlign: 'left' }}>
                                                                <span style={{ 
                                                                    fontSize: '0.95rem', 
                                                                    fontWeight: 800, 
                                                                    color: '#f8fafc',
                                                                    lineHeight: 1.2,
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis'
                                                                }}>
                                                                    {activeTeacherTooltip.teacher.name}
                                                                </span>
                                                                <span style={{ 
                                                                    fontSize: '0.8rem', 
                                                                    fontWeight: 600, 
                                                                    color: 'var(--brand-400)',
                                                                    marginTop: 3,
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis'
                                                                }}>
                                                                    {activeTeacherTooltip.teacher.department || 'Sin departamento'}
                                                                </span>
                                                                {activeTeacherTooltip.coveredGuards && activeTeacherTooltip.coveredGuards.length > 0 && (
                                                                    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                                        {activeTeacherTooltip.coveredGuards.map(cg => {
                                                                            const groupInfo = cg.type === GuardType.COEXISTENCE
                                                                                ? 'Convivencia'
                                                                                : (cg.group?.name ? cg.group.name : (cg.subject?.name || 'Guardia'));
                                                                            const classroomInfo = cg.classroom?.name ? ` · ${cg.classroom.name}` : '';
                                                                            const isDone = cg.status === GuardStatus.COMPLETED;

                                                                            return (
                                                                                <span 
                                                                                    key={cg.id}
                                                                                    style={{
                                                                                        fontSize: '0.75rem',
                                                                                        fontWeight: 700,
                                                                                        color: isDone ? '#c084fc' : '#34d399',
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        gap: 5,
                                                                                        whiteSpace: 'nowrap',
                                                                                        overflow: 'hidden',
                                                                                        textOverflow: 'ellipsis'
                                                                                    }}
                                                                                >
                                                                                    <span style={{ 
                                                                                        background: isDone ? 'rgba(168, 85, 247, 0.2)' : 'rgba(52, 211, 153, 0.2)', 
                                                                                        color: isDone ? '#d8b4fe' : '#34d399',
                                                                                        padding: '1px 5px', 
                                                                                        borderRadius: 4, 
                                                                                        border: isDone ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(52, 211, 153, 0.4)',
                                                                                        fontSize: '0.68rem',
                                                                                        flexShrink: 0
                                                                                    }}>
                                                                                        {isDone ? '✓ Realizada' : 'Cubriendo'}
                                                                                    </span>
                                                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                                        {groupInfo}{classroomInfo}
                                                                                    </span>
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            {activeTeacherTooltip.isAbsent && (
                                                                <span style={{
                                                                    fontSize: '0.72rem',
                                                                    fontWeight: 700,
                                                                    color: '#ef4444',
                                                                    marginTop: 2
                                                                }}>
                                                                    Ausente en esta hora
                                                                </span>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })()}
                                            </AnimatePresence>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Right Chevron Button */}
                        {carouselItems.length > 3 && activeStartIndex < carouselItems.length - 3 && (
                            <button
                                onClick={() => setCarouselStartIndex(prev => Math.min(carouselItems.length - 3, prev + 1))}
                                style={{
                                    position: 'absolute',
                                    right: '2px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    zIndex: 10,
                                    width: 26,
                                    height: 64,
                                    borderRadius: 'var(--radius-full)',
                                    background: 'rgba(15, 23, 42, 0.85)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(6, 182, 212, 0.4)',
                                    color: 'var(--brand-400)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 12px rgba(6, 182, 212, 0.25)',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(6, 182, 212, 0.25)';
                                    e.currentTarget.style.borderColor = 'var(--brand-400)';
                                    e.currentTarget.style.color = '#fff';
                                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                                    e.currentTarget.style.boxShadow = '0 6px 24px rgba(6, 182, 212, 0.45)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.85)';
                                    e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)';
                                    e.currentTarget.style.color = 'var(--brand-400)';
                                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 12px rgba(6, 182, 212, 0.25)';
                                }}
                            >
                                <ChevronRight size={18} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Filters + Search Bar */}
            {!isPantallaRole(currentUser?.role) && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Filter Pills */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {filters.map((f) => (
                            <motion.button
                                key={f.key}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setFilter(f.key as any)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '10px 20px',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    fontFamily: 'var(--font-sans)',
                                    border: filter === f.key
                                        ? '1px solid var(--brand-400)'
                                        : '1px solid var(--border-subtle)',
                                    background: filter === f.key
                                        ? 'linear-gradient(135deg, var(--brand-600), var(--brand-700))'
                                        : 'rgba(30, 41, 59, 0.5)',
                                    color: filter === f.key ? 'white' : 'var(--text-secondary)',
                                    boxShadow: filter === f.key
                                        ? '0 4px 15px rgba(34, 211, 238, 0.2)'
                                        : 'none',
                                    backdropFilter: 'blur(8px)',
                                }}
                            >
                                <span>{f.label}</span>
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={`${f.key}-${f.count}`}
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.5, opacity: 0 }}
                                        style={{
                                            padding: '2px 8px',
                                            borderRadius: 'var(--radius-full)',
                                            background: filter === f.key ? 'rgba(255, 255, 255, 0.25)' : 'rgba(6, 182, 212, 0.12)',
                                            fontSize: '0.7rem',
                                            fontWeight: 800,
                                            color: filter === f.key ? 'white' : 'var(--brand-400)',
                                            minWidth: '20px',
                                            textAlign: 'center',
                                            border: filter === f.key ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(6, 182, 212, 0.2)',
                                            boxShadow: filter === f.key ? '0 0 10px rgba(255, 255, 255, 0.2)' : 'none',
                                        }}
                                    >
                                        {f.count}
                                    </motion.span>
                                </AnimatePresence>
                            </motion.button>
                        ))}
                    </div>
                </div>
            )}

            {/* Calendar & Filters Panel */}
            {!isPantallaRole(currentUser?.role) && (
                <>
                    <style>{`
                        .hide-scrollbar::-webkit-scrollbar {
                            display: none;
                        }
                        .hide-scrollbar {
                            -ms-overflow-style: none;
                            scrollbar-width: none;
                        }
                    `}</style>
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.45)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: 'var(--radius-xl)',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                        marginTop: 16,
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                    }}>
                        {/* Top Row: Title, Active Filters & Toggle */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 12,
                            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                            paddingBottom: 12
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 'var(--radius-md)',
                                    background: 'rgba(6, 182, 212, 0.12)',
                                    border: '1px solid rgba(6, 182, 212, 0.25)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--brand-400)'
                                }}>
                                    <Filter size={15} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <h3 style={{
                                        margin: 0,
                                        fontSize: '0.92rem',
                                        fontWeight: 800,
                                        color: 'white',
                                        letterSpacing: '0.02em'
                                    }}>
                                        Filtros de guardia
                                    </h3>
                                    {(selectedDate !== null || selectedSlotId !== null || onlyCompatible) && (
                                        <motion.button
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => {
                                                setSelectedDate(null);
                                                setSelectedSlotId(null);
                                                setOnlyCompatible(false);
                                            }}
                                            style={{
                                                background: 'rgba(239, 68, 68, 0.12)',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                color: '#f87171',
                                                borderRadius: 'var(--radius-full)',
                                                padding: '2px 9px',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <RotateCcw size={10} />
                                            <span>Restablecer</span>
                                        </motion.button>
                                    )}
                                </div>
                            </div>

                            {currentUser && !isAdministracionRole(currentUser?.role) && (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        cursor: 'pointer',
                                        background: onlyCompatible ? 'rgba(6, 182, 212, 0.12)' : 'rgba(30, 41, 59, 0.35)',
                                        padding: '6px 14px',
                                        borderRadius: 'var(--radius-full)',
                                        border: '1px solid ' + (onlyCompatible ? 'rgba(6, 182, 212, 0.4)' : 'rgba(255, 255, 255, 0.06)'),
                                        boxShadow: onlyCompatible ? '0 0 12px rgba(6, 182, 212, 0.15)' : 'none',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onClick={() => setOnlyCompatible(!onlyCompatible)}
                                >
                                    <Zap size={14} style={{ color: onlyCompatible ? 'var(--brand-400)' : 'var(--text-muted)' }} />
                                    <span style={{
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        color: onlyCompatible ? '#fff' : 'var(--text-secondary)',
                                        transition: 'color 0.2s'
                                    }}>
                                        Compatibles con mi horario
                                    </span>
                                    <div style={{
                                        width: 34,
                                        height: 18,
                                        borderRadius: 9,
                                        background: onlyCompatible ? 'var(--brand-500)' : 'var(--slate-700)',
                                        padding: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: onlyCompatible ? 'flex-end' : 'flex-start',
                                        transition: 'all 0.2s ease-in-out'
                                    }}>
                                        <motion.div
                                            layout
                                            style={{
                                                width: 14,
                                                height: 14,
                                                borderRadius: '50%',
                                                background: '#fff',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Middle: Unified Date Filter */}
                        {availableDates.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    color: 'var(--text-muted)',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    fontFamily: 'var(--font-mono)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em'
                                }}>
                                    <Calendar size={13} style={{ color: 'var(--brand-400)' }} />
                                    <span>Filtrar por fecha</span>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    gap: 8,
                                    overflowX: 'auto',
                                    padding: '8px 4px 6px 4px',
                                    scrollbarWidth: 'none',
                                    WebkitOverflowScrolling: 'touch'
                                }} className="hide-scrollbar">
                                    {/* Option "Todos" */}
                                    <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => setSelectedDate(null)}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minWidth: '64px',
                                            height: '74px',
                                            borderRadius: 'var(--radius-lg)',
                                            border: selectedDate === null
                                                ? '2px solid var(--brand-400)'
                                                : '1px solid rgba(255, 255, 255, 0.08)',
                                            background: selectedDate === null
                                                ? 'rgba(6, 182, 212, 0.15)'
                                                : 'rgba(30, 41, 59, 0.35)',
                                            color: selectedDate === null ? 'var(--brand-400)' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            boxShadow: selectedDate === null ? '0 0 15px rgba(6, 182, 212, 0.25)' : 'none',
                                            flexShrink: 0
                                        }}
                                    >
                                        <Calendar size={18} style={{ marginBottom: 4 }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Todos</span>
                                    </motion.button>

                                    {/* Date sheet cards (hojas de calendario) */}
                                    {availableDates.map((dateStr) => {
                                        const { dayName, dayNum, monthName, isToday } = getFormattedDateParts(dateStr, todayDateStr);
                                        const isSelected = selectedDate === dateStr;
                                        const count = dateCounts[dateStr] || 0;

                                        return (
                                            <motion.button
                                                key={dateStr}
                                                whileHover={{ scale: 1.03 }}
                                                whileTap={{ scale: 0.97 }}
                                                onClick={() => setSelectedDate(dateStr)}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    minWidth: '64px',
                                                    height: '74px',
                                                    borderRadius: 'var(--radius-lg)',
                                                    border: isSelected
                                                ? '2px solid var(--brand-400)'
                                                : '1px solid rgba(255, 255, 255, 0.08)',
                                                    background: isSelected
                                                        ? 'rgba(6, 182, 212, 0.15)'
                                                        : 'rgba(30, 41, 59, 0.35)',
                                                    color: isSelected ? 'var(--brand-400)' : 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    boxShadow: isSelected ? '0 0 15px rgba(6, 182, 212, 0.25)' : 'none',
                                                    position: 'relative',
                                                    flexShrink: 0
                                                }}
                                            >
                                                <span style={{
                                                    fontSize: '0.6rem',
                                                    fontWeight: 800,
                                                    textTransform: 'uppercase',
                                                    opacity: isSelected ? 1 : 0.6,
                                                    color: isToday ? 'var(--warning)' : undefined,
                                                    letterSpacing: '0.05em'
                                                }}>
                                                    {dayName} {isToday && '•'}
                                                </span>
                                                <span style={{
                                                    fontSize: '1.25rem',
                                                    fontWeight: 900,
                                                    lineHeight: 1,
                                                    margin: '3px 0'
                                                }}>
                                                    {dayNum}
                                                </span>
                                                <span style={{
                                                    fontSize: '0.6rem',
                                                    fontWeight: 800,
                                                    textTransform: 'uppercase',
                                                    opacity: isSelected ? 1 : 0.6,
                                                    letterSpacing: '0.05em'
                                                }}>
                                                    {monthName}
                                                </span>

                                                {/* Guard Count Badge */}
                                                {count > 0 && (
                                                    <span style={{
                                                        position: 'absolute',
                                                        top: -4,
                                                        right: -4,
                                                        background: isSelected ? 'var(--brand-500)' : 'rgba(15, 23, 42, 0.8)',
                                                        border: '1.5px solid ' + (isSelected ? 'var(--brand-400)' : 'rgba(255,255,255,0.15)'),
                                                        color: isSelected ? '#fff' : 'var(--brand-400)',
                                                        fontSize: '0.55rem',
                                                        fontWeight: 900,
                                                        borderRadius: '50%',
                                                        width: 17,
                                                        height: 17,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                                    }}>
                                                        {count}
                                                    </span>
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                padding: '14px',
                                textAlign: 'center',
                                color: 'var(--text-muted)',
                                fontSize: '0.82rem',
                                background: 'rgba(30, 41, 59, 0.15)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px dashed rgba(255, 255, 255, 0.05)'
                            }}>
                                No hay fechas disponibles con los filtros actuales
                            </div>
                        )}

                        {/* Bottom: Unified Slot Filter */}
                        {availableSlots.length > 0 && (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                                paddingTop: 12
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    color: 'var(--text-muted)',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    fontFamily: 'var(--font-mono)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em'
                                }}>
                                    <Clock size={13} style={{ color: 'var(--brand-400)' }} />
                                    <span>Filtrar por tramo horario</span>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    gap: 8,
                                    overflowX: 'auto',
                                    padding: '4px 2px 6px 2px',
                                    scrollbarWidth: 'none',
                                    WebkitOverflowScrolling: 'touch'
                                }} className="hide-scrollbar">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedSlotId(null)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 7,
                                            padding: '6px 14px',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            border: selectedSlotId === null
                                                ? '1px solid var(--brand-400)'
                                                : '1px solid rgba(255, 255, 255, 0.08)',
                                            background: selectedSlotId === null
                                                ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(8, 145, 178, 0.35))'
                                                : 'rgba(30, 41, 59, 0.45)',
                                            color: selectedSlotId === null ? '#fff' : 'var(--text-secondary)',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            boxShadow: selectedSlotId === null ? '0 0 12px rgba(6, 182, 212, 0.25)' : 'none',
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0
                                        }}
                                    >
                                        <Clock size={13} style={{ opacity: selectedSlotId === null ? 1 : 0.7 }} />
                                        <span>Todos los tramos</span>
                                    </motion.button>

                                    {availableSlots.map(slot => {
                                        const isSelected = selectedSlotId === slot.id;
                                        const isRecreo = slot.label?.toLowerCase().includes('recreo') || slot.label?.toLowerCase().includes('descanso');
                                        // Count how many guards in this slot
                                        const slotCount = guards.filter(g => {
                                            if (g.type === GuardType.RECREO || g.subject_id === 'M_GUARDIA') return false;
                                            if (selectedDate && g.date !== selectedDate) return false;
                                            if (g.time_slot_id !== slot.id) return false;
                                            if (filter === 'today') return g.status !== GuardStatus.COMPLETED;
                                            if (filter === 'available') return g.status === GuardStatus.AVAILABLE;
                                            if (filter === 'history') return g.status === GuardStatus.COMPLETED;
                                            if (filter === 'mine') {
                                                if (!currentUser) return false;
                                                return g.covering_teacher_id === currentUser.id || g.requesting_teacher_id === currentUser.id;
                                            }
                                            return true;
                                        }).length;

                                        return (
                                            <motion.button
                                                key={slot.id}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setSelectedSlotId(slot.id)}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 7,
                                                    padding: '6px 14px',
                                                    borderRadius: 'var(--radius-full)',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    border: isSelected
                                                        ? (isRecreo ? '1px solid #fbbf24' : '1px solid var(--brand-400)')
                                                        : (isRecreo ? '1px solid rgba(251, 191, 36, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)'),
                                                    background: isSelected
                                                        ? (isRecreo ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(217, 119, 6, 0.4))' : 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(8, 145, 178, 0.35))')
                                                        : (isRecreo ? 'rgba(251, 191, 36, 0.08)' : 'rgba(30, 41, 59, 0.45)'),
                                                    color: isSelected ? '#fff' : (isRecreo ? '#fde047' : 'var(--text-secondary)'),
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    boxShadow: isSelected 
                                                        ? (isRecreo ? '0 0 12px rgba(251, 191, 36, 0.35)' : '0 0 12px rgba(6, 182, 212, 0.25)') 
                                                        : 'none',
                                                    whiteSpace: 'nowrap',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {isRecreo ? (
                                                    <Coffee size={13} style={{ color: isSelected ? '#fff' : '#fbbf24' }} />
                                                ) : (
                                                    <Clock size={13} style={{ opacity: isSelected ? 1 : 0.7 }} />
                                                )}
                                                <span>{slot.label}</span>
                                                {slotCount > 0 && (
                                                    <span style={{
                                                        background: isSelected ? 'rgba(255, 255, 255, 0.25)' : (isRecreo ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.08)'),
                                                        color: isSelected ? '#fff' : (isRecreo ? '#fef08a' : 'var(--brand-400)'),
                                                        fontSize: '0.68rem',
                                                        fontWeight: 800,
                                                        padding: '1px 6px',
                                                        borderRadius: 'var(--radius-full)',
                                                        border: isSelected ? '1px solid rgba(255, 255, 255, 0.4)' : (isRecreo ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)'),
                                                        minWidth: '18px',
                                                        textAlign: 'center',
                                                        boxShadow: isSelected ? '0 0 8px rgba(255, 255, 255, 0.2)' : 'none'
                                                    }}>
                                                        {slotCount}
                                                    </span>
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Guard Cards */}
            {!isPantallaRole(currentUser?.role) && (
                <div className="guard-grid-container" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <AnimatePresence mode="popLayout">
                        {filteredGuards.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={{
                                    textAlign: 'center',
                                    padding: 64,
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px dashed var(--slate-700)',
                                    background: 'rgba(15, 23, 42, 0.4)',
                                }}
                            >
                                <Shield style={{ width: 48, height: 48, color: 'var(--border-subtle)', margin: '0 auto 12px' }} />
                                <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                                    NO SE ENCONTRARON REGISTROS
                                </p>
                            </motion.div>
                        )}

                        {filteredGuards.map((guard, idx) => {
                            const isAdmin = canAccessAdminPanel(currentUser);
                            const isOwner = currentUser?.id === guard.requesting_teacher_id;
                            const isCovering = currentUser?.id === guard.covering_teacher_id;
                            let canManage = (isAdmin || isOwner || isCovering) && !isAdministracionRole(currentUser?.role) && !isPantallaRole(currentUser?.role);

                            // Restringir edición/borrado de guardias de convivencia solo a administradores
                            if (guard.type === GuardType.COEXISTENCE) {
                                canManage = isAdmin && !isPantallaRole(currentUser?.role);
                            }

                            const cardTaskType = getGuardTaskType(guard);
                            const isHighlighted = highlightedGuardId === guard.id;

                            return (
                                <motion.div
                                    key={guard.id}
                                    id={`guard-card-${guard.id}`}
                                    layout
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ 
                                        opacity: 1, 
                                        x: 0,
                                        scale: isHighlighted ? 1.02 : 1
                                    }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ delay: idx * 0.03, duration: 0.25 }}
                                    className="card"
                                    style={{
                                        borderLeft: `4px solid ${guard.type === GuardType.COEXISTENCE ? 'var(--brand-500)' : getBorderColor(guard.status)}`,
                                        ...(guard.type === GuardType.COEXISTENCE ? { border: '2px solid var(--brand-500)', boxShadow: '0 4px 20px rgba(6, 182, 212, 0.15)' } : {}),
                                        ...(isHighlighted ? {
                                            border: '2px solid #06b6d4',
                                            boxShadow: '0 0 0 4px rgba(6, 182, 212, 0.35), 0 10px 30px rgba(6, 182, 212, 0.3)',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                        } : {}),
                                        borderRadius: '4px var(--radius-lg) var(--radius-lg) 4px',
                                        padding: 24,
                                        position: 'relative',
                                        cursor: 'default',
                                    }}
                                >
                                    {/* Management Actions */}
                                    {canManage && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 12,
                                            right: 12,
                                            display: 'flex',
                                            gap: 6,
                                            opacity: 0.6,
                                            transition: 'opacity 0.2s',
                                        }}
                                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
                                        >
                                            <button
                                                onClick={() => onEdit(guard)}
                                                title="Editar"
                                                style={{
                                                    padding: 6,
                                                    borderRadius: 'var(--radius-sm)',
                                                    background: 'var(--bg-main)',
                                                    border: '1px solid var(--border-subtle)',
                                                    color: 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    transition: 'color 0.2s',
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--brand-400)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                                            >
                                                <Pencil style={{ width: 14, height: 14 }} />
                                            </button>
                                            {confirmDeleteId === guard.id ? (
                                                <button
                                                    onClick={() => { onDelete(guard.id); setConfirmDeleteId(null); }}
                                                    style={{
                                                        padding: '4px 10px',
                                                        borderRadius: 'var(--radius-sm)',
                                                        background: 'rgba(239, 68, 68, 0.15)',
                                                        border: '1px solid var(--danger)',
                                                        color: 'var(--danger)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.65rem',
                                                        fontWeight: 700,
                                                        fontFamily: 'var(--font-mono)',
                                                    }}
                                                >
                                                    CONFIRMAR
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmDeleteId(guard.id)}
                                                    title="Eliminar"
                                                    style={{
                                                        padding: 6,
                                                        borderRadius: 'var(--radius-sm)',
                                                        background: 'var(--bg-main)',
                                                        border: '1px solid var(--border-subtle)',
                                                        color: 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                        transition: 'color 0.2s',
                                                    }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                                                >
                                                    <Trash2 style={{ width: 14, height: 14 }} />
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {/* Top row: ID + Badges */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <span style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                color: 'var(--text-muted)',
                                            }}>
                                                {guard.id}
                                            </span>
                                            <span className={`badge ${getStatusBadgeClass(guard.status)}`}>
                                                {guard.status}
                                            </span>
                                            {guard.type === GuardType.COEXISTENCE && (
                                                <span className="badge badge-coexistence">Convivencia</span>
                                            )}
                                            {cardTaskType === 'tray' && (
                                                <span className="badge" style={{
                                                    background: 'rgba(249, 115, 22, 0.15)',
                                                    color: '#fdba74',
                                                    border: '1px solid rgba(249, 115, 22, 0.4)',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 5
                                                }}>
                                                    <Inbox style={{ width: 11, height: 11 }} /> Tarea en bandeja
                                                </span>
                                            )}
                                            {cardTaskType === 'file' && (
                                                <span className="badge" style={{
                                                    background: 'rgba(6, 182, 212, 0.15)',
                                                    color: '#67e8f9',
                                                    border: '1px solid rgba(6, 182, 212, 0.4)',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 5
                                                }}>
                                                    <Paperclip style={{ width: 11, height: 11 }} /> Tarea en archivo
                                                </span>
                                            )}
                                            {cardTaskType === 'both' && (
                                                <span className="badge" style={{
                                                    background: 'rgba(168, 85, 247, 0.15)',
                                                    color: '#d8b4fe',
                                                    border: '1px solid rgba(168, 85, 247, 0.4)',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 5
                                                }}>
                                                    <Layers style={{ width: 11, height: 11 }} /> Bandeja + Archivo
                                                </span>
                                            )}
                                            {guard.task_file_url && (
                                                <a
                                                    href={getTaskFileUrl(guard.task_file_url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        color: '#22d3ee',
                                                        textDecoration: 'none',
                                                        background: 'rgba(6, 182, 212, 0.15)',
                                                        padding: '2px 10px',
                                                        borderRadius: 'var(--radius-full)',
                                                        border: '1px solid rgba(6, 182, 212, 0.35)',
                                                        transition: 'all 0.2s',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(6, 182, 212, 0.25)';
                                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(6, 182, 212, 0.15)';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                    }}
                                                >
                                                    <Download style={{ width: 12, height: 12 }} />
                                                    DESCARGAR TAREA
                                                </a>
                                            )}
                                        </div>

                                        {/* Subject + Group */}
                                        <div className="guard-card-body">
                                            <div style={{ flex: 1 }}>
                                                <h3 className="guard-subject" style={{
                                                    fontSize: '1.2rem',
                                                    fontWeight: 800,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    marginBottom: 16,
                                                    color: guard.type === GuardType.COEXISTENCE ? 'var(--brand-400)' : 'inherit'
                                                }}>
                                                    {guard.type === GuardType.COEXISTENCE ? (
                                                        <Shield style={{ width: 22, height: 22, color: 'var(--brand-500)' }} />
                                                    ) : (
                                                        <BookOpen style={{ width: 20, height: 20, color: 'var(--brand-500)' }} />
                                                    )}
                                                    {guard.type === GuardType.COEXISTENCE ? (guard.subject?.name || 'Convivencia') : (guard.subject?.name || 'Materia')}
                                                    {guard.type !== GuardType.COEXISTENCE && (
                                                        <>
                                                            <span style={{ color: 'var(--border-subtle)', fontWeight: 400, fontSize: '0.9rem' }}>|</span>
                                                            <span style={{ color: 'var(--text-secondary)' }}>{guard.group?.name || 'Grupo'}</span>
                                                        </>
                                                    )}
                                                </h3>

                                                {/* Info Grid */}
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                                    gap: 8,
                                                }}>
                                                    {[
                                                        { icon: Calendar, text: guard.date },
                                                        { icon: Clock, text: guard.time_slot?.label || 'Hora' },
                                                        { icon: MapPin, text: guard.classroom?.name || 'Aula', isClassroom: true, id: guard.classroom?.id },
                                                    ].map((item, i) => (
                                                        <div key={i} 
                                                                onClick={item.isClassroom && item.id ? (e) => { e.stopPropagation(); setMapRoomId(item.id!); } : undefined}
                                                                style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 8,
                                                            padding: '8px 12px',
                                                            borderRadius: 'var(--radius-sm)',
                                                            background: 'var(--bg-info-pill)',
                                                            border: '1px solid var(--border-subtle)',
                                                            fontSize: '0.8rem',
                                                            color: 'var(--text-info-pill)',
                                                            cursor: item.isClassroom && item.id ? 'pointer' : 'default',
                                                            transition: 'inherit'
                                                        }}
                                                        className={`${item.isClassroom && item.id ? "hover:bg-[var(--brand-400)]/10 hover:border-[var(--brand-400)]/30" : ""} ${item.icon === Clock ? "guard-time" : ""}`}
                                                        >
                                                            <item.icon style={{ width: 15, height: 15, color: 'var(--brand-400)', flexShrink: 0 }} />
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {item.text}
                                                            </span>
                                                        </div>
                                                    ))}

                                                    {/* Requesting Teacher specifically with Avatar */}
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        padding: '8px 12px',
                                                        borderRadius: 'var(--radius-sm)',
                                                        background: 'var(--bg-info-pill)',
                                                        border: '1px solid var(--border-subtle)',
                                                        fontSize: '0.8rem',
                                                        color: 'var(--text-info-pill)',
                                                    }}>
                                                        {guard.requesting_teacher ? (
                                                            <TeacherAvatar
                                                                teacher={guard.requesting_teacher}
                                                                size={20}
                                                            />
                                                        ) : (
                                                            <div style={{
                                                                width: 20,
                                                                height: 20,
                                                                borderRadius: '50%',
                                                                background: guard.type === GuardType.COEXISTENCE ? 'var(--brand-500)' : 'var(--text-subtle)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}>
                                                                <User style={{ width: 12, height: 12, color: 'white' }} />
                                                            </div>
                                                        )}
                                                        <span className="teacher-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {guard.requesting_teacher?.name
                                                                || (guard.type === GuardType.COEXISTENCE ? 'Sistema' : 'Profesor')}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Observations */}
                                                {guard.observations && (
                                                    <div style={{
                                                        marginTop: 12,
                                                        padding: '10px 14px',
                                                        borderRadius: 'var(--radius-sm)',
                                                        background: 'var(--bg-main)',
                                                        border: '1px solid var(--border-subtle)',
                                                        borderLeft: '3px solid var(--text-muted)',
                                                        fontSize: '0.8rem',
                                                        color: 'var(--text-secondary)',
                                                        fontStyle: 'italic',
                                                    }}>
                                                        "{guard.observations}"
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right side: covering teacher + actions */}
                                            <div className="guard-card-actions">
                                                {guard.covering_teacher && (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 12,
                                                        padding: '8px 16px',
                                                        borderRadius: 'var(--radius-md)',
                                                        background: 'var(--bg-info-pill)',
                                                        border: '1px solid var(--border-subtle)',
                                                    }}>
                                                        <TeacherAvatar
                                                            teacher={guard.covering_teacher}
                                                            size={32}
                                                        />
                                                        <div>
                                                            <span style={{
                                                                fontSize: '0.55rem',
                                                                fontFamily: 'var(--font-mono)',
                                                                color: 'var(--brand-400)',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.1em',
                                                                fontWeight: 700,
                                                            }}>
                                                                Asignado a
                                                            </span>
                                                            <p className="teacher-name" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-info-pill)' }}>
                                                                {guard.covering_teacher.name}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Action Buttons */}
                                                {guard.status === GuardStatus.AVAILABLE && currentUser && !isAdministracionRole(currentUser?.role) && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.03 }}
                                                        whileTap={{ scale: 0.96 }}
                                                        onClick={() => onPickup(guard.id)}
                                                        className="btn btn-primary"
                                                    >
                                                        <Zap style={{ width: 16, height: 16, fill: 'white' }} />
                                                        {isAdmin ? 'ASIGNAR DOCENTE' : 'RECOGER GUARDIA'}
                                                    </motion.button>
                                                )}

                                            {guard.status === GuardStatus.ASSIGNED &&
                                                currentUser &&
                                                !isAdministracionRole(currentUser?.role) &&
                                                (guard.covering_teacher_id === currentUser.id || isAdmin || isPantallaRole(currentUser?.role)) && (
                                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                        {isAdmin && (
                                                            <motion.button
                                                                whileHover={{ scale: 1.03 }}
                                                                whileTap={{ scale: 0.96 }}
                                                                onClick={() => onPickup(guard.id)}
                                                                className="btn btn-primary"
                                                            >
                                                                <Zap style={{ width: 16, height: 16, fill: 'white' }} />
                                                                CAMBIAR DOCENTE
                                                            </motion.button>
                                                        )}
                                                        <motion.button
                                                            whileHover={{ scale: 1.03 }}
                                                            whileTap={{ scale: 0.96 }}
                                                            onClick={() => onComplete(guard.id)}
                                                            className="btn btn-success"
                                                        >
                                                            <CheckCircle style={{ width: 16, height: 16 }} />
                                                            MARCAR REALIZADA
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.03 }}
                                                            whileTap={{ scale: 0.96 }}
                                                            onClick={() => onRelease(guard.id)}
                                                            className="btn btn-ghost"
                                                            style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                                        >
                                                            SOLTAR
                                                        </motion.button>
                                                    </div>
                                                )}

                                            {/* REVERSAL AND ASSIGNMENT FOR COMPLETED */}
                                            {guard.status === GuardStatus.COMPLETED &&
                                                currentUser &&
                                                !isAdministracionRole(currentUser?.role) &&
                                                (guard.covering_teacher_id === currentUser.id || isAdmin || isPantallaRole(currentUser?.role)) && (
                                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                        {isAdmin && (
                                                            <motion.button
                                                                whileHover={{ scale: 1.03 }}
                                                                whileTap={{ scale: 0.96 }}
                                                                onClick={() => onPickup(guard.id)}
                                                                className="btn btn-primary"
                                                            >
                                                                <Zap style={{ width: 16, height: 16, fill: 'white' }} />
                                                                {guard.covering_teacher ? 'CAMBIAR DOCENTE' : 'ASIGNAR DOCENTE'}
                                                            </motion.button>
                                                        )}
                                                        {(() => {
                                                            const now = new Date();
                                                            let canRevert = true;
                                                            if (guard.date) {
                                                                const [y, m, d] = guard.date.split('-').map(Number);
                                                                let hh = 12, mm = 0; // Default to 12:00 if no start_time
                                                                if (guard.time_slot?.start_time) {
                                                                    const parts = guard.time_slot.start_time.split(':').map(Number);
                                                                    if (!isNaN(parts[0])) hh = parts[0];
                                                                    if (!isNaN(parts[1])) mm = parts[1];
                                                                }
                                                                const guardStart = new Date(y, m - 1, d, hh, mm);
                                                                const diffHrs = (now.getTime() - guardStart.getTime()) / (1000 * 60 * 60);
                                                                if (diffHrs > 8) canRevert = false;
                                                            }
                                                            return canRevert ? (
                                                                <motion.button
                                                                    whileHover={{ scale: 1.03 }}
                                                                    whileTap={{ scale: 0.96 }}
                                                                    onClick={() => onComplete(guard.id)}
                                                                    className="btn btn-ghost"
                                                                    style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}
                                                                >
                                                                    <Clock style={{ width: 16, height: 16 }} />
                                                                    REVERTIR A PENDIENTE
                                                                </motion.button>
                                                            ) : null;
                                                        })()}
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
            )}
            <style>{`
                @keyframes blink-warning-red {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                .blink-warning {
                    animation: blink-warning-red 0.8s infinite ease-in-out;
                }
            `}</style>

            {/* Map Modal */}
            <ClassroomMapModal 
                roomId={mapRoomId}
                meta={meta}
                onClose={() => setMapRoomId(null)}
            />

            {/* Observation & Task Modal */}
            <AnimatePresence>
                {selectedObservationGuard && (
                    <div 
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(3, 7, 18, 0.72)',
                            backdropFilter: 'blur(6px)',
                            WebkitBackdropFilter: 'blur(6px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 9999,
                            padding: 16
                        }}
                        onClick={() => setSelectedObservationGuard(null)}
                        onTouchEnd={(e) => {
                            if (e.target === e.currentTarget) {
                                setSelectedObservationGuard(null);
                            }
                        }}
                    >
                        {(() => {
                            const obsTaskType = getGuardTaskType(selectedObservationGuard);
                            const isTV = isPantallaRole(currentUser?.role);
                            const modalBorder = obsTaskType === 'file' 
                                ? 'rgba(6, 182, 212, 0.6)' 
                                : obsTaskType === 'both' 
                                ? 'rgba(168, 85, 247, 0.6)' 
                                : 'rgba(249, 115, 22, 0.6)';
                            const modalGlow = obsTaskType === 'file' 
                                ? 'rgba(6, 182, 212, 0.25)' 
                                : obsTaskType === 'both' 
                                ? 'rgba(168, 85, 247, 0.25)' 
                                : 'rgba(249, 115, 22, 0.25)';

                            return (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.92, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.92, y: 10 }}
                                    transition={{ duration: 0.18, ease: 'easeOut' }}
                                    onClick={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onTouchEnd={(e) => e.stopPropagation()}
                                    style={{
                                        background: '#0f172a',
                                        border: `1.5px solid ${modalBorder}`,
                                        borderRadius: 14,
                                        padding: '18px 20px',
                                        maxWidth: 460,
                                        width: '100%',
                                        boxShadow: `0 20px 40px -10px rgba(0, 0, 0, 0.9), 0 0 24px ${modalGlow}`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 14,
                                        color: '#f8fafc',
                                        position: 'relative'
                                    }}
                                >
                                    {/* Close button */}
                                    <button
                                        onClick={() => setSelectedObservationGuard(null)}
                                        style={{
                                            position: 'absolute',
                                            top: 12,
                                            right: 12,
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            color: 'var(--text-muted, #94a3b8)',
                                            borderRadius: '50%',
                                            width: 28,
                                            height: 28,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <X size={15} />
                                    </button>

                                    {/* Guard Brief Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 32 }}>
                                        <div style={{
                                            fontWeight: 800,
                                            fontSize: '1rem',
                                            color: '#f1f5f9'
                                        }}>
                                            {selectedObservationGuard.subject?.name || 'Guardia'}
                                        </div>
                                        {selectedObservationGuard.group?.name && (
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '2px 8px',
                                                borderRadius: 6,
                                                background: 'rgba(255, 255, 255, 0.08)',
                                                color: '#cbd5e1',
                                                fontWeight: 600
                                            }}>
                                                {selectedObservationGuard.group.name}
                                            </span>
                                        )}
                                    </div>

                                    {/* Differentiated Task Banners */}
                                    {obsTaskType !== 'none' && (
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 6,
                                            padding: '10px 14px',
                                            borderRadius: 10,
                                            background: obsTaskType === 'file' 
                                                ? 'rgba(6, 182, 212, 0.12)' 
                                                : obsTaskType === 'both' 
                                                ? 'rgba(168, 85, 247, 0.12)' 
                                                : 'rgba(249, 115, 22, 0.12)',
                                            border: obsTaskType === 'file' 
                                                ? '1px solid rgba(6, 182, 212, 0.35)' 
                                                : obsTaskType === 'both' 
                                                ? '1px solid rgba(168, 85, 247, 0.35)' 
                                                : '1px solid rgba(249, 115, 22, 0.35)',
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                fontWeight: 700,
                                                fontSize: '0.85rem',
                                                color: obsTaskType === 'file' 
                                                    ? '#67e8f9' 
                                                    : obsTaskType === 'both' 
                                                    ? '#d8b4fe' 
                                                    : '#fdba74'
                                            }}>
                                                {obsTaskType === 'tray' && <Inbox size={17} />}
                                                {obsTaskType === 'file' && <Paperclip size={17} />}
                                                {obsTaskType === 'both' && <Layers size={17} />}
                                                <span>
                                                    {obsTaskType === 'tray' && 'Tarea en bandeja física'}
                                                    {obsTaskType === 'file' && 'Tarea en archivo digital'}
                                                    {obsTaskType === 'both' && 'Bandeja física + Archivo adjunto'}
                                                </span>
                                            </div>

                                            {/* Subtitle instructions based on mode */}
                                            {isTV ? (
                                                <div style={{
                                                    fontSize: '0.78rem',
                                                    color: '#cbd5e1',
                                                    lineHeight: 1.4
                                                }}>
                                                    {obsTaskType === 'tray' && 'Hay fotocopias y material disponible en la bandeja física de profesores (bajo el televisor).'}
                                                    {obsTaskType === 'file' && 'Inicia sesión con tu cuenta de profesor en tu móvil o portátil para ver o descargar el archivo adjunto.'}
                                                    {obsTaskType === 'both' && 'Recoge las fotocopias en la bandeja física y entra con tu cuenta para consultar el documento adjunto.'}
                                                </div>
                                            ) : (
                                                <div style={{
                                                    fontSize: '0.78rem',
                                                    color: '#94a3b8',
                                                    lineHeight: 1.4
                                                }}>
                                                    {obsTaskType === 'tray' && 'El profesor ausente ha dejado material impreso en la bandeja física de la sala de profesores.'}
                                                    {obsTaskType === 'file' && 'El profesor ha subido un documento con instrucciones para el aula.'}
                                                    {obsTaskType === 'both' && 'Material disponible en bandeja física y documento digital adjunto.'}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Observation text */}
                                    {selectedObservationGuard.observations?.trim() ? (
                                        <div style={{
                                            background: 'rgba(2, 6, 23, 0.65)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: 8,
                                            padding: '12px 14px',
                                            fontSize: '0.9rem',
                                            lineHeight: 1.5,
                                            color: '#f8fafc',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            maxHeight: 200,
                                            overflowY: 'auto'
                                        }}>
                                            {selectedObservationGuard.observations.trim()}
                                        </div>
                                    ) : obsTaskType === 'none' ? (
                                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', padding: 8 }}>
                                            Sin observaciones registradas.
                                        </div>
                                    ) : null}

                                    {/* Action buttons (Teachers / Mobile view) */}
                                    {!isTV && (
                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: 8,
                                            marginTop: 2
                                        }}>
                                            {selectedObservationGuard.task_file_url && (
                                                <a
                                                    href={getTaskFileUrl(selectedObservationGuard.task_file_url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
                                                        color: '#ffffff',
                                                        textDecoration: 'none',
                                                        padding: '7px 14px',
                                                        borderRadius: 8,
                                                        fontSize: '0.78rem',
                                                        fontWeight: 700,
                                                        boxShadow: '0 4px 12px rgba(6, 182, 212, 0.35)',
                                                        transition: 'all 0.2s',
                                                        flex: '1 1 auto',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <Download size={14} /> Descargar archivo adjunto
                                                </a>
                                            )}
                                            <button
                                                onClick={() => handleScrollToGuard(selectedObservationGuard)}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    background: 'rgba(255, 255, 255, 0.07)',
                                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                                    color: '#f1f5f9',
                                                    padding: '7px 14px',
                                                    borderRadius: 8,
                                                    fontSize: '0.78rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    flex: '1 1 auto',
                                                    justifyContent: 'center'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                                                }}
                                            >
                                                <ExternalLink size={13} /> Ir a la tarjeta de guardia
                                            </button>
                                        </div>
                                    )}

                                    {/* 8-second auto-close animated line at bottom */}
                                    <div style={{
                                        width: '100%',
                                        height: 3,
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                        marginTop: 4
                                    }}>
                                        <motion.div
                                            initial={{ width: '100%' }}
                                            animate={{ width: '0%' }}
                                            transition={{ duration: 8, ease: 'linear' }}
                                            style={{
                                                height: '100%',
                                                background: obsTaskType === 'file' 
                                                    ? 'linear-gradient(90deg, #0891b2, #06b6d4)' 
                                                    : obsTaskType === 'both' 
                                                    ? 'linear-gradient(90deg, #9333ea, #a855f7)' 
                                                    : 'linear-gradient(90deg, #ea580c, #f97316)'
                                            }}
                                        />
                                    </div>
                                </motion.div>
                            );
                        })()}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GuardList;
