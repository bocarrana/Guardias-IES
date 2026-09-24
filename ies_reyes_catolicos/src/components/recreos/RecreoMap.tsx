import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Shield, Users, Info, Sparkles } from 'lucide-react';
import { RECREO_ZONES, RecreoZone, TodayRecreoAssignment } from '../../services/recreoZonesService';
import TeacherAvatar from '../TeacherAvatar';

interface RecreoMapProps {
    assignments?: TodayRecreoAssignment[];
    recreoTitle?: string;
    onSelectZone?: (zoneId: string) => void;
    selectedZoneId?: string | null;
}

export const RecreoMap: React.FC<RecreoMapProps> = ({
    assignments = [],
    recreoTitle = 'Primer Recreo',
    onSelectZone,
    selectedZoneId,
}) => {
    const [hoveredZone, setHoveredZone] = useState<string | null>(null);

    const activeZoneId = selectedZoneId || hoveredZone;

    const getAssignedForZone = (zoneId: string) => {
        return assignments.find(a => a.zone.id === zoneId);
    };

    return (
        <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(6, 182, 212, 0.05))',
                        border: '1px solid rgba(6, 182, 212, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <MapPin size={20} color="#06b6d4" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            Plano Interactivo de Zonas de Recreo
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Distribución de vigilancia de patio · {recreoTitle}
                        </p>
                    </div>
                </div>

                {/* Quick Badge indicator */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {RECREO_ZONES.map(z => {
                        const isHovered = activeZoneId === z.id;
                        const duty = getAssignedForZone(z.id);
                        return (
                            <button
                                key={z.id}
                                onClick={() => onSelectZone?.(z.id)}
                                onMouseEnter={() => setHoveredZone(z.id)}
                                onMouseLeave={() => setHoveredZone(null)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '6px 12px',
                                    borderRadius: '10px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    background: isHovered ? z.color : 'rgba(255,255,255,0.04)',
                                    color: isHovered ? '#ffffff' : 'var(--text-secondary)',
                                    border: `1px solid ${isHovered ? z.color : 'rgba(255,255,255,0.1)'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    transform: isHovered ? 'scale(1.05)' : 'none',
                                }}
                            >
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: isHovered ? '#fff' : z.color }} />
                                <span>{z.shortName}</span>
                                {duty?.teacherName && (
                                    <span style={{ opacity: 0.8, fontWeight: 500, fontSize: '0.7rem' }}>
                                        ({duty.teacherName.split(' ')[0]})
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Map Graphic Container */}
            <div style={{
                position: 'relative',
                background: '#f8fafc',
                borderRadius: '20px',
                border: '1px solid rgba(0,0,0,0.08)',
                overflow: 'hidden',
                padding: '16px',
            }}>
                <svg
                    viewBox="0 0 1000 620"
                    style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '540px' }}
                >
                    <defs>
                        {/* Drop shadow filter */}
                        <filter id="recreoGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.25" />
                        </filter>
                    </defs>

                    {/* Background Grid Accent */}
                    <rect x="0" y="0" width="1000" height="620" fill="#f8fafc" rx="16" />

                    {/* ======================================================== */}
                    {/* ZONA 3: TOP LEFT & CENTER-LEFT (Pista dep, Edif A, Edif D) */}
                    {/* ======================================================== */}
                    <g
                        id="zone-3-group"
                        style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                        onClick={() => onSelectZone?.('zona_3')}
                        onMouseEnter={() => setHoveredZone('zona_3')}
                        onMouseLeave={() => setHoveredZone(null)}
                    >
                        {/* Zone 3 background highlight */}
                        <rect
                            x="30" y="30" width="490" height="290" rx="16"
                            fill={activeZoneId === 'zona_3' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.05)'}
                            stroke={activeZoneId === 'zona_3' ? '#f59e0b' : 'rgba(245, 158, 11, 0.3)'}
                            strokeWidth={activeZoneId === 'zona_3' ? 3 : 1.5}
                            strokeDasharray={activeZoneId === 'zona_3' ? 'none' : '6 4'}
                        />

                        {/* Pista deportiva (Top-Left) */}
                        <rect x="50" y="50" width="150" height="150" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />
                        <text x="125" y="125" textAnchor="middle" fill="#475569" fontSize="13" fontWeight="700">Pista deportiva</text>

                        {/* Edificio A (1º ESO) */}
                        <path d="M 230,80 L 390,80 L 390,150 L 330,150 L 330,175 L 290,175 L 290,150 L 230,150 Z" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                        <text x="310" y="115" textAnchor="middle" fill="#92400e" fontSize="14" fontWeight="800">Edificio A</text>
                        <text x="310" y="133" textAnchor="middle" fill="#b45309" fontSize="11" fontWeight="600">1º de la ESO</text>

                        {/* Edificio D (Polideportivo) */}
                        <rect x="50" y="220" width="150" height="85" rx="8" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                        <text x="125" y="255" textAnchor="middle" fill="#92400e" fontSize="14" fontWeight="800">Edificio D</text>
                        <text x="125" y="275" textAnchor="middle" fill="#b45309" fontSize="11" fontWeight="600">Polideportivo</text>

                        {/* Zona 3 Label Pill */}
                        <rect x="330" y="195" width="110" height="32" rx="16" fill="#f59e0b" />
                        <text x="385" y="216" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="900">ZONA 3</text>
                    </g>


                    {/* ======================================================== */}
                    {/* ZONA 2: TOP RIGHT (Pistas deportivas)                    */}
                    {/* ======================================================== */}
                    <g
                        id="zone-2-group"
                        style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                        onClick={() => onSelectZone?.('zona_2')}
                        onMouseEnter={() => setHoveredZone('zona_2')}
                        onMouseLeave={() => setHoveredZone(null)}
                    >
                        {/* Zone 2 background highlight */}
                        <rect
                            x="545" y="30" width="425" height="300" rx="16"
                            fill={activeZoneId === 'zona_2' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.05)'}
                            stroke={activeZoneId === 'zona_2' ? '#10b981' : 'rgba(16, 185, 129, 0.3)'}
                            strokeWidth={activeZoneId === 'zona_2' ? 3 : 1.5}
                            strokeDasharray={activeZoneId === 'zona_2' ? 'none' : '6 4'}
                        />

                        {/* Pistas Deportivas Grandes */}
                        <rect x="565" y="50" width="385" height="260" rx="12" fill="#d1fae5" stroke="#059669" strokeWidth="2" />
                        <circle cx="757" cy="180" r="45" fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="5 5" />
                        <line x1="757" y1="50" x2="757" y2="310" stroke="#10b981" strokeWidth="2" strokeDasharray="5 5" />
                        <text x="757" y="175" textAnchor="middle" fill="#065f46" fontSize="18" fontWeight="900">Pistas deportivas</text>
                        <text x="757" y="200" textAnchor="middle" fill="#047857" fontSize="12" fontWeight="600">Fútbol · Baloncesto · Patios</text>

                        {/* Zona 2 Label Pill */}
                        <rect x="565" y="240" width="110" height="32" rx="16" fill="#10b981" />
                        <text x="620" y="261" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="900">ZONA 2</text>
                    </g>


                    {/* ======================================================== */}
                    {/* ZONA 4: BOTTOM LEFT & CENTER (B, C, Invernaderos, Rugby) */}
                    {/* ======================================================== */}
                    <g
                        id="zone-4-group"
                        style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                        onClick={() => onSelectZone?.('zona_4')}
                        onMouseEnter={() => setHoveredZone('zona_4')}
                        onMouseLeave={() => setHoveredZone(null)}
                    >
                        {/* Zone 4 background highlight */}
                        <rect
                            x="30" y="340" width="500" height="260" rx="16"
                            fill={activeZoneId === 'zona_4' ? 'rgba(236, 72, 153, 0.18)' : 'rgba(236, 72, 153, 0.05)'}
                            stroke={activeZoneId === 'zona_4' ? '#ec4899' : 'rgba(236, 72, 153, 0.3)'}
                            strokeWidth={activeZoneId === 'zona_4' ? 3 : 1.5}
                            strokeDasharray={activeZoneId === 'zona_4' ? 'none' : '6 4'}
                        />

                        {/* Campo de Rugby */}
                        <rect x="50" y="360" width="180" height="220" rx="10" fill="#fce7f3" stroke="#db2777" strokeWidth="1.5" />
                        <text x="140" y="465" textAnchor="middle" fill="#9d174d" fontSize="15" fontWeight="800">Campo de Rugby</text>

                        {/* Edificio B & C */}
                        <rect x="250" y="360" width="120" height="90" rx="8" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                        <text x="310" y="405" textAnchor="middle" fill="#92400e" fontSize="13" fontWeight="800">Edificio B / C</text>

                        {/* Invernaderos */}
                        <rect x="390" y="360" width="120" height="90" rx="8" fill="#ecfdf5" stroke="#059669" strokeWidth="1.5" />
                        <text x="450" y="405" textAnchor="middle" fill="#065f46" fontSize="12" fontWeight="800">Invernaderos</text>

                        {/* Edificio E */}
                        <rect x="250" y="470" width="100" height="90" rx="8" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                        <text x="300" y="520" textAnchor="middle" fill="#92400e" fontSize="12" fontWeight="800">Edificio E</text>

                        {/* Zona 4 Label Pill */}
                        <rect x="380" y="480" width="110" height="32" rx="16" fill="#ec4899" />
                        <text x="435" y="501" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="900">ZONA 4</text>
                    </g>


                    {/* ======================================================== */}
                    {/* ZONA 1: BOTTOM RIGHT (Edificio Ppal, Parking, Sala Prof) */}
                    {/* ======================================================== */}
                    <g
                        id="zone-1-group"
                        style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                        onClick={() => onSelectZone?.('zona_1_edificio')}
                        onMouseEnter={() => setHoveredZone('zona_1_edificio')}
                        onMouseLeave={() => setHoveredZone(null)}
                    >
                        {/* Zone 1 background highlight */}
                        <rect
                            x="550" y="340" width="420" height="260" rx="16"
                            fill={activeZoneId?.startsWith('zona_1') ? 'rgba(6, 182, 212, 0.18)' : 'rgba(6, 182, 212, 0.05)'}
                            stroke={activeZoneId?.startsWith('zona_1') ? '#06b6d4' : 'rgba(6, 182, 212, 0.3)'}
                            strokeWidth={activeZoneId?.startsWith('zona_1') ? 3 : 1.5}
                            strokeDasharray={activeZoneId?.startsWith('zona_1') ? 'none' : '6 4'}
                        />

                        {/* Usos múltiples & Plaza Igualdad */}
                        <rect x="570" y="360" width="90" height="60" rx="8" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.5" />
                        <text x="615" y="392" textAnchor="middle" fill="#0369a1" fontSize="10" fontWeight="700">Usos múlt.</text>

                        <rect x="570" y="430" width="110" height="35" rx="6" fill="#f0f9ff" stroke="#bae6fd" strokeWidth="1" />
                        <text x="625" y="452" textAnchor="middle" fill="#0369a1" fontSize="10" fontWeight="700">Plaza Igualdad</text>

                        {/* Edificio Principal & Sala de profes */}
                        <rect x="700" y="360" width="150" height="110" rx="10" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
                        <text x="775" y="410" textAnchor="middle" fill="#92400e" fontSize="13" fontWeight="800">Edificio Principal</text>
                        <text x="775" y="430" textAnchor="middle" fill="#b45309" fontSize="11" fontWeight="600">Sala de Profes</text>

                        {/* Zona Parking */}
                        <rect x="865" y="360" width="90" height="220" rx="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />
                        <text x="910" y="470" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="700" transform="rotate(-90 910 470)">Zona Parking</text>

                        {/* Zona 1 Labels (Puerta & Edificio) */}
                        <rect x="570" y="490" width="130" height="30" rx="15" fill="#3b82f6" />
                        <text x="635" y="510" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900">ZONA 1 PUERTA</text>

                        <rect x="715" y="490" width="135" height="30" rx="15" fill="#06b6d4" />
                        <text x="782" y="510" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900">ZONA 1 EDIFICIO</text>
                    </g>
                </svg>
            </div>

            {/* Selected / Hovered Zone Details Box */}
            <AnimatePresence>
                {activeZoneId && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${RECREO_ZONES.find(z => z.id === activeZoneId)?.color || 'var(--border-subtle)'}`,
                            borderRadius: '16px',
                            padding: '16px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 16,
                        }}
                    >
                        {(() => {
                            const zone = RECREO_ZONES.find(z => z.id === activeZoneId);
                            if (!zone) return null;
                            const duty = getAssignedForZone(zone.id);

                            return (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{
                                            width: 12,
                                            height: 48,
                                            borderRadius: 6,
                                            background: zone.color,
                                        }} />
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                    {zone.name}
                                                </span>
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    padding: '2px 8px',
                                                    borderRadius: 6,
                                                    background: zone.badgeBg,
                                                    color: zone.color,
                                                    fontWeight: 700,
                                                }}>
                                                    {recreoTitle}
                                                </span>
                                            </div>
                                            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {zone.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Assigned Teacher Card */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        background: 'var(--bg-main)',
                                        padding: '8px 16px',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border-subtle)',
                                    }}>
                                        {duty?.teacher ? (
                                            <TeacherAvatar teacher={duty.teacher} size={36} showViewer={false} />
                                        ) : (
                                            <div style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: '50%',
                                                background: 'rgba(255,255,255,0.08)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}>
                                                <Users size={18} color="var(--text-muted)" />
                                            </div>
                                        )}
                                        <div>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>
                                                Docente de vigilancia:
                                            </span>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                                                {duty?.teacherName || 'Sin asignar'}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
