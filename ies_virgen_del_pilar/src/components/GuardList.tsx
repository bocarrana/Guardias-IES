import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Guard, GuardStatus, GuardType, Teacher, MetaOptions, GuardGroupSchedule } from '../types';
import {
    User, Calendar, Clock, MapPin, CheckCircle, Zap,
    BookOpen, Shield, Pencil, Trash2, FileText, Search, Loader2, AlertTriangle,
    ChevronLeft, ChevronRight, X, Dices, ChevronDown
} from 'lucide-react';
import { getStorageUrl, getTaskFileUrl } from '../services/supabaseClient';
import { Download } from 'lucide-react';
import TeacherAvatar from './TeacherAvatar';
import ClassroomMapModal from './ClassroomMapModal';
import { toast } from 'sonner';
import { canAccessAdminPanel, isAdministracionRole, isPantallaRole, isAdminRole, isJefaturaRole } from '../utils/roles';
import { rankTeachers } from '../utils/guardAssignment';
import { LOGO_DARK_URL } from '../config/supabase';

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
        if (!el) return;
        setShowLeft(el.scrollLeft > 2);
        setShowRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 2);
    };

    useEffect(() => {
        const el = containerRef.current;
        if (!el || !isTV) return;

        checkScroll();

        window.addEventListener('resize', checkScroll);
        
        const observer = new MutationObserver(checkScroll);
        observer.observe(el, { childList: true, subtree: true });

        return () => {
            window.removeEventListener('resize', checkScroll);
            observer.disconnect();
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
                    padding: '4px 0',
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

const isGuardPassed = (guard: Guard, now: Date) => {
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
    assignmentModes, onChangeAssignmentMode
}) => {
    const [filter, setFilter] = useState<'today' | 'mine' | 'available' | 'history'>('today');
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [mapRoomId, setMapRoomId] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
    const [onlyCompatible, setOnlyCompatible] = useState(false);
    const [openModeMenuSlotId, setOpenModeMenuSlotId] = useState<string | null>(null);

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

    useEffect(() => {
        if (carouselItems.length > 0 && !hasInitializedCarousel.current) {
            setCarouselStartIndex(defaultCarouselStart);
            hasInitializedCarousel.current = true;
        }
    }, [carouselItems, defaultCarouselStart]);

    // Retorno automático a la vista principal tras 10s de inactividad
    useEffect(() => {
        if (carouselItems.length === 0 || !hasInitializedCarousel.current) return;
        
        if (carouselStartIndex === defaultCarouselStart) return;

        const timer = setTimeout(() => {
            setCarouselStartIndex(defaultCarouselStart);
        }, 10000);

        return () => clearTimeout(timer);
    }, [carouselStartIndex, defaultCarouselStart, carouselItems.length]);

    const activeStartIndex = Math.max(0, Math.min(carouselStartIndex, Math.max(0, carouselItems.length - 3)));
    const visibleItems = useMemo(() => {
        return carouselItems.slice(activeStartIndex, activeStartIndex + 3);
    }, [carouselItems, activeStartIndex]);

    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (touchStartX.current === null || touchEndX.current === null) return;
        const diffX = touchStartX.current - touchEndX.current;
        const swipeThreshold = 50; // pixels
        if (diffX > swipeThreshold) {
            // Swiped left -> next items
            setCarouselStartIndex(prev => Math.min(carouselItems.length - 3, prev + 1));
        } else if (diffX < -swipeThreshold) {
            // Swiped right -> previous items
            setCarouselStartIndex(prev => Math.max(0, prev - 1));
        }
        // Reset
        touchStartX.current = null;
        touchEndX.current = null;
    };

    const sortScore = (s: GuardStatus) =>
        s === GuardStatus.AVAILABLE ? 1 : s === GuardStatus.ASSIGNED ? 2 : 3;

    const dateCounts = useMemo(() => {
        const countsMap: Record<string, number> = {};
        guards.forEach(g => {
            if (g.type === GuardType.RECREO) return;
            
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
            if (g.type === GuardType.RECREO) return;
            
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
                    padding: isPantallaRole(currentUser?.role) ? '40px' : 24,
                    flex: isPantallaRole(currentUser?.role) ? 1 : 'none',
                    borderRadius: isPantallaRole(currentUser?.role) ? 0 : 'var(--radius-lg)',
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    background: isPantallaRole(currentUser?.role) ? 'transparent' : undefined,
                    border: isPantallaRole(currentUser?.role) ? 'none' : undefined,
                    boxShadow: isPantallaRole(currentUser?.role) ? 'none' : undefined,
                }}>
                    <div style={{ marginBottom: isPantallaRole(currentUser?.role) ? 24 : 20 }}>
                        <h2 style={{ 
                            fontSize: isPantallaRole(currentUser?.role) ? '1.8rem' : '1.2rem', 
                            fontWeight: 800, 
                            margin: 0, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 12, 
                            justifyContent: 'space-between' 
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Zap size={isPantallaRole(currentUser?.role) ? 28 : 20} className="text-glow-brand" style={{ color: 'var(--brand-500)' }} />
                                {currentSlot ? `Entorno de Guardias — ${currentDay}` : 'Entorno próximas guardias'}
                            </div>

                            {/* DYNAMIC DIGITAL CLOCK */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: isPantallaRole(currentUser?.role) ? '10px 20px' : '6px 14px',
                                background: 'rgba(6, 182, 212, 0.05)',
                                borderRadius: 'var(--radius-full)',
                                border: '1px solid rgba(6, 182, 212, 0.15)',
                                backdropFilter: 'blur(4px)'
                            }}>
                                <Clock size={isPantallaRole(currentUser?.role) ? 18 : 14} style={{ color: 'var(--brand-400)' }} />
                                <span style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: isPantallaRole(currentUser?.role) ? '1.2rem' : '0.95rem',
                                    fontWeight: 700,
                                    color: 'var(--text-primary)',
                                    letterSpacing: '0.05em',
                                    minWidth: isPantallaRole(currentUser?.role) ? '110px' : '85px',
                                    textAlign: 'center',
                                    textShadow: '0 0 10px rgba(6, 182, 212, 0.3)'
                                }}>
                                    {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
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
                        padding: (!isPantallaRole(currentUser?.role) && carouselItems.length > 3) ? '0 32px' : '0'
                    }}>
                        {/* Left Chevron Button */}
                        {!isPantallaRole(currentUser?.role) && carouselItems.length > 3 && activeStartIndex > 0 && (
                            <button
                                onClick={() => setCarouselStartIndex(prev => Math.max(0, prev - 1))}
                                style={{
                                    position: 'absolute',
                                    left: '4px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    zIndex: 10,
                                    width: 24,
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
                                gap: isPantallaRole(currentUser?.role) ? 24 : 16,
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
                                            padding: isPantallaRole(currentUser?.role) ? 24 : 16,
                                            background: isCurrent ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-card)',
                                            borderRadius: 'var(--radius-md)',
                                            border: isCurrent ? '2px solid var(--brand-500)' : '1px solid var(--border-subtle)',
                                            minWidth: 260,
                                            height: isPantallaRole(currentUser?.role) ? '100%' : 'auto',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            overflow: isPantallaRole(currentUser?.role) ? 'hidden' : 'visible',
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <Clock size={isPantallaRole(currentUser?.role) ? 18 : 14} style={{ color: isCurrent ? 'var(--brand-400)' : 'var(--text-muted)' }} />
                                                    <span style={{
                                                        fontSize: isPantallaRole(currentUser?.role) ? '1.1rem' : '0.8rem',
                                                        fontWeight: 800,
                                                        color: isCurrent ? 'var(--brand-400)' : 'var(--text-secondary)'
                                                    }}>
                                                        {slot.label} {isCurrent && '(AHORA)'}
                                                    </span>
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
                                                color: 'var(--brand-500)', 
                                                fontWeight: 700, 
                                                marginBottom: 12, 
                                                opacity: 0.8 
                                            }}>
                                                {day}, {new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                            </div>

                                            {/* Ausencias en esta franja */}
                                            <div style={{ 
                                                marginBottom: isPantallaRole(currentUser?.role) ? 8 : 16,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                flex: 1,
                                                minHeight: 0
                                            }}>
                                                <p style={{ 
                                                    fontSize: isPantallaRole(currentUser?.role) ? '0.8rem' : '0.65rem', 
                                                    fontWeight: 700, 
                                                    textTransform: 'uppercase', 
                                                    color: 'var(--text-muted)', 
                                                    marginBottom: 10 
                                                }}>
                                                    Ausencias
                                                </p>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    flexDirection: 'column', 
                                                    gap: 6,
                                                    flex: 1,
                                                    overflowY: isPantallaRole(currentUser?.role) ? 'auto' : 'visible',
                                                    WebkitOverflowScrolling: isPantallaRole(currentUser?.role) ? 'touch' : 'auto',
                                                    minHeight: 0,
                                                    paddingRight: isPantallaRole(currentUser?.role) ? 4 : 0
                                                }}>
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
                                                                {g.type === GuardType.COEXISTENCE ? g.subject?.name : `${g.subject?.name || ''}${g.group?.name ? ` - ${g.group.name}` : ''}`}
                                                            </div>
                                                            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    {(() => {
                                                                        const isSelectable = g.status === GuardStatus.AVAILABLE && currentUser && !isAdministracionRole(currentUser?.role);
                                                                        console.log("GUARDIA DEBUG:", g.id, "status:", g.status, "currentUser:", currentUser ? currentUser.id : "null", "role:", currentUser?.role, "isSelectable:", isSelectable);
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
                                                                                    title="Hacer clic para recoger esta guardia"
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
                                                                </div>
                                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                                    {g.task_file_url && (
                                                                        <a 
                                                                            href={getTaskFileUrl(g.task_file_url)} 
                                                                            target="_blank" 
                                                                            rel="noopener noreferrer" 
                                                                            title="Ver Tarea" 
                                                                            style={{ color: 'var(--brand-400)' }}
                                                                            onTouchStart={(e) => e.stopPropagation()}
                                                                            onTouchEnd={(e) => e.stopPropagation()}
                                                                        >
                                                                            <FileText size={14} />
                                                                        </a>
                                                                    )}
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
                                        <div style={{ marginTop: 16 }}>
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
                                                     color: 'var(--text-muted)'
                                                 }}>
                                                     Prof. Guardia
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
                                                                 <img 
                                                                     src={LOGO_DARK_URL} 
                                                                     alt="IES Logo" 
                                                                     style={{ 
                                                                         width: '100%', 
                                                                         height: '100%', 
                                                                         objectFit: 'contain'
                                                                     }} 
                                                                 />
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
                                                        const ranked = shouldRank ? rankTeachers(groupTeachers, guards) : null;

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
      
                                                            return (
                                                                <div 
                                                                    key={s.id}
                                                                    onTouchStart={(e) => e.stopPropagation()}
                                                                    onTouchMove={(e) => e.stopPropagation()}
                                                                    onTouchEnd={(e) => e.stopPropagation()}
                                                                    style={{ display: 'inline-block' }}
                                                                >
                                                                    <TeacherAvatar
                                                                        teacher={t}
                                                                        size={isPantallaRole(currentUser?.role) ? 50 : 36}
                                                                        allMembers={groupTeachers}
                                                                        isAbsent={isAbsent}
                                                                        canRevert={canRevert}
                                                                        onRevert={handleRevert}
                                                                        glowColor={glowColor}
                                                                    />
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </ScrollableAvatars>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Right Chevron Button */}
                        {!isPantallaRole(currentUser?.role) && carouselItems.length > 3 && activeStartIndex < carouselItems.length - 3 && (
                            <button
                                onClick={() => setCarouselStartIndex(prev => Math.min(carouselItems.length - 3, prev + 1))}
                                style={{
                                    position: 'absolute',
                                    right: '4px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    zIndex: 10,
                                    width: 24,
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
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                        marginTop: 16,
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                    }}>
                        {/* Top Row: Title & Toggle */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 12,
                            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                            paddingBottom: 12
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Calendar size={18} style={{ color: 'var(--brand-400)' }} />
                                <h3 style={{
                                    margin: 0,
                                    fontSize: '0.95rem',
                                    fontWeight: 800,
                                    color: 'white',
                                    letterSpacing: '0.02em'
                                }}>
                                    Filtro temporal
                                </h3>
                            </div>

                            {currentUser && !isAdministracionRole(currentUser?.role) && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    cursor: 'pointer',
                                    background: 'rgba(30, 41, 59, 0.3)',
                                    padding: '6px 12px',
                                    borderRadius: 'var(--radius-full)',
                                    border: '1px solid ' + (onlyCompatible ? 'rgba(6, 182, 212, 0.3)' : 'rgba(255, 255, 255, 0.05)'),
                                    transition: 'all 0.3s ease'
                                }} onClick={() => setOnlyCompatible(!onlyCompatible)}>
                                    <span style={{
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        color: onlyCompatible ? 'var(--brand-400)' : 'var(--text-secondary)',
                                        transition: 'color 0.2s'
                                    }}>
                                        Compatibles con mi horario
                                    </span>
                                    <div style={{
                                        width: 36,
                                        height: 20,
                                        borderRadius: 10,
                                        background: onlyCompatible ? 'var(--brand-600)' : 'var(--slate-700)',
                                        padding: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: onlyCompatible ? 'flex-end' : 'flex-start',
                                        transition: 'all 0.2s ease-in-out'
                                    }}>
                                        <motion.div
                                            layout
                                            style={{
                                                width: 16,
                                                height: 16,
                                                borderRadius: '50%',
                                                background: '#fff',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Middle: Scrollable Date Selector */}
                        {availableDates.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{
                                    display: 'flex',
                                    gap: 8,
                                    overflowX: 'auto',
                                    padding: '10px 8px 8px 8px',
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
                                        }}
                                    >
                                        <Calendar size={18} style={{ marginBottom: 4 }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Todos</span>
                                    </motion.button>

                                    {/* Date pills */}
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
                                padding: '16px',
                                textAlign: 'center',
                                color: 'var(--text-muted)',
                                fontSize: '0.85rem',
                                background: 'rgba(30, 41, 59, 0.15)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px dashed rgba(255, 255, 255, 0.05)'
                            }}>
                                No hay fechas disponibles con los filtros actuales
                            </div>
                        )}

                        {/* Bottom: Slot Pills */}
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
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    fontFamily: 'var(--font-mono)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>
                                    <Clock size={12} />
                                    <span>Filtrar por tramo horario</span>
                                </div>

                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedSlotId(null)}
                                        style={{
                                            padding: '4px 12px',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            border: selectedSlotId === null
                                                ? '1px solid var(--brand-400)'
                                                : '1px solid rgba(255, 255, 255, 0.08)',
                                            background: selectedSlotId === null
                                                ? 'rgba(6, 182, 212, 0.15)'
                                                : 'rgba(30, 41, 59, 0.35)',
                                            color: selectedSlotId === null ? 'var(--brand-400)' : 'var(--text-secondary)',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        Todos los tramos
                                    </motion.button>

                                    {availableSlots.map(slot => {
                                        const isSelected = selectedSlotId === slot.id;
                                        // Count how many guards in this slot
                                        const slotCount = guards.filter(g => {
                                            if (g.type === GuardType.RECREO) return false;
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
                                                    padding: '4px 12px',
                                                    borderRadius: 'var(--radius-full)',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    border: isSelected
                                                        ? '1px solid var(--brand-400)'
                                                        : '1px solid rgba(255, 255, 255, 0.08)',
                                                    background: isSelected
                                                        ? 'rgba(6, 182, 212, 0.15)'
                                                        : 'rgba(30, 41, 59, 0.35)',
                                                    color: isSelected ? 'var(--brand-400)' : 'var(--text-secondary)',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6
                                                }}
                                            >
                                                <span>{slot.label}</span>
                                                {slotCount > 0 && (
                                                    <span style={{
                                                        background: isSelected ? 'var(--brand-500)' : 'rgba(255,255,255,0.1)',
                                                        color: isSelected ? '#fff' : 'var(--text-secondary)',
                                                        fontSize: '0.6rem',
                                                        fontWeight: 800,
                                                        padding: '1px 5px',
                                                        borderRadius: 'var(--radius-full)'
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

                            return (
                                <motion.div
                                    key={guard.id}
                                    layout
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="card"
                                    style={{
                                        borderLeft: `4px solid ${guard.type === GuardType.COEXISTENCE ? 'var(--brand-500)' : getBorderColor(guard.status)}`,
                                        ...(guard.type === GuardType.COEXISTENCE ? { border: '2px solid var(--brand-500)', boxShadow: '0 4px 20px rgba(6, 182, 212, 0.15)' } : {}),
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
                                            {guard.has_task === 'Sí' && (
                                                <span className="badge badge-task">
                                                    <FileText style={{ width: 10, height: 10 }} /> Tarea
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
                                                        color: 'var(--brand-400)',
                                                        textDecoration: 'none',
                                                        background: 'rgba(34, 211, 238, 0.1)',
                                                        padding: '2px 10px',
                                                        borderRadius: 'var(--radius-full)',
                                                        border: '1px solid rgba(34, 211, 238, 0.2)',
                                                        transition: 'all 0.2s',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(34, 211, 238, 0.2)';
                                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(34, 211, 238, 0.1)';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                    }}
                                                >
                                                    <Download style={{ width: 12, height: 12 }} />
                                                    VER ADJUNTO
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
                                                    {guard.subject?.name || 'Materia'}
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
                                                        RECOGER GUARDIA
                                                    </motion.button>
                                                )}

                                            {guard.status === GuardStatus.ASSIGNED &&
                                                currentUser &&
                                                !isAdministracionRole(currentUser?.role) &&
                                                (guard.covering_teacher_id === currentUser.id || isPantallaRole(currentUser?.role)) && (
                                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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

                                            {/* REVERSAL FOR COMPLETED */}
                                            {guard.status === GuardStatus.COMPLETED &&
                                                currentUser &&
                                                !isAdministracionRole(currentUser?.role) &&
                                                (guard.covering_teacher_id === currentUser.id || isAdmin || isPantallaRole(currentUser?.role)) && (
                                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                                                        {guard.type === GuardType.COEXISTENCE && (guard.covering_teacher_id === currentUser.id || isPantallaRole(currentUser?.role)) && (
                                                            <motion.button
                                                                whileHover={{ scale: 1.03 }}
                                                                whileTap={{ scale: 0.96 }}
                                                                onClick={() => onRelease(guard.id)}
                                                                className="btn btn-ghost"
                                                                style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                                            >
                                                                SOLTAR
                                                            </motion.button>
                                                        )}
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
        </div>
    );
};

export default GuardList;
