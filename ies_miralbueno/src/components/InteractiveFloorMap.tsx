import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize2, X, Eye, User, Clock, Shield } from 'lucide-react';
import TeacherAvatar from './TeacherAvatar';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS PÚBLICOS
// ─────────────────────────────────────────────────────────────────────────────

/** Información de guardia que el componente padre puede inyectar por aula */
export interface RoomGuardInfo {
    roomId: string;
    roomLabel: string;
    /** Nombre del profesor de guardia en esa aula (null si está libre) */
    guardTeacher: string | null;
    /** Hora de la franja, ej. "10:30 - 11:25" */
    timeSlot?: string;
    /** Avatar URL o seed dicebear */
    avatarUrl?: string;
    /** Objeto Teacher opcional para renderizar el avatar rico */
    teacher?: any;
    /** Nombre del grupo asociado a esta ocupación */
    groupLabel?: string;
}

interface Room {
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface InteractiveFloorMapProps {
    /** ID del aula a iluminar desde fuera (ej. cuando la guardia activa cambia) */
    highlightedRoomId?: string;
    /** Etiqueta para el badge de aula iluminada */
    highlightedRoomLabel?: string;
    /** SVG externo como string raw. Si se omite, se usa el mockup. */
    svgMarkup?: string;
    /** Título del plano */
    floorLabel?: string;
    /**
     * Callback disparado cuando el usuario toca/hace clic en un aula.
     * Recibe el id del elemento SVG (ej. "aula-102").
     * El componente padre puede usarlo para buscar info de guardia y pasarla por guardInfo.
     */
    onRoomClick?: (roomId: string) => void;
    /**
     * Información de guardia para el aula actualmente seleccionada.
     * El padre la calcula y la devuelve para mostrar en el panel.
     */
    guardInfo?: RoomGuardInfo | null;
    /**
     * Mapeo de roomId -> 'free' | 'occupied' | 'warning' | 'interactive'
     */
    roomStates?: Record<string, 'free' | 'occupied' | 'warning' | 'interactive'>;
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL DE INFO DE GUARDIA
// ─────────────────────────────────────────────────────────────────────────────
const GuardInfoPanel: React.FC<{
    info: RoomGuardInfo | null | undefined;
    onClose: () => void;
}> = ({ info, onClose }) => {
    if (!info) return null;

    const isAvailable = !info.guardTeacher;

    return (
        <div style={{
            position: 'absolute',
            top: 24,
            left: 24,
            width: 320,
            background: 'var(--bg-card)',
            border: `1px solid var(--border-subtle)`,
            borderRadius: 20,
            boxShadow: 'var(--shadow-xl)',
            zIndex: 110,
            overflow: 'hidden',
            animation: 'premiumSlideRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
            {/* Glossy Header */}
            <div style={{
                padding: '12px 16px',
                background: isAvailable ? 'rgba(76, 175, 80, 0.12)' : 'rgba(255, 183, 0, 0.12)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        padding: 6,
                        borderRadius: 8,
                        background: isAvailable ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 183, 0, 0.2)',
                        display: 'flex'
                    }}>
                        <Shield size={16} color={isAvailable ? '#4caf50' : '#ffb700'} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{
                            fontSize: '0.9rem',
                            fontWeight: 800,
                            letterSpacing: '0.02em',
                            color: 'var(--text-primary)'
                        }}>
                            {info.roomLabel}
                        </span>
                        <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: isAvailable ? '#81c784' : '#ffd54f',
                            opacity: 0.9
                        }}>
                            {isAvailable ? 'Espacio Disponible' : 'Espacio Ocupado'}
                        </span>
                    </div>
                </div>
                 <button
                    onClick={onClose}
                    title="Cerrar panel"
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)', 
                        border: '1px solid rgba(255, 255, 255, 0.2)', 
                        cursor: 'pointer',
                        color: 'var(--text-primary)', 
                        width: 44, height: 44, borderRadius: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
                    }}
                >
                    <Eye size={26} />
                </button>
            </div>

            {/* Premium Body */}
            <div style={{ padding: '16px' }}>
                {!isAvailable ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {info.teacher ? (
                                <TeacherAvatar teacher={info.teacher} size={44} showViewer={false} />
                            ) : (
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12,
                                    background: 'linear-gradient(135deg, rgba(255,183,0,0.2), rgba(255,183,0,0.05))',
                                    border: '1px solid rgba(255,183,0,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0, overflow: 'hidden',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                }}>
                                    {info.avatarUrl
                                        ? <img src={info.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <User size={22} color="#ffb700" />
                                    }
                                </div>
                            )}
                             <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                                    {info.guardTeacher}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 3 }}>
                                    {info.groupLabel || 'Personal Docente'}
                                </div>
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: 10,
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            border: '1px solid rgba(255,255,255,0.04)'
                        }}>
                             <div style={{
                                background: 'var(--bg-sidebar)',
                                padding: 6, borderRadius: 6
                            }}>
                                <Clock size={14} color="var(--text-muted)" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Horario de sesión</span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{info.timeSlot || 'Franja no definida'}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        padding: '12px',
                        background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.08), rgba(76, 175, 80, 0.02))',
                        borderRadius: 10,
                        border: '1px dashed rgba(76, 175, 80, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'rgba(76,175,80,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4caf50', boxShadow: '0 0 12px #4caf50' }} />
                        </div>
                         <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 700 }}>Este aula está libre</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>No se ha detectado docencia para esta franja horaria.</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
const InteractiveFloorMap: React.FC<InteractiveFloorMapProps> = ({
    highlightedRoomId,
    highlightedRoomLabel,
    svgMarkup,
    floorLabel = 'Planta Baja',
    onRoomClick,
    guardInfo,
    roomStates,
}) => {
    const transformRef = useRef<ReactZoomPanPinchRef>(null);
    const svgContainerRef = useRef<HTMLDivElement>(null);

    const [activeRoom, setActiveRoom] = useState<string | undefined>(highlightedRoomId);
    const [showPanel, setShowPanel] = useState(false);

    // Sync prop highlightedRoomId → estado local
    useEffect(() => {
        setActiveRoom(highlightedRoomId);
    }, [highlightedRoomId]);

    // Reset state when SVG changes (navigating between buildings)
    useEffect(() => {
        if (!highlightedRoomId) {
            setActiveRoom(undefined);
            setShowPanel(false);
        }
    }, [svgMarkup, highlightedRoomId]);

    // Abrir panel automáticamente cuando llega guardInfo
    useEffect(() => {
        if (guardInfo) setShowPanel(true);
    }, [guardInfo]);

    // ── CSS-based persistent styles (injected directly into SVG markup) ──
    const processedSvgMarkup = useMemo(() => {
        if (!svgMarkup) return svgMarkup;

        let injectedCSS = `
<style>
    /* Ensure dynamically-created labels are always visible and on top */
    .room-label {
        opacity: 1 !important;
        visibility: visible !important;
        display: block !important;
        fill: #111111 !important;
        font-weight: 900 !important;
        paint-order: stroke !important;
        stroke: #ffffff !important;
        stroke-width: 0.3px !important;
        pointer-events: none !important;
    }
    #labels-layer {
        pointer-events: none !important;
    }`;

        if (highlightedRoomId) {
            // Escape the room ID for use in CSS selector
            const cssId = highlightedRoomId.replace(/([^\w-])/g, '\\$1');

            injectedCSS += `
    @keyframes __roomPulse {
        0%, 100% {
            fill: rgba(34, 211, 238, 0.45);
            filter: drop-shadow(0 0 12px rgba(34,211,238,0.9)) drop-shadow(0 0 24px rgba(34,211,238,0.5));
        }
        50% {
            fill: rgba(34, 211, 238, 0.65);
            filter: drop-shadow(0 0 20px rgba(34,211,238,1)) drop-shadow(0 0 40px rgba(34,211,238,0.7));
        }
    }
    #${cssId},
    #${cssId} > path,
    #${cssId} > rect {
        fill: rgba(34, 211, 238, 0.45) !important;
        stroke: #22d3ee !important;
        stroke-width: 3 !important;
        stroke-linejoin: round !important;
        filter: drop-shadow(0 0 12px rgba(34,211,238,0.9)) drop-shadow(0 0 24px rgba(34,211,238,0.5)) !important;
        animation: __roomPulse 2s ease-in-out infinite !important;
    }
    /* Bold the specific label for the highlighted room */
    .room-label-target {
        fill: #ffffff !important;
        stroke: #22d3ee !important;
        stroke-width: 0.5px !important;
        filter: drop-shadow(0 0 4px rgba(34,211,238,0.8)) !important;
    }`;
        }

        injectedCSS += `
</style>`;

        // Inject before closing </svg> tag
        return svgMarkup.replace(/<\/svg>\s*$/i, injectedCSS + '</svg>');
    }, [svgMarkup, highlightedRoomId]);

    // ── Highlight + Click listener para SVG externo ──────────────────────────
    useEffect(() => {
        if (!svgMarkup || !svgContainerRef.current) return;

        const container = svgContainerRef.current;
        const svg = container.querySelector('svg');
        if (!svg) return;
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.maxHeight = '100%';
        svg.style.display = 'block';

        // 1. Reset all interactive rooms and apply highlight to activeRoom
        const container_ = svgContainerRef.current;
        const allPaths = container_.querySelectorAll('path, g, rect');
        
        allPaths.forEach((el) => {
            const el_ = el as SVGElement;
            const id = el_.getAttribute('id');
            if (!id || id === 'layer1' || id === 'svg1') return;

            // *** Skip the highlighted room — its styles are managed separately ***
            if (highlightedRoomId && id === highlightedRoomId) return;

            // Only make it interactive if it's a known room
            const isKnownRoom = roomStates && roomStates[id];
            
            if (isKnownRoom) {
                el_.style.transition = 'fill 0.3s, stroke 0.3s, filter 0.3s';
                el_.style.cursor = 'pointer';
            }

            // Default border for all identified zones (classrooms, cafeteria, etc.)
            const isZone = isKnownRoom || !id.startsWith('path');
            if (isZone) {
                el_.style.stroke = '#333333';
                el_.style.strokeWidth = '1';
                el_.style.strokeLinejoin = 'round';
            }

            // Highlight logic moved to states loop below for consistency
        });

        // 3. Add Permanent Labels — into a dedicated top layer
        let labelsLayer = svg.querySelector('#labels-layer');
        if (!labelsLayer) {
            labelsLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            labelsLayer.setAttribute('id', 'labels-layer');
            svg.appendChild(labelsLayer);
        }

        const existingLabels = labelsLayer.querySelectorAll('.room-label');
        if (existingLabels.length === 0) {
            const roomsToLabel = Array.from(allPaths).filter(el => {
                const id = el.getAttribute('id');
                if (!id || id === 'layer1' || id === 'svg1') return false;
                if (el.closest('defs')) return false;
                
                // Ignore generic Inkscape/Illustrator IDs like path123, rect45, g789, etc.
                const isGeneric = /^(path|rect|g|text|tspan|circle|ellipse|line|polygon|polyline)\d+$/i.test(id);
                return !isGeneric;
            }) as SVGGraphicsElement[];

            roomsToLabel.forEach((el) => {
                const id = el.getAttribute('id')!;
                const titleElement = el.querySelector('title');
                const labelText = titleElement?.textContent || id;
                
                if (!labelText || labelText.length < 2) return;
                const isGenericLabel = /^(path|rect|g|text|tspan|circle|ellipse|line|polygon|polyline)\d+$/i.test(labelText);
                if (isGenericLabel) return;

                try {
                    const bbox = el.getBBox();
                    if (bbox.width < 2 || bbox.height < 2) return; 

                    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    
                    const cx = bbox.x + bbox.width / 2;
                    const cy = bbox.y + bbox.height / 2;
                    
                    text.setAttribute('x', cx.toString());
                    text.setAttribute('y', cy.toString());
                    text.setAttribute('text-anchor', 'middle');
                    text.setAttribute('dominant-baseline', 'central');
                    
                    // Add standard and optional target classes
                    let classes = 'room-label';
                    if (highlightedRoomId === id) classes += ' room-label-target';
                    text.setAttribute('class', classes);
                    
                    const elTransform = el.getAttribute('transform');
                    if (elTransform) {
                        text.setAttribute('transform', elTransform);
                    }

                    text.style.pointerEvents = 'none';
                    text.style.fontFamily = 'var(--font-sans)';
                    text.style.userSelect = 'none';
                    
                    const isKnownRoom = roomStates && roomStates[id];
                    const baseSize = isKnownRoom ? 7.0 : 3.5;
                    const maxWidthSize = isKnownRoom ? bbox.width / 2 : bbox.width / 4;
                    const maxHeightSize = isKnownRoom ? bbox.height / 0.9 : bbox.height / 1.8;
                    const limitSize = isKnownRoom ? 15 : 7.5;

                    const fontSize = Math.max(baseSize, Math.min(maxWidthSize, maxHeightSize, limitSize));
                    text.style.fontSize = `${fontSize}px`;
                    text.textContent = labelText;
                    
                    labelsLayer?.appendChild(text);
                } catch (e) {
                    console.warn('Could not add label for room:', id, e);
                }
            });
        }

        if (roomStates) {
            Object.entries(roomStates).forEach(([id, state]) => {
                const target = svg.getElementById(id) as SVGElement | null;
                if (!target) return;

                // 1. Base State Color (Neon)
                if (state === 'free') {
                    target.style.fill = 'rgba(76, 175, 80, 0.40)';
                    target.style.stroke = 'rgba(56, 142, 60, 0.8)';
                    target.style.strokeWidth = '1.2';
                } else if (state === 'occupied') {
                    target.style.fill = 'rgba(255, 140, 0, 0.50)';
                    target.style.stroke = '#e07800';
                    target.style.strokeWidth = '1.2';
                } else if (state === 'interactive') {
                    // For general navigation: no fill override, just interactive
                    target.classList.add('interactive-zone');
                    target.style.cursor = 'pointer';
                    target.style.transition = 'all 0.2s ease';
                }

                // 3. Pointer for all valid rooms
                target.style.cursor = 'pointer';

                // 2. Extra characteristic for SELECTION (Glow + Thick Border)
                if (activeRoom && id === activeRoom) {
                    target.style.stroke = '#FF8C00';
                    target.style.strokeWidth = '2.5';
                    target.style.filter = 'drop-shadow(0 0 14px rgba(255, 140, 0, 1)) brightness(1.2)';
                    target.style.zIndex = '100';
                    // Move to front if possible in SVG
                    target.parentElement?.appendChild(target);
                } else {
                    target.style.filter = 'none';
                }
            });
        }

        // ── Ensure Labels Layer is always at the end (Z-index simulation) ──
        if (labelsLayer) {
            svg.appendChild(labelsLayer);
        }

        const handleClick = (e: MouseEvent) => {
            let target = e.target as SVGElement | null;
            while (target && (!target.getAttribute('id') || (roomStates && !roomStates[target.getAttribute('id')!]))) {
                target = target.parentElement as SVGElement | null;
            }
            const roomId = target?.getAttribute('id');
            if (!roomId) return;

            const isInteractive = roomStates && roomStates[roomId] === 'interactive';

            setActiveRoom(prev => {
                const next = prev === roomId ? undefined : roomId;
                if (next) {
                    onRoomClick?.(next);
                    // Don't show panel for interactive zones (general map navigation)
                    if (!isInteractive) {
                        setShowPanel(true);
                    } else {
                        setShowPanel(false);
                    }
                } else {
                    setShowPanel(false);
                }
                return next;
            });
        };

        svg.addEventListener('click', handleClick);
        return () => svg.removeEventListener('click', handleClick);

    }, [svgMarkup, activeRoom, onRoomClick, roomStates, showPanel, highlightedRoomId]);

    const resetZoom = () => transformRef.current?.resetTransform();
    const zoomIn    = () => transformRef.current?.zoomIn();
    const zoomOut   = () => transformRef.current?.zoomOut();

    return (
        <div style={{
            background: 'transparent',
            borderRadius: 32,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            fontFamily: 'var(--font-sans)',
            position: 'relative',
        }}>

            {/* ── FLOAT CONTROLS ─────────────────────────────────────────── */}
            {/* ── Top Bar (Active Room Indicator) ── */}
            <div style={{
                position: 'absolute',
                top: 24,
                left: 24,
                right: 24,
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'center',
                pointerEvents: 'none',
                zIndex: 60
            }}>
                {/* Active Room Indicator (Only show if panel is closed) */}
                {activeRoom && !showPanel ? (
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            backdropFilter: 'blur(12px)',
                            borderRadius: '16px', 
                            padding: '10px 18px',
                            fontSize: '0.8rem', 
                            fontWeight: 900, 
                            color: '#FF8C00',
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 10,
                            pointerEvents: 'auto',
                            cursor: 'pointer',
                            boxShadow: 'var(--shadow-lg)'
                        }}
                        onClick={() => { setActiveRoom(undefined); setShowPanel(false); }}
                    >
                        <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: '#FF8C00', 
                            boxShadow: '0 0 10px #FF8C00'
                        }} />
                        <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {highlightedRoomLabel || activeRoom}
                        </span>
                        <X size={14} style={{ opacity: 0.6 }} />
                    </motion.div>
                ) : <div />}
            </div>

            {/* ── Floating Zoom Controls (Vertical, above Legend) ── */}
            <div style={{
                position: 'absolute',
                bottom: 160, // Must clear parent modal's rounded-[2.5rem] (40px) corner + 3 buttons height
                right: 24,
                zIndex: 65,
                pointerEvents: 'none'
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column', // Vertical stack
                    background: 'var(--bg-card)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '16px',
                    padding: '6px',
                    gap: '4px',
                    pointerEvents: 'auto',
                    boxShadow: 'var(--shadow-xl)'
                }}>
                    {[
                        { icon: <ZoomIn size={20} />, action: zoomIn, title: 'Acercar' },
                        { icon: <ZoomOut size={20} />, action: zoomOut, title: 'Alejar' },
                        { icon: <Maximize2 size={20} />, action: resetZoom, title: 'Centrar' },
                    ].map(({ icon, action, title }) => (
                        <button
                            key={title} 
                            onClick={action} 
                            title={title}
                            className="zoom-btn"
                            style={{
                                width: '40px',
                                height: '40px',
                                padding: 0,
                                borderRadius: '12px',
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            {icon}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Área zoom / pan ────────────────────────────────────────── */}
            <TransformWrapper
                ref={transformRef}
                initialScale={1} minScale={0.4} maxScale={6}
                centerOnInit={true}
                doubleClick={{ mode: 'zoomIn' }}
                smooth={true}
            >
                <TransformComponent
                    wrapperStyle={{ 
                        width: '100%', 
                        height: '100%',
                        background: '#fcfcfc', 
                        cursor: 'grab',
                        borderRadius: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    contentStyle={{ 
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {svgMarkup ? (
                        <div
                            ref={svgContainerRef}
                            style={{ 
                                width: '100%', 
                                height: 'auto',
                                maxHeight: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            dangerouslySetInnerHTML={{ __html: processedSvgMarkup || '' }}
                        />
                    ) : (
                        <div style={{ 
                            padding: 64, 
                            textAlign: 'center', 
                            color: 'var(--text-muted)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 16
                        }}>
                            <Shield size={48} opacity={0.2} />
                            <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>Cargando Plano...</p>
                        </div>
                    )}
                </TransformComponent>
            </TransformWrapper>

            {/* ── Panel flotante de guardia ───────────────────────────────── */}
            {showPanel && (
                <GuardInfoPanel
                    info={guardInfo}
                    onClose={() => { setShowPanel(false); setActiveRoom(undefined); }}
                />
            )}

            {/* ── Occupancy Legend (Bottom Left) ── */}
            <div style={{
                position: 'absolute',
                bottom: 24,
                left: 24, // Moved to left for better balance
                display: 'flex',
                gap: 16,
                alignItems: 'center',
                padding: '10px 18px',
                background: 'var(--bg-card)',
                backdropFilter: 'blur(16px)',
                borderRadius: 18,
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 60
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', boxShadow: '0 0 10px var(--warning)' }} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>Ocupada</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>Libre</span>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50%       { opacity: 0.7; transform: scale(0.95); }
                }
                @keyframes premiumSlideRight {
                    from { opacity: 0; transform: translateX(-30px) scale(0.95); filter: blur(10px); }
                    to   { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
                }
                @keyframes roomHighlightPulse {
                    0%, 100% {
                        fill: rgba(34, 211, 238, 0.45);
                        filter: drop-shadow(0 0 12px rgba(34,211,238,0.9)) drop-shadow(0 0 24px rgba(34,211,238,0.5));
                    }
                    50% {
                        fill: rgba(34, 211, 238, 0.65);
                        filter: drop-shadow(0 0 20px rgba(34,211,238,1)) drop-shadow(0 0 40px rgba(34,211,238,0.7));
                    }
                }
            `}</style>
        </div>
    );
};

export default InteractiveFloorMap;
