import React from 'react';
import { motion } from 'framer-motion';
import { TimeSlot } from '../types';
import { Coffee } from 'lucide-react';

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

interface InteractiveScheduleGridProps {
    slots: TimeSlot[];
    getItem: (day: string, slotId: string) => any;
    renderItemContent: (item: any, day: string, slot: TimeSlot) => React.ReactNode;
    onSlotClick: (item: any, day: string, slot: TimeSlot) => void;
    showRowHeaders?: boolean;
    stickyOffset?: number;
    /** Si true, los recreos son seleccionables (pestaña de guardias).
     *  Si false (por defecto), son decorativos e ininteractivos (pestaña lectiva). */
    interactiveBreakSlots?: boolean;
}

/** Detecta si una franja es un Recreo por su etiqueta */
const isBreak = (slot: TimeSlot) =>
    slot.label?.toLowerCase().includes('recreo') ||
    slot.label?.toLowerCase().includes('descanso') ||
    slot.label?.toLowerCase().includes('break');

const InteractiveScheduleGrid: React.FC<InteractiveScheduleGridProps> = ({
    slots, getItem, renderItemContent, onSlotClick, showRowHeaders = false, stickyOffset = 0, interactiveBreakSlots = false
}) => {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: showRowHeaders
                ? `minmax(80px, auto) repeat(${DAYS.length}, 1fr)`
                : `repeat(${DAYS.length}, 1fr)`,
            gap: 8,
            alignItems: 'stretch'
        }}>
            {/* ── Headers Row ────────────────────────────────────────── */}
            {/* ── Headers Row ────────────────────────────────────────── */}
            {showRowHeaders && <div style={{ position: 'sticky', top: stickyOffset, zIndex: 10, background: 'var(--bg-card)' }} />} {/* Empty corner cell */}
            {DAYS.map(day => (
                <div key={day} style={{
                    fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
                    color: 'var(--brand-400)', textAlign: 'center', marginBottom: 4,
                    padding: '8px 4px',
                    position: 'sticky', top: stickyOffset, zIndex: 10, background: 'var(--bg-card)',
                    borderBottom: '1px solid var(--border-subtle)'
                }}>
                    {day}
                </div>
            ))}

            {/* ── Slots Rows ──────────────────────────────────────────── */}
            {slots.map(slot => {
                const brk = isBreak(slot);
                
                return (
                    <React.Fragment key={slot.id}>
                        {/* Row Header */}
                        {showRowHeaders && (
                            <div
                                style={{
                                    minHeight: brk ? 36 : 70,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'flex-end',
                                    paddingRight: 12,
                                    paddingLeft: 4,
                                    fontSize: brk ? '0.65rem' : '0.75rem',
                                    fontWeight: 700,
                                    color: brk ? 'rgba(251,191,36,0.7)' : 'var(--brand-400)',
                                    borderRight: `2px solid ${brk ? 'rgba(251,191,36,0.2)' : 'var(--border-subtle)'}`,
                                    opacity: brk ? 0.85 : 1,
                                }}
                            >
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    textAlign: 'right', lineHeight: 1.1, flexDirection: 'row-reverse'
                                }}>
                                    {brk && <Coffee size={10} style={{ opacity: 0.7, flexShrink: 0 }} />}
                                    <span>{slot.label}</span>
                                </div>
                                <div style={{
                                    fontSize: '0.6rem', opacity: 0.5, marginTop: 2,
                                    fontWeight: 500, color: brk ? 'rgba(251,191,36,0.5)' : 'var(--text-secondary)'
                                }}>
                                    {slot.start_time?.slice(0, 5)}{slot.end_time ? ` - ${slot.end_time.slice(0, 5)}` : ''}
                                </div>
                            </div>
                        )}

                        {/* Day Cells */}
                        {DAYS.map(day => {
                            const existing = getItem(day, slot.id);

                            /* ── RECREO DECORATIVO ────────── */
                            if (brk && !interactiveBreakSlots) {
                                return (
                                    <div
                                        key={`${day}-${slot.id}`}
                                        title="Recreo – no disponible para asignar"
                                        style={{
                                            minHeight: 36,
                                            borderRadius: 6,
                                            border: '1px dashed rgba(251,191,36,0.25)',
                                            background: 'rgba(251,191,36,0.04)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 5,
                                            cursor: 'default',
                                            pointerEvents: 'none',
                                            opacity: 0.75,
                                        }}
                                    >
                                        <Coffee size={11} color="rgba(251,191,36,0.5)" />
                                        <span style={{
                                            fontSize: '0.6rem',
                                            color: 'rgba(251,191,36,0.5)',
                                            fontWeight: 600,
                                            letterSpacing: '0.05em',
                                            textTransform: 'uppercase',
                                        }}>
                                            Recreo
                                        </span>
                                    </div>
                                );
                            }

                            /* ── RECREO INTERACTIVO ──────── */
                            if (brk && interactiveBreakSlots) {
                                return (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        key={`${day}-${slot.id}`}
                                        onClick={() => onSlotClick(existing, day, slot)}
                                        style={{
                                            padding: '6px 4px',
                                            borderRadius: 6,
                                            border: existing
                                                ? '1px solid rgba(251,191,36,0.8)'
                                                : '1px dashed rgba(251,191,36,0.35)',
                                            background: existing
                                                ? 'rgba(251,191,36,0.15)'
                                                : 'rgba(251,191,36,0.04)',
                                            color: 'rgba(251,191,36,0.8)',
                                            fontSize: '0.6rem',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            minHeight: 36,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            gap: 3,
                                        }}
                                    >
                                        <Coffee size={11} />
                                        <span style={{ fontWeight: 700 }}>{existing ? '✓' : ''}</span>
                                    </motion.button>
                                );
                            }

                            /* ── HORA LECTIVA / GUARDIA ──────── */
                            return (
                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    key={`${day}-${slot.id}`}
                                    onClick={() => onSlotClick(existing, day, slot)}
                                    style={{
                                        padding: '12px 6px',
                                        borderRadius: 8,
                                        border: '1px solid',
                                        borderColor: existing ? 'var(--brand-500)' : 'var(--border-subtle)',
                                        background: existing ? 'var(--brand-950-subtle)' : 'var(--bg-sidebar)',
                                        color: existing ? 'var(--brand-300)' : 'var(--text-muted)',
                                        fontSize: '0.65rem',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        minHeight: 70,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: 2,
                                        transition: 'background 0.2s',
                                    }}
                                >
                                    {renderItemContent(existing, day, slot)}
                                </motion.button>
                            );
                        })}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default InteractiveScheduleGrid;
