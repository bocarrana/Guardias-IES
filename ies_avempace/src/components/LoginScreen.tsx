import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { signInWithGoogle } from '../services/supabaseClient';
import { LOGO_DARK_URL, LOGO_LIGHT_URL } from '../config/supabase';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';
import PrivacyModal from './PrivacyModal';

interface LoginScreenProps {
    loading: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ loading }) => {
    const { authError } = useAuth();
    const { theme } = useTheme();
    const [isPrivacyOpen, setIsPrivacyOpen] = React.useState(false);

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-main)',
            }}>
                <Loader2
                    style={{ width: 48, height: 48, color: 'var(--brand-500)', animation: 'spin 1s linear infinite' }}
                />
                <p style={{
                    marginTop: 16,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                }}>
                    INICIANDO SISTEMA...
                </p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--bg-main)',
        }}>
            {/* Background Orbs */}
            <div className="bg-orb" style={{
                top: '-20%', left: '-20%', width: 800, height: 800,
                background: 'rgba(6, 182, 212, 0.05)',
            }} />
            <div className="bg-orb" style={{
                bottom: '-20%', right: '-20%', width: 800, height: 800,
                background: 'rgba(168, 85, 247, 0.05)',
            }} />

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    position: 'relative',
                    zIndex: 10,
                    maxWidth: 420,
                    width: '100%',
                    textAlign: 'center',
                    padding: 40,
                    borderRadius: 'var(--radius-xl)',
                }}
                className="glass"
            >
                {/* Logo */}
                <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    style={{
                        marginBottom: 28,
                        display: 'flex',
                        justifyContent: 'center',
                    }}
                >
                    <div style={{
                        width: 96,
                        height: 96,
                        borderRadius: 'var(--radius-lg)',
                        background: 'var(--bg-main)',
                        border: '2px solid var(--brand-500)',
                        boxShadow: '0 0 25px rgba(6, 182, 212, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                    }}>
                        <img
                            src={theme === 'dark' ? LOGO_DARK_URL : LOGO_LIGHT_URL}
                            alt="Logo IES"
                            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    </div>
                </motion.div>

                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--heading-color)', marginBottom: 4 }}>
                    Guardias IES <span style={{ color: 'var(--brand-400)' }}>Aragón</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: '0.875rem' }}>
                    Sistema de Gestión de Guardias
                </p>

                {/* Auth Error */}
                {authError && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={{
                            marginBottom: 24,
                            padding: 14,
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(153, 27, 27, 0.2)',
                            border: '1px solid rgba(248, 113, 113, 0.3)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            textAlign: 'left',
                        }}
                    >
                        <AlertTriangle style={{ width: 20, height: 20, color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: '0.8rem', color: '#fca5a5' }}>{authError}</p>
                    </motion.div>
                )}

                {/* Botón de Inicio de Sesión con Google */}
                <div style={{ marginTop: 8, marginBottom: 20 }}>
                    <button
                        onClick={signInWithGoogle}
                        style={{
                            width: '100%',
                            padding: '14px 20px',
                            borderRadius: 'var(--radius-md)',
                            background: 'white',
                            color: '#1f2937',
                            border: '1px solid #e5e7eb',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseOver={e => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
                        }}
                        onMouseOut={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                        }}
                    >
                        <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        Iniciar sesión con Google
                    </button>

                    <p style={{
                        marginTop: 12,
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.4
                    }}>
                        Accede con tu cuenta corporativa del centro educativo.
                    </p>
                </div>

                {/* Privacy Link */}
                <button
                    onClick={() => setIsPrivacyOpen(true)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--brand-400)',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        marginTop: 12,
                        opacity: 0.8,
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseOut={(e) => (e.currentTarget.style.opacity = '0.8')}
                >
                    Política de Privacidad y RGPD
                </button>

                {/* Theme Toggle */}
                <div style={{
                    marginTop: 24,
                    display: 'flex',
                    justifyContent: 'center',
                }}>
                    <div style={{
                        padding: '8px 16px',
                        borderRadius: 999,
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-main)',
                        display: 'inline-flex',
                        alignItems: 'center',
                    }}>
                        <ThemeToggle showLabel />
                    </div>
                </div>
            </motion.div>

            {/* Privacy Modal */}
            <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
        </div>
    );
};

export default LoginScreen;
