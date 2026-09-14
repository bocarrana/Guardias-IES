import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, X, Sparkles, Check, ExternalLink, Lightbulb } from 'lucide-react';
import { HelpItem } from '../../data/helpDictionary';

interface HelpCardProps {
    item: HelpItem;
    onClose: () => void;
    onOpenFullHelp?: () => void;
}

export const HelpCard: React.FC<HelpCardProps> = ({ item, onClose, onOpenFullHelp }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
                width: 320,
                maxWidth: 'calc(100vw - 32px)',
                maxHeight: 'calc(100vh - 32px)',
                overflowY: 'auto',
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(34, 211, 238, 0.3)',
                borderRadius: 16,
                padding: '16px 18px',
                boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 20px rgba(6, 182, 212, 0.15)',
                color: '#f8fafc',
                fontSize: '0.85rem',
                textAlign: 'left',
                zIndex: 9999,
                position: 'relative',
                boxSizing: 'border-box',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(6, 182, 212, 0.4))',
                        border: '1px solid rgba(34, 211, 238, 0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#22d3ee', flexShrink: 0
                    }}>
                        <HelpCircle size={16} />
                    </div>
                    <div>
                        {item.badge && (
                            <span style={{
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                color: 'var(--brand-400, #22d3ee)',
                                display: 'block',
                                marginBottom: 2
                            }}>
                                {item.badge}
                            </span>
                        )}
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#fff', lineHeight: 1.25 }}>
                            {item.title}
                        </h4>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: 'none',
                        borderRadius: 6,
                        width: 24, height: 24,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        padding: 0,
                        flexShrink: 0
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                >
                    <X size={14} />
                </button>
            </div>

            {/* Description */}
            <p style={{ margin: '0 0 10px 0', color: '#cbd5e1', fontSize: '0.8rem', lineHeight: 1.45 }}>
                {item.description}
            </p>

            {/* Bullets */}
            {item.bullets && item.bullets.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                    {item.bullets.map((bullet, idx) => (
                        <div key={idx} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 6,
                            fontSize: '0.78rem', color: '#e2e8f0', lineHeight: 1.35
                        }}>
                            <span style={{ color: 'var(--brand-400, #22d3ee)', fontWeight: 800, flexShrink: 0, marginTop: 1 }}>•</span>
                            <span>{bullet}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Pro Tip Box */}
            {item.tip && (
                <div style={{
                    background: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    borderRadius: 10,
                    padding: '8px 10px',
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8
                }}>
                    <Lightbulb size={15} color="#eab308" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: '0.74rem', color: '#fef08a', lineHeight: 1.35 }}>
                        <strong>Consejo:</strong> {item.tip}
                    </div>
                </div>
            )}

            {/* Footer buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 4 }}>
                {onOpenFullHelp ? (
                    <button
                        onClick={() => {
                            onClose();
                            onOpenFullHelp();
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--brand-400, #22d3ee)',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 0'
                        }}
                    >
                        <span>Más guías</span>
                        <ExternalLink size={12} />
                    </button>
                ) : <div />}

                <button
                    onClick={onClose}
                    style={{
                        background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 14px',
                        color: '#090d16',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        transition: 'transform 0.15s, opacity 0.15s',
                        boxShadow: '0 2px 10px rgba(6, 182, 212, 0.3)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                    <Check size={13} strokeWidth={3} />
                    <span>Entendido</span>
                </button>
            </div>
        </motion.div>
    );
};
