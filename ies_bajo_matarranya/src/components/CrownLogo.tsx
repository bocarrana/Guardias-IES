import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { getCenterLogoUrl } from '../services/supabaseClient';
import { LOGO_DARK_URL, LOGO_LIGHT_URL } from '../config/supabase';

interface CrownLogoProps {
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

export const CrownLogo: React.FC<CrownLogoProps> = ({ size = 28, className = '', style = {} }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const variant = isDark ? 'dark' : 'light';

    const [src, setSrc] = useState<string>(() => getCenterLogoUrl(variant));
    const [fallbackLevel, setFallbackLevel] = useState<number>(0);

    useEffect(() => {
        setFallbackLevel(0);
        setSrc(getCenterLogoUrl(variant));

        const handleLogoUpdate = () => {
            setFallbackLevel(0);
            setSrc(getCenterLogoUrl(variant));
        };

        window.addEventListener('center-logo-updated', handleLogoUpdate);
        return () => window.removeEventListener('center-logo-updated', handleLogoUpdate);
    }, [variant]);

    const handleError = () => {
        if (fallbackLevel === 0) {
            // Level 1: Fallback to local files in /public (logo1.png / logo.png)
            setFallbackLevel(1);
            setSrc(isDark ? LOGO_DARK_URL : LOGO_LIGHT_URL);
        } else if (fallbackLevel === 1) {
            // Level 2: Fallback to generic logo.png
            setFallbackLevel(2);
            setSrc('/logo.png');
        } else if (fallbackLevel === 2) {
            // Level 3: Fallback to SVG crown
            setFallbackLevel(3);
        }
    };

    if (fallbackLevel === 3) {
        return (
            <svg
                width={size}
                height={size}
                viewBox="0 0 48 48"
                fill="none"
                className={className}
                style={{ display: 'block', ...style }}
            >
                <path
                    d="M6 34C6 32.8954 6.89543 32 8 32H40C41.1046 32 42 32.8954 42 34V38C42 39.1046 41.1046 40 40 40H8C6.89543 40 6 39.1046 6 38V34Z"
                    fill={isDark ? '#22d3ee' : '#0284c7'}
                />
                <path
                    d="M7 32L11 16L18 25L24 10L30 25L37 16L41 32H7Z"
                    fill={isDark ? '#22d3ee' : '#0284c7'}
                />
                <circle cx="11" cy="14.5" r="2.5" fill={isDark ? '#facc15' : '#d97706'} />
                <circle cx="24" cy="8.5" r="3.2" fill={isDark ? '#facc15' : '#d97706'} />
                <circle cx="37" cy="14.5" r="2.5" fill={isDark ? '#facc15' : '#d97706'} />
            </svg>
        );
    }

    return (
        <img
            src={src}
            alt="Logo IES"
            width={size}
            height={size}
            className={className}
            style={{
                width: size,
                height: size,
                objectFit: 'contain',
                display: 'block',
                transition: 'all 0.2s ease',
                ...style,
            }}
            onError={handleError}
        />
    );
};

export default CrownLogo;
