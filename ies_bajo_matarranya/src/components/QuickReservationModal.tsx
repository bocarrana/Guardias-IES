import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Clock, UserPlus, Trash2, Check } from 'lucide-react';

interface QuickReservationModalProps {
    roomName: string;
    slotLabel: string;
    /** If set, we're viewing an existing reservation (cancel mode) */
    existingTeacherName?: string;
    onConfirm: (teacherName: string) => void;
    onCancel?: () => void;
    onClose: () => void;
}

const QuickReservationModal: React.FC<QuickReservationModalProps> = ({
    roomName, slotLabel, existingTeacherName, onConfirm, onCancel, onClose
}) => {
    const [name, setName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const isViewMode = !!existingTeacherName;

    useEffect(() => {
        if (!isViewMode) {
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    }, [isViewMode]);

    const handleConfirm = () => {
        if (!name.trim()) return;
        onConfirm(name.trim());
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleConfirm();
        if (e.key === 'Escape') onClose();
    };

    return createPortal(
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 flex items-center justify-center p-4"
                style={{ zIndex: 9999 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Backdrop */}
                <div
                    style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(2,6,23,0.85)',
                        backdropFilter: 'blur(8px)'
                    }}
                    onClick={onClose}
                />

                {/* Modal Card */}
                <motion.div
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: 420,
                        borderRadius: 24,
                        overflow: 'hidden',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-card)',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                    }}
                    initial={{ scale: 0.92, y: 40, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.92, y: -30, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    {/* ── Header ──────────────────────────────── */}
                    <div style={{
                        padding: '20px 24px',
                        background: isViewMode
                            ? 'linear-gradient(135deg, rgba(248,113,113,0.15), rgba(248,113,113,0.05))'
                            : 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05))',
                        borderBottom: '1px solid var(--border-subtle)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    }}>
                        <div>
                            <h3 style={{
                                fontSize: '1.1rem', fontWeight: 800,
                                color: 'var(--text-primary)', margin: 0
                            }}>
                                {isViewMode ? '🔴 Aula Reservada' : 'Reservar Aula'}
                            </h3>
                            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    fontSize: '0.8rem', fontWeight: 700,
                                    color: 'var(--brand-400)',
                                    background: 'rgba(6,182,212,0.1)',
                                    padding: '4px 10px', borderRadius: 8,
                                    border: '1px solid rgba(6,182,212,0.2)',
                                }}>
                                    <MapPin size={13} /> {roomName}
                                </span>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    fontSize: '0.8rem', fontWeight: 700,
                                    color: 'var(--text-secondary)',
                                    background: 'var(--bg-sidebar)',
                                    padding: '4px 10px', borderRadius: 8,
                                    border: '1px solid var(--border-subtle)',
                                }}>
                                    <Clock size={13} /> {slotLabel}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
                                borderRadius: 12, width: 40, height: 40, cursor: 'pointer',
                                color: 'var(--text-secondary)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s', flexShrink: 0
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* ── Body ────────────────────────────────── */}
                    <div style={{ padding: '24px' }}>
                        {isViewMode ? (
                            /* ── VIEW / CANCEL MODE ── */
                            <div style={{
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', gap: 20, padding: '8px 0'
                            }}>
                                <div style={{
                                    width: 60, height: 60, borderRadius: 14,
                                    background: 'linear-gradient(135deg, rgba(248,113,113,0.2), rgba(248,113,113,0.05))',
                                    border: '2px solid rgba(248,113,113,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <UserPlus size={26} color="var(--danger)" />
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        fontSize: '1.2rem', fontWeight: 800,
                                        color: 'var(--text-primary)'
                                    }}>
                                        {existingTeacherName}
                                    </div>
                                    <div style={{
                                        fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4
                                    }}>
                                        Tiene reservada esta aula hoy
                                    </div>
                                </div>
                                {onCancel && (
                                    <button
                                        onClick={onCancel}
                                        style={{
                                            width: '100%', padding: '14px 20px',
                                            fontSize: '0.95rem', borderRadius: 14,
                                            display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', gap: 8,
                                            background: 'rgba(248,113,113,0.1)',
                                            border: '1px solid rgba(248,113,113,0.3)',
                                            color: 'var(--danger)',
                                            fontWeight: 700, cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <Trash2 size={18} /> Cancelar Reserva
                                    </button>
                                )}
                            </div>
                        ) : (
                            /* ── CREATE MODE ── */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <label style={{
                                    fontSize: '0.75rem', fontWeight: 700,
                                    color: 'var(--brand-400)', textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                }}>
                                    Nombre del profesor
                                </label>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Escribe el nombre..."
                                    autoComplete="off"
                                    style={{
                                        width: '100%', padding: '16px 18px',
                                        borderRadius: 14,
                                        border: '2px solid var(--border-subtle)',
                                        background: 'var(--bg-main)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1.1rem', fontWeight: 600,
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                    }}
                                    onFocus={e => e.target.style.borderColor = 'var(--brand-500)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                                />
                                <button
                                    onClick={handleConfirm}
                                    disabled={!name.trim()}
                                    style={{
                                        width: '100%', padding: '16px 20px',
                                        fontSize: '1rem', borderRadius: 14,
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', gap: 10,
                                        background: name.trim()
                                            ? 'linear-gradient(135deg, var(--brand-500), var(--brand-600))'
                                            : 'var(--bg-sidebar)',
                                        border: 'none',
                                        color: name.trim() ? 'white' : 'var(--text-muted)',
                                        fontWeight: 800, cursor: name.trim() ? 'pointer' : 'not-allowed',
                                        transition: 'all 0.2s',
                                        boxShadow: name.trim() ? '0 4px 20px rgba(6,182,212,0.3)' : 'none',
                                    }}
                                >
                                    <Check size={20} /> Reservar
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

export default QuickReservationModal;
