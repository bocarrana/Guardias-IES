import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';
import { RECREO_ZONES, TodayRecreoAssignment } from '../../services/recreoZonesService';
import TeacherAvatar from '../TeacherAvatar';
import InteractiveFloorMap from '../InteractiveFloorMap';
import General_SVG from '../../assets/maps/General.svg?raw';

interface RecreoMapProps {
    assignments?: TodayRecreoAssignment[];
    recreoTitle?: string;
    onSelectZone?: (zoneId: string) => void;
    selectedZoneId?: string | null;
}

export const RecreoMap: React.FC<RecreoMapProps> = ({
    assignments = [],
    recreoTitle = 'Recreo',
    onSelectZone,
    selectedZoneId,
}) => {
    const [hoveredZone, setHoveredZone] = useState<string | null>(null);

    const activeZoneId = selectedZoneId || hoveredZone || 'zona_1_edificio';

    const getAssignedForZone = (zoneId: string) => {
        return assignments.find(a => a.zone.id === zoneId);
    };

    const activeZone = useMemo(() => {
        return RECREO_ZONES.find(z => z.id === activeZoneId) || RECREO_ZONES[0];
    }, [activeZoneId]);

    const activeDuty = useMemo(() => {
        return getAssignedForZone(activeZone.id);
    }, [activeZone.id, assignments]);

    // Build the processed General.svg with vivid highlights on the active zone
    const processedSvgMarkup = useMemo(() => {
        let activePathSelectors = '';
        let activeTextSelectors = '';
        const zoneColor = activeZone.color;

        if (activeZone.id === 'zona_1_puerta') {
            activePathSelectors = '#path14, #path17';
            activeTextSelectors = '#text7, #text7 *, #text21, #text21 *';
        } else if (activeZone.id === 'zona_1_edificio') {
            activePathSelectors = '#path14, #path17';
            activeTextSelectors = '#text7, #text7 *, #text21, #text21 *';
        } else if (activeZone.id === 'zona_2') {
            activePathSelectors = '#path2';
            activeTextSelectors = '#text4, #text4 *, #text20, #text20 *';
        } else if (activeZone.id === 'zona_3') {
            activePathSelectors = '#path12';
            activeTextSelectors = '#text5, #text5 *, #text25, #text25 *';
        } else if (activeZone.id === 'zona_4') {
            activePathSelectors = '#path16, #path13, #path15';
            activeTextSelectors = '#text6, #text6 *, #text24, #text24 *, #text22, #text22 *, #text23, #text23 *';
        }

        const injectedCSS = `
<style>
    /* Interactive pointer on main zones */
    #path14, #path17, #path2, #path12, #path16, #path13, #path15,
    #text7, #text4, #text5, #text6, #text21, #text20, #text25, #text24, #text22, #text23 {
        cursor: pointer !important;
        transition: all 0.25s ease-in-out;
    }
    #path14:hover, #path17:hover, #path2:hover, #path12:hover, #path16:hover, #path13:hover, #path15:hover {
        filter: brightness(1.2) drop-shadow(0 0 10px rgba(255,255,255,0.7));
    }
    @keyframes __recreoZonePulse {
        0%, 100% {
            fill: ${zoneColor}66 !important;
            stroke: ${zoneColor} !important;
            stroke-width: 2.8px !important;
            filter: drop-shadow(0 0 12px ${zoneColor}) drop-shadow(0 0 28px ${zoneColor}80) !important;
        }
        50% {
            fill: ${zoneColor}99 !important;
            stroke: #ffffff !important;
            stroke-width: 3.8px !important;
            filter: drop-shadow(0 0 20px ${zoneColor}) drop-shadow(0 0 45px ${zoneColor}) !important;
        }
    }
    ${activePathSelectors} {
        animation: __recreoZonePulse 1.8s ease-in-out infinite !important;
        paint-order: stroke fill !important;
    }
    ${activeTextSelectors} {
        fill: #ffffff !important;
        stroke: ${zoneColor} !important;
        stroke-width: 0.6px !important;
        filter: drop-shadow(0 0 8px ${zoneColor}) !important;
        font-weight: 900 !important;
    }
</style>`;

        return General_SVG.replace('</svg>', `${injectedCSS}</svg>`);
    }, [activeZone]);

    const handleMapElementClick = (elementId: string) => {
        if (['path14', 'path17', 'text21', 'text7', 'tspan10', 'tspan21'].includes(elementId)) {
            onSelectZone?.('zona_1_edificio');
        } else if (['path2', 'text20', 'text4', 'tspan3', 'tspan20'].includes(elementId)) {
            onSelectZone?.('zona_2');
        } else if (['path12', 'text25', 'text5', 'tspan8', 'tspan4'].includes(elementId)) {
            onSelectZone?.('zona_3');
        } else if (['path16', 'path13', 'path15', 'text24', 'text22', 'text23', 'text6', 'tspan9', 'tspan24', 'tspan22', 'tspan23'].includes(elementId)) {
            onSelectZone?.('zona_4');
        }
    };

    return (
        <div style={{
            background: 'var(--bg-card)',
            borderRadius: '24px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxHeight: '90vh',
            overflow: 'hidden',
        }}>
            {/* Map Graphic Container using InteractiveFloorMap & General_SVG */}
            <div style={{
                position: 'relative',
                background: '#0b1628',
                borderRadius: '18px',
                border: '1px solid rgba(255,255,255,0.08)',
                overflow: 'hidden',
                height: 'clamp(260px, 48vh, 400px)',
                flex: '1 1 auto',
                display: 'flex',
                flexDirection: 'column',
            }}>
                <InteractiveFloorMap
                    floorLabel={`PLANO GENERAL · ${activeZone.name.toUpperCase()}`}
                    svgMarkup={processedSvgMarkup}
                    onRoomClick={handleMapElementClick}
                    initialScale={0.55}
                    minScale={0.35}
                />
            </div>

            {/* Selected Zone Details Footer */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeZone.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${activeZone.color}60`,
                        borderRadius: '16px',
                        padding: '12px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 14,
                        boxShadow: `0 4px 20px ${activeZone.color}15`,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: 8,
                            height: 42,
                            borderRadius: 4,
                            background: activeZone.color,
                            boxShadow: `0 0 10px ${activeZone.color}`,
                        }} />
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    {activeZone.name}
                                </span>
                                <span style={{
                                    fontSize: '0.7rem',
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    background: activeZone.badgeBg,
                                    color: activeZone.color,
                                    fontWeight: 700,
                                    border: `1px solid ${activeZone.color}40`,
                                }}>
                                    {recreoTitle}
                                </span>
                            </div>
                            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {activeZone.description}
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
                        {activeDuty?.teacher ? (
                            <TeacherAvatar teacher={activeDuty.teacher} size={36} showViewer={false} />
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
                                Docente asignado:
                            </span>
                            <span style={{ fontSize: '0.9rem', color: activeDuty?.teacherName ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 700 }}>
                                {activeDuty?.teacherName || 'Sin asignar'}
                            </span>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
