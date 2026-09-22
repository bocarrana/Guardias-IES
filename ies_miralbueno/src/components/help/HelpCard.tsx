import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, Check, ExternalLink, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { HelpItem } from '../../data/helpDictionary';

interface HelpCardProps {
    item: HelpItem;
    onClose: () => void;
    onOpenFullHelp?: () => void;
}

export const HelpCard: React.FC<HelpCardProps> = ({ item, onClose, onOpenFullHelp }) => {
    const pages = item.pages && item.pages.length > 0 ? item.pages : null;
    const [currentPage, setCurrentPage] = useState(0);
    const [direction, setDirection] = useState(0);

    const totalPages = pages ? pages.length : 1;
    const activeData = pages ? pages[currentPage] : null;

    const title = activeData?.title || item.title;
    const badge = activeData?.badge || item.badge;
    const description = activeData?.description || item.description;
    const bullets = activeData?.bullets || item.bullets;
    const tip = activeData?.tip || item.tip;

    const goToPage = useCallback((newPage: number, dir: number) => {
        if (!pages) return;
        if (newPage >= 0 && newPage < pages.length) {
            setDirection(dir);
            setCurrentPage(newPage);
        }
    }, [pages]);

    const handleNext = () => {
        if (!pages) {
            onClose();
            return;
        }
        if (currentPage < pages.length - 1) {
            goToPage(currentPage + 1, 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (!pages) return;
        if (currentPage > 0) {
            goToPage(currentPage - 1, -1);
        }
    };

    // Keyboard navigation (ArrowLeft / ArrowRight)
    useEffect(() => {
        if (!pages) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') {
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                handlePrev();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pages, currentPage]);

    const slideVariants = {
        enter: (dir: number) => ({
            x: dir > 0 ? 35 : dir < 0 ? -35 : 0,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (dir: number) => ({
            x: dir < 0 ? 35 : -35,
            opacity: 0,
        }),
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
                width: pages ? 350 : 320,
                maxWidth: 'calc(100vw - 32px)',
                maxHeight: 'calc(100vh - 32px)',
                overflowY: 'auto',
                background: 'rgba(15, 23, 42, 0.96)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(34, 211, 238, 0.35)',
                borderRadius: 18,
                padding: '16px 18px',
                boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.7), 0 0 25px rgba(6, 182, 212, 0.2)',
                color: '#f8fafc',
                fontSize: '0.85rem',
                textAlign: 'left',
                zIndex: 9999,
                position: 'relative',
                boxSizing: 'border-box',
                userSelect: 'none',
                touchAction: 'pan-y',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{
                        width: 30, height: 30, borderRadius: 9,
                        background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.25), rgba(6, 182, 212, 0.45))',
                        border: '1px solid rgba(34, 211, 238, 0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#22d3ee', flexShrink: 0
                    }}>
                        <HelpCircle size={17} />
                    </div>
                    <div>
                        {badge && (
                            <span style={{
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                color: 'var(--brand-400, #22d3ee)',
                                display: 'block',
                                marginBottom: 2
                            }}>
                                {badge}
                            </span>
                        )}
                        <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#fff', lineHeight: 1.25 }}>
                            {title}
                        </h4>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: 'none',
                        borderRadius: 6,
                        width: 26, height: 26,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        padding: 0,
                        flexShrink: 0
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                    aria-label="Cerrar ayuda"
                >
                    <X size={15} />
                </button>
            </div>

            {/* Slideable Content Area */}
            <div style={{ position: 'relative', minHeight: 160, overflow: 'hidden' }}>
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentPage}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.2 }}
                        drag={pages ? "x" : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.25}
                        onDragEnd={(_, { offset, velocity }) => {
                            if (!pages) return;
                            const swipeThreshold = 40;
                            const velocityThreshold = 400;
                            if (offset.x < -swipeThreshold || velocity.x < -velocityThreshold) {
                                if (currentPage < pages.length - 1) handleNext();
                            } else if (offset.x > swipeThreshold || velocity.x > velocityThreshold) {
                                if (currentPage > 0) handlePrev();
                            }
                        }}
                        style={{ cursor: pages ? 'grab' : 'default' }}
                    >
                        {/* Description */}
                        <p style={{ margin: '0 0 10px 0', color: '#cbd5e1', fontSize: '0.8rem', lineHeight: 1.45 }}>
                            {description}
                        </p>

                        {/* Bullets */}
                        {bullets && bullets.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                                {bullets.map((bullet, idx) => (
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
                        {tip && (
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
                                    <strong>Consejo:</strong> {tip}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Pagination Dots (Mobile / TV home style) */}
            {pages && totalPages > 1 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '6px 0 10px 0'
                }}>
                    {pages.map((_, idx) => {
                        const isActive = idx === currentPage;
                        return (
                            <button
                                key={idx}
                                onClick={() => goToPage(idx, idx > currentPage ? 1 : -1)}
                                style={{
                                    width: isActive ? 22 : 7,
                                    height: 7,
                                    borderRadius: 999,
                                    background: isActive
                                        ? 'linear-gradient(90deg, #22d3ee, #06b6d4)'
                                        : 'rgba(255, 255, 255, 0.22)',
                                    border: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: isActive ? '0 0 10px rgba(34, 211, 238, 0.75)' : 'none',
                                    outline: 'none'
                                }}
                                title={`Página ${idx + 1} de ${totalPages}`}
                                aria-label={`Ir a la página ${idx + 1}`}
                            />
                        );
                    })}
                </div>
            )}

            {/* Footer Navigation & Action Buttons */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                paddingTop: 6,
                borderTop: pages ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
            }}>
                {pages && totalPages > 1 ? (
                    <>
                        <button
                            onClick={handlePrev}
                            disabled={currentPage === 0}
                            style={{
                                background: currentPage === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.07)',
                                border: '1px solid',
                                borderColor: currentPage === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.15)',
                                borderRadius: 8,
                                padding: '6px 12px',
                                color: currentPage === 0 ? 'rgba(255, 255, 255, 0.2)' : '#cbd5e1',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: currentPage === 0 ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                transition: 'all 0.15s',
                            }}
                        >
                            <ChevronLeft size={14} />
                            <span>Anterior</span>
                        </button>

                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
                            {currentPage + 1} / {totalPages}
                        </span>

                        <button
                            onClick={handleNext}
                            style={{
                                background: currentPage === totalPages - 1
                                    ? 'linear-gradient(135deg, #22d3ee, #06b6d4)'
                                    : 'rgba(34, 211, 238, 0.15)',
                                border: '1px solid',
                                borderColor: currentPage === totalPages - 1
                                    ? 'transparent'
                                    : 'rgba(34, 211, 238, 0.4)',
                                borderRadius: 8,
                                padding: '6px 14px',
                                color: currentPage === totalPages - 1 ? '#090d16' : '#22d3ee',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                transition: 'all 0.15s',
                                boxShadow: currentPage === totalPages - 1 ? '0 2px 10px rgba(6, 182, 212, 0.35)' : 'none'
                            }}
                        >
                            {currentPage === totalPages - 1 ? (
                                <>
                                    <Check size={13} strokeWidth={3} />
                                    <span>Entendido</span>
                                </>
                            ) : (
                                <>
                                    <span>Siguiente</span>
                                    <ChevronRight size={14} />
                                </>
                            )}
                        </button>
                    </>
                ) : (
                    <>
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
                    </>
                )}
            </div>
        </motion.div>
    );
};
