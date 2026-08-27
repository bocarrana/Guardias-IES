import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, Calendar, Map as MapIcon, Layers } from 'lucide-react';
import InteractiveFloorMap, { RoomGuardInfo } from './InteractiveFloorMap';
import { MetaOptions, PersonalScheduleEntry, Teacher } from '../types';
import { getAllPersonalSchedules } from '../services/supabaseClient';
import { toast } from 'sonner';
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

const BUILDINGS: { key: BuildingKey; label: string }[] = [
  { key: 'general', label: 'Plano General' },
  { key: 'main', label: 'Principal' },
  { key: 'secundario', label: 'Secundario' },
  { key: 'agraria', label: 'Agraria' },
  { key: 'b', label: 'Edif. B' },
  { key: 'c', label: 'Edif. C' },
  { key: 'ef', label: 'Edif. EF' },
];

const BUILDING_LABELS: Record<BuildingKey, string> = {
  general: 'PLANO GENERAL DEL CENTRO',
  main: 'EDIFICIO PRINCIPAL',
  agraria: 'EDIFICIO AGRARIA',
  secundario: 'EDIFICIO SECUNDARIO',
  b: 'EDIFICIO B',
  c: 'EDIFICIO C',
  ef: 'EDIFICIO EF',
};

// Mapping for General Map navigation - Maps SVG IDs to Building Keys
const BUILDING_CLICK_MAP: Record<string, BuildingKey> = {
  // Principal / Main / Zona 1
  'text21': 'main', 'tspan21': 'main',
  // Secundario / Zona 3
  'text25': 'secundario', 'tspan4': 'secundario',
  // Agraria / Zona 4
  'text24': 'agraria', 'tspan24': 'agraria', 'path16': 'agraria',
  // B
  'text22': 'b', 'tspan22': 'b', 'path13': 'b',
  // C
  'text23': 'c', 'tspan23': 'c', 'path15': 'c',
  // EF
  'text20': 'ef', 'tspan20': 'ef', 'path2': 'ef',
  // Mapeo corregido de zonas coloreadas (paths)
  'path12': 'secundario', // El color rojo pertenece al edificio secundario
  'path14': 'main',       // El color azul/cian del principal ahora lleva a Principal
  'path17': 'main',       // El área marrón del principal ahora lleva a Principal
};

interface FloorMapProps {
  meta: MetaOptions;
  teachers: Teacher[];
}

const FloorMap: React.FC<FloorMapProps> = ({ meta, teachers }) => {
  const [allSchedules, setAllSchedules] = useState<PersonalScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGuardInfo, setActiveGuardInfo] = useState<RoomGuardInfo | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingKey>('general');
  const [selectedFloor, setSelectedFloor] = useState<number>(0);
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number>(0);
  const [selectedDay, setSelectedDay] = useState<string>('Lunes');

  const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

  const lectiveSlots = useMemo(() =>
    meta.slots.filter(s => !s.label?.toLowerCase().includes('recreo')),
    [meta.slots]
  );

  const currentSlot = useMemo(() => lectiveSlots[selectedSlotIdx], [lectiveSlots, selectedSlotIdx]);
  const dayIdx = DAYS.indexOf(selectedDay);

  useEffect(() => {
    const now = new Date();
    const dIdx = now.getDay();
    const currentDay = dIdx >= 1 && dIdx <= 5 ? DAYS[dIdx - 1] : 'Lunes';
    setSelectedDay(currentDay);

    const currentTime = now.getHours() * 60 + now.getMinutes();
    const lective = meta.slots.filter(s => !s.label?.toLowerCase().includes('recreo'));
    const slotIdx = lective.findIndex(s => {
      if (!s.start_time || !s.end_time) return false;
      const [startH, startM] = s.start_time.split(':').map(Number);
      const [endH, endM] = s.end_time.split(':').map(Number);
      const start = startH * 60 + startM;
      const end = endH * 60 + endM;
      return currentTime >= start && currentTime <= end;
    });

    setSelectedSlotIdx(slotIdx !== -1 ? slotIdx : 0);
  }, [meta.slots]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getAllPersonalSchedules();
        setAllSchedules(data);
      } catch (err) {
        toast.error('Error al sincronizar datos del mapa');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const currentOccupancy = useMemo(() => {
    const slot = lectiveSlots[selectedSlotIdx];
    if (!slot) return {};
    const map: Record<string, PersonalScheduleEntry> = {};
    allSchedules.forEach(entry => {
      if (entry.dia_semana === selectedDay && entry.franja_id === slot.id && entry.aula_id) {
        map[entry.aula_id] = entry;
      }
    });
    return map;
  }, [allSchedules, selectedDay, selectedSlotIdx, lectiveSlots]);

  const roomStates = useMemo(() => {
    if (selectedBuilding === 'general') {
      // Create a set of interactive zones for the general map
      const states: Record<string, any> = {};
      Object.keys(BUILDING_CLICK_MAP).forEach(id => {
        states[id] = 'interactive';
      });
      return states;
    }
    const states: Record<string, 'free' | 'occupied'> = {};
    meta.classrooms.forEach(room => {
      states[room.id] = currentOccupancy[room.id] ? 'occupied' : 'free';
    });
    return states;
  }, [meta.classrooms, currentOccupancy, selectedBuilding]);

  const handleRoomClick = (roomId: string) => {
    // If we are on the general map, handle building navigation
    if (selectedBuilding === 'general') {
      const targetBuilding = BUILDING_CLICK_MAP[roomId];
      if (targetBuilding) {
        setSelectedBuilding(targetBuilding);
        setSelectedFloor(0);
        toast.info(`Navegando a: ${BUILDING_LABELS[targetBuilding]}`);
        return;
      }
    }

    const occupancy = currentOccupancy[roomId];
    const room = meta.classrooms.find(c => c.id === roomId);
    const slot = lectiveSlots[selectedSlotIdx];

    if (!room) return;

    if (occupancy) {
      const teacher = teachers.find(t => t.id === occupancy.profesor_id);
      setActiveGuardInfo({
        roomId: room.id,
        roomLabel: room.name,
        guardTeacher: teacher ? teacher.name : 'Profesor desconocido',
        timeSlot: `${slot?.start_time || ''} - ${slot?.end_time || ''}`,
        avatarUrl: teacher?.avatar_url,
        teacher: teacher,
        groupLabel: occupancy.grupo?.name
      });
    } else {
      setActiveGuardInfo({
        roomId: room.id,
        roomLabel: room.name,
        guardTeacher: null,
        timeSlot: `${slot?.start_time} - ${slot?.end_time}`
      });
    }
  };

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

  const renderSidebar = () => (
    <div className="flex flex-col justify-center gap-8 w-64 shrink-0 h-full overflow-y-auto pr-2 custom-scrollbar glass p-6 rounded-[2rem] shadow-xl">
      {/* ── TIEMPO Y SESIÓN ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 pl-12">
          <Calendar size={14} className="text-[var(--brand-400)]" />
          <span className="label !mb-0 !text-[0.8rem] !tracking-[0.15em] !text-[var(--brand-400)]">Día de Consulta</span>
        </div>
        <div className="px-10">
          <select
            className="select"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
          >
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 mt-2 pl-12">
          <Clock size={14} className="text-[var(--brand-400)]" />
          <span className="label !mb-0 !text-[0.8rem] !tracking-[0.15em] !text-[var(--brand-400)]">Franja Horaria</span>
        </div>
        <div className="px-10">
          <select
            className="select"
            value={selectedSlotIdx}
            onChange={(e) => setSelectedSlotIdx(parseInt(e.target.value))}
          >
            {lectiveSlots.map((s, idx) => (
              <option key={s.id} value={idx}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="h-px bg-[var(--border-subtle)] opacity-50" />

      {/* ── SELECCIÓN DE EDIFICIO ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 pl-12">
          <MapIcon size={14} className="text-[var(--brand-400)]" />
          <span className="label !mb-0 !text-[0.8rem] !tracking-[0.15em] !text-[var(--brand-400)]">Edificio</span>
        </div>
        <div className="px-10">
          <select
            className="select"
            value={selectedBuilding}
            onChange={(e) => {
              const val = e.target.value as BuildingKey;
              setSelectedBuilding(val);
              if (val !== 'main') setSelectedFloor(0);
            }}
          >
            {BUILDINGS.map((b) => (
              <option key={b.key} value={b.key}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        {/* ── PLANTAS (SOLO EDIFICIO PRINCIPAL) ── */}
        <AnimatePresence>
          {selectedBuilding === 'main' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-col gap-4 overflow-hidden pt-2"
            >
              <div className="flex items-center gap-2 pl-12">
                <Layers size={14} className="text-[var(--brand-400)]" />
                <span className="label !mb-0 !text-[0.8rem] !tracking-[0.15em] !text-[var(--brand-400)]">Nivel / Planta</span>
              </div>
              <div className="px-10">
                <select
                  className="select"
                  value={selectedFloor}
                  onChange={(e) => setSelectedFloor(parseInt(e.target.value))}
                >
                  {[0, 1, 2].map(f => (
                    <option key={f} value={f}>
                      {f === 0 ? 'Planta Baja' : `Planta ${f}ª`}
                    </option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pt-4 text-[10px] text-[var(--text-muted)] font-mono opacity-50 text-center tracking-tighter">
        :: GUARDIAS IES MAP SYSTEM ::
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-cyan-500 gap-4">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        <span className="text-xs font-bold uppercase tracking-widest animate-pulse">Sincronizando Command Center...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in w-full pb-2 px-2 flex gap-5 overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
      {renderSidebar()}
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex-1 glass rounded-[2.5rem] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] h-full min-h-[400px]"
      >
        <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent z-10" />
        <InteractiveFloorMap
          floorLabel={getFloorLabel()}
          onRoomClick={handleRoomClick}
          guardInfo={activeGuardInfo}
          roomStates={roomStates}
          svgMarkup={getSvgMarkup()}
        />
      </motion.div>
    </div>
  );
};

export default FloorMap;