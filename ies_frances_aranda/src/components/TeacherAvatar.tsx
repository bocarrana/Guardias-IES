import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Teacher } from '../types';
import { getStorageUrl, uploadTeacherPhoto, updateTeacherAvatarSeed, deleteTeacherPhoto } from '../services/supabaseClient';
import { Camera, X, Dices, Check, Mail, Briefcase, ChevronLeft, ChevronRight, ImageOff, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';
import imageCompression from 'browser-image-compression';
import { isPantallaRole } from '../utils/roles';
import tvAvatar from '../assets/tv-avatar.png';

interface TeacherAvatarProps {
    teacher: Teacher;
    size?: number;
    editable?: boolean;
    editMode?: 'photo' | 'avatar' | 'both';
    onUpdate?: () => void;
    forceAvatarViewer?: boolean;
    allMembers?: Teacher[];
    showViewer?: boolean;
    isAbsent?: boolean;
    canRevert?: boolean;
    onRevert?: () => void;
    glowColor?: string;
}

const TeacherAvatar: React.FC<TeacherAvatarProps> = ({
    teacher,
    size = 52,
    editable = false,
    editMode = 'photo',
    onUpdate,
    forceAvatarViewer = false,
    allMembers = [],
    showViewer = true,
    isAbsent = false,
    canRevert = false,
    onRevert,
    glowColor
}) => {
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [viewedTeacher, setViewedTeacher] = useState<Teacher>(teacher);
    const [isUploading, setIsUploading] = useState(false);
    const [previewSeed, setPreviewSeed] = useState<string | null>(null);

    React.useEffect(() => {
        setViewedTeacher(teacher);
    }, [teacher]);

    const getTeacherAvatarUrl = (t: Teacher) => {
        if (!t) return '';
        if (isPantallaRole(t.role)) return tvAvatar;
        const seed = t.avatar_seed || t.email || t.id || 'seed';
        try {
            const avatar = createAvatar(avataaars, {
                seed: seed,
                backgroundColor: ['transparent'],
            });
            return avatar.toDataUri();
        } catch (error) {
            console.error("Error generating avatar locally:", error);
            return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><circle cx="100" cy="100" r="100" fill="%2364748b"/></svg>`;
        }
    };

    const getTeacherPhotoUrl = (t: Teacher) => {
        if (!t) return '';
        // 1. If we have a custom photo in Supabase Storage
        if (t.avatar_url && !t.avatar_url.startsWith('http')) {
            return getStorageUrl(t.avatar_url, 'Fotos');
        }
        // 2. If it's a direct URL (like an external photo or a migration leftover)
        if (t.avatar_url && t.avatar_url.startsWith('http')) {
            return t.avatar_url;
        }
        // 3. Default to Dicebear
        return getTeacherAvatarUrl(t);
    };

    const faceAvatarUrl = getTeacherAvatarUrl(viewedTeacher);
    const viewerUrl = forceAvatarViewer ? faceAvatarUrl : getTeacherPhotoUrl(viewedTeacher);

    const photoUrl = previewSeed
        ? createAvatar(avataaars, { seed: previewSeed, backgroundColor: ['transparent'] }).toDataUri()
        : viewerUrl;

    const handleNext = () => {
        if (!allMembers.length) return;
        const idx = allMembers.findIndex(t => t.id === viewedTeacher.id);
        const nextIdx = (idx + 1) % allMembers.length;
        setViewedTeacher(allMembers[nextIdx]);
        setPreviewSeed(null);
    };

    const handlePrev = () => {
        if (!allMembers.length) return;
        const idx = allMembers.findIndex(t => t?.id === viewedTeacher?.id);
        const prevIdx = (idx - 1 + allMembers.length) % allMembers.length;
        setViewedTeacher(allMembers[prevIdx]);
        setPreviewSeed(null);
    };

    if (!teacher) return null;

    return (
        <>
            <div style={{ position: 'relative', width: size, height: size }}>
                <motion.div
                    whileHover={showViewer ? { scale: 1.05 } : undefined}
                    whileTap={showViewer ? { scale: 0.95 } : undefined}
                    onClick={showViewer ? (e) => {
                        e.stopPropagation();
                        setPreviewSeed(null);
                        setViewedTeacher(teacher);
                        setIsViewerOpen(true);
                    } : undefined}
                    onTouchStart={showViewer ? (e) => e.stopPropagation() : undefined}
                    onTouchEnd={showViewer ? (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setPreviewSeed(null);
                        setViewedTeacher(teacher);
                        setIsViewerOpen(true);
                    } : undefined}
                    style={{
                        width: size,
                        height: size,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        cursor: showViewer ? 'pointer' : 'default',
                        background: 'var(--bg-sidebar)',
                        border: glowColor && !isAbsent
                            ? `2.5px solid ${glowColor}`
                            : '2px solid var(--border-subtle)',
                        position: 'relative',
                        boxShadow: glowColor && !isAbsent
                            ? `0 0 8px ${glowColor}40, 0 0 16px ${glowColor}25, 0 4px 12px rgba(0,0,0,0.2)`
                            : '0 4px 12px rgba(0,0,0,0.2)',
                        pointerEvents: showViewer ? 'auto' : 'none', // Crucial: allow click-through
                        filter: isAbsent ? 'grayscale(80%) opacity(0.5)' : undefined,
                    }}
                >
                    <img
                        src={getTeacherAvatarUrl(teacher)}
                        alt={teacher.name}
                        key={teacher.id + teacher.avatar_url + teacher.avatar_seed}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e: any) => {
                            const target = e.currentTarget;
                            const initialsFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.name || 'User')}&background=0f172a&color=22d3ee&bold=true`;
                            target.src = initialsFallback;
                        }}
                    />
                    {isUploading && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                style={{ width: 16, height: 16, border: '2px solid var(--brand-400)', borderTopColor: 'transparent', borderRadius: '50%' }}
                            />
                        </div>
                    )}
                </motion.div>

                {isAbsent && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '-10%',
                        width: '120%',
                        height: '3px',
                        background: '#ef4444',
                        transform: 'translateY(-50%) rotate(-45deg)',
                        boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)',
                        pointerEvents: 'none',
                        zIndex: 10,
                    }} />
                )}

                {isAbsent && canRevert && onRevert && (
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            onRevert();
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onRevert();
                        }}
                        style={{
                            position: 'absolute',
                            top: -3,
                            left: -3,
                            width: size < 32 ? 14 : 18,
                            height: size < 32 ? 14 : 18,
                            minWidth: size < 32 ? 14 : 18,
                            minHeight: size < 32 ? 14 : 18,
                            borderRadius: '50%',
                            background: '#eab308',
                            border: '1.5px solid var(--bg-card)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#1e293b',
                            boxShadow: '0 2px 6px rgba(234, 179, 8, 0.4)',
                            zIndex: 15,
                            padding: 0,
                            boxSizing: 'border-box',
                            pointerEvents: 'auto'
                        }}
                        title="Revertir ausencia de guardia"
                    >
                        <RotateCcw size={size < 32 ? 9 : 12} />
                    </div>
                )}

                {editable && (
                    <div
                        onClick={(e) => { e.stopPropagation(); setViewedTeacher(teacher); setIsViewerOpen(true); }}
                        style={{
                            position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: '50%',
                            background: editMode === 'avatar' ? '#eab308' : 'var(--brand-500)',
                            border: '2px solid var(--bg-card)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: editMode === 'avatar' ? '#1e293b' : 'white',
                            boxShadow: `0 2px 6px ${editMode === 'avatar' ? 'rgba(234, 179, 8, 0.4)' : 'rgba(0,0,0,0.3)'}`, zIndex: 5
                        }}
                    >
                        {editMode === 'avatar' ? <Dices size={14} /> : <Camera size={14} />}
                    </div>
                )}
            </div>

            {createPortal(
                <AnimatePresence>
                    {isViewerOpen && (
                        <div style={{
                            position: 'fixed', inset: 0, zIndex: 10000,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 20, pointerEvents: 'auto'
                        }}>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsViewerOpen(false)}
                                style={{ position: 'absolute', inset: 0, background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(8px)' }}
                            />

                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="no-scrollbar"
                                style={{
                                    position: 'relative', width: '95%', maxWidth: 460, maxHeight: '90vh',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    background: 'var(--bg-card)', borderRadius: 32,
                                    border: '1px solid var(--border-subtle)',
                                    boxShadow: '0 30px 100px rgba(0,0,0,0.6)',
                                    padding: '24px 44px 24px 44px', // Increased side padding
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    WebkitOverflowScrolling: 'touch'
                                }}
                            >
                                <button
                                    onClick={() => setIsViewerOpen(false)}
                                    style={{
                                        position: 'absolute', top: 20, right: 20,
                                         background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
                                        borderRadius: '50%', width: 44, height: 44,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'var(--text-secondary)', cursor: 'pointer', zIndex: 10
                                    }}
                                >
                                    <X size={24} />
                                </button>

                                {/* Photo & Navigation Container */}
                                <div style={{ 
                                    position: 'relative', width: '100%', maxWidth: 320, height: 320, 
                                    marginBottom: 20, display: 'flex', justifyContent: 'center', alignItems: 'center' 
                                }}>
                                    {/* Image Container with overflow:hidden */}
                                    <div style={{
                                        width: '100%', height: '100%',
                                        background: 'var(--bg-main)', borderRadius: 28,
                                        overflow: 'hidden', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', border: '1px solid var(--border-subtle)',
                                        boxShadow: 'var(--shadow-lg)',
                                        position: 'relative'
                                    }}>
                                        <AnimatePresence mode="wait" initial={false}>
                                            <motion.img
                                                key={viewedTeacher.id + (previewSeed || '')}
                                                src={photoUrl}
                                                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                                exit={{ opacity: 0, scale: 1.1, x: -20 }}
                                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e: any) => {
                                                    const target = e.currentTarget;
                                                    const fallback = getTeacherAvatarUrl(viewedTeacher);
                                                    if (target.src !== fallback) {
                                                        target.src = fallback;
                                                    }
                                                }}
                                            />
                                        </AnimatePresence>
                                    </div>

                                    {/* Navigation Arrows - Centered in Gutter */}
                                    {allMembers.length > 1 && (
                                        <>
                                            <motion.button
                                                whileHover={{ scale: 1.1, x: -4 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                                style={{
                                                    position: 'absolute', left: -54, top: '50%', transform: 'translateY(-50%)',
                                                    background: 'var(--bg-card)', backdropFilter: 'blur(12px)',
                                                    border: '1px solid var(--border-subtle)', borderRadius: '50%',
                                                    width: 52, height: 52, display: 'flex', alignItems: 'center',
                                                    justifyContent: 'center', color: 'var(--text-primary)',
                                                    cursor: 'pointer', zIndex: 100, boxShadow: 'var(--shadow-xl)'
                                                }}
                                            >
                                                <ChevronLeft size={28} />
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.1, x: 4 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                                style={{
                                                    position: 'absolute', right: -54, top: '50%', transform: 'translateY(-50%)',
                                                    background: 'var(--bg-card)', backdropFilter: 'blur(12px)',
                                                    border: '1px solid var(--border-subtle)', borderRadius: '50%',
                                                    width: 52, height: 52, display: 'flex', alignItems: 'center',
                                                    justifyContent: 'center', color: 'var(--text-primary)',
                                                    cursor: 'pointer', zIndex: 100, boxShadow: 'var(--shadow-xl)'
                                                }}
                                            >
                                                <ChevronRight size={28} />
                                            </motion.button>
                                        </>
                                    )}

                                    {editable && (editMode === 'photo' || editMode === 'both') && (
                                        <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 110 }}>
                                            {viewedTeacher.avatar_url && !viewedTeacher.avatar_url.includes('dicebear') ? (
                                                <button
                                                    onClick={async () => {
                                                        if (!window.confirm('¿Eliminar esta foto y volver al avatar?')) return;
                                                        try {
                                                            setIsUploading(true);
                                                            await deleteTeacherPhoto(viewedTeacher.id);
                                                            toast.success('Foto eliminada');
                                                            if (onUpdate) await onUpdate();
                                                            setIsViewerOpen(false);
                                                        } finally { setIsUploading(false); }
                                                    }}
                                                    style={{
                                                        width: 52, height: 52, borderRadius: '50%',
                                                        background: 'rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(8px)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer', boxShadow: 'var(--shadow-lg)', color: 'var(--danger)',
                                                        border: '1px solid var(--danger)'
                                                    }}
                                                    title="Eliminar foto"
                                                >
                                                    <ImageOff size={24} />
                                                </button>
                                            ) : (
                                                <label style={{
                                                    width: 52, height: 52, borderRadius: '50%',
                                                    background: 'var(--brand-600)', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', boxShadow: 'var(--shadow-lg)', color: 'white'
                                                }} title="Subir foto">
                                                    <Camera size={24} />
                                                    <input
                                                        type="file" accept="image/*" style={{ display: 'none' }}
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;

                                                            if (file.size > 10 * 1024 * 1024) {
                                                                toast.error('La imagen es demasiado grande. Máximo 10MB.');
                                                                return;
                                                            }

                                                            try {
                                                                setIsUploading(true);
                                                                const options = { maxSizeMB: 0.1, maxWidthOrHeight: 512, useWebWorker: true };
                                                                const compressedFile = await imageCompression(file, options);
                                                                const finalFile = new File([compressedFile], file.name, { type: 'image/jpeg' });
                                                                await uploadTeacherPhoto(viewedTeacher.id, finalFile);
                                                                toast.success('Foto optimizada y actualizada');
                                                                if (onUpdate) await onUpdate();
                                                                setIsViewerOpen(false);
                                                            } catch (err: any) {
                                                                console.error("Compression error:", err);
                                                                toast.error('Error al procesar la imagen');
                                                            } finally { setIsUploading(false); }
                                                        }}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Carousel Tray */}
                                {allMembers.length > 1 && (
                                    <div style={{
                                        display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 24,
                                        padding: '12px 16px', 
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        backdropFilter: 'blur(12px)',
                                        borderRadius: 24, 
                                        border: '1px solid rgba(255, 255, 255, 0.08)', 
                                        overflowX: 'auto', 
                                        maxWidth: '100%',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                                    }}>
                                        {allMembers.map((m) => {
                                            const isActive = m.id === viewedTeacher.id;
                                            return (
                                                <motion.div
                                                    key={m.id}
                                                    whileHover={{ scale: 1.15, y: -2 }}
                                                    onClick={(e) => { e.stopPropagation(); setViewedTeacher(m); setPreviewSeed(null); }}
                                                    style={{
                                                        width: 42, height: 42, borderRadius: '50%', overflow: 'hidden',
                                                        border: isActive ? '3px solid var(--brand-500)' : '2px solid rgba(255,255,255,0.1)',
                                                        cursor: 'pointer', opacity: isActive ? 1 : 0.6, flexShrink: 0,
                                                        boxShadow: isActive ? '0 0 15px var(--brand-900-subtle)' : 'none'
                                                    }}
                                                >
                                                    <img
                                                        src={getTeacherPhotoUrl(m)}
                                                        alt=""
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        onError={(e: any) => {
                                                            const target = e.currentTarget;
                                                            target.onerror = null;
                                                            target.src = getTeacherAvatarUrl(m);
                                                        }}
                                                    />
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Info */}
                                <div style={{ width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 20 }}>
                                    <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{viewedTeacher.name}</h2>
                                    <div style={{ color: 'var(--brand-500)', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{viewedTeacher.role}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 12, width: '100%' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.9rem' }}>
                                            <Briefcase size={14} style={{ color: 'var(--brand-500)' }} />
                                            {viewedTeacher.department}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
                                            <Mail size={14} style={{ opacity: 0.6 }} />
                                            {viewedTeacher.email}
                                        </div>
                                    </div>
                                </div>

                                {/* Randomize Buttons */}
                                <AnimatePresence>
                                    {editable && (editMode === 'avatar' || editMode === 'both') && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 360, overflow: 'hidden' }}
                                        >
                                            <button
                                                onClick={() => setPreviewSeed(Math.random().toString(36).substring(7))}
                                                style={{ 
                                                    width: '100%', padding: '12px', fontSize: '1rem', 
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, 
                                                    background: 'transparent', color: 'var(--text-primary)', 
                                                    border: '1px solid var(--border-subtle)', borderRadius: 16, 
                                                    fontWeight: 700, cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <Dices size={22} style={{ color: 'var(--brand-400)' }} />
                                                Probar suerte
                                            </button>
                                            {previewSeed && (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            setIsUploading(true);
                                                            await updateTeacherAvatarSeed(viewedTeacher.id, previewSeed);
                                                            toast.success('¡Avatar actualizado!');
                                                            // CRÍTICO: esperamos a que refreshUser() actualice
                                                            // el teacher prop ANTES de limpiar previewSeed,
                                                            // así el sidebar ya tiene la semilla nueva cuando
                                                            // cerramos el modal.
                                                            if (onUpdate) await onUpdate();
                                                            setPreviewSeed(null);
                                                            setIsViewerOpen(false);
                                                        } finally { setIsUploading(false); }
                                                    }}
                                                    disabled={isUploading}
                                                    style={{ width: '100%', padding: '14px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'linear-gradient(135deg, var(--brand-400), var(--brand-600))', color: 'white', border: 'none', borderRadius: 16, fontWeight: 700, cursor: 'pointer' }}
                                                >
                                                    <Check size={22} />
                                                    {isUploading ? 'Guardando...' : '¡Me quedo con este!'}
                                                </button>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
};

export default TeacherAvatar;
