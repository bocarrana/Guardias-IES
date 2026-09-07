import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { LOGO_DARK_URL, LOGO_LIGHT_URL } from '../config/supabase';

interface CrownLogoProps {
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

export const CrownLogo: React.FC<CrownLogoProps> = ({ size = 28, className = '', style = {} }) => {
    const { theme } = useTheme();
    const logoSrc = theme === 'dark' ? LOGO_DARK_URL : LOGO_LIGHT_URL;

    return (
        <img
            src={logoSrc}
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
            onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src.endsWith('/logo1.png')) {
                    target.src = '/logo.png';
                }
            }}
        />
    );
};

export default CrownLogo;
