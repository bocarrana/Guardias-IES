import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Map as MapIcon } from 'lucide-react';
import InteractiveFloorMap, { RoomGuardInfo } from './InteractiveFloorMap';
import { MetaOptions, Teacher, PersonalScheduleEntry } from '../types';
import { getAllPersonalSchedules } from '../services/supabaseClient';
import Ed1_0_SVG from '../assets/maps/Ed1_0.svg?raw';
import Ed1_1_SVG from '../assets/maps/Ed1_1.svg?raw';
import Ed1_2_SVG from '../assets/maps/Ed1_2.svg?raw';
import Ed7_SVG from '../assets/maps/Ed7.svg?raw';
import Ed3_SVG from '../assets/maps/Ed3.svg?raw';
import Ed4_SVG from '../assets/maps/Ed4.svg?raw';
import Ed5_SVG from '../assets/maps/Ed5.svg?raw';
import Ed6_SVG from '../assets/maps/Ed6.svg?raw';
import General_SVG from '../assets/maps/General.svg?raw';

type BuildingKey = 'general' | 'main' | 'agraria' | 'secundario' | 'b' | 'c' | 'ef';

interface ClassroomMapModalProps {
    roomId: string | null;
    meta: MetaOptions;
    teachers?: Teacher[];
    onClose: () => void;
}

const BUILDING_LABELS: Record<BuildingKey, string> = {
    general: 'PLANO GENERAL DEL CENTRO',
    main: 'EDIFICIO PRINCIPAL',
    agraria: 'EDIFICIO AGRARIA',
    secundario: 'EDIFICIO SECUNDARIO',
    b: 'EDIFICIO B',
    c: 'EDIFICIO C',
    ef: 'EDIFICIO EF',
};

// Automagically locate the building and floor by checking the SVG markup
const findLocationForRoom = (id: string): { b: BuildingKey, f: number } => {
    const search = `id="${id}"`;
    if (Ed1_0_SVG.includes(search)) return { b: 'main', f: 0 };
    if (Ed1_1_SVG.includes(search)) return { b: 'main', f: 1 };
    if (Ed1_2_SVG.includes(search)) return { b: 'main', f: 2 };
    if (Ed7_SVG.includes(search)) return { b: 'agraria', f: 0 };
    if (Ed3_SVG.includes(search)) return { b: 'secundario', f: 0 };
    if (Ed4_SVG.includes(search)) return { b: 'b', f: 0 };
    if (Ed5_SVG.includes(search)) return { b: 'c', f: 0 };
    if (Ed6_SVG.includes(search)) return { b: 'ef', f: 0 };
    return { b: 'general', f: 0 }; // Fallback
};

const ClassroomMapModal: React.FC<ClassroomMapModalProps> = ({ roomId, meta, teachers = [], onClose }) => {
    const [allSchedules, setAllSchedules] = useState<PersonalScheduleEntry[]>([]);
    
    useEffect(() => {
        if (!roomId) return;
        const fetchData = async () => {
            try {
                const data = await getAllPersonalSchedules();
                setAllSchedules(data);
            } catch (err) {
                console.error('Error fetching schedules for modal', err);
            }
        };
        fetchData();
    }, [roomId]);

    if (!roomId) return null;

    // Use current time to find who is effectively there right now or the current slot logic
    const now = new Date();
    const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const currentDay = DAYS[now.getDay()] === 'Sábado' || DAYS[now.getDay()] === 'Domingo' ? 'Lunes' : DAYS[now.getDay()];
    
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    const lectiveSlots = meta.slots.filter(s => !s.label?.toLowerCase().includes('recreo'));
    
    let currentSlot = lectiveSlots.find(s => {
        if (!s.start_time || !s.end_time) return false;
        const [startH, startM] = s.start_time.split(':').map(Number);
        const [endH, endM] = s.end_time.split(':').map(Number);
        return currentTimeMinutes >= (startH * 60 + startM) && currentTimeMinutes <= (endH * 60 + endM);
    });

    if (!currentSlot && lectiveSlots.length > 0) {
        currentSlot = lectiveSlots[0];
    }

    const occupancy = allSchedules.find(entry => 
        entry.dia_semana === currentDay && 
        entry.franja_id === currentSlot?.id && 
        entry.aula_id === roomId
    );

    const room = meta.classrooms.find(c => c.id === roomId);
    let activeGuardInfo: RoomGuardInfo | null = null;
    
    if (room) {
        if (occupancy) {
            const teacher = teachers.find(t => t.id === occupancy.profesor_id);
            activeGuardInfo = {
                roomId: room.id,
                roomLabel: room.name,
                guardTeacher: teacher ? teacher.name : 'Profesor',
                timeSlot: `${currentSlot?.start_time || ''} - ${currentSlot?.end_time || ''}`,
                avatarUrl: teacher?.avatar_url,
                teacher: teacher,
                groupLabel: occupancy.grupo?.name
            };
        } else {
            activeGuardInfo = {
                roomId: room.id,
                roomLabel: room.name,
                guardTeacher: null,
                timeSlot: `${currentSlot?.start_time || ''} - ${currentSlot?.end_time || ''}`
            };
        }
    }

    const loc = findLocationForRoom(roomId);
    const selectedBuilding = loc.b;
    const selectedFloor = loc.f;

    const getSvgMarkup = (): string | undefined => {
        switch (selectedBuilding) {
            case 'general': return General_SVG;
            case 'main': return selectedFloor === 0 ? Ed1_0_SVG : selectedFloor === 1 ? Ed1_1_SVG : Ed1_2_SVG;
            case 'agraria': return Ed7_SVG;
            case 'secundario': return Ed3_SVG;
            case 'b': return Ed4_SVG;
            case 'c': return Ed5_SVG;
            case 'ef': return Ed6_SVG;
            default: return undefined;
        }
    };

    const getFloorLabel = (): string => {
        const base = BUILDING_LABELS[selectedBuilding] || '';
        if (selectedBuilding === 'main') {
            return `${base} · ${selectedFloor === 0 ? 'PLANTA BAJA' : `PLANTA ${selectedFloor}ª`}`;
        }
        return base;
    };

    return createPortal(
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 md:p-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Backdrop overlay */}
                <div 
                    className="absolute inset-0 w-full h-full bg-slate-950/95" 
                    onClick={onClose}
                />

                <motion.div
                    className="relative flex flex-col rounded-[2.5rem] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 bg-[#0b1628]"
                    style={{
                        width: '90vw',
                        maxWidth: '1200px',
                        height: '80vh',
                        maxHeight: '85vh'
                    }}
                    initial={{ scale: 0.95, y: 30, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.95, y: -30, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    {/* Close button - clearly positioned outside the map content */}
                    <button 
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            zIndex: 60,
                            background: 'rgba(15,23,42,0.95)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: 14,
                            width: 44,
                            height: 44,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'rgba(255,255,255,0.7)',
                            transition: 'all 0.25s ease',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(239,68,68,0.2)';
                            e.currentTarget.style.color = '#f87171';
                            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
                            e.currentTarget.style.transform = 'scale(1.08)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(15,23,42,0.85)';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        <X size={22} />
                    </button>

                    {/* Building / Floor label badge - bottom left */}
                    <div style={{
                        position: 'absolute',
                        bottom: 16,
                        left: 16,
                        zIndex: 60,
                        background: 'rgba(15,23,42,0.95)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 12,
                        padding: '8px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    }}>
                        <MapIcon size={14} style={{ color: '#22d3ee', flexShrink: 0 }} />
                        <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            color: 'rgba(255,255,255,0.7)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                        }}>
                            {room?.name} · {getFloorLabel()}
                        </span>
                    </div>

                    {/* Map Content */}
                    <div className="flex-1 relative bg-[#0b1628]">
                        <InteractiveFloorMap
                            floorLabel="" 
                            highlightedRoomId={roomId}
                            highlightedRoomLabel={room?.name}
                            svgMarkup={getSvgMarkup()}
                            guardInfo={activeGuardInfo}
                        />
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

export default ClassroomMapModal;
