import { useState, useEffect, useCallback } from 'react';
import { Guard, GuardGroupSchedule, MetaOptions, Teacher } from '../types';
// Updated to use Horario_Personal as single source of truth for Guard Groups
import { getGuards, getMetaOptions, getTeachers, getAutoGuardGroups, subscribeToGuards, supabase } from '../services/supabaseClient';

import { isAdministracionRole } from '../utils/roles';

export const useGuards = (isAuthenticated: boolean) => {
    const [guards, setGuards] = useState<Guard[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [guardGroupSchedules, setGuardGroupSchedules] = useState<GuardGroupSchedule[]>([]);
    const [meta, setMeta] = useState<MetaOptions>({
        slots: [],
        classrooms: [],
        groups: [],
        subjects: [],
    });
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const [guardsData, teachersData, metaData, schedulesData] = await Promise.all([
                getGuards(),
                getTeachers(true),
                getMetaOptions(),
                getAutoGuardGroups()
            ]);
            setGuards(guardsData);
            setTeachers(teachersData);
            setMeta(metaData);
            setGuardGroupSchedules(schedulesData);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    // Initial fetch
    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated, fetchData]);

    // Realtime subscription
    useEffect(() => {
        if (!isAuthenticated) return;

        const unsubscribeGuards = subscribeToGuards(() => {
            getGuards().then(setGuards).catch(console.error);
        });

        // Suscripción a cambios en Horario_Personal (para los grupos auto-generados)
        const hpChannel = supabase
            .channel('useguards_horario_realtime')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'Horario_Personal' 
            }, () => {
                getAutoGuardGroups().then(setGuardGroupSchedules).catch(console.error);
            })
            .subscribe();

        // Suscripción a cambios en la tabla Grupos (para detectar nuevos grupos mixtos creados por usuarios)
        const groupsChannel = supabase
            .channel('useguards_groups_realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'Grupos'
            }, () => {
                getMetaOptions().then(setMeta).catch(console.error);
            })
            .subscribe();

        return () => {
            unsubscribeGuards();
            supabase.removeChannel(hpChannel);
            supabase.removeChannel(groupsChannel);
        };
    }, [isAuthenticated]);

    return {
        guards,
        setGuards,
        teachers: teachers.filter(t => t.active !== false && !isAdministracionRole(t.role)),
        allTeachers: teachers,
        meta,
        guardGroupSchedules,
        loading,
        refetch: fetchData,
    };
};
