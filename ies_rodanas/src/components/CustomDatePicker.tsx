import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface CustomDatePickerProps {
    value: string;
    onChange: (date: string) => void;
}

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Días no lectivos en Aragón (Aproximación curso lectivo)
const isNonSchoolDay = (date: Date) => {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return true; // Fines de semana

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();

    // Festivos fijos (Mes-Día)
    const fixedHolidays = [
        '10-12', // El Pilar
        '11-01', // Todos los Santos
        '12-06', // Día de la Constitución
        '12-08', // Inmaculada Concepción
        '04-23', // San Jorge (Día de Aragón)
        '05-01', // Día del Trabajador
    ];

    const dateStr = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    if (fixedHolidays.includes(dateStr)) return true;

    // Navidades 2025/2026 (aprox: 20 dic - 6 ene)
    if (year === 2025 && month === 12 && day >= 20) return true;
    if (year === 2026 && month === 1 && day <= 6) return true;

    // Semana Santa 2026 (aprox: 28 mar - 6 abr)
    if (year === 2026 && month === 3 && day >= 28) return true;
    if (year === 2026 && month === 4 && day <= 6) return true;

    return false;
};

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const initialDate = value ? new Date(value) : new Date();
    const [viewDate, setViewDate] = useState(initialDate);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (value) setViewDate(new Date(value));
    }, [value]);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1;
    };

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.preventDefault();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.preventDefault();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleSelectDate = (day: number) => {
        const year = viewDate.getFullYear();
        const month = (viewDate.getMonth() + 1).toString().padStart(2, '0');
        const dayStr = day.toString().padStart(2, '0');
        onChange(`${year}-${month}-${dayStr}`);
        setIsOpen(false);
    };

    const formatDateLabel = (dateStr: string) => {
        if (!dateStr) return 'Seleccionar fecha';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    const renderCalendarDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days = [];

        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} style={{ width: 32, height: 32 }} />);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const currentValDate = new Date(value);
            const isSelected =
                currentValDate.getDate() === d &&
                currentValDate.getMonth() === month &&
                currentValDate.getFullYear() === year;
            const today = new Date();
            const isToday =
                today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;

            const thisDate = new Date(year, month, d);
            const isHoliday = isNonSchoolDay(thisDate);

            days.push(
                <motion.button
                    key={d}
                    type="button"
                    whileHover={!isHoliday ? { scale: 1.15 } : {}}
                    whileTap={!isHoliday ? { scale: 0.9 } : {}}
                    onClick={() => !isHoliday && handleSelectDate(d)}
                    disabled={isHoliday}
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: isHoliday ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        border: isToday && !isSelected && !isHoliday ? '1px solid var(--brand-400)' : 'none',
                        background: isHoliday ? 'rgba(239, 68, 68, 0.08)' : (isSelected ? 'var(--brand-500)' : 'transparent'),
                        color: isHoliday ? 'var(--danger-400)' : (isSelected ? 'white' : isToday ? 'var(--brand-400)' : 'var(--text-secondary)'),
                        boxShadow: isSelected && !isHoliday ? '0 0 12px rgba(34, 211, 238, 0.5)' : 'none',
                        fontFamily: 'var(--font-sans)',
                        opacity: isHoliday ? 0.6 : 1,
                    }}
                >
                    {d}
                </motion.button>
            );
        }
        return days;
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="input"
                style={{
                    cursor: 'pointer',
                    paddingLeft: 36,
                    display: 'flex',
                    alignItems: 'center',
                    textTransform: 'capitalize',
                    borderColor: isOpen ? 'var(--brand-500)' : undefined,
                    boxShadow: isOpen ? '0 0 0 2px rgba(6, 182, 212, 0.15)' : undefined,
                }}
            >
                <Calendar
                    style={{
                        position: 'absolute',
                        left: 12,
                        width: 18,
                        height: 18,
                        color: isOpen ? 'var(--brand-400)' : 'var(--slate-400)',
                        transition: 'color 0.2s',
                    }}
                />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {formatDateLabel(value)}
                </span>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            marginTop: 8,
                            width: '100%',
                            minWidth: 280,
                            borderRadius: 'var(--radius-lg)',
                            overflow: 'hidden',
                            zIndex: 50,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 12,
                            borderBottom: '1px solid var(--border-subtle)',
                            background: 'var(--bg-sidebar)',
                        }}>
                            <button
                                onClick={handlePrevMonth}
                                type="button"
                                style={{
                                    padding: 4,
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--slate-400)',
                                    cursor: 'pointer',
                                }}
                            >
                                <ChevronLeft style={{ width: 18, height: 18 }} />
                            </button>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--heading-color)', textTransform: 'capitalize' }}>
                                {MONTHS[viewDate.getMonth()]}{' '}
                                <span style={{ color: 'var(--slate-500)' }}>{viewDate.getFullYear()}</span>
                            </span>
                            <button
                                onClick={handleNextMonth}
                                type="button"
                                style={{
                                    padding: 4,
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--slate-400)',
                                    cursor: 'pointer',
                                }}
                            >
                                <ChevronRight style={{ width: 18, height: 18 }} />
                            </button>
                        </div>

                        {/* Weekday labels */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: 4,
                            padding: '12px 12px 4px',
                        }}>
                            {DAYS.map((d) => (
                                <div key={d} style={{
                                    textAlign: 'center',
                                    fontSize: '0.6rem',
                                    fontWeight: 700,
                                    color: 'var(--slate-500)',
                                    fontFamily: 'var(--font-mono)',
                                }}>
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Days */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: 4,
                            padding: '4px 12px 12px',
                            placeItems: 'center',
                        }}>
                            {renderCalendarDays()}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CustomDatePicker;
