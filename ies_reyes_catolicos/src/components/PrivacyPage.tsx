import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, FileText, Users, EyeOff, ArrowLeft } from 'lucide-react';

const PrivacyPage: React.FC = () => {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-main)',
            color: 'var(--text-primary)',
            padding: '40px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            {/* Background Orbs */}
            <div className="bg-orb" style={{
                top: '-10%', left: '-10%', width: 600, height: 600,
                background: 'rgba(6, 182, 212, 0.03)',
            }} />
            <div className="bg-orb" style={{
                bottom: '-10%', right: '-10%', width: 600, height: 600,
                background: 'rgba(168, 85, 247, 0.03)',
            }} />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    maxWidth: 800,
                    width: '100%',
                    position: 'relative',
                    zIndex: 10
                }}
            >
                {/* Back Link */}
                <a 
                    href="/" 
                    style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: 8, 
                        color: 'var(--brand-400)', 
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        marginBottom: 32,
                        transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateX(-4px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                >
                    <ArrowLeft size={16} /> Volver al Inicio
                </a>

                <div className="glass" style={{
                    padding: '48px',
                    borderRadius: 'var(--radius-2xl)',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
                }}>
                    <header style={{ marginBottom: 40, textAlign: 'center' }}>
                        <div style={{
                            width: 60,
                            height: 60,
                            borderRadius: 16,
                            background: 'rgba(34, 211, 238, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--brand-400)',
                            border: '1px solid rgba(34, 211, 238, 0.2)',
                            margin: '0 auto 20px auto'
                        }}>
                            <ShieldCheck size={32} />
                        </div>
                        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--heading-color)', marginBottom: 12 }}>
                            Política de Privacidad y RGPD
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
                            Tratamiento de datos personales en la plataforma de guardias del IES Aragón.
                        </p>
                    </header>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 32, lineHeight: 1.7 }}>
                        <section>
                            <h2 style={{ color: 'var(--heading-color)', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <Lock size={20} style={{ color: 'var(--brand-400)' }} />
                                1. Responsable del Tratamiento
                            </h2>
                            <p>
                                El responsable del tratamiento de los datos es <strong>aplanastorrea@gmail.com</strong>. Esta plataforma es una herramienta técnica interna para la gestión operativa del centro educativo. El uso de esta aplicación está restringido exclusivamente al personal autorizado del centro.
                            </p>
                        </section>

                        <section>
                            <h2 style={{ color: 'var(--heading-color)', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <FileText size={20} style={{ color: 'var(--brand-400)' }} />
                                2. Finalidad del Tratamiento
                            </h2>
                            <p>
                                Los datos de carácter personal se recogen exclusivamente con las siguientes finalidades:
                            </p>
                            <ul style={{ paddingLeft: 24, marginTop: 12 }}>
                                <li><strong>Gestión de Guardias:</strong> Organización y asignación de sustituciones del profesorado.</li>
                                <li><strong>Tareas de Guardia:</strong> Comunicación interna sobre el contenido y pautas para las horas de guardia.</li>
                                <li><strong>Estadísticas Internas:</strong> Generación de informes de cumplimiento para la Jefatura de Estudios.</li>
                                <li><strong>Personalización:</strong> Gestión de perfiles de usuario, avatares y preferencias de interfaz.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 style={{ color: 'var(--heading-color)', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <Users size={20} style={{ color: 'var(--brand-400)' }} />
                                3. Base Jurídica
                            </h2>
                            <p>
                                El tratamiento de sus datos se basa en la <strong>relación administrativa o laboral</strong> existente con la administración educativa competente y en el cumplimiento de una misión realizada en interés público, de acuerdo con la Ley Orgánica de Educación y el Reglamento General de Protección de Datos (RGPD).
                            </p>
                        </section>

                        <section>
                            <h2 style={{ color: 'var(--heading-color)', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <EyeOff size={20} style={{ color: 'var(--brand-400)' }} />
                                4. Sus Derechos
                            </h2>
                            <p>
                                De acuerdo con el RGPD, usted dispone de los derechos de <strong>acceso, rectificación, supresión, limitación del tratamiento y portabilidad</strong>. Para ejercer estos derechos, puede dirigirse a la Secretaría del IES Aragón. Sus datos son tratados bajo estrictas medidas de seguridad y no se ceden a terceros fuera de la infraestructura tecnológica necesaria para el funcionamiento del servicio (Supabase y Google Auth).
                            </p>
                        </section>
                    </div>

                    <footer style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Última actualización: Marzo 2026 · IES Aragón
                        </p>
                    </footer>
                </div>
            </motion.div>
        </div>
    );
};

export default PrivacyPage;
