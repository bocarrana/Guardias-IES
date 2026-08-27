import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Teacher, Guard, GuardType, GuardStatus } from '../types';
import { X, Search, Zap, Dices, RefreshCw } from 'lucide-react';
import TeacherAvatar from './TeacherAvatar';
import { rankTeachers } from '../utils/guardAssignment';
import { getStorageUrl } from '../services/supabaseClient';

interface TeacherSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    teachers: Teacher[];
    guardGroupTeachers: Teacher[];
    onSelect: (teacher: Teacher) => void;
    actionType: 'pickup' | 'release' | 'complete' | 'revert';
    guard: Guard | null;
    isTVMode?: boolean;
    guards?: Guard[];
    assignmentMode?: 'recommended' | 'random';
}

const ROUTETTE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'];

const TeacherSelectionModal: React.FC<TeacherSelectionModalProps> = ({
    isOpen,
    onClose,
    teachers,
    guardGroupTeachers,
    onSelect,
    actionType,
    guard,
    isTVMode = false,
    guards = [],
    assignmentMode = 'recommended',
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showManual, setShowManual] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const [winner, setWinner] = useState<Teacher | null>(null);
    const [tickerWiggle, setTickerWiggle] = useState(false);
    const [confettiParticles, setConfettiParticles] = useState<{ id: number; x: number; y: number; color: string; size: number; delay: number }[]>([]);

    const actionText = useMemo(() => {
        switch (actionType) {
            case 'pickup': return 'recoger la guardia';
            case 'release': return 'liberar la guardia';
            case 'complete': return 'marcar la guardia como realizada';
            case 'revert': return 'revertir la guardia a pendiente';
            default: return 'gestionar la guardia';
        }
    }, [actionType]);

    // Filtrar profesores por búsqueda
    const filteredTeachers = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return teachers;
        return teachers.filter(t => 
            t.name.toLowerCase().includes(query) || 
            (t.department && t.department.toLowerCase().includes(query))
        );
    }, [teachers, searchQuery]);

    // Calcular el ranking y los tonos del gradiente para el grupo de guardia de esta franja
    const rankedOnDuty = useMemo(() => {
        const isRecreo = guard?.type === GuardType.RECREO || guard?.time_slot?.type?.toLowerCase() === 'recreo' || guard?.time_slot?.label?.toLowerCase().includes('recreo');
        
        if (!guards || guards.length === 0 || isRecreo || guardGroupTeachers.length === 0) {
            return guardGroupTeachers.map(t => ({
                teacher: t,
                hue: undefined
            }));
        }
        
        const ranked = rankTeachers(guardGroupTeachers, guards);
        return ranked.map(rt => ({
            teacher: rt.teacher,
            hue: rt.hue
        }));
    }, [guardGroupTeachers, guards, guard]);

    // Separar los profesores del grupo de guardia que coinciden con los filtrados (manteniendo el orden del ranking)
    const onDutyFiltered = useMemo(() => {
        return rankedOnDuty.filter(rt => 
            filteredTeachers.some(ft => ft.id === rt.teacher.id)
        );
    }, [rankedOnDuty, filteredTeachers]);

    // Profesores que no están en el grupo de guardia pero que coinciden con el filtro
    const otherFiltered = useMemo(() => {
        return filteredTeachers.filter(ft => 
            !guardGroupTeachers.some(ggt => ggt.id === ft.id)
        );
    }, [guardGroupTeachers, filteredTeachers]);

    const N = guardGroupTeachers.length;
    const isRandomMode = assignmentMode === 'random' && actionType === 'pickup' && !showManual && N > 0;

    const spinWheel = () => {
        if (isSpinning) return;
        setIsSpinning(true);
        setWinner(null);
        setConfettiParticles([]);

        const winnerIdx = Math.floor(Math.random() * N);
        const sectorAngle = 360 / N;

        const spins = 6 + Math.floor(Math.random() * 3);
        const winnerTargetAngle = 270 - (winnerIdx * sectorAngle + sectorAngle / 2);
        const nextRotation = rotation + spins * 360 + (winnerTargetAngle - (rotation % 360));
        
        setRotation(nextRotation);

        const tickInterval = setInterval(() => {
            setTickerWiggle(prev => !prev);
        }, 120);

        setTimeout(() => {
            clearInterval(tickInterval);
            setIsSpinning(false);
            const chosen = guardGroupTeachers[winnerIdx];
            setWinner(chosen);

            const particles = Array.from({ length: 65 }).map((_, idx) => ({
                id: idx,
                x: Math.random() * 100,
                y: Math.random() * -20,
                color: ROUTETTE_COLORS[idx % ROUTETTE_COLORS.length],
                size: Math.random() * 8 + 6,
                delay: Math.random() * 0.4
            }));
            setConfettiParticles(particles);
        }, 4500);
    };

    const cx = 150;
    const cy = 150;
    const R = 140;

    const slices = useMemo(() => {
        if (N === 0) return [];
        return guardGroupTeachers.map((teacher, index) => {
            const startAngle = (index * 2 * Math.PI) / N;
            const endAngle = ((index + 1) * 2 * Math.PI) / N;
            
            const x1 = cx + R * Math.cos(startAngle);
            const y1 = cy + R * Math.sin(startAngle);
            const x2 = cx + R * Math.cos(endAngle);
            const y2 = cy + R * Math.sin(endAngle);
            
            const largeArcFlag = 360 / N > 180 ? 1 : 0;
            const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
            
            const midAngle = startAngle + (endAngle - startAngle) / 2;
            const textR = R * 0.50;
            const tx = cx + textR * Math.cos(midAngle);
            const ty = cy + textR * Math.sin(midAngle);
            
            let textRotation = (midAngle * 180) / Math.PI;
            let finalRotation = textRotation + 90;
            const normalized = (finalRotation % 360 + 360) % 360;
            if (normalized > 90 && normalized < 270) {
                finalRotation += 180;
            }

            return {
                pathData,
                color: ROUTETTE_COLORS[index % ROUTETTE_COLORS.length],
                tx,
                ty,
                textRotation: finalRotation,
                teacher
            };
        });
    }, [guardGroupTeachers, N]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 11000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            pointerEvents: 'auto'
        }}>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(2, 6, 23, 0.85)',
                    backdropFilter: 'blur(8px)'
                }}
            />

            {/* Modal Content */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: 'spring', duration: 0.4 }}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: isTVMode ? 700 : 550,
                    maxHeight: '85vh',
                    background: 'var(--bg-card)',
                    borderRadius: 24,
                    border: '1px solid var(--border-subtle)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 1
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                        <h3 style={{
                            margin: 0,
                            fontSize: '1.25rem',
                            fontWeight: 800,
                            color: 'white',
                            letterSpacing: '-0.02em'
                        }}>
                            ¿Quién realiza la acción?
                        </h3>
                        <p style={{
                            margin: '4px 0 0',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)'
                        }}>
                            Selecciona tu nombre para <span style={{ color: 'var(--brand-400)', fontWeight: 700 }}>{actionText}</span>.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '50%',
                            width: 36,
                            height: 36,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-secondary)';
                            e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {isRandomMode ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                        position: 'relative',
                        padding: '20px 0 10px 0',
                        overflow: 'hidden'
                    }}>
                        <style>{`
                            @keyframes fall {
                                0% { transform: translateY(0px) rotate(0deg); opacity: 1; }
                                100% { transform: translateY(450px) rotate(720deg); opacity: 0; }
                            }
                        `}</style>
                        
                        {/* Confetti Particles */}
                        {confettiParticles.map(p => (
                            <div
                                key={p.id}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: `${p.x}%`,
                                    width: p.size,
                                    height: p.size,
                                    backgroundColor: p.color,
                                    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                                    animation: 'fall 3.5s linear forwards',
                                    animationDelay: `${p.delay}s`,
                                    pointerEvents: 'none',
                                    zIndex: 10
                                }}
                            />
                        ))}

                        <div style={{
                            position: 'relative',
                            width: 300,
                            height: 300,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 20,
                            marginTop: 16
                        }}>
                            {/* Outer glowing ring */}
                            <div style={{
                                position: 'absolute',
                                width: 284,
                                height: 284,
                                borderRadius: '50%',
                                border: '4px solid rgba(6, 182, 212, 0.4)',
                                boxShadow: '0 0 25px rgba(6, 182, 212, 0.25), inset 0 0 25px rgba(6, 182, 212, 0.25)',
                                pointerEvents: 'none'
                            }} />

                            {/* Pointer needle at the top */}
                            <div 
                                style={{
                                    position: 'absolute',
                                    top: -12,
                                    left: '50%',
                                    width: 0,
                                    height: 0,
                                    borderLeft: '14px solid transparent',
                                    borderRight: '14px solid transparent',
                                    borderTop: '24px solid #ef4444',
                                    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))',
                                    zIndex: 5,
                                    transformOrigin: 'top center',
                                    transform: tickerWiggle ? 'translateX(-50%) rotate(-12deg)' : 'translateX(-50%) rotate(0deg)',
                                    transition: 'transform 0.1s ease-out'
                                }}
                            />

                            {/* SVG Wheel */}
                            <svg 
                                width="300" 
                                height="300"
                                viewBox="0 0 300 300"
                                style={{
                                    transform: `rotate(${rotation}deg)`,
                                    transition: isSpinning ? 'transform 4.5s cubic-bezier(0.1, 0.8, 0.15, 1)' : 'none',
                                    transformOrigin: '150px 150px'
                                }}
                            >
                                <g>
                                    {slices.map((slice, idx) => {
                                        const avatarR = R * 0.72; // Adjusted to sit beautifully inside the slice
                                        const angleRad = (idx * 2 * Math.PI) / N + (Math.PI / N);
                                        const ax = cx + avatarR * Math.cos(angleRad) - 19; // Centered for 38x38 image
                                        const ay = cy + avatarR * Math.sin(angleRad) - 19;
                                        
                                        const photoUrl = slice.teacher.avatar_url && !slice.teacher.avatar_url.startsWith('http')
                                            ? getStorageUrl(slice.teacher.avatar_url, 'Fotos')
                                            : slice.teacher.avatar_url && slice.teacher.avatar_url.startsWith('http')
                                                ? slice.teacher.avatar_url
                                                : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(slice.teacher.avatar_seed || slice.teacher.email || slice.teacher.id)}`;

                                        return (
                                            <g key={idx}>
                                                <path 
                                                    d={slice.pathData} 
                                                    fill={slice.color}
                                                    stroke="rgba(15, 23, 42, 0.5)"
                                                    strokeWidth="2"
                                                />
                                                
                                                <clipPath id={`clip-${idx}`}>
                                                    <circle cx={ax + 19} cy={ay + 19} r="18" />
                                                </clipPath>
                                                <circle cx={ax + 19} cy={ay + 19} r="19" fill="var(--bg-card)" stroke="white" strokeWidth="2" />
                                                <image
                                                    href={photoUrl}
                                                    x={ax}
                                                    y={ay}
                                                    width="38"
                                                    height="38"
                                                    clipPath={`url(#clip-${idx})`}
                                                />

                                                <text
                                                    x={slice.tx}
                                                    y={slice.ty}
                                                    fill="#ffffff"
                                                    fontSize="12.5"
                                                    fontWeight="900"
                                                    textAnchor="middle"
                                                    transform={`rotate(${slice.textRotation}, ${slice.tx}, ${slice.ty})`}
                                                    style={{
                                                        paintOrder: 'stroke fill',
                                                        stroke: '#000000',
                                                        strokeWidth: '3px',
                                                        strokeLinejoin: 'round',
                                                        fontWeight: 900,
                                                        letterSpacing: '-0.02em'
                                                    }}
                                                >
                                                    {slice.teacher.name.split(' ')[0]}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </g>
                            </svg>

                            {/* Center circular button */}
                            <button
                                onClick={spinWheel}
                                disabled={isSpinning}
                                style={{
                                    position: 'absolute',
                                    width: 76,
                                    height: 76,
                                    borderRadius: '50%',
                                    background: 'var(--bg-main)',
                                    border: '3px solid var(--border-subtle)',
                                    boxShadow: '0 8px 16px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.05)',
                                    color: 'white',
                                    fontSize: '0.8rem',
                                    fontWeight: 800,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: isSpinning ? 'not-allowed' : 'pointer',
                                    zIndex: 6,
                                    gap: 2,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}
                            >
                                {isSpinning ? (
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>GIRANDO</span>
                                ) : (
                                    <>
                                        <Dices size={16} style={{ color: 'var(--brand-400)' }} />
                                        <span>GIRAR</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Winner presentation overlay */}
                        <AnimatePresence>
                            {winner && !isSpinning && (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0, y: 10 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.8, opacity: 0, y: 10 }}
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'rgba(2, 6, 23, 0.95)',
                                        backdropFilter: 'blur(6px)',
                                        borderRadius: 20,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 24,
                                        zIndex: 8
                                    }}
                                >
                                    <div style={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: '50%',
                                        border: '3px solid var(--brand-500)',
                                        boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)',
                                        marginBottom: 16,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden'
                                    }}>
                                        <TeacherAvatar teacher={winner} size={80} showViewer={false} />
                                    </div>
                                    
                                    <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'white', textAlign: 'center' }}>
                                        {winner.name}
                                    </h4>
                                    <p style={{ margin: '4px 0 20px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                        {winner.department}
                                    </p>

                                    <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 300 }}>
                                        <button
                                            onClick={() => onSelect(winner)}
                                            style={{
                                                flex: 1,
                                                padding: '10px 16px',
                                                background: 'var(--brand-500)',
                                                border: 'none',
                                                borderRadius: 12,
                                                color: 'white',
                                                fontWeight: 700,
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
                                            }}
                                        >
                                            Asignar Guardia
                                        </button>
                                        
                                        <button
                                            onClick={spinWheel}
                                            style={{
                                                width: 44,
                                                height: 44,
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid var(--border-subtle)',
                                                borderRadius: 12,
                                                color: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer'
                                            }}
                                            title="Volver a girar"
                                        >
                                            <RefreshCw size={18} />
                                        </button>
                                    </div>
                                    
                                    <button
                                        onClick={() => setShowManual(true)}
                                        style={{
                                            marginTop: 20,
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--text-secondary)',
                                            fontSize: '0.75rem',
                                            textDecoration: 'underline',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Seleccionar a otro profesor manualmente
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Manual bypass link */}
                        {!winner && (
                            <button
                                onClick={() => setShowManual(true)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.75rem',
                                    textDecoration: 'underline',
                                    cursor: 'pointer',
                                    marginTop: 10
                                }}
                            >
                                Elegir un profesor manualmente
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Search Input */}
                        <div style={{
                            position: 'relative',
                            marginBottom: 20
                        }}>
                            <Search
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: 14,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-muted)'
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Buscar tu nombre o departamento..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px 12px 42px',
                                    background: 'rgba(15, 23, 42, 0.4)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 14,
                                    color: 'white',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--brand-500)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={{
                                        position: 'absolute',
                                        right: 14,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        padding: 0
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Scrollable Teachers List */}
                        <div 
                            className="hide-scrollbar"
                            style={{
                                flex: 1,
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 18,
                                paddingLeft: 6,
                                paddingRight: 6,
                                paddingTop: 4,
                                paddingBottom: 4
                            }}
                        >
                            {/* 1. On Duty Teachers (Guard Group for the slot) */}
                            {onDutyFiltered.length > 0 && (
                                <div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        color: 'var(--brand-400)',
                                        letterSpacing: '0.05em',
                                        marginBottom: 10
                                    }}>
                                        <Zap size={12} fill="var(--brand-400)" />
                                        Profesores de Guardia (Esta franja)
                                    </div>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                        gap: 10
                                    }}>
                                        {onDutyFiltered.map(({ teacher: t, hue }) => {
                                            const glowColor = hue !== undefined ? `hsl(${hue}, 85%, 55%)` : undefined;
                                            const ordinaryCount = guards.filter(
                                                (g) => g.status === GuardStatus.COMPLETED && g.covering_teacher_id === t.id && g.type === GuardType.ORDINARY
                                            ).length;
                                            const coexistenceCount = guards.filter(
                                                (g) => g.status === GuardStatus.COMPLETED && g.covering_teacher_id === t.id && g.type === GuardType.COEXISTENCE
                                            ).length;

                                            return (
                                                <motion.div
                                                    key={t.id}
                                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(6, 182, 212, 0.28)', borderColor: glowColor || 'var(--brand-400)' }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => onSelect(t)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 12,
                                                        padding: 12,
                                                        background: 'rgba(6, 182, 212, 0.16)',
                                                        border: glowColor ? `2.5px solid ${glowColor}` : '1px solid rgba(6, 182, 212, 0.35)',
                                                        borderRadius: 14,
                                                        cursor: 'pointer',
                                                        transition: 'border-color 0.2s, background-color 0.2s',
                                                        boxShadow: glowColor 
                                                            ? `0 4px 12px rgba(6, 182, 212, 0.1), 0 0 12px ${glowColor}50` 
                                                            : '0 4px 12px rgba(6, 182, 212, 0.1), 0 0 10px rgba(6, 182, 212, 0.15)'
                                                    }}
                                                >
                                                    <div style={{ position: 'relative', width: 38, height: 38 }}>
                                                        <TeacherAvatar teacher={t} size={38} showViewer={false} glowColor={glowColor} />
                                                        {ordinaryCount > 0 && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: -4,
                                                                right: -4,
                                                                background: 'var(--brand-500)',
                                                                color: 'white',
                                                                fontSize: '0.6rem',
                                                                fontWeight: 900,
                                                                borderRadius: '50%',
                                                                width: 15,
                                                                height: 15,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                                                border: '1.5px solid var(--bg-card)',
                                                                zIndex: 10
                                                            }}>
                                                                {ordinaryCount}
                                                            </div>
                                                        )}
                                                        {coexistenceCount > 0 && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                bottom: -4,
                                                                right: -4,
                                                                background: '#a855f7',
                                                                color: 'white',
                                                                fontSize: '0.6rem',
                                                                fontWeight: 900,
                                                                borderRadius: '50%',
                                                                width: 15,
                                                                height: 15,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                                                border: '1.5px solid var(--bg-card)',
                                                                zIndex: 10
                                                            }}>
                                                                {coexistenceCount}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ overflow: 'hidden' }}>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                            {t.name}
                                                        </div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                            {t.department}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 2. Other Teachers */}
                            {otherFiltered.length > 0 && (
                                <div>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        color: 'var(--text-muted)',
                                        letterSpacing: '0.05em',
                                        marginBottom: 10
                                    }}>
                                        Todos los Profesores
                                    </div>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                        gap: 10
                                    }}>
                                        {otherFiltered.map(t => (
                                            <motion.div
                                                key={t.id}
                                                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'var(--border-subtle)' }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => onSelect(t)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    padding: 12,
                                                    background: 'rgba(30, 41, 59, 0.25)',
                                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                                    borderRadius: 14,
                                                    cursor: 'pointer',
                                                    transition: 'border-color 0.2s, background-color 0.2s'
                                                }}
                                            >
                                                <TeacherAvatar teacher={t} size={38} showViewer={false} />
                                                <div style={{ overflow: 'hidden' }}>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                        {t.name}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                        {t.department}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {filteredTeachers.length === 0 && (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px 20px',
                                    color: 'var(--text-muted)',
                                    fontSize: '0.85rem'
                                }}>
                                    No se encontró ningún profesor que coincida con tu búsqueda.
                                </div>
                            )}
                        </div>
                        
                        {/* Option to return to Roulette if manual mode was bypassed */}
                        {assignmentMode === 'random' && actionType === 'pickup' && guardGroupTeachers.length > 0 && (
                            <button
                                onClick={() => setShowManual(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--brand-400)',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    marginTop: 15,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}
                            >
                                Volver al sorteo aleatorio
                            </button>
                        )}
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default TeacherSelectionModal;
