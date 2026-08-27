import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, FileText, Upload, Trash2, Plus, User, Info } from 'lucide-react';
import { Teacher, CalendarEvent } from '../types';
import { createCalendarEvent, deleteCalendarEvent, getCalendarEvents, uploadCalendarFile } from '../services/supabaseClient';
import { toast } from 'sonner';

interface Props {
    date: string;
    currentUser: Teacher | null;
    onClose: () => void;
    onRefresh: () => void;
}

const CalendarEventsModal: React.FC<Props> = ({ date, currentUser, onClose, onRefresh }) => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const fetchEvents = async () => {
        setLoading(true);
        const allEvents = await getCalendarEvents();
        setEvents(allEvents.filter(e => e.date === date));
        setLoading(false);
    };

    useEffect(() => {
        fetchEvents();
    }, [date]);

    const handleCreate = async () => {
        if (!newTitle.trim()) {
            toast.error('El título es obligatorio');
            return;
        }
        if (!currentUser) return;

        setUploading(true);
        try {
            let fileUrl = '';
            if (file) {
                fileUrl = await uploadCalendarFile(file);
            }

            await createCalendarEvent({
                date,
                title: newTitle,
                description: newDesc,
                file_url: fileUrl,
                creator_id: currentUser.id,
                category: 'General'
            });

            toast.success('Anotación creada');
            setNewTitle('');
            setNewDesc('');
            setFile(null);
            setIsAdding(false);
            fetchEvents();
            onRefresh();
        } catch (err) {
            toast.error('Error al crear la anotación');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta anotación?')) return;
        try {
            await deleteCalendarEvent(id);
            toast.success('Anotación eliminada');
            fetchEvents();
            onRefresh();
        } catch (err) {
            toast.error('Error al eliminar');
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            padding: 20
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                style={{
                    width: '100%', maxWidth: 500,
                    background: 'var(--bg-card)',
                    borderRadius: 16, border: '1px solid var(--border-subtle)',
                    overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    maxHeight: '90vh'
                }}
            >
                {/* Header */}
                <div style={{ 
                    padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'var(--bg-sidebar)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ 
                            width: 36, height: 36, borderRadius: 10,
                            background: 'var(--brand-500)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', color: 'white'
                        }}>
                            <CalendarIcon size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Anotaciones</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: 8, borderRadius: 8 }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>Cargando...</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {events.length === 0 && !isAdding && (
                                <div style={{ 
                                    textAlign: 'center', padding: '40px 20px',
                                    background: 'rgba(255,255,255,0.02)', borderRadius: 12,
                                    border: '1px dashed var(--border-subtle)'
                                }}>
                                    <Info size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No hay anotaciones para este día</div>
                                    <button 
                                        onClick={() => setIsAdding(true)}
                                        className="btn btn-primary" 
                                        style={{ marginTop: 16, fontSize: '0.8rem' }}
                                    >
                                        <Plus size={14} style={{ marginRight: 6 }} /> Añadir primera
                                    </button>
                                </div>
                            )}

                            {events.map(event => (
                                <div key={event.id} style={{
                                    padding: 16, borderRadius: 12,
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--border-subtle)',
                                    position: 'relative'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div style={{ fontWeight: 700, color: 'var(--brand-500)', fontSize: '0.95rem' }}>{event.title}</div>
                                        {(currentUser?.id === event.creator_id || currentUser?.role !== 'Usuario') && (
                                            <button onClick={() => handleDelete(event.id)} style={{ color: '#ef4444', padding: 4, opacity: 0.6, cursor: 'pointer', background: 'none', border: 'none' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                    {event.description && (
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12, whiteSpace: 'pre-wrap' }}>
                                            {event.description}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            <User size={12} />
                                            {event.creator?.name || 'Sistema'}
                                        </div>
                                        {event.file_url && (
                                            <a href={event.file_url} target="_blank" rel="noreferrer" style={{ 
                                                display: 'flex', alignItems: 'center', gap: 6, 
                                                fontSize: '0.75rem', color: 'var(--brand-500)',
                                                textDecoration: 'none', fontWeight: 600
                                            }}>
                                                <FileText size={14} /> Documento
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {isAdding && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    style={{
                                        padding: 20, borderRadius: 12,
                                        background: 'var(--bg-sidebar)',
                                        border: '2px solid var(--brand-500)'
                                    }}
                                >
                                    <div style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.9rem' }}>Nueva Anotación</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <input 
                                            className="input" 
                                            placeholder="Título..." 
                                            value={newTitle} 
                                            onChange={e => setNewTitle(e.target.value)} 
                                        />
                                        <textarea 
                                            className="input" 
                                            placeholder="Descripción..." 
                                            style={{ minHeight: 80, padding: 12 }} 
                                            value={newDesc} 
                                            onChange={e => setNewDesc(e.target.value)}
                                        />
                                        
                                        <div style={{ position: 'relative' }}>
                                            <input 
                                                type="file" 
                                                id="cal-file" 
                                                hidden 
                                                onChange={e => setFile(e.target.files?.[0] || null)}
                                            />
                                            <label htmlFor="cal-file" style={{
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                padding: '10px 14px', borderRadius: 8,
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid var(--border-subtle)',
                                                cursor: 'pointer', fontSize: '0.8rem'
                                            }}>
                                                <Upload size={16} />
                                                {file ? file.name : 'Adjuntar documento...'}
                                            </label>
                                        </div>

                                        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                            <button 
                                                onClick={handleCreate} 
                                                disabled={uploading}
                                                className="btn btn-primary" 
                                                style={{ flex: 1 }}
                                            >
                                                {uploading ? 'Guardando...' : 'Guardar'}
                                            </button>
                                            <button 
                                                onClick={() => setIsAdding(false)} 
                                                className="btn btn-ghost"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {!isAdding && events.length > 0 && (
                                <button 
                                    onClick={() => setIsAdding(true)}
                                    className="btn btn-ghost" 
                                    style={{ border: '1px dashed var(--border-subtle)', borderRadius: 12, padding: 16 }}
                                >
                                    <Plus size={16} style={{ marginRight: 8 }} /> Añadir otra anotación
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default CalendarEventsModal;
