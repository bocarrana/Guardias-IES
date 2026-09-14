import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { HELP_ITEMS, HelpItem } from '../../data/helpDictionary';
import { HelpCard } from './HelpCard';

interface HelpBadgeProps {
    helpKey: string;
    item?: HelpItem;
    position?: 'top' | 'bottom' | 'left' | 'right';
    size?: 'sm' | 'md' | 'lg' | number;
    className?: string;
    style?: React.CSSProperties;
    onOpenFullHelp?: () => void;
}

export const HelpBadge: React.FC<HelpBadgeProps> = ({
    helpKey,
    item,
    position = 'bottom',
    size = 'md',
    className = '',
    style = {},
    onOpenFullHelp,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const badgeRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean } | null>(null);

    const numSize = typeof size === 'number' ? size : size === 'sm' ? 18 : size === 'lg' ? 26 : 22;
    const helpData = item || HELP_ITEMS[helpKey];

    const updatePosition = useCallback(() => {
        if (!badgeRef.current) return;
        const rect = badgeRef.current.getBoundingClientRect();
        const CARD_WIDTH = Math.min(320, window.innerWidth - 32);
        
        // Calculate horizontal position clamped to viewport
        const badgeCenterX = rect.left + rect.width / 2;
        let left = badgeCenterX - CARD_WIDTH / 2;
        left = Math.max(16, Math.min(left, window.innerWidth - CARD_WIDTH - 16));

        // Calculate vertical position (place above if not enough space below)
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const placeAbove = position === 'top' || (spaceBelow < 280 && spaceAbove > spaceBelow);

        const top = placeAbove ? rect.top - 8 : rect.bottom + 8;

        setCoords({ top, left, placeAbove });
    }, [position]);

    const handleToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isOpen) {
            updatePosition();
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    // Close when clicking outside or scrolling / resizing
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (badgeRef.current && !badgeRef.current.contains(e.target as Node)) {
                // If click is not inside the portal popover
                const popover = document.getElementById('help-badge-portal-popover');
                if (popover && popover.contains(e.target as Node)) return;
                setIsOpen(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        const handleScrollOrResize = () => {
            updatePosition();
        };

        document.addEventListener('mousedown', handleClickOutside, true);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleScrollOrResize);
        window.addEventListener('scroll', handleScrollOrResize, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside, true);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handleScrollOrResize);
            window.removeEventListener('scroll', handleScrollOrResize, true);
        };
    }, [isOpen, updatePosition]);

    if (!helpData) return null;

    return (
        <div
            ref={badgeRef}
            className={`help-badge-wrapper ${className}`}
            style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                verticalAlign: 'middle',
                zIndex: isOpen ? 50 : 1,
                ...style,
            }}
        >
            <button
                type="button"
                onClick={handleToggle}
                title={helpData.title}
                aria-label={`Ayuda: ${helpData.title}`}
                style={{
                    background: isOpen
                        ? 'rgba(34, 211, 238, 0.25)'
                        : 'rgba(255, 255, 255, 0.07)',
                    border: `1px solid ${isOpen ? 'var(--brand-400, #22d3ee)' : 'rgba(255, 255, 255, 0.18)'}`,
                    borderRadius: '50%',
                    width: numSize,
                    height: numSize,
                    minWidth: numSize,
                    minHeight: numSize,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isOpen ? 'var(--brand-400, #22d3ee)' : '#94a3b8',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isOpen ? '0 0 12px rgba(34, 211, 238, 0.4)' : 'none',
                }}
                onMouseEnter={(e) => {
                    if (!isOpen) {
                        e.currentTarget.style.color = 'var(--brand-400, #22d3ee)';
                        e.currentTarget.style.borderColor = 'var(--brand-400, #22d3ee)';
                        e.currentTarget.style.background = 'rgba(34, 211, 238, 0.12)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isOpen) {
                        e.currentTarget.style.color = '#94a3b8';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                        e.currentTarget.style.transform = 'scale(1)';
                    }
                }}
            >
                <HelpCircle size={Math.round(numSize * 0.72)} />
            </button>

            {/* Portal Popover Card: prevents overflow / clipping by parent cards */}
            {typeof document !== 'undefined' && ReactDOM.createPortal(
                <AnimatePresence>
                    {isOpen && coords && (
                        <div
                            id="help-badge-portal-popover"
                            style={{
                                position: 'fixed',
                                top: coords.top,
                                left: coords.left,
                                zIndex: 99999,
                                transform: coords.placeAbove ? 'translateY(-100%)' : 'none',
                                pointerEvents: 'auto',
                            }}
                        >
                            <HelpCard
                                item={helpData}
                                onClose={() => setIsOpen(false)}
                                onOpenFullHelp={onOpenFullHelp}
                            />
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

