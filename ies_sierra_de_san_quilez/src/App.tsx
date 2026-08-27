import { useState, useMemo, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { AnimatePresence } from 'framer-motion';
import { useGuards } from './hooks/useGuards';
import TeacherSelectionModal from './components/TeacherSelectionModal';
import { Teacher, Guard, GuardStatus, MetaOptions, GuardGroupSchedule, GuardType, ViewType } from './types';
import { toast } from 'sonner';
import { canAccessAdminPanel, canAccessMySchedule, canAccessDashboard, canAccessFreeClassrooms, isAdministracionRole, isPantallaRole } from './utils/roles';

import LoginScreen from './components/LoginScreen';
import Layout from './components/Layout';
import GuardList from './components/GuardList';
import GuardModal from './components/GuardModal';
import Dashboard from './components/Dashboard';
import TeacherDirectory from './components/TeacherDirectory';
import AdminPanel from './components/AdminPanel';
import GuardGroups from './components/GuardGroups';
import MySchedule from './components/MySchedule';
import FreeClassrooms from './components/FreeClassrooms';
import FloorMap from './components/FloorMap';
import PrivacyPage from './components/PrivacyPage';
import SchoolCalendar from './components/SchoolCalendar';
import LibreDisposicionPanel from './components/LibreDisposicionPanel';

import {
    updateGuardStatus,
    createGuard,
    updateGuardDetails,
    deleteGuard,
    batchUpdateGuardStatus,
    isSchoolDay,
} from './services/supabaseClient';



const App: React.FC = () => {
    const { session, currentUser, loading: authLoading } = useAuth();
    const isAuthenticated = !!session && !!currentUser;
    
    // Check for explicit route /privacy
    const isPrivacyPath = window.location.pathname === '/privacy' || window.location.pathname === '/privacy/';
    
    const { guards, setGuards, teachers, allTeachers, meta, guardGroupSchedules, loading: dataLoading, refetch } = useGuards(isAuthenticated);

    const [view, setView] = useState<ViewType>('guards');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGuard, setEditingGuard] = useState<Guard | null>(null);
    const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
    const [hasRedirectedAdmin, setHasRedirectedAdmin] = useState(false);

    // Assignment Mode State per Slot (Recomendada vs Aleatoria)
    const [assignmentModes, setAssignmentModes] = useState<Record<string, 'recommended' | 'random'>>(() => {
        const saved = localStorage.getItem('assignmentModes');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error(e);
            }
        }
        return {};
    });

    const handleAssignmentModeChange = (slotId: string, mode: 'recommended' | 'random') => {
        setAssignmentModes(prev => {
            const next = { ...prev, [slotId]: mode };
            localStorage.setItem('assignmentModes', JSON.stringify(next));
            return next;
        });
    };

    // Kiosk/TV Mode States
    const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{
        type: 'pickup' | 'release' | 'complete' | 'revert';
        guardId: string;
    } | null>(null);

    const getGuardGroupTeachersForGuard = (guard: Guard) => {
        const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const [year, month, day] = guard.date.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const dayName = DAYS_ES[dateObj.getDay()];

        return guardGroupSchedules
            .filter(gs => gs.dia_semana === dayName && gs.franja_id === guard.time_slot_id)
            .map(gs => gs.teacher)
            .filter(Boolean) as Teacher[];
    };

    const loading = authLoading || dataLoading;

    useEffect(() => {
        if (currentUser && !hasRedirectedAdmin) {
            if (isAdministracionRole(currentUser.role)) {
                setView('libre_disposicion');
            } else if (isPantallaRole(currentUser.role)) {
                setView('guards');
            }
            setHasRedirectedAdmin(true);
        }
    }, [currentUser, hasRedirectedAdmin]);

    // ─── GENERATE VIRTUAL GUARDS ──────────────────────────
    // Cada guardia de convivencia aparece solo 3h antes de su inicio
    // Se bloquean en días no lectivos
    const [isTodaySchoolDay, setIsTodaySchoolDay] = useState(true);

    useEffect(() => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        isSchoolDay(todayStr).then(setIsTodaySchoolDay).catch(() => setIsTodaySchoolDay(true));
    }, []);

    const allGuards = useMemo(() => {
        if (!meta.slots.length || !isTodaySchoolDay) return guards;
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA');
        const [todayYear, todayMonth, todayDay] = todayStr.split('-').map(Number);

        const lectiveSlotsMap = new Map();
        meta.slots.forEach(s => {
            if (!s.label.toLowerCase().includes('recreo') && !lectiveSlotsMap.has(s.label)) {
                lectiveSlotsMap.set(s.label, s);
            }
        });
        const lectiveSlots = Array.from(lectiveSlotsMap.values());

        const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
        const realClassroom = meta.classrooms.find(c => c.name.toLowerCase().includes('convivencia'));

        const virtuals: Guard[] = [];
        lectiveSlots.forEach(slot => {
            // Solo mostrar si faltan 3h o menos para el inicio de la franja y no ha terminado
            if (slot.start_time) {
                const [h, m] = slot.start_time.split(':').map(Number);
                const slotStart = new Date(todayYear, todayMonth - 1, todayDay, h, m);
                const timeDiff = slotStart.getTime() - now.getTime();
                
                // Si faltan más de 3 horas, no mostrar todavía
                if (timeDiff > THREE_HOURS_MS) return;

                // Si ya ha pasado la hora de fin de la franja, no mostrar
                let slotEnd: Date;
                if (slot.end_time) {
                    const [eh, em] = slot.end_time.split(':').map(Number);
                    slotEnd = new Date(todayYear, todayMonth - 1, todayDay, eh, em);
                } else {
                    slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
                }
                if (now > slotEnd) return;
            }

            const hasConvivencia = guards.some(g => g.date === todayStr && g.time_slot_id === slot.id && g.type === GuardType.COEXISTENCE);
            if (!hasConvivencia) {
                virtuals.push({
                    id: `V-CONV-${slot.id}`,
                    date: todayStr,
                    time_slot_id: slot.id,
                    time_slot: slot,
                    classroom_id: realClassroom?.id || '',
                    classroom: realClassroom || ({ id: '', name: 'Convivencia' } as any),
                    group_id: '',
                    group: { id: '', name: 'Aula de Convivencia' } as any,
                    subject_id: '',
                    subject: { id: '', name: 'Guardia de Convivencia' } as any,
                    covering_teacher_id: null,
                    status: GuardStatus.AVAILABLE,
                    type: GuardType.COEXISTENCE,
                    observations: 'Guardia de convivencia generada automáticamente por el sistema.',
                    isVirtual: true,
                } as any);
            }
        });

        return [...guards, ...virtuals];
    }, [guards, meta.slots, isTodaySchoolDay, meta.classrooms]);

    // ─── AUTO-COMPLETE EXPIRED GUARDS ──────────────────────
    useEffect(() => {
        if (!guards.length || dataLoading) return;

        const checkAndComplete = async () => {
            const now = new Date();
            const toComplete: string[] = [];

            guards.forEach(g => {
                if (g.status === GuardStatus.COMPLETED) return;
                if (!g.time_slot?.start_time) return;

                try {
                    // Combinamos fecha y hora (ej: 2026-03-04T08:00:00)
                    const [year, month, day] = g.date.split('-').map(Number);
                    const [hours, minutes] = g.time_slot.start_time.split(':').map(Number);

                    const guardStart = new Date(year, month - 1, day, hours, minutes);
                    
                    let guardEnd: Date;
                    if (g.time_slot.end_time) {
                        const [eh, em] = g.time_slot.end_time.split(':').map(Number);
                        guardEnd = new Date(year, month - 1, day, eh, em);
                    } else {
                        guardEnd = new Date(guardStart.getTime() + 60 * 60 * 1000);
                    }

                    if (now > guardEnd) {
                        toComplete.push(g.id);
                    }
                } catch (e) {
                    console.error("Error parsing date for auto-completion:", e);
                }
            });

            if (toComplete.length > 0) {
                console.log(`Auto-completando ${toComplete.length} guardias pasadas...`);
                try {
                    await batchUpdateGuardStatus(toComplete, GuardStatus.COMPLETED, currentUser?.id || 'sistema');
                    await refetch();
                } catch (err) {
                    console.error("Failed to auto-complete guards:", err);
                }
            }
        };

        checkAndComplete();
        const interval = setInterval(checkAndComplete, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [guards, dataLoading]);

    // ─── ROUTING ──────────────────────────────────────────
    if (isPrivacyPath) {
        return <PrivacyPage />;
    }

    if (!session) {
        return <LoginScreen loading={authLoading} />;
    }

    // ─── ACTIONS ──────────────────────────────────────────
    const handlePickup = async (guardId: string) => {
        if (!currentUser) return;
        const targetGuard = allGuards.find(g => g.id === guardId);
        if (!targetGuard) return;

        // Si es Modo TV, abrir el modal de selección de profesor
        if (isPantallaRole(currentUser.role)) {
            setPendingAction({ type: 'pickup', guardId });
            setIsTeacherModalOpen(true);
            return;
        }

        // Si ya está asignada al usuario actual, llamamos a handleRelease
        if (targetGuard.status === GuardStatus.ASSIGNED && targetGuard.covering_teacher_id === currentUser.id) {
            return handleRelease(guardId);
        }

        // --- VALIDATION: Check if it's within the teacher's assigned schedule ---
        const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const [year, month, day] = targetGuard.date.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const targetDayName = DAYS_ES[dateObj.getDay()];

        const isAssigned = guardGroupSchedules.some(
            gs => gs.profesor_id === currentUser.id && 
                  gs.dia_semana === targetDayName && 
                  gs.franja_id === targetGuard.time_slot_id
        );

        if (!isAssigned) {
            const confirmed = window.confirm('Estás recogiendo una guardia fuera de tu horario asignado.\n\n¿Deseas continuar?');
            if (!confirmed) {
                return;
            }
        }
        // --- END VALIDATION ---

        const previousGuards = [...guards];

        try {
            if ((targetGuard as any).isVirtual) {
                // Al recoger virtual, insertamos en Supabase
                const realClassroom = meta.classrooms.find(c => c.name.toLowerCase().includes('convivencia'));
                const payload: Partial<Guard> = {
                    date: targetGuard.date,
                    time_slot_id: targetGuard.time_slot_id,
                    requesting_teacher_id: null as unknown as string,
                    covering_teacher_id: currentUser.id,
                    status: GuardStatus.ASSIGNED,
                    type: GuardType.COEXISTENCE,
                    observations: targetGuard.observations,
                    has_task: 'NO'
                };
                if (realClassroom) payload.classroom_id = realClassroom.id;

                await createGuard(payload);
                toast.success('¡Guardia de Convivencia iniciada!', { description: 'Se ha registrado correctamente.' });
                await refetch();
                return;
            }

            // Actualización Optimista para guardias normales
            setGuards(prev => prev.map(g => 
                g.id === guardId 
                    ? { ...g, status: GuardStatus.ASSIGNED, covering_teacher_id: currentUser.id, covering_teacher: currentUser as any } 
                    : g
            ));

            const result = await updateGuardStatus(guardId, GuardStatus.ASSIGNED, currentUser.id, currentUser.id);
            
            if (result.success) {
                toast.success('¡Guardia recogida!', { description: 'Se te ha asignado correctamente.' });
            } else {
                // Revertir en caso de error de negocio (concurrencia)
                setGuards(previousGuards);
                toast.error(result.message || 'Error al recoger la guardia', {
                    duration: 5000,
                    icon: '⚠️'
                });
            }
            await refetch();
        } catch (error) {
            setGuards(previousGuards);
            toast.error('Error del sistema al recoger la guardia');
        }
    };

    const handleRelease = async (guardId: string) => {
        if (!currentUser) return;
        const targetGuard = allGuards.find(g => g.id === guardId);
        if (!targetGuard) return;

        // Si es Modo TV, abrir el modal de selección de profesor
        if (isPantallaRole(currentUser.role)) {
            setPendingAction({ type: 'release', guardId });
            setIsTeacherModalOpen(true);
            return;
        }

        const previousGuards = [...guards];

        try {
            // Actualización Optimista
            if (targetGuard.type === GuardType.COEXISTENCE) {
                // Para convivencia, desaparece de la lista "real" (vuelve a ser virtual)
                setGuards(prev => prev.filter(g => g.id !== guardId));
            } else {
                // Para normales, vuelve a estar disponible
                setGuards(prev => prev.map(g => 
                    g.id === guardId 
                        ? { ...g, status: GuardStatus.AVAILABLE, covering_teacher_id: null, covering_teacher: undefined } 
                        : g
                ));
            }

            if (targetGuard.type === GuardType.COEXISTENCE) {
                await deleteGuard(guardId);
                toast.success('Guardia de convivencia liberada');
            } else {
                const result = await updateGuardStatus(guardId, GuardStatus.AVAILABLE, undefined, currentUser.id);
                if (!result.success) {
                    setGuards(previousGuards);
                    toast.error(result.message || 'Error al liberar la guardia');
                    return;
                }
                toast.success('Guardia liberada', { description: 'Has dejado de cubrir esta guardia.' });
            }
            await refetch();
        } catch (error) {
            setGuards(previousGuards);
            toast.error('Error del sistema al liberar la guardia');
        }
    };

    const handleComplete = async (guardId: string) => {
        const targetGuard = guards.find(g => g.id === guardId);
        if (!targetGuard) return;

        // Si es Modo TV, abrir el modal de selección de profesor
        if (currentUser && isPantallaRole(currentUser.role)) {
            const actionType = targetGuard.status === GuardStatus.COMPLETED ? 'revert' : 'complete';
            setPendingAction({ type: actionType, guardId });
            setIsTeacherModalOpen(true);
            return;
        }

        try {
            // Revert back to ASSIGNED if already COMPLETED
            if (targetGuard.status === GuardStatus.COMPLETED) {
                await updateGuardStatus(guardId, GuardStatus.ASSIGNED, targetGuard.covering_teacher_id || undefined, currentUser?.id, true);
                toast.info('Estado revertido', { description: 'La guardia vuelve a estar pendiente.' });
            } else {
                await updateGuardStatus(guardId, GuardStatus.COMPLETED, undefined, currentUser?.id);
                toast.success('Guardia finalizada', { description: 'Marcada como realizada.' });
            }
            await refetch();
        } catch {
            toast.error('Error al cambiar el estado');
        }
    };

    // Ejecuta la acción pendiente en Modo TV una vez seleccionado el profesor
    const handleTeacherSelected = async (selectedTeacher: Teacher) => {
        if (!pendingAction) return;
        const { type, guardId } = pendingAction;
        const targetGuard = allGuards.find(g => g.id === guardId);
        setIsTeacherModalOpen(false);
        setPendingAction(null);

        if (!targetGuard) return;

        const previousGuards = [...guards];

        if (type === 'pickup') {
            // --- VALIDATION: Check if it's within the teacher's assigned schedule ---
            const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const [year, month, day] = targetGuard.date.split('-').map(Number);
            const dateObj = new Date(year, month - 1, day);
            const targetDayName = DAYS_ES[dateObj.getDay()];

            const isAssigned = guardGroupSchedules.some(
                gs => gs.profesor_id === selectedTeacher.id && 
                      gs.dia_semana === targetDayName && 
                      gs.franja_id === targetGuard.time_slot_id
            );

            if (!isAssigned) {
                const confirmed = window.confirm(`Estás recogiendo una guardia para ${selectedTeacher.name} fuera de su horario asignado.\n\n¿Deseas continuar?`);
                if (!confirmed) {
                    return;
                }
            }

            try {
                if ((targetGuard as any).isVirtual) {
                    const realClassroom = meta.classrooms.find(c => c.name.toLowerCase().includes('convivencia'));
                    const payload: Partial<Guard> = {
                        date: targetGuard.date,
                        time_slot_id: targetGuard.time_slot_id,
                        requesting_teacher_id: null as unknown as string,
                        covering_teacher_id: selectedTeacher.id,
                        status: GuardStatus.ASSIGNED,
                        type: GuardType.COEXISTENCE,
                        observations: targetGuard.observations,
                        has_task: 'NO'
                    };
                    if (realClassroom) payload.classroom_id = realClassroom.id;

                    await createGuard(payload);
                    toast.success(`¡Guardia de Convivencia iniciada para ${selectedTeacher.name}!`);
                    await refetch();
                    return;
                }

                // Optimistic Update
                setGuards(prev => prev.map(g => 
                    g.id === guardId 
                        ? { ...g, status: GuardStatus.ASSIGNED, covering_teacher_id: selectedTeacher.id, covering_teacher: selectedTeacher as any } 
                        : g
                ));

                const result = await updateGuardStatus(guardId, GuardStatus.ASSIGNED, selectedTeacher.id, selectedTeacher.id);
                if (result.success) {
                    toast.success(`¡Guardia asignada a ${selectedTeacher.name}!`);
                } else {
                    setGuards(previousGuards);
                    toast.error(result.message || 'Error al asignar la guardia');
                }
                await refetch();
            } catch {
                setGuards(previousGuards);
                toast.error('Error del sistema al asignar la guardia');
            }
        } else if (type === 'release') {
            try {
                if (targetGuard.type === GuardType.COEXISTENCE) {
                    setGuards(prev => prev.filter(g => g.id !== guardId));
                    await deleteGuard(guardId);
                    toast.success(`Guardia de convivencia liberada por ${selectedTeacher.name}`);
                } else {
                    setGuards(prev => prev.map(g => 
                        g.id === guardId 
                            ? { ...g, status: GuardStatus.AVAILABLE, covering_teacher_id: null, covering_teacher: undefined } 
                            : g
                    ));

                    const result = await updateGuardStatus(guardId, GuardStatus.AVAILABLE, undefined, selectedTeacher.id);
                    if (!result.success) {
                        setGuards(previousGuards);
                        toast.error(result.message || 'Error al liberar la guardia');
                        return;
                    }
                    toast.success(`Guardia liberada por ${selectedTeacher.name}`);
                }
                await refetch();
            } catch {
                setGuards(previousGuards);
                toast.error('Error del sistema al liberar la guardia');
            }
        } else if (type === 'complete') {
            try {
                await updateGuardStatus(guardId, GuardStatus.COMPLETED, undefined, selectedTeacher.id);
                toast.success(`Guardia marcada como realizada por ${selectedTeacher.name}`);
                await refetch();
            } catch {
                toast.error('Error al finalizar la guardia');
            }
        } else if (type === 'revert') {
            try {
                await updateGuardStatus(guardId, GuardStatus.ASSIGNED, targetGuard.covering_teacher_id || undefined, selectedTeacher.id, true);
                toast.info(`Guardia revertida por ${selectedTeacher.name}`);
                await refetch();
            } catch {
                toast.error('Error al revertir el estado de la guardia');
            }
        }
    };

    const handleDelete = async (guardId: string) => {
        try {
            await deleteGuard(guardId);
            await refetch();
            toast.success('Guardia eliminada');
        } catch {
            toast.error('Error al eliminar la guardia');
        }
    };

    const handleOpenCreate = () => {
        setEditingGuard(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (guard: Guard) => {
        setEditingGuard(guard);
        setIsModalOpen(true);
    };

    const handleSubmit = async (formData: any) => {
        if (!currentUser) return;
        try {
            if (editingGuard) {
                await updateGuardDetails(editingGuard.id, formData);
                toast.success('Cambios guardados');
            } else {
                if (Array.isArray(formData)) {
                    for (const item of formData) {
                        await createGuard({
                            ...item,
                            requesting_teacher_id: item.requesting_teacher_id || currentUser.id,
                        });
                    }
                    toast.success(`¡${formData.length} guardias creadas!`, { description: `Nuevas guardias creadas correctamente.` });
                } else {
                    await createGuard({
                        ...formData,
                        requesting_teacher_id: formData.requesting_teacher_id || currentUser.id,
                    });
                    toast.success('¡Guardia creada!', { description: `Nueva guardia para ${formData.date}` });
                }
            }
            await refetch();
            setIsModalOpen(false);
        } catch (err) {
            console.error(err);
            toast.error('Error guardando. Revisa la consola.');
        }
    };

    // ─── RENDER ───────────────────────────────────────────
    return (
        <Layout
            currentUser={currentUser}
            view={view}
            onViewChange={(newView) => {
                // Cerrar el modal si el usuario navega fuera de 'Panel de Guardias'
                if (newView !== 'guards') setIsModalOpen(false);
                if (newView !== 'teachers') setTeacherSearchQuery('');
                setView(newView);
            }}
            onCreateGuard={handleOpenCreate}
            onRefresh={refetch}
        >
            {view === 'guards' && (
                <GuardList
                    guards={allGuards}
                    currentUser={currentUser}
                    loading={loading}
                    onPickup={handlePickup}
                    onRelease={handleRelease}
                    onComplete={handleComplete}
                    onDelete={handleDelete}
                    onEdit={handleOpenEdit}
                    meta={meta}
                    guardGroupSchedules={guardGroupSchedules}
                    assignmentModes={assignmentModes}
                    onChangeAssignmentMode={handleAssignmentModeChange}
                />
            )}
            {view === 'my_schedule' && currentUser && canAccessMySchedule(currentUser) && (
                <MySchedule
                    currentUser={currentUser}
                    meta={meta}
                />
            )}
            {view === 'guard_groups' && (
                <GuardGroups
                    teachers={teachers}
                    meta={meta}
                    guardGroupSchedules={guardGroupSchedules}
                    currentUser={currentUser}
                    onRefetch={refetch}
                    guards={guards}
                />
            )}
            {view === 'dashboard' && canAccessDashboard(currentUser) && (
                <Dashboard guards={guards} teachers={teachers} currentUser={currentUser} guardGroupSchedules={guardGroupSchedules} />
            )}
            {view === 'teachers' && (
                <TeacherDirectory teachers={teachers} guards={guards} meta={meta} currentUser={currentUser} onRefresh={refetch} initialSearchQuery={teacherSearchQuery} />
            )}
            {view === 'free_classrooms' && canAccessFreeClassrooms(currentUser) && (
                <FreeClassrooms meta={meta} currentUser={currentUser} onNavigateToTeacher={(name) => {
                    setTeacherSearchQuery(name);
                    setView('teachers');
                }} />
            )}
            {view === 'floor_plan' && (
                <FloorMap meta={meta} teachers={teachers} />
            )}
            {view === 'calendar' && (
                <SchoolCalendar currentUser={currentUser} />
            )}
            {view === 'libre_disposicion' && (
                <LibreDisposicionPanel currentUser={currentUser} />
            )}
            {view === 'admin' && currentUser && canAccessAdminPanel(currentUser) && (
                <AdminPanel
                    teachers={allTeachers}
                    guards={guards}
                    meta={meta}
                    onRefetch={refetch}
                    guardGroupSchedules={guardGroupSchedules}
                    currentUser={currentUser}
                />
            )}

            {isModalOpen && view === 'guards' && (
                <GuardModal
                    editingGuard={editingGuard}
                    meta={meta}
                    currentUser={currentUser}
                    teachers={teachers}
                    onSubmit={handleSubmit}
                    onClose={() => setIsModalOpen(false)}
                />
            )}

            <AnimatePresence>
                {isTeacherModalOpen && pendingAction && (
                    <TeacherSelectionModal
                        isOpen={isTeacherModalOpen}
                        onClose={() => {
                            setIsTeacherModalOpen(false);
                            setPendingAction(null);
                        }}
                        teachers={teachers}
                        guardGroupTeachers={(() => {
                            const g = allGuards.find(x => x.id === pendingAction.guardId);
                            if (!g) return [];
                            const baseTeachers = getGuardGroupTeachersForGuard(g);
                            return baseTeachers.filter(t => {
                                const isBusy = allGuards.some(ag => 
                                    ag.date === g.date &&
                                    ag.time_slot_id === g.time_slot_id &&
                                    ag.covering_teacher_id === t.id &&
                                    ag.id !== g.id &&
                                    (ag.status === GuardStatus.ASSIGNED || ag.status === GuardStatus.COMPLETED)
                                );
                                return !isBusy;
                            });
                        })()}
                        onSelect={handleTeacherSelected}
                        actionType={pendingAction.type}
                        guard={(() => {
                            const g = allGuards.find(x => x.id === pendingAction.guardId) || null;
                            return g;
                        })()}
                        isTVMode={isPantallaRole(currentUser?.role)}
                        guards={allGuards}
                        assignmentMode={(() => {
                            const g = allGuards.find(x => x.id === pendingAction.guardId);
                            return g?.time_slot_id ? (assignmentModes[g.time_slot_id] || 'recommended') : 'recommended';
                        })()}
                    />
                )}
            </AnimatePresence>
        </Layout>
    );
};

export default App;
