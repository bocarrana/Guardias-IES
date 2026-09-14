import React, { useState, useRef, useEffect } from 'react';
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

    const numSize = typeof size === 'number' ? size : size === 'sm' ? 18 : size === 'lg' ? 26 : 22;
    const helpData = item || HELP_ITEMS[helpKey];

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (badgeRef.current && !badgeRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    if (!helpData) return null;

    // Popover placement
    const getPlacementStyles = (): React.CSSProperties => {
        switch (position) {
            case 'top':
                return { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' };
            case 'left':
                return { right: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' };
            case 'right':
                return { left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' };
            case 'bottom':
            default:
                return { top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' };
        }
    };

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
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(prev => !prev);
                }}
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

            {/* Popover Card */}
            <AnimatePresence>
                {isOpen && (
                    <div
                        style={{
                            position: 'absolute',
                            zIndex: 1000,
                            ...getPlacementStyles(),
                        }}
                    >
                        <HelpCard
                            item={helpData}
                            onClose={() => setIsOpen(false)}
                            onOpenFullHelp={onOpenFullHelp}
                        />
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
