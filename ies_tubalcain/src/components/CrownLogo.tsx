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
    const [useFallback, setUseFallback] = useState(false);

    useEffect(() => {
        setUseFallback(false);
        setSrc(getCenterLogoUrl(variant));

        const handleLogoUpdate = () => {
            setUseFallback(false);
            setSrc(getCenterLogoUrl(variant));
        };

        window.addEventListener('center-logo-updated', handleLogoUpdate);
        return () => window.removeEventListener('center-logo-updated', handleLogoUpdate);
    }, [variant]);

    const handleError = () => {
        if (!useFallback) {
            setUseFallback(true);
            setSrc(isDark ? LOGO_DARK_URL : LOGO_LIGHT_URL);
        }
    };

    return (
        <img
            src={useFallback ? (isDark ? LOGO_DARK_URL : LOGO_LIGHT_URL) : src}
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
