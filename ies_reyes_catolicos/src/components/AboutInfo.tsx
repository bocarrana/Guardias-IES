import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, Heart, X, MessageSquare } from 'lucide-react';

interface AboutInfoProps {
    isOpen: boolean;
    onClose: () => void;
    isMobile: boolean;
}

const AboutInfo: React.FC<AboutInfoProps> = ({ isOpen, onClose, isMobile }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: isMobile ? 'rgba(2, 6, 23, 0.8)' : 'transparent',
                            backdropFilter: isMobile ? 'blur(4px)' : 'none',
                            zIndex: 1000,
                            pointerEvents: isMobile ? 'auto' : 'none', // For desktop we only want to close on click outside if we add a global listener, but for now simple is better
                        }}
                    />

                    {/* Content Container */}
                    <motion.div
                        initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 10 }}
                        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                        exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        style={isMobile ? {
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'var(--bg-card)',
                            borderTop: '1px solid var(--border-subtle)',
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            padding: '32px 24px',
                            zIndex: 1001,
                            maxHeight: '80vh',
                            overflowY: 'auto',
                            boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
                        } : {
                            position: 'fixed',
                            top: 85,
                            left: 20,
                            width: 300,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 24,
                            zIndex: 1001,
                            boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                            pointerEvents: 'auto',
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                            <div style={{ pointerEvents: 'none' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--heading-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    Guardias IES <span style={{ color: 'var(--brand-400)', fontSize: '0.8rem', fontWeight: 600 }}>:: v2.0</span>
                                </h3>
                                <div style={{
                                    fontSize: '0.6rem',
                                    background: 'rgba(34, 211, 238, 0.15)',
                                    color: 'var(--brand-400)',
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    textTransform: 'uppercase',
                                    fontWeight: 800,
                                    letterSpacing: '0.05em',
                                    marginTop: 4,
                                    display: 'inline-block'
                                }}>
                                    Beta Interna
                                </div>
                            </div>
                            <button onClick={onClose} style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Mission */}
                        <div style={{ marginBottom: 24 }}>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                Herramienta diseñada para agilizar la gestión de guardias del profesorado en los <strong>Institutos de Educación Secundaria (IES) de Aragón</strong>.
                            </p>
                        </div>

                        {/* Authorship */}
                        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: 'rgba(168, 85, 247, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--purple-400)',
                                border: '1px solid rgba(168, 85, 247, 0.2)'
                            }}>
                                <Code size={18} />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--heading-color)', margin: 0 }}>
                                    Alberto Planas
                                </p>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, margin: 0 }}>
                                    Desarrollado en Aragón con <Heart size={10} style={{ color: 'var(--danger)' }} fill="var(--danger)" />
                                </p>
                            </div>
                        </div>

                        {/* Contact */}
                        <div style={{
                            background: 'rgba(30, 41, 59, 0.3)',
                            padding: 16,
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-subtle)',
                            marginBottom: 20
                        }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: 8, margin: 0 }}>
                                <MessageSquare size={16} style={{ flexShrink: 0, color: 'var(--brand-400)', marginTop: 2 }} />
                                <span>
                                    Para dudas o sugerencias, búscame por el centro o envíame un mensaje directo.
                                </span>
                            </p>
                        </div>

                        {/* Footer */}
                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, textAlign: 'center' }}>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                Plataforma de uso exclusivo interno
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AboutInfo;
