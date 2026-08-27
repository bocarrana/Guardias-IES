import React, { createContext, useContext, useEffect, useState } from 'react';
import { Teacher } from '../types';
import { getCurrentSession, getTeacherByEmail } from '../services/supabaseClient';

interface AuthContextType {
    session: any;
    currentUser: Teacher | null;
    authError: string | null;
    loading: boolean;
    setAuthError: (err: string | null) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
    loginAsDemoUser: (teacher: Teacher) => void;
    changeDemoRole: (role: string) => void;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    currentUser: null,
    authError: null,
    loading: true,
    setAuthError: () => { },
    logout: () => { },
    refreshUser: async () => { },
    loginAsDemoUser: () => { },
    changeDemoRole: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<Teacher | null>(null);
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
                setSession({ user: { email: teacher.email } });
                setCurrentUser(teacher);
                setAuthError(null);
                setLoading(false);
                return;
            }

            if (import.meta.env.DEV) {
                // === PREVISUALIZACIÓN LOCAL ESTÁTICA ===
                // Para probar con base de datos real: descomenta la línea de abajo y comenta el bloque "Mock" estático.
                // let teacher = await getTeacherByEmail('alplanast@educa.aragon.es');
                
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

                setSession({ user: { email: 'alplanast@educa.aragon.es' } });
                setCurrentUser(teacher);
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
                    setSession(sess);
                    setCurrentUser(teacher);
                    setAuthError(null);
                } else {
                    setSession(null);
                    setCurrentUser(null);
                    setAuthError(`Acceso denegado: El email "${email}" no está registrado en la base de datos. Contacte con Jefatura de Estudios.`);

                    const { supabase } = await import('../config/supabase');
                    await supabase.auth.signOut();
                }
            } else {
                setSession(null);
                setCurrentUser(null);
            }
        } catch (err) {
            console.error('Error en checkAuth:', err);
            setSession(null);
            setCurrentUser(null);
        } finally {
            setLoading(false);
        }
    };

    const loginAsDemoUser = (teacher: Teacher) => {
        setSession({ user: { email: teacher.email } });
        setCurrentUser(teacher);
        setAuthError(null);
        localStorage.setItem('demo-user', JSON.stringify(teacher));
    };

    const changeDemoRole = (role: any) => {
        setCurrentUser(prev => prev ? { ...prev, role } : null);
    };

    const logout = async () => {
        localStorage.removeItem('demo-user');
        try {
            const { supabase } = await import('../config/supabase');
            await supabase.auth.signOut();
        } catch (e) {
            console.error('Error al cerrar sesión:', e);
        }
        setSession(null);
        setCurrentUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                session,
                currentUser,
                authError,
                loading,
                setAuthError,
                logout,
                refreshUser: checkAuth,
                loginAsDemoUser,
                changeDemoRole,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
