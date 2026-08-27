import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Teacher, MetaOptions, GuardGroupSchedule, PersonalScheduleEntry } from '../types';
import InteractiveScheduleGrid, { DAYS } from './InteractiveScheduleGrid';
import { toast } from 'sonner';
import { Plus, X, MapPin } from 'lucide-react';
import ClassroomMapModal from './ClassroomMapModal';
import {
    getAutoGuardGroups,
    getPersonalSchedule, 
    deletePersonalScheduleEntry, 
    deletePersonalScheduleEntries,
    createPersonalScheduleEntry,
    bulkCreatePersonalSchedule,
    findOrCreateMixedGroup
} from '../services/supabaseClient';

interface MyScheduleProps {
    currentUser: Teacher;
    meta: MetaOptions;
}

const MySchedule: React.FC<MyScheduleProps> = ({ currentUser, meta }) => {
    const [activeTab, setActiveTab] = useState<'lectivo' | 'guardias'>('lectivo');
    
    const [dbPersonal, setDbPersonal] = useState<PersonalScheduleEntry[]>([]);
    const [dbGuard, setDbGuard] = useState<GuardGroupSchedule[]>([]);

    const [draftPersonal, setDraftPersonal] = useState<PersonalScheduleEntry[]>([]);
    const [draftGuard, setDraftGuard] = useState<GuardGroupSchedule[]>([]);

    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mapRoomId, setMapRoomId] = useState<string | null>(null);

    // Form inputs for Horario Lectivo
    const [newPersonalForm, setNewPersonalForm] = useState<{
        materia_id: string;
        submateria_id: string;
        grupo_ids: string[];
        aula_id: string;
    }>({
        materia_id: '',
        submateria_id: '',
        grupo_ids: [],
        aula_id: ''
    });

    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pDataAll, gDataAll] = await Promise.all([
                getPersonalSchedule(currentUser.id),
                getAutoGuardGroups()
            ]);
            
            // Filter PersonalSchedule items so we only show Lectivos in the Lectivo tab
            // Note: old records that have 'null' type might also need to be here, but generally 'Lectivo'.
            const pData = pDataAll.filter(s => s.tipo !== 'Guardia');
            
            const gData = gDataAll.filter(s => s.profesor_id === currentUser.id);
            
            setDbPersonal(pData);
            setDraftPersonal(pData);
            
            setDbGuard(gData);
            setDraftGuard(gData);
            
            setHasChanges(false);
        } catch (error) {
            toast.error('Error al cargar el horario');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentUser.id]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // ── ESTRATEGIA: DELETE-ALL + RE-INSERT-ALL ──
            // Borramos TODOS los registros existentes del profesor
            // y reinsertamos el draft completo.
            
            const existingLectivoIds = dbPersonal
                .filter(d => !String(d.id).startsWith('temp-'))
                .map(d => d.id);
            
            const existingGuardIds = dbGuard
                .filter(d => !String(d.id).startsWith('temp-'))
                .map(d => d.id);

            const allExistingIds = [...existingLectivoIds, ...existingGuardIds];

            if (allExistingIds.length > 0) {
                await deletePersonalScheduleEntries(allExistingIds);
            }

            // Para cada entrada lectiva, si el grupo_id empieza con 'mixed-temp-',
            // necesitamos crear/encontrar el grupo real en la DB.
            const entriesToCreate: any[] = [];

            for (const entry of draftPersonal) {
                let grupoId = entry.grupo_id || null;

                // grupo mixto temporal → buscar o crear en la tabla Grupos
                if (grupoId && String(grupoId).startsWith('mixed-temp-')) {
                    const mixedName = entry.grupo?.name || '';
                    if (mixedName) {
                        grupoId = await findOrCreateMixedGroup(mixedName);
                    }
                }

                entriesToCreate.push({
                    profesor_id: entry.profesor_id,
                    dia_semana: entry.dia_semana,
                    franja_id: entry.franja_id,
                    materia_id: entry.materia_id || null,
                    grupo_id: grupoId,
                    aula_id: entry.aula_id || null,
                    tipo: entry.tipo || 'Lectivo'
                });
            }

            for (const entry of draftGuard) {
                entriesToCreate.push({
                    profesor_id: entry.profesor_id,
                    dia_semana: entry.dia_semana,
                    franja_id: entry.franja_id,
                    tipo: 'Guardia'
                });
            }

            if (entriesToCreate.length > 0) {
                await bulkCreatePersonalSchedule(entriesToCreate);
            }

            setHasChanges(false);
            toast.success('Horario guardado correctamente');
            await fetchData();
        } catch (error: any) {
            console.error('Error al guardar el horario:', error);
            const errorMsg = error?.message || error?.details || 'Error desconocido';
            const errorCode = error?.code || '';
            toast.error('Error al guardar el horario', {
                description: `${errorCode ? `[${errorCode}] ` : ''}${errorMsg}`
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setDraftPersonal([...dbPersonal]);
        setDraftGuard([...dbGuard]);
        setHasChanges(false);
    };

    const formatGroupNames = (names: string[]) => {
        if (names.length === 0) return '';
        if (names.length === 1) return names[0];

        // Agrupar por prefijo (ej: "1º ESO" o "ESO1")
        const groupsByPrefix: Record<string, string[]> = {};
        
        names.forEach(name => {
            const cleanName = name.trim();
            // Detecta si termina en una letra sola (ej: "ESO1A" o "1º ESO A")
            const match = cleanName.match(/^(.+?)\s*([A-Z])$/);
            
            if (match) {
                const prefix = match[1].trim();
                const letter = match[2];
                if (!groupsByPrefix[prefix]) groupsByPrefix[prefix] = [];
                if (!groupsByPrefix[prefix].includes(letter)) groupsByPrefix[prefix].push(letter);
            } else {
                if (!groupsByPrefix['']) groupsByPrefix[''] = [];
                if (!groupsByPrefix[''].includes(cleanName)) groupsByPrefix[''].push(cleanName);
            }
        });

        return Object.entries(groupsByPrefix).map(([prefix, letters]) => {
            if (!prefix) return letters.join(', ');
            // Ordenamos letras para que sea siempre igual (A+B+C)
            const sortedLetters = [...letters].sort();
            return `${prefix} ${sortedLetters.join('+')}`;
        }).join(' y ');
    };

    return (
        <div style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-lg)'
        }}>
            {/* Header Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
                <button
                    onClick={() => setActiveTab('lectivo')}
                    style={{
                        flex: 1, padding: 16, background: activeTab === 'lectivo' ? 'var(--brand-900-subtle)' : 'transparent',
                        border: 'none', borderBottom: activeTab === 'lectivo' ? '2px solid var(--brand-500)' : '2px solid transparent',
                        color: activeTab === 'lectivo' ? 'var(--brand-400)' : 'var(--text-secondary)',
                        fontWeight: activeTab === 'lectivo' ? 700 : 500, cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    Mi Horario Lectivo
                </button>
                <button
                    onClick={() => setActiveTab('guardias')}
                    style={{
                        flex: 1, padding: 16, background: activeTab === 'guardias' ? 'var(--brand-900-subtle)' : 'transparent',
                        border: 'none', borderBottom: activeTab === 'guardias' ? '2px solid var(--brand-500)' : '2px solid transparent',
                        color: activeTab === 'guardias' ? 'var(--brand-400)' : 'var(--text-secondary)',
                        fontWeight: activeTab === 'guardias' ? 700 : 500, cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    Mi Disponibilidad para Guardias
                </button>
            </div>
            
            {hasChanges && (
                <div style={{ padding: '12px 24px', background: 'var(--brand-900)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ color: 'var(--brand-300)', fontSize: '0.9rem', fontWeight: 600 }}>
                        Tienes cambios sin guardar en tu horario.
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button 
                            onClick={handleCancel}
                            disabled={isSaving}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                fontWeight: 600,
                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            style={{
                                background: 'var(--brand-500)',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                fontWeight: 600,
                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                opacity: isSaving ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}
                        >
                            {isSaving ? 'Guardando...' : 'Guardar Horario'}
                        </button>
                    </div>
                </div>
            )}

            <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Cargando matriz...</div>
                    ) : activeTab === 'lectivo' ? (
                        <motion.div key="lectivo" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                            <div style={{ marginBottom: 20, padding: 16, background: 'var(--brand-950-subtle)', borderRadius: 8, border: '1px solid var(--brand-500-40)', display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-300)', marginRight: 8 }}>PINCEL:</div>
                                <select 
                                    className="select" 
                                    value={newPersonalForm.materia_id} 
                                    onChange={e => setNewPersonalForm({ ...newPersonalForm, materia_id: e.target.value, submateria_id: '' })} 
                                    style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: 6 }}
                                >
                                    <option value="">-- Departamento --</option>
                                    {meta.subjects.filter(s => !s.padre_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                {newPersonalForm.materia_id && meta.subjects.some(s => s.padre_id === newPersonalForm.materia_id) && (
                                    <select 
                                        className="select" 
                                        value={newPersonalForm.submateria_id} 
                                        onChange={e => setNewPersonalForm({ ...newPersonalForm, submateria_id: e.target.value })} 
                                        style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: 6 }}
                                    >
                                        <option value="">-- Materia --</option>
                                        {meta.subjects.filter(s => s.padre_id === newPersonalForm.materia_id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                )}
                                <div style={{ flex: 1 }}>
                                    <button 
                                        onClick={() => setIsGroupModalOpen(true)}
                                        style={{ 
                                            width: '100%', 
                                            background: 'var(--bg-elevated)', 
                                            border: '1px solid var(--border-subtle)', 
                                            color: 'var(--text-primary)', 
                                            padding: '8px 16px', 
                                            borderRadius: 8,
                                            textAlign: 'left',
                                            fontSize: '0.9rem',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-500)'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                                    >
                                        <span style={{ opacity: newPersonalForm.grupo_ids.length > 0 ? 1 : 0.6 }}>
                                            {newPersonalForm.grupo_ids.length === 0 
                                                ? '-- Grupos --' 
                                                : formatGroupNames(newPersonalForm.grupo_ids.map(id => meta.groups.find(g => g.id === id)?.name || ''))
                                            }
                                        </span>
                                        {newPersonalForm.grupo_ids.length > 0 && (
                                            <div style={{ 
                                                fontSize: '0.65rem', 
                                                background: 'var(--brand-500)', 
                                                color: 'white', 
                                                width: 18, height: 18, 
                                                borderRadius: '50%', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center',
                                                marginLeft: 8
                                            }}>
                                                {newPersonalForm.grupo_ids.length}
                                            </div>
                                        )}
                                    </button>
                                </div>
                                <select 
                                    className="select" 
                                    value={newPersonalForm.aula_id} 
                                    onChange={e => setNewPersonalForm({ ...newPersonalForm, aula_id: e.target.value })} 
                                    style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: 6 }}
                                >
                                    <option value="">-- Aula --</option>
                                    {meta.classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                                Selecciona arriba la asignatura, grupo y aula, y luego haz clic en las celdas vacías para "pintar" tu horario. Si haces clic en una celda llena, se borrará.
                            </div>

                            <InteractiveScheduleGrid
                                slots={meta.slots.filter(s => !s.label.toLowerCase().includes('recreo'))}
                                getItem={(day, slotId) => draftPersonal.filter(e => e.dia_semana === day && e.franja_id === slotId)}
                                showRowHeaders={true}
                                renderItemContent={(items, day, slot) => (
                                    items.length > 0 ? (
                                        <>
                                            <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{items[0].materia?.name}</div>
                                            <div style={{ opacity: 0.8 }}>{items[0].grupo?.name}</div>
                                            {items[0].aula && (
                                                <div 
                                                    onClick={items[0].aula.id ? (e) => { e.stopPropagation(); setMapRoomId(items[0].aula!.id); } : undefined}
                                                    style={{ 
                                                        opacity: 0.8, fontSize: '0.6rem',
                                                        cursor: items[0].aula.id ? 'pointer' : 'default',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '2px',
                                                        padding: '1px 3px',
                                                        borderRadius: '4px',
                                                        background: 'rgba(255,255,255,0.05)',
                                                        marginTop: '2px',
                                                        transition: 'inherit'
                                                    }}
                                                    className={items[0].aula.id ? "hover:bg-[var(--brand-400)]/10 hover:text-[var(--brand-400)]" : ""}
                                                >
                                                    <MapPin size={8} />
                                                    {items[0].aula?.name}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div style={{ opacity: 0.2 }}><Plus size={16} style={{ margin: '0 auto' }} /></div>
                                    )
                                )}
                                onSlotClick={async (items, day, slot) => {
                                    if (items.length > 0) {
                                        setDraftPersonal(prev => prev.filter(e => !(e.dia_semana === day && e.franja_id === slot.id)));
                                        setHasChanges(true);
                                    } else if (newPersonalForm.materia_id && newPersonalForm.grupo_ids.length > 0) {
                                        const finalMateriaId = newPersonalForm.submateria_id || newPersonalForm.materia_id;
                                        const materia = meta.subjects.find(s => s.id === finalMateriaId);
                                        const aula = meta.classrooms.find(c => c.id === newPersonalForm.aula_id);

                                        // Construir nombre de grupo (individual o mixto)
                                        let grupoId: string;
                                        let grupoName: string;

                                        if (newPersonalForm.grupo_ids.length === 1) {
                                            // Grupo individual: usar el que ya existe
                                            grupoId = newPersonalForm.grupo_ids[0];
                                            grupoName = meta.groups.find(g => g.id === grupoId)?.name || '';
                                        } else {
                                            // Grupo mixto: generar nombre combinado y usar ID temporal
                                            const selectedNames = newPersonalForm.grupo_ids
                                                .map(gid => meta.groups.find(g => g.id === gid)?.name || '')
                                                .filter(Boolean);
                                            grupoName = formatGroupNames(selectedNames);
                                            grupoId = `mixed-temp-${Date.now()}`;
                                        }

                                        const newEntry: PersonalScheduleEntry = {
                                            id: `temp-${Date.now()}-${Math.random()}`,
                                            materia_id: finalMateriaId,
                                            grupo_id: grupoId,
                                            aula_id: newPersonalForm.aula_id,
                                            tipo: 'Lectivo',
                                            profesor_id: currentUser.id,
                                            dia_semana: day,
                                            franja_id: slot.id,
                                            materia,
                                            grupo: { id: grupoId, name: grupoName },
                                            aula
                                        } as PersonalScheduleEntry;

                                        setDraftPersonal(prev => {
                                            const filtered = prev.filter(e => !(e.dia_semana === day && e.franja_id === slot.id));
                                            return [...filtered, newEntry];
                                        });
                                        setHasChanges(true);
                                    } else {
                                        toast.error('Selecciona primero la asignatura y al menos un grupo');
                                    }
                                }}
                            />
                        </motion.div>
                    ) : (
                        <motion.div key="guardias" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            {(() => {
                                // Separar horas ordinarias y recreos consultando meta.slots
                                const breakSlotIds = new Set(
                                    meta.slots
                                        .filter(s => s.label?.toLowerCase().includes('recreo'))
                                        .map(s => s.id)
                                );
                                const horasReceo      = draftGuard.filter(e => breakSlotIds.has(e.franja_id)).length;
                                const horasOrdinarias = draftGuard.length - horasReceo;
                                // Nota: para cálculo de horas reales, recreosDisplay = horasReceo * 0.5
                                return (
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                background: 'var(--brand-950-subtle)', 
                                padding: '16px 20px', 
                                borderRadius: 12, 
                                border: '1px solid var(--brand-500-40)', 
                                marginBottom: 20,
                                gap: 16,
                            }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', flex: 1 }}>
                                    Haz clic en las franjas horarias en las que tengas disponibilidad oficial de Guardia según tu cuadrante del centro.
                                </div>

                                {/* ── Contadores separados ─────────────────── */}
                                <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                                    {/* Horas ordinarias */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{
                                            fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)',
                                            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2
                                        }}>
                                            Ordinarias
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', color: 'var(--brand-400)' }}>
                                            <span style={{ fontSize: '1.1rem', fontWeight: 800, lineHeight: 1 }}>{horasOrdinarias}</span>
                                        </div>
                                    </div>

                                    {/* Separador */}
                                    <div style={{
                                        width: 1, background: 'var(--border-subtle)',
                                        alignSelf: 'stretch', opacity: 0.5
                                    }} />

                                    {/* Horas de recreo */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{
                                            fontSize: '0.65rem', fontWeight: 700,
                                            color: 'rgba(251,191,36,0.7)',
                                            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2
                                        }}>
                                            Recreos
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', color: 'rgba(251,191,36,0.9)' }}>
                                            <span style={{ fontSize: '1.1rem', fontWeight: 800, lineHeight: 1 }}>{horasReceo}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                                );
                            })()}
                            <InteractiveScheduleGrid
                                slots={meta.slots}
                                interactiveBreakSlots={true}
                                getItem={(day, slotId) => draftGuard.find(e => e.dia_semana === day && e.franja_id === slotId)}
                                renderItemContent={(existing, day, slot) => (
                                    <>
                                        <div style={{ fontWeight: 700, fontSize: '0.75rem' }}>{slot.label}</div>
                                        <div style={{ opacity: 0.6, fontSize: '0.65rem' }}>{slot.start_time?.slice(0, 5)}</div>
                                    </>
                                )}
                                onSlotClick={async (existing, day, slot) => {
                                    if (existing) {
                                        setDraftGuard(prev => prev.filter(e => e.id !== existing.id));
                                        setHasChanges(true);
                                    } else {
                                        setDraftGuard(prev => [...prev, { 
                                            id: `temp-${Date.now()}-${Math.random()}`,
                                            profesor_id: currentUser.id, 
                                            dia_semana: day, 
                                            franja_id: slot.id,
                                            horas: 1
                                        } as GuardGroupSchedule]);
                                        setHasChanges(true);
                                    }
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Group Selection Modal ────────────────────── */}
            <AnimatePresence>
                {isGroupModalOpen && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
                        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
                    }}>
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{
                                width: '100%', maxWidth: 450, background: 'var(--bg-card)',
                                borderRadius: 20, border: '1px solid var(--border-subtle)',
                                overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--border-subtle)', position: 'relative' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Selección de Grupos</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '8px 0 0' }}>
                                    Selecciona varios grupos si llevas un grupo mixto
                                </p>
                                <button 
                                    onClick={() => setIsGroupModalOpen(false)}
                                    style={{ 
                                        position: 'absolute', top: 20, right: 20, 
                                        background: 'none', border: 'none', color: 'var(--text-muted)', 
                                        cursor: 'pointer', padding: 5, display: 'flex'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div style={{ padding: 24, maxHeight: '60vh', overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    {meta.groups.map(g => {
                                        const isSelected = newPersonalForm.grupo_ids.includes(g.id);
                                        return (
                                            <label 
                                                key={g.id} 
                                                style={{ 
                                                    display: 'flex', alignItems: 'center', gap: 10, padding: 12, 
                                                    borderRadius: 12, background: isSelected ? 'var(--brand-900-subtle)' : 'rgba(255,255,255,0.03)',
                                                    border: isSelected ? '1px solid var(--brand-500)' : '1px solid transparent',
                                                    cursor: 'pointer', transition: 'all 0.2s',
                                                }}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected}
                                                    onChange={() => {
                                                        const ids = isSelected 
                                                            ? newPersonalForm.grupo_ids.filter(id => id !== g.id)
                                                            : [...newPersonalForm.grupo_ids, g.id];
                                                        setNewPersonalForm({ ...newPersonalForm, grupo_ids: ids });
                                                    }}
                                                    style={{ width: 18, height: 18, accentColor: 'var(--brand-500)' }}
                                                />
                                                <span style={{ 
                                                    fontSize: '0.9rem', 
                                                    fontWeight: isSelected ? 800 : 500, 
                                                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' 
                                                }}>
                                                    {g.name}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <div style={{ padding: 24, background: 'var(--bg-sidebar)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button 
                                    onClick={() => setNewPersonalForm({ ...newPersonalForm, grupo_ids: [] })}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', padding: '0 12px' }}
                                >
                                    Limpiar todos
                                </button>
                                <button 
                                    onClick={() => setIsGroupModalOpen(false)}
                                    style={{ 
                                        padding: '10px 20px', borderRadius: 12, border: '1px solid var(--border-subtle)',
                                        background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', cursor: 'pointer'
                                    }}
                                >
                                    Cerrar
                                </button>
                                <button 
                                    onClick={() => setIsGroupModalOpen(false)}
                                    className="btn btn-primary"
                                    style={{ padding: '10px 24px', borderRadius: 12 }}
                                >
                                    Confirmar {newPersonalForm.grupo_ids.length > 0 && `(${newPersonalForm.grupo_ids.length})`}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Map Modal */}
            <ClassroomMapModal 
                roomId={mapRoomId}
                meta={meta}
                onClose={() => setMapRoomId(null)}
            />
        </div>
    );
};

export default MySchedule;
