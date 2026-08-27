import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, FileText, Lock, Users, EyeOff } from 'lucide-react';

interface PrivacyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
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
                            background: 'rgba(2, 6, 23, 0.85)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 2000,
                        }}
                    />

                    {/* Centering wrapper - flexbox, no transform needed */}
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2001,
                            padding: '20px',
                            pointerEvents: 'none',
                        }}
                    >
                        {/* Modal Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 30 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                width: '100%',
                                maxWidth: 580,
                                maxHeight: '85vh',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-xl)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.6)',
                                pointerEvents: 'auto',
                            }}
                        >
                            {/* Header - fixed, never scrolls */}
                            <div style={{
                                padding: '20px 24px',
                                borderBottom: '1px solid var(--border-subtle)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'rgba(30, 41, 59, 0.2)',
                                flexShrink: 0,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background: 'rgba(34, 211, 238, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--brand-400)',
                                        border: '1px solid rgba(34, 211, 238, 0.2)'
                                    }}>
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--heading-color)', margin: 0 }}>
                                            Privacidad y RGPD
                                        </h3>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                                            Información sobre el tratamiento de tus datos
                                        </p>
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
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    flexShrink: 0,
                                }}>
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div style={{
                                padding: '24px',
                                overflowY: 'auto',
                                flex: 1,
                                fontSize: '0.85rem',
                                color: 'var(--text-secondary)',
                                lineHeight: 1.65,
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    <section>
                                        <h4 style={{ color: 'var(--heading-color)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.9rem' }}>
                                            <Lock size={16} style={{ color: 'var(--brand-400)' }} />
                                            Responsable del Tratamiento
                                        </h4>
                                        <p style={{ margin: 0 }}>
                                            El responsable del tratamiento de los datos es <strong>aplanastorrea@gmail.com</strong>. Esta plataforma es una herramienta técnica interna para la gestión operativa del centro.
                                        </p>
                                    </section>

                                    <section>
                                        <h4 style={{ color: 'var(--heading-color)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.9rem' }}>
                                            <FileText size={16} style={{ color: 'var(--brand-400)' }} />
                                            Finalidad del Tratamiento
                                        </h4>
                                        <p style={{ margin: '0 0 8px 0' }}>
                                            Los datos se recogen exclusivamente para:
                                        </p>
                                        <ul style={{ paddingLeft: 20, margin: 0 }}>
                                            <li>Gestionar las guardias y sustituciones del profesorado.</li>
                                            <li>Facilitar la comunicación interna de tareas de guardia.</li>
                                            <li>Generar estadísticas de cumplimiento de guardias para Jefatura.</li>
                                            <li>Personalización de la interfaz de usuario (avatares y preferencias).</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h4 style={{ color: 'var(--heading-color)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.9rem' }}>
                                            <Users size={16} style={{ color: 'var(--brand-400)' }} />
                                            Base Legal
                                        </h4>
                                        <p style={{ margin: 0 }}>
                                            El tratamiento se basa en la <strong>relación administrativa/laboral</strong> con el centro y el cumplimiento de una misión realizada en interés público (organización del servicio educativo). No se requiere consentimiento adicional para el uso de datos profesionales básicos.
                                        </p>
                                    </section>

                                    <section>
                                        <h4 style={{ color: 'var(--heading-color)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.9rem' }}>
                                            <EyeOff size={16} style={{ color: 'var(--brand-400)' }} />
                                            Tus Derechos
                                        </h4>
                                        <p style={{ margin: 0 }}>
                                            Puedes ejercer tus derechos de acceso, rectificación, supresión y otros reconocidos por el RGPD contactando con la Secretaría del centro. Tus datos no serán cedidos a ninguna entidad externa ajena a la infraestructura de Supabase (servidor de datos) y Google (autenticación).
                                        </p>
                                    </section>
                                </div>
                            </div>

                            {/* Footer - fixed, never scrolls */}
                            <div style={{
                                padding: '16px 24px',
                                borderTop: '1px solid var(--border-subtle)',
                                background: 'rgba(30, 41, 59, 0.2)',
                                textAlign: 'center',
                                flexShrink: 0,
                            }}>
                                <button
                                    onClick={onClose}
                                    className="btn btn-primary"
                                    style={{
                                        padding: '10px 32px',
                                        borderRadius: 'var(--radius-full)',
                                        fontWeight: 700,
                                    }}
                                >
                                    HE LEÍDO Y ENTIENDO
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default PrivacyModal;
