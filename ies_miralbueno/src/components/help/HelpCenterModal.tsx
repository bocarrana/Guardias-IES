import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Search, X, Users, Tv, Shield,
    Lightbulb, HelpCircle, ChevronDown, ChevronUp,
    ExternalLink, Sparkles, Command, Check
} from 'lucide-react';
import { HELP_ITEMS, FAQ_LIST, HelpItem, FAQItem } from '../../data/helpDictionary';

interface HelpCenterModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'docentes' | 'tv' | 'jefatura';
    initialSearch?: string;
}

export const HelpCenterModal: React.FC<HelpCenterModalProps> = ({
    isOpen,
    onClose,
    initialTab = 'docentes',
    initialSearch = '',
}) => {
    const [activeTab, setActiveTab] = useState<'docentes' | 'tv' | 'jefatura'>(initialTab);
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

    // Filter items based on search and active tab
    const filteredFaqs = useMemo(() => {
        let list = FAQ_LIST;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return list.filter(f =>
                f.question.toLowerCase().includes(q) ||
                f.answer.toLowerCase().includes(q) ||
                f.tag.toLowerCase().includes(q)
            );
        }
        return list.filter(f => f.category === activeTab);
    }, [activeTab, searchQuery]);

    const filteredGuides = useMemo(() => {
        const guides = Object.values(HELP_ITEMS);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return guides.filter(g =>
                g.title.toLowerCase().includes(q) ||
                g.description.toLowerCase().includes(q) ||
                (g.bullets && g.bullets.some(b => b.toLowerCase().includes(q))) ||
                (g.tip && g.tip.toLowerCase().includes(q))
            );
        }
        return guides.filter(g => g.category === activeTab || g.category === 'general');
    }, [activeTab, searchQuery]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(5, 10, 20, 0.82)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    padding: 16,
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: '100%',
                        maxWidth: 780,
                        maxHeight: '90vh',
                        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(10, 15, 30, 0.98) 100%)',
                        border: '1px solid rgba(34, 211, 238, 0.25)',
                        borderRadius: 20,
                        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(6, 182, 212, 0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        color: '#f8fafc',
                    }}
                >
                    {/* Top Bar Header */}
                    <div style={{
                        padding: '20px 24px 16px 24px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                width: 38, height: 38, borderRadius: 12,
                                background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(6, 182, 212, 0.35))',
                                border: '1px solid rgba(34, 211, 238, 0.4)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#22d3ee',
                            }}>
                                <BookOpen size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                                    Centro de Soporte y Guías Rápidas
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                                    Manuales de uso, preguntas frecuentes y consejos operativos
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 10,
                                width: 32, height: 32,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div style={{ padding: '16px 24px 10px 24px' }}>
                        <div style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                        }}>
                            <Search size={16} style={{ position: 'absolute', left: 14, color: '#94a3b8', pointerEvents: 'none' }} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar cualquier duda (ej: libre disposición, 24 horas, convivencia, clonar horario)..."
                                style={{
                                    width: '100%',
                                    padding: '11px 16px 11px 40px',
                                    borderRadius: 12,
                                    border: '1px solid rgba(255, 255, 255, 0.14)',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    color: '#fff',
                                    fontSize: '0.88rem',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--brand-400, #22d3ee)'}
                                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)'}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={{
                                        position: 'absolute', right: 12,
                                        background: 'none', border: 'none',
                                        color: '#94a3b8', cursor: 'pointer', padding: 2,
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tab Navigation (only when not searching) */}
                    {!searchQuery && (
                        <div style={{
                            display: 'flex',
                            gap: 8,
                            padding: '0 24px 12px 24px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        }}>
                            {[
                                { id: 'docentes', label: '👤 Para Docentes', icon: Users },
                                { id: 'tv', label: '📺 Pantalla Sala TV', icon: Tv },
                                { id: 'jefatura', label: '⚙️ Jefatura y Dirección', icon: Shield },
                            ].map(tab => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveTab(tab.id as any);
                                            setExpandedFaqIndex(null);
                                        }}
                                        style={{
                                            padding: '8px 14px',
                                            borderRadius: 10,
                                            border: isActive ? '1px solid rgba(34, 211, 238, 0.4)' : '1px solid transparent',
                                            background: isActive ? 'rgba(34, 211, 238, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                            color: isActive ? '#22d3ee' : '#94a3b8',
                                            fontSize: '0.82rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            transition: 'all 0.18s',
                                        }}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Scrollable Content Body */}
                    <div style={{
                        overflowY: 'auto',
                        padding: '16px 24px 24px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 20,
                    }}>
                        {/* 1. GUÍAS VISUALES / TARJETAS */}
                        <div>
                            <h4 style={{
                                margin: '0 0 12px 0',
                                fontSize: '0.82rem',
                                color: 'var(--brand-400, #22d3ee)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}>
                                <Sparkles size={14} />
                                {searchQuery ? `Guías coincidentes (${filteredGuides.length})` : 'Guías prácticas y reglas'}
                            </h4>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                                gap: 12,
                            }}>
                                {filteredGuides.map(guide => (
                                    <div
                                        key={guide.id}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: 14,
                                            padding: '14px 16px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 8,
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                            <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>
                                                {guide.title}
                                            </h5>
                                            {guide.badge && (
                                                <span style={{
                                                    fontSize: '0.62rem',
                                                    fontWeight: 800,
                                                    padding: '2px 8px',
                                                    borderRadius: 6,
                                                    background: 'rgba(34, 211, 238, 0.12)',
                                                    color: '#22d3ee',
                                                    border: '1px solid rgba(34, 211, 238, 0.3)',
                                                    textTransform: 'uppercase',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {guide.badge}
                                                </span>
                                            )}
                                        </div>

                                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                                            {guide.description}
                                        </p>

                                        {guide.bullets && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
                                                {guide.bullets.map((b, idx) => (
                                                    <div key={idx} style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.35 }}>
                                                        {b}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {guide.tip && (
                                            <div style={{
                                                background: 'rgba(234, 179, 8, 0.08)',
                                                border: '1px solid rgba(234, 179, 8, 0.25)',
                                                borderRadius: 8,
                                                padding: '6px 10px',
                                                marginTop: 4,
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 6,
                                            }}>
                                                <Lightbulb size={13} color="#eab308" style={{ flexShrink: 0, marginTop: 2 }} />
                                                <span style={{ fontSize: '0.72rem', color: '#fef08a', lineHeight: 1.35 }}>
                                                    {guide.tip}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. PREGUNTAS FRECUENTES (FAQ) */}
                        <div>
                            <h4 style={{
                                margin: '0 0 12px 0',
                                fontSize: '0.82rem',
                                color: 'var(--brand-400, #22d3ee)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}>
                                <HelpCircle size={14} />
                                {searchQuery ? `Preguntas Frecuentes (${filteredFaqs.length})` : 'Preguntas Frecuentes'}
                            </h4>

                            {filteredFaqs.length === 0 ? (
                                <div style={{
                                    padding: '24px',
                                    textAlign: 'center',
                                    color: '#94a3b8',
                                    fontSize: '0.85rem',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: 12,
                                }}>
                                    No se encontraron respuestas para tu búsqueda. Prueba con otro término como "guardia", "24h" o "horario".
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {filteredFaqs.map((faq, index) => {
                                        const isExpanded = expandedFaqIndex === index;
                                        return (
                                            <div
                                                key={index}
                                                style={{
                                                    background: isExpanded ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                                    border: `1px solid ${isExpanded ? 'rgba(34, 211, 238, 0.3)' : 'rgba(255, 255, 255, 0.07)'}`,
                                                    borderRadius: 12,
                                                    overflow: 'hidden',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                <button
                                                    onClick={() => setExpandedFaqIndex(isExpanded ? null : index)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px 16px',
                                                        background: 'none',
                                                        border: 'none',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: 12,
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        color: '#fff',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{
                                                            fontSize: '0.62rem',
                                                            fontWeight: 800,
                                                            padding: '2px 6px',
                                                            borderRadius: 4,
                                                            background: 'rgba(255, 255, 255, 0.1)',
                                                            color: '#94a3b8',
                                                            textTransform: 'uppercase',
                                                        }}>
                                                            {faq.tag}
                                                        </span>
                                                        <span>{faq.question}</span>
                                                    </div>
                                                    {isExpanded ? <ChevronUp size={16} color="#22d3ee" /> : <ChevronDown size={16} color="#94a3b8" />}
                                                </button>

                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            style={{
                                                                padding: '0 16px 14px 16px',
                                                                fontSize: '0.8rem',
                                                                color: '#cbd5e1',
                                                                lineHeight: 1.45,
                                                                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                                                            }}
                                                        >
                                                            <div style={{ paddingTop: 8 }}>
                                                                {faq.answer}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer with keyboard shortcut hint */}
                    <div style={{
                        padding: '12px 24px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(0, 0, 0, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.74rem',
                        color: '#94a3b8',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Command size={13} />
                            <span>Atajo rápido: Pulsa <strong>?</strong> o <strong>F1</strong> en cualquier pantalla para abrir esta ayuda.</span>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
                                border: 'none',
                                borderRadius: 8,
                                padding: '6px 16px',
                                color: '#090d16',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                            }}
                        >
                            Cerrar
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
