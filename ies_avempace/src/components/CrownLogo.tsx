import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface CrownLogoProps {
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

export const CrownLogo: React.FC<CrownLogoProps> = ({ size = 28, className = '', style = {} }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            className={className}
            style={{ display: 'block', transition: 'all 0.3s ease', ...style }}
        >
            <defs>
                <linearGradient id={`crownGrad-${isDark ? 'dark' : 'light'}`} x1="4" y1="8" x2="44" y2="40" gradientUnits="userSpaceOnUse">
                    {isDark ? (
                        <>
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="50%" stopColor="#22d3ee" />
                            <stop offset="100%" stopColor="#06b6d4" />
                        </>
                    ) : (
                        <>
                            <stop offset="0%" stopColor="#0284c7" />
                            <stop offset="50%" stopColor="#0369a1" />
                            <stop offset="100%" stopColor="#075985" />
                        </>
                    )}
                </linearGradient>
                {isDark && (
                    <filter id="crownGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                )}
            </defs>

            {/* Base band */}
            <path
                d="M6 34C6 32.8954 6.89543 32 8 32H40C41.1046 32 42 32.8954 42 34V38C42 39.1046 41.1046 40 40 40H8C6.89543 40 6 39.1046 6 38V34Z"
                fill={`url(#crownGrad-${isDark ? 'dark' : 'light'})`}
            />

            {/* Jewels on Band */}
            <circle cx="14" cy="36" r="1.5" fill={isDark ? '#0f172a' : '#ffffff'} />
            <circle cx="24" cy="36" r="2" fill={isDark ? '#0f172a' : '#ffffff'} />
            <circle cx="34" cy="36" r="1.5" fill={isDark ? '#0f172a' : '#ffffff'} />

            {/* Spikes */}
            <path
                d="M7 32L11 16L18 25L24 10L30 25L37 16L41 32H7Z"
                fill={`url(#crownGrad-${isDark ? 'dark' : 'light'})`}
                filter={isDark ? 'url(#crownGlow)' : undefined}
            />

            {/* Pearl Tops */}
            <circle cx="11" cy="14.5" r="2.5" fill={isDark ? '#facc15' : '#d97706'} />
            <circle cx="24" cy="8.5" r="3.2" fill={isDark ? '#facc15' : '#d97706'} />
            <circle cx="37" cy="14.5" r="2.5" fill={isDark ? '#facc15' : '#d97706'} />
        </svg>
    );
};

export default CrownLogo;
