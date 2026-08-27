import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthDayPickerProps {
    label?: string;
    value: string; // "YYYY-MM-DD"
    onChange: (newDate: string) => void;
    startYear?: number;
    endYear?: number;
    fullWidth?: boolean;
    style?: React.CSSProperties;
    disabled?: boolean;
    position?: 'top' | 'bottom';
    align?: 'left' | 'right';
}

export const MonthDayPicker: React.FC<MonthDayPickerProps> = ({
    label,
    value,
    onChange,
    startYear: propStartYear,
    endYear: propEndYear,
    fullWidth = false,
    style,
    disabled = false,
    position = 'bottom',
    align = 'left'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });

    const updateCoords = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updateCoords();
            window.addEventListener('resize', updateCoords);
            window.addEventListener('scroll', updateCoords, { capture: true });
        }
        return () => {
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, { capture: true });
        };
    }, [isOpen]);

    const MONTHS = [
        { num: 9, name: 'Septiembre', short: 'Sep' },
        { num: 10, name: 'Octubre', short: 'Oct' },
        { num: 11, name: 'Noviembre', short: 'Nov' },
        { num: 12, name: 'Diciembre', short: 'Dic' },
        { num: 1, name: 'Enero', short: 'Ene' },
        { num: 2, name: 'Febrero', short: 'Feb' },
        { num: 3, name: 'Marzo', short: 'Mar' },
        { num: 4, name: 'Abril', short: 'Abr' },
        { num: 5, name: 'Mayo', short: 'May' },
        { num: 6, name: 'Junio', short: 'Jun' }
    ];

    // Decode year/month/day from "YYYY-MM-DD"
    const parts = useMemo(() => {
        const p = value ? value.split('-') : [];
        const today = new Date();
        const year = p[0] ? parseInt(p[0]) : today.getFullYear();
        const month = p[1] ? parseInt(p[1]) : today.getMonth() + 1;
        const day = p[2] ? parseInt(p[2]) : today.getDate();
        return { year, month, day };
    }, [value]);

    // Derive school year baseline (September starts the school year)
    const initialSchoolYear = useMemo(() => {
        if (propStartYear !== undefined) return propStartYear;
        return parts.month >= 9 ? parts.year : parts.year - 1;
    }, [parts, propStartYear]);

    const [schoolYear, setSchoolYear] = useState(initialSchoolYear);
    const [tempMonth, setTempMonth] = useState(parts.month);

    // Keep state synced with outer value updates
    useEffect(() => {
        setSchoolYear(initialSchoolYear);
        setTempMonth(parts.month);
    }, [parts, initialSchoolYear]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const clickOnTrigger = containerRef.current && containerRef.current.contains(event.target as Node);
            const clickOnPopover = popoverRef.current && popoverRef.current.contains(event.target as Node);
            if (!clickOnTrigger && !clickOnPopover) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const startYear = schoolYear;
    const endYear = schoolYear + 1;
    const activeYear = tempMonth >= 9 ? startYear : endYear;

    const daysInMonth = useMemo(() => {
        return new Date(activeYear, tempMonth, 0).getDate();
    }, [activeYear, tempMonth]);

    const handleSelectMonth = (mNum: number) => {
        setTempMonth(mNum);
    };

    const handleSelectDay = (dNum: number) => {
        const targetYear = tempMonth >= 9 ? startYear : endYear;
        const formattedMonth = String(tempMonth).padStart(2, '0');
        const formattedDay = String(dNum).padStart(2, '0');
        onChange(`${targetYear}-${formattedMonth}-${formattedDay}`);
        setIsOpen(false);
    };

    const handleYearChange = (delta: number) => {
        setSchoolYear(prev => prev + delta);
    };

    const currentMonthObj = MONTHS.find(m => m.num === parts.month);
    
    // Nice formatted date text: "27 May 2026" or similar
    const displayLabel = useMemo(() => {
        if (!value) return 'dd/mm/aaaa';
        const d = new Date(value + 'T00:00:00');
        if (isNaN(d.getTime())) return value;
        const shortMonth = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][d.getMonth()];
        return `${d.getDate()} ${shortMonth} ${d.getFullYear()}`;
    }, [value]);

    const yearBtnStyle: React.CSSProperties = {
        background: 'rgba(255,255,255,0.05)',
        border: 'none',
        borderRadius: 4,
        width: 24,
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--text-primary)'
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: fullWidth ? '100%' : 'auto', ...style }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                {label && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {label}
                    </span>
                )}
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                        if (!isOpen) {
                            updateCoords();
                        }
                        setIsOpen(!isOpen);
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 14px',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        borderRadius: 10,
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-main)',
                        color: value ? 'var(--text-primary)' : 'var(--text-muted)',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.6 : 1,
                        transition: 'all 0.2s',
                        outline: 'none',
                        textAlign: 'left',
                        width: '100%',
                        boxSizing: 'border-box'
                    }}
                >
                    <Calendar size={15} style={{ color: 'var(--brand-400)', flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayLabel}
                    </span>
                </button>
            </div>

            <AnimatePresence>
                {isOpen && !disabled && (
                    <>
                        {createPortal(
                            <motion.div
                        ref={popoverRef}
                        initial={{ opacity: 0, y: position === 'top' ? -8 : 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: position === 'top' ? -8 : 8 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: 'fixed',
                            width: 290,
                            padding: 14,
                            borderRadius: 16,
                            background: 'var(--bg-card, rgba(15, 23, 42, 0.95))',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid var(--border-subtle)',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)',
                            zIndex: 1100,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                            ...(position === 'top' ? {
                                bottom: window.innerHeight - coords.top + 8
                            } : {
                                top: coords.top + coords.height + 8
                            }),
                            ...(align === 'right' ? {
                                right: window.innerWidth - (coords.left + coords.width)
                            } : {
                                left: coords.left
                            })
                        }}
                    >
                        {/* School Year Switcher */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <button
                                type="button"
                                onClick={() => handleYearChange(-1)}
                                style={yearBtnStyle}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                Curso {startYear} - {endYear}
                            </span>
                            <button
                                type="button"
                                onClick={() => handleYearChange(1)}
                                style={yearBtnStyle}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        <div style={{ height: 1, background: 'var(--border-subtle)' }} />

                        {/* Month Selector */}
                        <div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>
                                Selecciona Mes
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
                                {MONTHS.map(m => {
                                    const isSelected = tempMonth === m.num;
                                    return (
                                        <button
                                            key={m.num}
                                            type="button"
                                            onClick={() => handleSelectMonth(m.num)}
                                            style={{
                                                padding: '6px 0',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                borderRadius: 6,
                                                border: isSelected ? '1px solid var(--brand-400)' : '1px solid transparent',
                                                background: isSelected ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                                color: isSelected ? 'var(--brand-400)' : 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={e => {
                                                if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                            }}
                                            onMouseLeave={e => {
                                                if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                            }}
                                        >
                                            {m.short}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ height: 1, background: 'var(--border-subtle)' }} />

                        {/* Day Selector */}
                        <div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>
                                Selecciona Día
                            </span>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(7, 1fr)',
                                gap: 4,
                                maxHeight: 135,
                                overflowY: 'auto',
                                paddingRight: 2
                            }}>
                                {Array.from({ length: daysInMonth }, (_, idx) => idx + 1).map(d => {
                                    const isSelected = parts.day === d && parts.month === tempMonth && initialSchoolYear === schoolYear;
                                    return (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => handleSelectDay(d)}
                                            style={{
                                                width: 28,
                                                height: 28,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                borderRadius: '50%',
                                                border: 'none',
                                                background: isSelected ? 'var(--brand-500)' : 'transparent',
                                                color: isSelected ? '#ffffff' : 'var(--text-primary)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s',
                                                boxShadow: isSelected ? '0 0 8px rgba(6, 182, 212, 0.4)' : 'none'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSelected) e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            {d}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                            </motion.div>,
                            document.body
                        )}
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
