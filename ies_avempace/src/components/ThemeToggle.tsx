import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
    /** Show a label next to the toggle */
    showLabel?: boolean;
    /** Compact mode: smaller size */
    compact?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ showLabel = false, compact = false }) => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    const trackW = compact ? 48 : 56;
    const trackH = compact ? 26 : 30;
    const thumbSize = compact ? 20 : 24;
    const iconSize = compact ? 11 : 13;
    const thumbOffset = trackW - thumbSize - (trackH - thumbSize) / 2;
    const thumbStart = (trackH - thumbSize) / 2;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                userSelect: 'none',
            }}
            onClick={toggleTheme}
            role="switch"
            aria-checked={!isDark}
            aria-label="Cambiar tema"
        >
            {/* Sun icon */}
            <Sun
                size={iconSize + 2}
                style={{
                    color: !isDark ? 'var(--warning)' : 'var(--text-muted)',
                    transition: 'color 0.3s ease',
                    flexShrink: 0,
                }}
            />

            {/* Track */}
            <div
                style={{
                    position: 'relative',
                    width: trackW,
                    height: trackH,
                    borderRadius: trackH / 2,
                    background: isDark
                        ? 'rgba(30, 41, 59, 0.9)'
                        : 'rgba(226, 232, 240, 0.95)',
                    border: isDark
                        ? '1px solid rgba(99, 102, 241, 0.35)'
                        : '1px solid rgba(148, 163, 184, 0.4)',
                    boxShadow: isDark
                        ? 'inset 0 1px 4px rgba(0,0,0,0.4), 0 0 12px rgba(99,102,241,0.15)'
                        : 'inset 0 1px 3px rgba(0,0,0,0.1)',
                    transition: 'background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
                    flexShrink: 0,
                }}
            >
                {/* Thumb */}
                <motion.div
                    animate={{ x: isDark ? thumbStart : thumbOffset }}
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    style={{
                        position: 'absolute',
                        top: (trackH - thumbSize) / 2,
                        width: thumbSize,
                        height: thumbSize,
                        borderRadius: '50%',
                        background: isDark
                            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                            : 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
                        boxShadow: isDark
                            ? '0 2px 8px rgba(99,102,241,0.5), 0 1px 3px rgba(0,0,0,0.3)'
                            : '0 2px 6px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {/* Icon inside thumb */}
                    <motion.div
                        animate={{ rotate: isDark ? 0 : 90 }}
                        transition={{ duration: 0.3 }}
                    >
                        {isDark
                            ? <Moon size={iconSize} style={{ color: '#c4b5fd' }} />
                            : <Sun size={iconSize} style={{ color: '#f59e0b' }} />
                        }
                    </motion.div>
                </motion.div>
            </div>

            {/* Moon icon */}
            <Moon
                size={iconSize + 2}
                style={{
                    color: isDark ? '#818cf8' : 'var(--text-muted)',
                    transition: 'color 0.3s ease',
                    flexShrink: 0,
                }}
            />

            {/* Optional label */}
            {showLabel && (
                <span style={{
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                }}>
                    {isDark ? 'OSCURO' : 'CLARO'}
                </span>
            )}
        </div>
    );
};

export default ThemeToggle;
