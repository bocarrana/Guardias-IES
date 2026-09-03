import React, { createContext, useContext, useEffect, useState } from 'react';
import { Teacher } from '../types';
import { getCurrentSession, getTeacherByEmail } from '../services/supabaseClient';
import { isAdminRole } from '../utils/roles';

interface AuthContextType {
    session: any;
    currentUser: Teacher | null;
    realUser: Teacher | null;
    authError: string | null;
    loading: boolean;
    canSwitchRole: boolean;
    setAuthError: (err: string | null) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
    loginAsDemoUser: (teacher: Teacher) => void;
    changeDemoRole: (role: string) => void;
    switchRole: (role: string) => void;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    currentUser: null,
    realUser: null,
    authError: null,
    loading: true,
    canSwitchRole: false,
    setAuthError: () => { },
    logout: () => { },
    refreshUser: async () => { },
    loginAsDemoUser: () => { },
    changeDemoRole: () => { },
    switchRole: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<Teacher | null>(null);
    const [realUser, setRealUser] = useState<Teacher | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        setLoading(true);
        try {
            // Comprobar primero si hay una sesión de demostración activa en localStorage
            const savedDemoUser = localStorage.getItem('demo-user');
            if (savedDemoUser) {
                const teacher = JSON.parse(savedDemoUser) as Teacher;
                const savedRole = localStorage.getItem('admin-active-role');
                const effectiveUser = savedRole ? { ...teacher, role: savedRole as any } : teacher;

                setSession({ user: { email: teacher.email } });
                setRealUser(teacher);
                setCurrentUser(effectiveUser);
                setAuthError(null);
                setLoading(false);
                return;
            }

            if (import.meta.env.DEV) {
                let teacher: Teacher | null = {
                    id: 'P001',
                    name: 'Profesor de Pruebas (Mock)',
                    email: 'alplanast@educa.aragon.es',
                    department: 'Informática',
                    guard_group: 'A',
                    avatar_url: undefined,
                    avatar_seed: 'seed',
                    role: 'Admin',
                    user_id: 'mock-user-id',
                    horas_guardia: 1,
                    active: true
                };

                const savedRole = localStorage.getItem('admin-active-role');
                const effectiveUser = savedRole ? { ...teacher, role: savedRole as any } : teacher;

                setSession({ user: { email: 'alplanast@educa.aragon.es' } });
                setRealUser(teacher);
                setCurrentUser(effectiveUser);
                setAuthError(null);
                setLoading(false);
                return;
            }

            const sess = await getCurrentSession();
            console.log('Verificando sesión:', sess?.user?.email);

            if (sess?.user?.email) {
                const email = sess.user.email.toLowerCase();

                // Validar que el profesor existe en la base de datos
                const teacher = await getTeacherByEmail(email);
                console.log('Resultado búsqueda profesor:', teacher ? 'Encontrado' : 'No encontrado');

                if (teacher) {
                    const isRealAdmin = isAdminRole(teacher.role) || teacher.email?.startsWith('guardias@');
                    const savedRole = isRealAdmin ? localStorage.getItem('admin-active-role') : null;
                    const effectiveUser = savedRole ? { ...teacher, role: savedRole as any } : teacher;

                    setSession(sess);
                    setRealUser(teacher);
                    setCurrentUser(effectiveUser);
                    setAuthError(null);
                } else {
                    setSession(null);
                    setRealUser(null);
                    setCurrentUser(null);
                    setAuthError(`Acceso denegado: El email "${email}" no está registrado en la base de datos. Contacte con Jefatura de Estudios.`);

                    const { supabase } = await import('../config/supabase');
                    await supabase.auth.signOut();
                }
            } else {
                setSession(null);
                setRealUser(null);
                setCurrentUser(null);
            }
        } catch (err) {
            console.error('Error en checkAuth:', err);
            setSession(null);
            setRealUser(null);
            setCurrentUser(null);
        } finally {
            setLoading(false);
        }
    };

    const loginAsDemoUser = (teacher: Teacher) => {
        setSession({ user: { email: teacher.email } });
        setRealUser(teacher);
        setCurrentUser(teacher);
        setAuthError(null);
        localStorage.setItem('demo-user', JSON.stringify(teacher));
    };

    const switchRole = (newRole: string) => {
        if (!currentUser) return;
        localStorage.setItem('admin-active-role', newRole);
        setCurrentUser(prev => prev ? { ...prev, role: newRole as any } : null);
    };

    const changeDemoRole = (role: string) => {
        switchRole(role);
    };

    const logout = async () => {
        localStorage.removeItem('demo-user');
        localStorage.removeItem('admin-active-role');
        try {
            const { supabase } = await import('../config/supabase');
            await supabase.auth.signOut();
        } catch (e) {
            console.error('Error al cerrar sesión:', e);
        }
        setSession(null);
        setRealUser(null);
        setCurrentUser(null);
    };

    const canSwitchRole = Boolean(
        isAdminRole(realUser?.role) ||
        realUser?.email?.startsWith('guardias@') ||
        realUser?.email === 'usuariodemo@educa.aragon.es' ||
        Boolean(localStorage.getItem('demo-user'))
    );

    return (
        <AuthContext.Provider
            value={{
                session,
                currentUser,
                realUser,
                authError,
                loading,
                canSwitchRole,
                setAuthError,
                logout,
                refreshUser: checkAuth,
                loginAsDemoUser,
                changeDemoRole,
                switchRole,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
