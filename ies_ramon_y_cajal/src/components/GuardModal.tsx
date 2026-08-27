import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Guard, GuardType, MetaOptions, TaskStatus, Teacher } from '../types';
import CustomDatePicker from './CustomDatePicker';
import { uploadTaskFile, getPersonalSchedule, isSchoolDay } from '../services/supabaseClient';
import { toast } from 'sonner';
import { PersonalScheduleEntry } from '../types';
import { useEffect } from 'react';
import { canAccessAdminPanel } from '../utils/roles';

interface GuardModalProps {
    editingGuard: Guard | null;
    meta: MetaOptions;
    currentUser: Teacher | null;
    teachers: Teacher[];
    onSubmit: (formData: any) => Promise<void>;
    onClose: () => void;
}

const GuardModal: React.FC<GuardModalProps> = ({ editingGuard, meta, currentUser, teachers, onSubmit, onClose }) => {
    const isAdmin = canAccessAdminPanel(currentUser);

    const [formData, setFormData] = useState({
        date: editingGuard?.date || new Date().toISOString().split('T')[0],
        time_slot_id: editingGuard?.time_slot_id || meta.slots[0]?.id || '',
        classroom_id: editingGuard?.classroom_id || '',
        group_id: editingGuard?.group_id || '',
        subject_id: editingGuard?.subject_id || '',
        type: editingGuard?.type || GuardType.ORDINARY,
        has_task: editingGuard?.has_task || TaskStatus.NO,
        observations: editingGuard?.observations || '',
        requesting_teacher_id: editingGuard?.requesting_teacher_id || currentUser?.id || '',
        task_file_url: editingGuard?.task_file_url || '',
    });
    const [personalSchedule, setPersonalSchedule] = useState<PersonalScheduleEntry[]>([]);
    const [loadingSchedule, setLoadingSchedule] = useState(false);
    const [selectedScheduleEntries, setSelectedScheduleEntries] = useState<PersonalScheduleEntry[]>([]);

    const getDayName = (dateStr: string) => {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return days[new Date(dateStr).getDay()];
    };

    const currentDay = getDayName(formData.date);
    const daySchedule = personalSchedule.filter(s => s.dia_semana === currentDay);

    useEffect(() => {
        if (formData.requesting_teacher_id) {
            setLoadingSchedule(true);
            getPersonalSchedule(formData.requesting_teacher_id).then(data => {
                setPersonalSchedule(data);
                setLoadingSchedule(false);
                setSelectedScheduleEntries([]);
            });
        } else {
            setPersonalSchedule([]);
            setSelectedScheduleEntries([]);
        }
    }, [formData.requesting_teacher_id]);

    useEffect(() => {
        setSelectedScheduleEntries([]);
    }, [formData.date]);

    useEffect(() => {
        if (selectedScheduleEntries.length === 1) {
            const entry = selectedScheduleEntries[0];
            if (entry.tipo === 'Guardia') {
                setFormData(prev => ({
                    ...prev,
                    time_slot_id: entry.franja_id,
                    classroom_id: '',
                    group_id: '',
                    subject_id: 'M_GUARDIA'
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    time_slot_id: entry.franja_id,
                    classroom_id: entry.aula_id || '',
                    group_id: entry.grupo_id || '',
                    subject_id: entry.materia_id || ''
                }));
            }
        }
    }, [selectedScheduleEntries]);

    const handleFillFromSchedule = (entry: PersonalScheduleEntry) => {
        setSelectedScheduleEntries(prev => {
            const exists = prev.some(e => e.id === entry.id);
            if (exists) {
                return prev.filter(e => e.id !== entry.id);
            } else {
                return [...prev, entry];
            }
        });
    };

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [dateBlocked, setDateBlocked] = useState(false);
    const [dateBlockReason, setDateBlockReason] = useState('');

    // Check if selected date is a school day
    useEffect(() => {
        const checkDate = async () => {
            const lectivo = await isSchoolDay(formData.date);
            setDateBlocked(!lectivo);
            if (!lectivo) {
                setDateBlockReason('La fecha seleccionada no es un día lectivo.');
            } else {
                setDateBlockReason('');
            }
        };
        checkDate();
    }, [formData.date]);

    // Reset classroom and group when subject is Guardia (guard absence)
    useEffect(() => {
        if (formData.subject_id === 'M_GUARDIA') {
            setFormData(prev => ({
                ...prev,
                classroom_id: '',
                group_id: '',
            }));
        }
    }, [formData.subject_id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (dateBlocked) {
            toast.warning('No se pueden crear guardias en días no lectivos', {
                description: dateBlockReason,
                duration: 4000,
            });
            return;
        }
        setSubmitting(true);
        try {
            let uploadedFileUrl = '';

            if (selectedFile) {
                try {
                    uploadedFileUrl = await uploadTaskFile(selectedFile);
                } catch (uploadErr) {
                    console.error('Error subiendo archivo:', uploadErr);
                    toast.error('Error al subir el archivo adjunto');
                    setSubmitting(false);
                    return;
                }
            }

            if (selectedScheduleEntries.length > 1) {
                const payloads = selectedScheduleEntries.map(entry => {
                    const isGuard = entry.tipo === 'Guardia';
                    return {
                        date: formData.date,
                        time_slot_id: entry.franja_id,
                        classroom_id: isGuard ? '' : (entry.aula_id || ''),
                        group_id: isGuard ? '' : (entry.grupo_id || ''),
                        subject_id: isGuard ? 'M_GUARDIA' : (entry.materia_id || ''),
                        type: formData.type,
                        has_task: uploadedFileUrl ? TaskStatus.YES : formData.has_task,
                        observations: formData.observations,
                        requesting_teacher_id: formData.requesting_teacher_id || currentUser?.id || '',
                        task_file_url: uploadedFileUrl || formData.task_file_url,
                    };
                });
                await onSubmit(payloads);
            } else {
                let finalFormData = { ...formData };
                if (uploadedFileUrl) {
                    finalFormData.task_file_url = uploadedFileUrl;
                    finalFormData.has_task = TaskStatus.YES;
                }
                await onSubmit(finalFormData);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(6px)',
                padding: 16,
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: 520,
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    borderRadius: 'var(--radius-xl)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                    position: 'relative',
                }}
            >
                {/* Glow accent */}
                <div style={{
                    position: 'absolute', top: 0, right: 0, width: 140, height: 140,
                    background: 'rgba(34, 211, 238, 0.1)', borderRadius: '50%',
                    filter: 'blur(50px)', pointerEvents: 'none',
                }} />

                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'var(--bg-sidebar)',
                    backdropFilter: 'blur(12px)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                }}>
                    <h3 style={{
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        color: 'var(--heading-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                    }}>
                        <span style={{
                            width: 4,
                            height: 24,
                            borderRadius: 2,
                            background: 'var(--brand-500)',
                            boxShadow: '0 0 10px var(--brand-500)',
                        }} />
                        {editingGuard ? 'Editar Guardia' : 'Solicitar Guardia'}
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--slate-400)',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            padding: 4,
                            transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--slate-400)'; }}
                    >
                        ✕
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Admin Teacher Selection */}
                    {isAdmin && !editingGuard && (
                        <div>
                            <label className="label">Profesor Ausente (Admin)</label>
                            <select
                                required
                                className="select"
                                value={formData.requesting_teacher_id}
                                onChange={(e) => setFormData({ ...formData, requesting_teacher_id: e.target.value })}
                                style={{ borderColor: 'var(--accent-400)', color: 'var(--text-primary)' }}
                            >
                                <option value="">Seleccionar profesor...</option>
                                {teachers
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} ({t.department})
                                        </option>
                                    ))}
                            </select>
                            <p style={{ fontSize: '0.65rem', color: 'var(--slate-500)', marginTop: 4 }}>
                                Como administrador, puedes crear guardias para cualquier docente.
                            </p>
                        </div>
                    )}

                    {/* Date + Slot */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <label className="label">Fecha</label>
                            <CustomDatePicker
                                value={formData.date}
                                onChange={(date) => setFormData({ ...formData, date })}
                            />
                        </div>
                        <div>
                            <label className="label">Franja</label>
                            <select
                                required={selectedScheduleEntries.length <= 1}
                                className="select"
                                value={selectedScheduleEntries.length > 1 ? '' : formData.time_slot_id}
                                onChange={(e) => setFormData({ ...formData, time_slot_id: e.target.value })}
                                disabled={selectedScheduleEntries.length > 1}
                                style={{ opacity: selectedScheduleEntries.length > 1 ? 0.5 : 1 }}
                            >
                                <option value="">{selectedScheduleEntries.length > 1 ? 'Múltiple (automático)' : 'Seleccionar'}</option>
                                {meta.slots
                                    .filter((s) => !s.label.toLowerCase().includes('recreo'))
                                    .map((s) => (
                                        <option key={s.id} value={s.id}>{s.label}</option>
                                    ))}
                            </select>
                        </div>
                    </div>

                    {/* Sugerencias de Horario Personal */}
                    {!editingGuard && daySchedule.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            style={{
                                background: 'rgba(34, 211, 238, 0.05)',
                                border: '1px dashed var(--brand-500)',
                                borderRadius: 'var(--radius-lg)',
                                padding: '12px 16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10
                            }}
                        >
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-400)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                ⚡ Selección automática por día:
                            </p>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {daySchedule.map(entry => {
                                    const isSelected = selectedScheduleEntries.some(e => e.id === entry.id);
                                    return (
                                        <button
                                            key={entry.id}
                                            type="button"
                                            onClick={() => handleFillFromSchedule(entry)}
                                            className="btn"
                                            style={{
                                                fontSize: '0.7rem',
                                                padding: '4px 8px',
                                                height: 'auto',
                                                background: isSelected ? 'var(--brand-600)' : 'var(--slate-800)',
                                                color: 'white',
                                                border: isSelected ? '1px solid var(--brand-400)' : '1px solid var(--slate-700)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}
                                        >
                                            {isSelected && <span>✓</span>}
                                            {entry.tipo === 'Guardia'
                                                ? `Guardia - ${meta.slots.find(s => s.id === entry.franja_id)?.label}`
                                                : `${entry.materia?.name || 'Materia'} (${entry.grupo?.name || ''}) - ${meta.slots.find(s => s.id === entry.franja_id)?.label}`
                                            }
                                        </button>
                                    );
                                })}
                            </div>
                            <p style={{ fontSize: '0.6rem', color: 'var(--slate-500)' }}>
                                Haz clic en una o varias clases para seleccionarlas y crear múltiples guardias a la vez.
                            </p>
                        </motion.div>
                    )}

                    {/* Info notice when multi-select is active */}
                    {selectedScheduleEntries.length > 1 && (
                        <div style={{
                            fontSize: '0.75rem',
                            padding: '8px 12px',
                            background: 'rgba(34, 211, 238, 0.1)',
                            borderLeft: '3px solid var(--brand-500)',
                            color: 'var(--brand-300)',
                            borderRadius: '0 var(--radius-md) var(--radius-md) 0'
                        }}>
                            Selección múltiple activa ({selectedScheduleEntries.length} clases). Se creará una guardia independiente para cada clase con sus respectivos datos de aula, grupo y materia.
                        </div>
                    )}

                    {/* Classroom + Group */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <label className="label" style={{ opacity: (selectedScheduleEntries.length > 1) || formData.subject_id === 'M_GUARDIA' ? 0.5 : 1 }}>Aula</label>
                            <select
                                required={selectedScheduleEntries.length <= 1 && formData.subject_id !== 'M_GUARDIA'}
                                disabled={(selectedScheduleEntries.length > 1) || formData.subject_id === 'M_GUARDIA'}
                                className="select"
                                value={selectedScheduleEntries.length > 1 ? '' : formData.classroom_id}
                                onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })}
                                style={{ opacity: (selectedScheduleEntries.length > 1) || formData.subject_id === 'M_GUARDIA' ? 0.5 : 1 }}
                            >
                                <option value="">{selectedScheduleEntries.length > 1 ? 'Múltiple (automático)' : formData.subject_id === 'M_GUARDIA' ? 'No requiere' : 'Seleccionar'}</option>
                                {meta.classrooms.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label" style={{ opacity: (selectedScheduleEntries.length > 1) || formData.subject_id === 'M_GUARDIA' ? 0.5 : 1 }}>Grupo</label>
                            <select
                                required={selectedScheduleEntries.length <= 1 && formData.subject_id !== 'M_GUARDIA'}
                                disabled={(selectedScheduleEntries.length > 1) || formData.subject_id === 'M_GUARDIA'}
                                className="select"
                                value={selectedScheduleEntries.length > 1 ? '' : formData.group_id}
                                onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                                style={{ opacity: (selectedScheduleEntries.length > 1) || formData.subject_id === 'M_GUARDIA' ? 0.5 : 1 }}
                            >
                                <option value="">{selectedScheduleEntries.length > 1 ? 'Múltiple (automático)' : formData.subject_id === 'M_GUARDIA' ? 'No requiere' : 'Seleccionar'}</option>
                                {meta.groups.map((g) => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="label" style={{ opacity: (selectedScheduleEntries.length > 1) ? 0.5 : 1 }}>Materia</label>
                        <select
                            required={selectedScheduleEntries.length <= 1}
                            disabled={selectedScheduleEntries.length > 1}
                            className="select"
                            value={selectedScheduleEntries.length > 1 ? '' : formData.subject_id}
                            onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                            style={{ opacity: (selectedScheduleEntries.length > 1) ? 0.5 : 1 }}
                        >
                            <option value="">{selectedScheduleEntries.length > 1 ? 'Múltiple (automático)' : 'Seleccionar'}</option>
                            {meta.subjects.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Task Radio Buttons */}
                    <div>
                        <label className="label">¿Tarea Dejada?</label>
                        <div style={{ display: 'flex', gap: 24, paddingTop: 10, paddingBottom: 4 }}>
                            {[
                                { label: 'Sí', value: TaskStatus.YES },
                                { label: 'No', value: TaskStatus.NO },
                            ].map((item) => (
                                <label
                                    key={item.value}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        color: formData.has_task === item.value ? 'var(--brand-400)' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="has_task"
                                        value={item.value}
                                        checked={formData.has_task === item.value}
                                        onChange={() => setFormData({ ...formData, has_task: item.value })}
                                        style={{
                                            accentColor: 'var(--brand-500)',
                                            width: 18,
                                            height: 18,
                                            cursor: 'pointer'
                                        }}
                                    />
                                    {item.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Task File Attachment */}
                    <div>
                        <label className="label">Adjuntar Tarea (Imagen o Documento)</label>
                        <div style={{
                            marginTop: 8,
                            padding: '12px 16px',
                            border: '2px dashed var(--slate-700)',
                            borderRadius: 'var(--radius-lg)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            background: selectedFile ? 'rgba(34, 211, 238, 0.05)' : 'transparent',
                            transition: 'all 0.2s',
                        }}>
                            <div style={{ flex: 1 }}>
                                <input
                                    type="file"
                                    id="task-file"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                    style={{ display: 'none' }}
                                    accept="image/*,.pdf,.doc,.docx,.txt"
                                />
                                <label
                                    htmlFor="task-file"
                                    style={{
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        color: selectedFile ? 'var(--brand-400)' : 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}
                                >
                                    {selectedFile ? (
                                        <>
                                            <span style={{ fontSize: '1.1rem' }}>📄</span>
                                            {selectedFile.name}
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ fontSize: '1.1rem' }}>📎</span>
                                            Seleccionar archivo...
                                        </>
                                    )}
                                </label>
                            </div>
                            {selectedFile && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedFile(null)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--slate-500)',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                    }}
                                >
                                    Quitar
                                </button>
                            )}
                        </div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--slate-500)', marginTop: 6 }}>
                            Formatos permitidos: Imágenes, PDF, Word, TXT.
                        </p>
                    </div>

                    {/* Observations */}
                    <div>
                        <label className="label">Observaciones</label>
                        <textarea
                            rows={3}
                            className="textarea"
                            placeholder="Instrucciones para la guardia..."
                            value={formData.observations}
                            onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                        />
                    </div>

                    {/* Actions */}
                    <div style={{
                        paddingTop: 16,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 12,
                        borderTop: '1px solid var(--slate-800)',
                    }}>
                        <button type="button" onClick={onClose} className="btn btn-ghost">
                            Cancelar
                        </button>
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            type="submit"
                            className="btn btn-primary"
                            disabled={submitting || dateBlocked}
                            style={{ opacity: (submitting || dateBlocked) ? 0.6 : 1 }}
                        >
                            {submitting 
                                ? 'Guardando...' 
                                : dateBlocked 
                                    ? '⚠ DÍA NO LECTIVO' 
                                    : editingGuard 
                                        ? 'GUARDAR CAMBIOS' 
                                        : (selectedScheduleEntries.length > 1) 
                                            ? `CREAR ${selectedScheduleEntries.length} GUARDIAS` 
                                            : 'CREAR GUARDIA'}
                        </motion.button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default GuardModal;
