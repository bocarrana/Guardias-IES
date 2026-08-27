import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MetaOptions, PersonalScheduleEntry, Classroom, Teacher, RoomReservation } from '../types';
import InteractiveScheduleGrid from './InteractiveScheduleGrid';
import QuickReservationModal from './QuickReservationModal';
import { getAllPersonalSchedules, getRoomReservations, createRoomReservation, deleteRoomReservation, getTeachers, getQuickReservationsForDate, createQuickReservation, cleanupExpiredQuickReservations } from '../services/supabaseClient';
import { toast } from 'sonner';
import { Search, MapPin, CalendarPlus, Trash2, CalendarDays, Clock, User, Bookmark, History, Zap } from 'lucide-react';
import { isAdminRole, canAccessAdminPanel } from '../utils/roles';
import { MonthDayPicker } from './MonthDayPicker';

interface FreeClassroomsProps {
    meta: MetaOptions;
    currentUser: Teacher | null;
    onNavigateToTeacher?: (teacherName: string) => void;
}

const FreeClassrooms: React.FC<FreeClassroomsProps> = ({ meta, currentUser, onNavigateToTeacher }) => {
    const [allSchedules, setAllSchedules] = useState<PersonalScheduleEntry[]>([]);
    const [reservations, setReservations] = useState<RoomReservation[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [activeTab, setActiveTab] = useState<'grid' | 'reservations' | 'quick'>('grid');

    // Reservation states
    const [resDate, setResDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [resAulaId, setResAulaId] = useState<string>('');
    const [resSlotId, setResSlotId] = useState<string>('');
    const [resMotivo, setResMotivo] = useState<string>('');
    const [resAnual, setResAnual] = useState(false);
    const [submittingRes, setSubmittingRes] = useState(false);
    const [resListTab, setResListTab] = useState<'upcoming' | 'history'>('upcoming');

    // Quick reservation states
    const [quickReservations, setQuickReservations] = useState<RoomReservation[]>([]);
    const [quickModal, setQuickModal] = useState<{ roomId: string; roomName: string; slotId: string; slotLabel: string; existingName?: string; existingId?: string } | null>(null);

    const todayStr = new Date().toISOString().split('T')[0];

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [schedulesData, resData, teachersData, quickData] = await Promise.all([
                getAllPersonalSchedules(),
                getRoomReservations(),
                getTeachers(),
                getQuickReservationsForDate(todayStr)
            ]);
            setAllSchedules(schedulesData);
            setReservations(resData);
            setTeachers(teachersData);
            setQuickReservations(quickData);
        } catch (err) {
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
        // Auto-cleanup expired quick reservations on mount
        cleanupExpiredQuickReservations().then(count => {
            if (count > 0) console.log(`Cleaned up ${count} expired quick reservations`);
        });

        // Midnight auto-reset: check every 60s if the date has changed
        let lastDate = new Date().toISOString().split('T')[0];
        const midnightTimer = setInterval(async () => {
            const nowDate = new Date().toISOString().split('T')[0];
            if (nowDate !== lastDate) {
                lastDate = nowDate;
                console.log('Midnight reset: cleaning up yesterday\'s quick reservations');
                await cleanupExpiredQuickReservations();
                const freshData = await getQuickReservationsForDate(nowDate);
                setQuickReservations(freshData);
            }
        }, 60_000);

        return () => clearInterval(midnightTimer);
    }, []);

    const allowedRooms = useMemo(() => {
        return meta.classrooms.filter(c => ['Informática', 'Ramón y Cajal', 'Sala Multiusos', 'Biblioteca'].includes(c.name));
    }, [meta.classrooms]);

    useEffect(() => {
        if (!resAulaId && allowedRooms.length > 0) {
            setResAulaId(allowedRooms[0].id);
        }
    }, [allowedRooms, resAulaId]);

    // Día de la semana de hoy (para cruzar reservas rápidas con la vista General)
    const todayWeekday = useMemo(() => {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return days[new Date().getDay()];
    }, []);

    // Mapa de reservas rápidas de hoy: slotId → Map<roomId, teacherName>
    const quickReservedTodayMap = useMemo(() => {
        const map: Record<string, Map<string, string>> = {};
        quickReservations.forEach(qr => {
            if (qr.aula_id && qr.tramo_horario) {
                if (!map[qr.tramo_horario]) map[qr.tramo_horario] = new Map();
                const name = (qr.motivo || '').replace('RAPIDA:', '');
                map[qr.tramo_horario].set(qr.aula_id, name || 'Reservado');
            }
        });
        return map;
    }, [quickReservations]);

    // Agrupar aulas ocupadas por día y franja (para Búsqueda General en Grid)
    const occupiedMap = useMemo(() => {
        const map: Record<string, Record<string, Set<string>>> = {};
        
        // 1. Horario Personal (Classes)
        allSchedules.forEach(entry => {
            if (entry.aula_id) {
                if (!map[entry.dia_semana]) map[entry.dia_semana] = {};
                if (!map[entry.dia_semana][entry.franja_id]) {
                    map[entry.dia_semana][entry.franja_id] = new Set<string>();
                }
                map[entry.dia_semana][entry.franja_id].add(entry.aula_id);
            }
        });

        // 2. Annual Reservations
        reservations.forEach(res => {
            if (res.anual && res.aula_id) {
                const weekday = getWeekdayForDate(res.fecha);
                if (!map[weekday]) map[weekday] = {};
                if (!map[weekday][res.tramo_horario]) {
                    map[weekday][res.tramo_horario] = new Set<string>();
                }
                map[weekday][res.tramo_horario].add(res.aula_id);
            }
        });

        return map;
    }, [allSchedules, reservations]);

    const validClassrooms = useMemo(() => {
        return meta.classrooms.filter(c => {
            const n = c.name.toLowerCase();
            if (c.id === 'A047') return false;
            if (n.includes('pista')) return false;
            if (n.includes('frontón') || n.includes('fronton')) return false;
            if (n.includes('gimnasio')) return false;
            if (n.includes('dpto') || n.includes('departamento')) return false;
            if (n.includes('lab.') || n.includes('laboratorio')) return false;
            if (n.includes('---')) return false;
            if (n.includes('convivencia')) return false;
            if (n.includes('música') || n.includes('musica')) return false;
            if (n.includes('taller')) return false;
            if (['agro1', 'agro2', 'b01', 'b02', 'b03', 'c01', 'c02'].includes(n)) return false;
            return true;
        });
    }, [meta.classrooms]);

    const getFreeClassrooms = (day: string, slotId: string): Classroom[] => {
        const occupiedIds = occupiedMap[day]?.[slotId] || new Set();
        let free = validClassrooms.filter(c => !occupiedIds.has(c.id));
        
        if (searchTerm) {
            free = free.filter(c => 
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                c.location?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return free;
    };

    const getWeekdayForDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return days[d.getDay()];
    };

    const getSlotStatus = (slotId: string) => {
        if (!resDate || !resAulaId) return { type: 'free', label: 'Libre' };
        
        const weekday = getWeekdayForDate(resDate);
        
        // 1. Check classes (Horario General)
        const isClass = allSchedules.some(s => s.aula_id === resAulaId && s.dia_semana === weekday && s.franja_id === slotId && s.tipo === 'Lectivo');
        if (isClass) return { type: 'class', label: 'Ocupado por Clase' };
        
        // 2. Check reservations
        const existingRes = reservations.find(r => {
             const sameRoom = r.aula_id === resAulaId;
             const sameSlot = r.tramo_horario === slotId;
             if (!sameRoom || !sameSlot) return false;
             
             // Specific date
             if (r.fecha === resDate) return true;
             
             // Annual for same weekday
             if (r.anual) {
                 const resWeekday = getWeekdayForDate(r.fecha);
                 if (resWeekday === weekday) return true;
             }
             
             return false;
        });

        if (existingRes) {
             if (existingRes.anual) {
                 return { type: 'class', label: 'Ocupado por Curso', res: existingRes };
             }
             const userTeacher = teachers.find(t => t.user_id === existingRes.profesor_id);
             const userEmail = userTeacher?.email ? userTeacher.email.split('@')[0] : 'Profesor';
             return { type: 'reserved', label: `Reservado por ${userEmail}`, res: existingRes };
        }
        
        return { type: 'free', label: 'Libre' };
    };
    const isAdmin = canAccessAdminPanel(currentUser);

    const handleDeleteReservation = async (res: RoomReservation) => {
        if (!currentUser) return;
        
        if (res.profesor_id !== currentUser.user_id) {
            if (!isAdmin) {
                toast.error('No tienes permiso para borrar esta reserva.');
                return;
            }
            
            const resOwner = teachers.find(t => t.user_id === res.profesor_id);
            if (resOwner?.email === 'alplanast@iesreyescatolicos.com' && !isAdminRole(currentUser?.role)) {
                 toast.error('No puedes borrar reservas del Admin.');
                 return;
            }
        }
        
        try {
            await deleteRoomReservation(res.id);
            toast.success('Reserva eliminada');
            fetchAll();
        } catch (e) {
            toast.error('Error al eliminar');
        }
    };

    const handleCreateReservation = async (e: React.FormEvent) => {
         e.preventDefault();
         if (!currentUser) {
             toast.error('Debes iniciar sesión para reservar');
             return;
         }
         if (!resSlotId) {
             toast.error('Selecciona un tramo horario');
             return;
         }
         
         const status = getSlotStatus(resSlotId);
         if (status.type !== 'free') {
             toast.error('Este tramo ya está ocupado');
             return;
         }

         setSubmittingRes(true);
         try {
             await createRoomReservation({
                 aula_id: resAulaId,
                 profesor_id: currentUser.user_id!,
                 fecha: resDate,
                 tramo_horario: resSlotId,
                 motivo: resMotivo,
                 anual: resAnual
             });
             toast.success('Reserva creada con éxito');
             setResMotivo('');
             setResSlotId('');
             setResAnual(false);
             fetchAll();
         } catch(err: any) {
             console.error('Reservation error:', err);
             toast.error(`Error al reservar: ${err?.message || 'Error desconocido'}`);
         } finally {
             setSubmittingRes(false);
         }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>
             {/* Cabecera y Tabs */}
             <div style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: 'var(--shadow-sm)',
                flexWrap: 'wrap',
                gap: 16
             }}>
                 <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {activeTab === 'grid' ? 'Aulas Libres' : activeTab === 'quick' ? 'Reserva Rápida del Día' : 'Reserva de Espacios'}
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                        {activeTab === 'grid' ? 'Consulta qué espacios no tienen docencia asignada en tiempo real.' : activeTab === 'quick' ? 'Toca un aula libre para reservarla. Se resetean al final del día.' : 'Reserva espacios como la Sala Multiusos, Ramón y Cajal o Informática.'}
                    </p>
                 </div>
                 
                 <div style={{ display: 'flex', gap: 8, background: 'var(--bg-main)', padding: 4, borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                     <button
                        onClick={() => setActiveTab('grid')}
                        className={`btn ${activeTab === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '13px' }}
                     >
                         <MapPin size={16} style={{ marginRight: 6 }} /> General
                     </button>
                     <button
                        onClick={() => setActiveTab('reservations')}
                        className={`btn ${activeTab === 'reservations' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '13px' }}
                     >
                         <Bookmark size={16} style={{ marginRight: 6 }} /> Reserva
                     </button>
                     <button
                        onClick={() => setActiveTab('quick')}
                        className={`btn ${activeTab === 'quick' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '13px' }}
                     >
                         <Zap size={16} style={{ marginRight: 6 }} /> Rápida
                     </button>
                 </div>
             </div>

             {/* Contenido */}
             <div style={{
                flex: 1,
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-lg)',
             }}>
                 {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: 16 }}>
                        <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--brand-900)', borderTopColor: 'var(--brand-500)', borderRadius: '50%' }} />
                        <span>Cargando datos...</span>
                    </div>
                 ) : activeTab === 'grid' ? (
                     <>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ position: 'relative', width: '300px' }}>
                                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input 
                                    type="text"
                                    placeholder="Buscar aula o ubicación..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-sidebar)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: '8px',
                                        padding: '8px 12px 8px 36px',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.85rem',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>
                        <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
                            <InteractiveScheduleGrid
                                slots={meta.slots}
                                interactiveBreakSlots={true}
                                showRowHeaders={true}
                                getItem={() => ({})}
                                onSlotClick={() => {}}
                                renderItemContent={(_, day, slot) => {
                                    const freeRooms = getFreeClassrooms(day, slot.id);
                                    const totalRooms = validClassrooms.length;

                                    // Separar aulas con reserva rápida de hoy (solo para el día actual)
                                    const isToday = day === todayWeekday;
                                    const quickSlotMap = isToday ? quickReservedTodayMap[slot.id] : undefined;
                                    const actuallyFree = quickSlotMap
                                        ? freeRooms.filter(r => !quickSlotMap.has(r.id))
                                        : freeRooms;
                                    const quickReservedRooms = quickSlotMap
                                        ? freeRooms.filter(r => quickSlotMap.has(r.id))
                                        : [];

                                    const occupancyRate = totalRooms > 0 ? ((totalRooms - actuallyFree.length) / totalRooms) * 100 : 0;
                                    
                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', height: '100%', maxHeight: 128, overflowY: 'auto', paddingRight: 2 }}>
                                            <div style={{ fontSize: '10px', fontWeight: 800, color: actuallyFree.length > 5 ? 'var(--brand-700)' : 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', marginBottom: 4, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 2, position: 'sticky', top: 0, zIndex: 5, background: '#0a1727', paddingTop: 8, paddingLeft: 8, paddingRight: 8, marginTop: -4 }}>
                                                <span>{actuallyFree.length} LIBRES</span>
                                                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{Math.round(occupancyRate)}% OCUP.</span>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {/* Aulas con reserva rápida → en rojo */}
                                                {quickReservedRooms.map(room => (
                                                    <div
                                                        key={room.id}
                                                        title={`${room.name} — OCUPADA (${quickSlotMap!.get(room.id)})`}
                                                        style={{
                                                            padding: '3px 8px',
                                                            background: 'rgba(248,113,113,0.12)',
                                                            border: '1px solid rgba(248,113,113,0.4)',
                                                            color: 'var(--danger)',
                                                            fontSize: '10px',
                                                            borderRadius: 6,
                                                            fontWeight: 800,
                                                            whiteSpace: 'nowrap',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 3,
                                                            boxShadow: '0 1px 3px rgba(248,113,113,0.15)'
                                                        }}
                                                    >
                                                        {room.name}
                                                        <span style={{ fontSize: '8px', opacity: 0.75, fontWeight: 700 }}>OCUPADA</span>
                                                    </div>
                                                ))}
                                                {/* Aulas libres normales */}
                                                {actuallyFree.map(room => (
                                                    <div key={room.id} title={`${room.name}${room.location ? ` - ${room.location}` : ''}`} style={{ padding: '3px 8px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '10px', borderRadius: 6, fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                                        {room.name}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                        </div>
                     </>
                 ) : activeTab === 'quick' ? (
                     /* ══════════ QUICK RESERVATION TAB ══════════ */
                     <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                         {/* Toolbar */}
                         <div style={{
                             padding: '12px 24px',
                             borderBottom: '1px solid var(--border-subtle)',
                             display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                             flexWrap: 'wrap', gap: 10
                         }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                 <CalendarDays size={16} color="var(--brand-400)" />
                                 <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-400)', fontFamily: 'var(--font-mono)' }}>
                                     {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                 </span>
                                 <span style={{
                                     fontSize: '0.7rem', fontWeight: 800,
                                     background: 'rgba(6,182,212,0.1)', color: 'var(--brand-400)',
                                     padding: '2px 8px', borderRadius: 6,
                                     border: '1px solid rgba(6,182,212,0.2)'
                                 }}>
                                     {quickReservations.length} reserva{quickReservations.length !== 1 ? 's' : ''} hoy
                                 </span>
                             </div>

                         </div>

                         {/* Grid: Aulas × Franjas */}
                         <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: 16 }}>
                             {(() => {
                                 const DAYS_MAP = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                                 const todayDay = DAYS_MAP[new Date().getDay()] || 'Lunes';
                                 const lectiveSlots = meta.slots.filter(s => !s.label?.toLowerCase().includes('recreo'));

                                 const getQuickCellStatus = (roomId: string, slotId: string) => {
                                     // 1. Check class schedule
                                     const hasClass = allSchedules.some(s =>
                                         s.aula_id === roomId && s.dia_semana === todayDay && s.franja_id === slotId && s.tipo === 'Lectivo'
                                     );
                                     if (hasClass) return { status: 'class' as const, label: 'Clase' };

                                     // 2. Check quick reservations
                                     const qr = quickReservations.find(r => r.aula_id === roomId && r.tramo_horario === slotId);
                                     if (qr) {
                                         const name = (qr.motivo || '').replace('RAPIDA:', '');
                                         return { status: 'reserved' as const, label: name, id: qr.id };
                                     }

                                     // 3. Check normal reservations for today
                                     const nr = reservations.find(r => {
                                         if (r.aula_id !== roomId || r.tramo_horario !== slotId) return false;
                                         if (r.fecha === todayStr) return true;
                                         if (r.anual) {
                                             const resDay = DAYS_MAP[new Date(r.fecha + 'T00:00:00').getDay()];
                                             return resDay === todayDay;
                                         }
                                         return false;
                                     });
                                     if (nr) return { status: 'occupied' as const, label: 'Reservado' };

                                     return { status: 'free' as const, label: 'Libre' };
                                 };

                                 return (
                                     <table style={{
                                         width: '100%', borderCollapse: 'separate',
                                         borderSpacing: 6, tableLayout: 'fixed'
                                     }}>
                                         <thead>
                                             <tr>
                                                 <th style={{
                                                     width: 140, padding: '8px 12px',
                                                     fontSize: '0.7rem', fontWeight: 800,
                                                     color: 'var(--brand-400)', textTransform: 'uppercase',
                                                     letterSpacing: '0.08em', textAlign: 'left'
                                                 }}>
                                                     Aula
                                                 </th>
                                                 {lectiveSlots.map(slot => (
                                                     <th key={slot.id} style={{
                                                         padding: '8px 6px',
                                                         fontSize: '0.7rem', fontWeight: 800,
                                                         color: 'var(--text-secondary)', textAlign: 'center',
                                                         borderBottom: '2px solid var(--border-subtle)'
                                                     }}>
                                                         <div>{slot.label}</div>
                                                         <div style={{ fontSize: '0.6rem', opacity: 0.6, marginTop: 2 }}>
                                                             {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                                                         </div>
                                                     </th>
                                                 ))}
                                             </tr>
                                         </thead>
                                         <tbody>
                                             {validClassrooms.map(room => (
                                                 <tr key={room.id}>
                                                     <td style={{
                                                         padding: '8px 12px',
                                                         fontSize: '0.85rem', fontWeight: 700,
                                                         color: 'var(--text-primary)',
                                                         whiteSpace: 'nowrap',
                                                         borderRight: '2px solid var(--border-subtle)'
                                                     }}>
                                                         {room.name}
                                                     </td>
                                                     {lectiveSlots.map(slot => {
                                                         const cell = getQuickCellStatus(room.id, slot.id);
                                                         const isClass = cell.status === 'class';
                                                         const isReserved = cell.status === 'reserved';
                                                         const isOccupied = cell.status === 'occupied';
                                                         const isFree = cell.status === 'free';

                                                         return (
                                                             <td
                                                                 key={slot.id}
                                                                 onClick={() => {
                                                                     if (isClass || isOccupied) return;
                                                                     if (isReserved) {
                                                                         setQuickModal({
                                                                             roomId: room.id,
                                                                             roomName: room.name,
                                                                             slotId: slot.id,
                                                                             slotLabel: `${slot.start_time?.slice(0,5)} - ${slot.end_time?.slice(0,5)}`,
                                                                             existingName: cell.label,
                                                                             existingId: cell.id
                                                                         });
                                                                     } else {
                                                                         setQuickModal({
                                                                             roomId: room.id,
                                                                             roomName: room.name,
                                                                             slotId: slot.id,
                                                                             slotLabel: `${slot.start_time?.slice(0,5)} - ${slot.end_time?.slice(0,5)}`
                                                                         });
                                                                     }
                                                                 }}
                                                                 style={{
                                                                     padding: '10px 6px',
                                                                     borderRadius: 10,
                                                                     textAlign: 'center',
                                                                     cursor: isClass || isOccupied ? 'default' : 'pointer',
                                                                     transition: 'all 0.2s',
                                                                     minHeight: 56,
                                                                     verticalAlign: 'middle',
                                                                     background: isReserved
                                                                         ? 'rgba(248,113,113,0.15)'
                                                                         : isClass || isOccupied
                                                                             ? 'var(--bg-sidebar)'
                                                                             : 'rgba(74,222,128,0.08)',
                                                                     border: isReserved
                                                                         ? '2px solid rgba(248,113,113,0.5)'
                                                                         : isClass || isOccupied
                                                                             ? '1px solid var(--border-subtle)'
                                                                             : '1px dashed rgba(74,222,128,0.3)',
                                                                     opacity: isClass || isOccupied ? 0.5 : 1,
                                                                 }}
                                                                 onMouseEnter={e => {
                                                                     if (isFree) {
                                                                         e.currentTarget.style.background = 'rgba(74,222,128,0.18)';
                                                                         e.currentTarget.style.borderColor = 'rgba(74,222,128,0.5)';
                                                                     }
                                                                 }}
                                                                 onMouseLeave={e => {
                                                                     if (isFree) {
                                                                         e.currentTarget.style.background = 'rgba(74,222,128,0.08)';
                                                                         e.currentTarget.style.borderColor = 'rgba(74,222,128,0.3)';
                                                                     }
                                                                 }}
                                                             >
                                                                 {isReserved ? (
                                                                     <div>
                                                                         <div style={{
                                                                             fontSize: '0.75rem', fontWeight: 800,
                                                                             color: 'var(--danger)',
                                                                             overflow: 'hidden', textOverflow: 'ellipsis',
                                                                             whiteSpace: 'nowrap'
                                                                         }}>
                                                                             {cell.label}
                                                                         </div>
                                                                         <div style={{
                                                                             fontSize: '0.6rem', color: 'rgba(248,113,113,0.6)',
                                                                             fontWeight: 600, marginTop: 2
                                                                         }}>
                                                                             RESERVADO
                                                                         </div>
                                                                     </div>
                                                                 ) : isClass || isOccupied ? (
                                                                     <span style={{
                                                                         fontSize: '0.7rem', fontWeight: 700,
                                                                         color: 'var(--text-muted)', textTransform: 'uppercase'
                                                                     }}>
                                                                         {cell.label}
                                                                     </span>
                                                                 ) : (
                                                                     <span style={{
                                                                         fontSize: '0.75rem', fontWeight: 700,
                                                                         color: 'var(--success)', textTransform: 'uppercase'
                                                                     }}>
                                                                         Libre
                                                                     </span>
                                                                 )}
                                                             </td>
                                                         );
                                                     })}
                                                 </tr>
                                             ))}
                                         </tbody>
                                     </table>
                                 );
                             })()}
                         </div>

                         {/* Quick Reservation Modal */}
                         {quickModal && (
                             <QuickReservationModal
                                 roomName={quickModal.roomName}
                                 slotLabel={quickModal.slotLabel}
                                 existingTeacherName={quickModal.existingName}
                                 onConfirm={async (teacherName) => {
                                     try {
                                         await createQuickReservation(
                                             quickModal.roomId,
                                             todayStr,
                                             quickModal.slotId,
                                             teacherName
                                         );
                                         toast.success(`${quickModal.roomName} reservada para ${teacherName}`);
                                         setQuickModal(null);
                                         const quickData = await getQuickReservationsForDate(todayStr);
                                         setQuickReservations(quickData);
                                     } catch (err: any) {
                                         toast.error(`Error: ${err?.message || 'No se pudo reservar'}`);
                                     }
                                 }}
                                 onCancel={quickModal.existingId ? async () => {
                                     try {
                                         await deleteRoomReservation(quickModal.existingId!);
                                         toast.success('Reserva cancelada');
                                         setQuickModal(null);
                                         const quickData = await getQuickReservationsForDate(todayStr);
                                         setQuickReservations(quickData);
                                     } catch (err) {
                                         toast.error('Error al cancelar reserva');
                                     }
                                 } : undefined}
                                 onClose={() => setQuickModal(null)}
                             />
                         )}
                     </div>
                 ) : (
                     <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

                         {/* Formulario de Reserva */}
                         <div style={{ width: 350, borderRight: '1px solid var(--border-subtle)', padding: 24, background: 'var(--bg-main)', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
                             <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                                 <CalendarPlus size={18} color="var(--brand-500)"/> Nueva Reserva
                             </h3>
                             <form onSubmit={handleCreateReservation} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                 
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                     <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Espacio</label>
                                     <select 
                                        className="select"
                                        value={resAulaId} 
                                        onChange={e => { setResAulaId(e.target.value); setResSlotId(''); }}
                                        required
                                     >
                                         <option value="" disabled>Selecciona un aula...</option>
                                         {allowedRooms.map(r => (
                                             <option key={r.id} value={r.id}>{r.name}</option>
                                         ))}
                                     </select>
                                 </div>

                                 <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Fecha</label>
                                      <MonthDayPicker 
                                          value={resDate} 
                                          onChange={setResDate} 
                                          fullWidth
                                      />
                                  </div>

                                 <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setResAnual(!resAnual)}>
                                     <input 
                                         type="checkbox" 
                                         checked={resAnual} 
                                         onChange={() => {}} // Handled by div onClick for better hit area
                                         style={{ width: 18, height: 18, cursor: 'pointer' }}
                                     />
                                     <div style={{ display: 'flex', flexDirection: 'column' }}>
                                         <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Reserva para todo el curso</span>
                                     </div>
                                  </div>

                                 <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                     <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tramo / Disponibilidad</label>
                                     <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8, background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-subtle)', maxHeight: 250, overflowY: 'auto' }}>
                                        {meta.slots.filter(s => !s.label.toLowerCase().includes('recreo')).map(slot => {
                                             const stat = getSlotStatus(slot.id);
                                             return (
                                                 <label 
                                                    key={slot.id} 
                                                    style={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'space-between',
                                                        padding: '8px 12px', 
                                                        borderRadius: 6, 
                                                        background: stat.type === 'free' ? 'var(--bg-main)' : 'var(--bg-card)', 
                                                        border: `1px solid ${resSlotId === slot.id ? 'var(--brand-500)' : 'var(--border-subtle)'}`,
                                                        cursor: stat.type === 'free' ? 'pointer' : 'not-allowed',
                                                        opacity: stat.type === 'free' ? 1 : 0.6
                                                    }}
                                                >
                                                     <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                         <input 
                                                            type="radio" 
                                                            name="slot" 
                                                            value={slot.id} 
                                                            checked={resSlotId === slot.id}
                                                            onChange={() => setResSlotId(slot.id)}
                                                            disabled={stat.type !== 'free'}
                                                         />
                                                         <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{slot.start_time} - {slot.end_time}</span>
                                                     </div>
                                                     <span style={{ 
                                                         fontSize: '0.75rem', 
                                                         fontWeight: 700,
                                                         color: stat.type === 'free' ? 'var(--brand-500)' : stat.type === 'class' ? 'var(--danger)' : 'var(--warning)'
                                                     }}>
                                                         {stat.label}
                                                     </span>
                                                 </label>
                                             );
                                        })}
                                     </div>
                                 </div>

                                 <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                     <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Motivo (Opcional)</label>
                                     <input 
                                         type="text" 
                                         value={resMotivo} 
                                         onChange={e => setResMotivo(e.target.value)} 
                                         placeholder="Ej: Examen, Charla..."
                                         style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                                     />
                                 </div>

                                 <button 
                                    type="submit" 
                                    className="btn btn-primary" 
                                    disabled={submittingRes || !resSlotId || getSlotStatus(resSlotId).type !== 'free'}
                                    style={{ marginTop: 12 }}
                                 >
                                     {submittingRes ? 'Reservando...' : 'Confirmar Reserva'}
                                 </button>
                             </form>
                         </div>

                         {/* Panel de Reservas — Próximas + Historial */}
                         <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
                             {/* Tabs */}
                            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-main)', padding: 4, borderRadius: 10, border: '1px solid var(--border-subtle)', alignSelf: 'flex-start' }}>
                                {(() => {
                                    const todayStr = new Date().toLocaleDateString('en-CA');
                                    const upcomingCount = reservations.filter(r => r.fecha >= todayStr).length;
                                    const historyCount = reservations.filter(r => r.fecha < todayStr).length;

                                    return (
                                        <>
                                            <button
                                                onClick={() => setResListTab('upcoming')}
                                                style={{
                                                    padding: '6px 16px', borderRadius: 7, fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
                                                    background: resListTab === 'upcoming' ? 'var(--brand-500)' : 'transparent',
                                                    color: resListTab === 'upcoming' ? '#fff' : 'var(--text-secondary)'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <CalendarDays size={14}/> 
                                                    <span>Próximas</span>
                                                </div>
                                                <span style={{
                                                    padding: '1px 6px',
                                                    borderRadius: 6,
                                                    fontSize: '0.65rem',
                                                    background: resListTab === 'upcoming' ? 'rgba(255,255,255,0.2)' : 'rgba(6, 182, 212, 0.1)',
                                                    color: resListTab === 'upcoming' ? 'white' : 'var(--brand-400)',
                                                    minWidth: 20,
                                                    textAlign: 'center'
                                                }}>
                                                    {upcomingCount}
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => setResListTab('history')}
                                                style={{
                                                    padding: '6px 16px', borderRadius: 7, fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
                                                    background: resListTab === 'history' ? 'var(--brand-500)' : 'transparent',
                                                    color: resListTab === 'history' ? '#fff' : 'var(--text-secondary)'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <History size={14}/> 
                                                    <span>Historial</span>
                                                </div>
                                                <span style={{
                                                    padding: '1px 6px',
                                                    borderRadius: 6,
                                                    fontSize: '0.65rem',
                                                    background: resListTab === 'history' ? 'rgba(255,255,255,0.2)' : 'rgba(6, 182, 212, 0.1)',
                                                    color: resListTab === 'history' ? 'white' : 'var(--brand-400)',
                                                    minWidth: 20,
                                                    textAlign: 'center'
                                                }}>
                                                    {historyCount}
                                                </span>
                                            </button>
                                        </>
                                    );
                                })()}
                            </div>

                             {/* Reservation list */}
                             {(() => {
                                 const todayStr = new Date().toLocaleDateString('en-CA');
                                 const filtered = resListTab === 'upcoming'
                                     ? reservations.filter(r => r.fecha >= todayStr).sort((a, b) => a.fecha.localeCompare(b.fecha))
                                     : reservations.filter(r => r.fecha < todayStr).sort((a, b) => b.fecha.localeCompare(a.fecha));

                                 if (filtered.length === 0) {
                                     return (
                                         <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-main)', borderRadius: 12, border: '1px dashed var(--border-subtle)' }}>
                                             {resListTab === 'upcoming'
                                                 ? 'No hay reservas próximas.'
                                                 : 'No hay reservas pasadas en el historial.'}
                                         </div>
                                     );
                                 }

                                 // Group by date
                                 const grouped: Record<string, RoomReservation[]> = {};
                                 filtered.forEach(r => {
                                     if (!grouped[r.fecha]) grouped[r.fecha] = [];
                                     grouped[r.fecha].push(r);
                                 });

                                 const formatDateLabel = (dateStr: string) => {
                                     if (dateStr === todayStr) return 'Hoy';
                                     const tomorrow = new Date();
                                     tomorrow.setDate(tomorrow.getDate() + 1);
                                     if (dateStr === tomorrow.toLocaleDateString('en-CA')) return 'Mañana';
                                     const d = new Date(dateStr + 'T00:00:00');
                                     const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                                     return `${dayNames[d.getDay()]} ${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
                                 };

                                 return (
                                     <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                         {Object.entries(grouped).map(([date, items]) => (
                                             <div key={date}>
                                                 {/* Date header */}
                                                 <div style={{
                                                     display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                                                     paddingBottom: 6, borderBottom: '1px solid var(--border-subtle)'
                                                 }}>
                                                     <CalendarDays size={14} color={date === todayStr ? 'var(--brand-400)' : 'var(--text-muted)'}/>
                                                     <span style={{
                                                         fontSize: '0.8rem', fontWeight: 700,
                                                         color: date === todayStr ? 'var(--brand-400)' : 'var(--text-secondary)',
                                                         fontFamily: 'var(--font-mono)', letterSpacing: '0.04em'
                                                     }}>
                                                         {formatDateLabel(date)}
                                                     </span>
                                                     <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                                                         {items.length} reserva{items.length > 1 ? 's' : ''}
                                                     </span>
                                                 </div>
                                                 {/* Items for this date */}
                                                 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                     {items.map(res => {
                                                         const isMine = res.profesor_id === currentUser?.user_id;
                                                         const canDelete = isMine || isAdmin;
                                                         const resOwner = teachers.find(t => t.user_id === res.profesor_id);
                                                         const displayName = resOwner?.email?.split('@')[0] || resOwner?.name || 'Profesor';
                                                         const isPast = date < todayStr;

                                                         return (
                                                             <div key={res.id} style={{
                                                                 display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                                 padding: '8px 14px', background: 'var(--bg-main)', borderRadius: 8,
                                                                 border: `1px solid ${isMine ? 'var(--brand-800)' : 'var(--border-subtle)'}`,
                                                                 opacity: isPast ? 0.6 : 1,
                                                                 transition: 'all 0.2s', gap: 10
                                                             }}>
                                                                 <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
                                                                     <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--brand-400)', whiteSpace: 'nowrap' }}>
                                                                         {res.classroom?.name || 'Espacio'}
                                                                     </span>
                                                                     <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 12, border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                                                         <Clock size={10}/>
                                                                         {meta.slots.find(s => s.id === res.tramo_horario)?.start_time} - {meta.slots.find(s => s.id === res.tramo_horario)?.end_time}
                                                                     </span>
                                                                     <span
                                                                         style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', cursor: onNavigateToTeacher ? 'pointer' : 'default', color: onNavigateToTeacher ? 'var(--brand-400)' : 'var(--text-secondary)', transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}
                                                                         onClick={() => { if (onNavigateToTeacher && resOwner) onNavigateToTeacher(resOwner.name); }}
                                                                         onMouseEnter={e => { if (onNavigateToTeacher) (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
                                                                         onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                                                                     >
                                                                         <User size={11}/> {displayName}
                                                                     </span>
                                                                     {res.motivo && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>• {res.motivo}</span>}
                                                                     {res.anual && (
                                                                         <span style={{ 
                                                                             fontSize: '0.65rem', 
                                                                             fontWeight: 800, 
                                                                             background: 'rgba(255,183,0,0.1)', 
                                                                             color: '#ffb700', 
                                                                             padding: '1px 6px', 
                                                                             borderRadius: 4, 
                                                                             border: '1px solid rgba(255,183,0,0.3)',
                                                                             textTransform: 'uppercase'
                                                                         }}>
                                                                             Todo el curso
                                                                         </span>
                                                                     )}
                                                                 </div>
                                                                 {((isMine && !isPast) || isAdmin) && (
                                                                     <button
                                                                         onClick={() => handleDeleteReservation(res)}
                                                                         className="btn btn-ghost"
                                                                         style={{ color: 'var(--danger)', padding: 6, flexShrink: 0 }}
                                                                         title="Eliminar reserva"
                                                                     >
                                                                         <Trash2 size={15}/>
                                                                     </button>
                                                                 )}
                                                             </div>
                                                         );
                                                     })}
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 );
                             })()}
                         </div>
                     </div>
                 )}
             </div>
        </div>
    );
};

export default FreeClassrooms;
