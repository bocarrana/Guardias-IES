import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, ListTodo, Users, Plus, LogOut, Database, Clock, Info, Menu, CalendarRange, MapPin, Map, CalendarDays, Bookmark, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Teacher, ViewType } from '../types';
import { useAuth } from '../context/AuthContext';
import { LOGO_DARK_URL, LOGO_LIGHT_URL } from '../config/supabase';
import { getStorageUrl } from '../services/supabaseClient';
import TeacherAvatar from './TeacherAvatar';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';
import AboutInfo from './AboutInfo';
import PrivacyModal from './PrivacyModal';
import { canAccessAdminPanel, canAccessMySchedule, canAccessDashboard, canAccessFreeClassrooms, isAdministracionRole, isPantallaRole, getRoleDisplayName } from '../utils/roles';



interface LayoutProps {
    currentUser: Teacher | null;
    view: ViewType;
    onViewChange: (view: ViewType) => void;
    onCreateGuard: () => void;
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
}

const navItems = [
    { id: 'guards' as ViewType, label: 'Panel de Guardias', icon: ListTodo },
    { id: 'guard_groups' as ViewType, label: 'Grupos Guardias', icon: Clock },
    { id: 'teachers' as ViewType, label: 'Profesorado', icon: Users },
    { id: 'my_schedule' as ViewType, label: 'Mi Horario', icon: CalendarRange, hideForAdministracion: true },
    { id: 'dashboard' as ViewType, label: 'Estadísticas', icon: LayoutDashboard, hideForAdministracion: true },
    { id: 'calendar' as ViewType, label: 'Calendario', icon: CalendarDays },
    { id: 'free_classrooms' as ViewType, label: 'Aulas Libres', icon: MapPin, hideForAdministracion: true },
    { id: 'floor_plan' as ViewType, label: 'Plano', icon: Map },
    { id: 'libre_disposicion' as ViewType, label: 'Libre Disposición', icon: Bookmark },
    { id: 'admin' as ViewType, label: 'Administrador', icon: Database, adminOnly: true },
];

const viewTitles: Record<ViewType, string> = {
    guards: 'Gestión de Guardias',
    guard_groups: 'Grupos por Franjas',
    teachers: 'Directorio de Personal',
    dashboard: 'Estadísticas',
    calendar: 'Calendario Escolar',
    my_schedule: 'Mi Horario Personal',
    admin: 'Panel de Administrador',
    free_classrooms: 'Disponibilidad de Aulas',
    floor_plan: 'Mapa Interactivo',
    libre_disposicion: 'Libre Disposición',
};

const SIDEBAR_EXPANDED = 260;
const SIDEBAR_COLLAPSED = 68;

const Layout: React.FC<LayoutProps> = ({ currentUser, view, onViewChange, onCreateGuard, onRefresh, children }) => {
    const { logout, refreshUser, canSwitchRole, switchRole } = useAuth();
    const { theme } = useTheme();
    const [isAboutOpen, setIsAboutOpen] = React.useState(false);
    const [isPrivacyOpen, setIsPrivacyOpen] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
        try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
    });

    const toggleSidebar = () => {
        setSidebarCollapsed(prev => {
            const next = !prev;
            try { localStorage.setItem('sidebar-collapsed', String(next)); } catch {}
            return next;
        });
    };

    const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const avatarUrl = currentUser?.avatar_url
        ? getStorageUrl(currentUser.avatar_url, 'Fotos')
        : `https://ui-avatars.com/api/?name=${currentUser?.name || 'U'}&background=0f172a&color=22d3ee`;

    const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
        <>
            {/* Logo Header */}
            <div
                style={{
                    padding: collapsed ? '24px 0' : '24px 20px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: collapsed ? 0 : 12,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                }}
            >
                <div style={{
                    width: 40,
                    height: 40,
                    minWidth: 40,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--brand-500)',
                    boxShadow: '0 0 12px rgba(6, 182, 212, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                }}>
                    <img src={theme === 'dark' ? LOGO_DARK_URL : LOGO_LIGHT_URL} alt="Logo" style={{
                        width: '100%', height: '100%', objectFit: 'contain', padding: 4,
                    }} onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
                </div>
                {!collapsed && (
                    <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--heading-color)', letterSpacing: '0.01em', margin: 0 }}>
                        Guardias IES
                    </h1>
                )}
                {/* Info */}
                {!collapsed && !isPantallaRole(currentUser?.role) && (
                    <div
                        style={{ marginLeft: 'auto', color: 'var(--text-muted)', opacity: 0.6, cursor: 'help', padding: 4, borderRadius: 6, transition: 'opacity 0.2s' }}
                        onMouseEnter={() => !isMobile && setIsAboutOpen(true)}
                        onMouseLeave={() => !isMobile && setIsAboutOpen(false)}
                        onClick={() => setIsAboutOpen(!isAboutOpen)}
                        onMouseOver={e => e.currentTarget.style.opacity = '1'}
                        onMouseOut={e => e.currentTarget.style.opacity = '0.6'}
                    >
                        <Info size={14} />
                    </div>
                )}
            </div>

            {/* Navigation */}
            {!isPantallaRole(currentUser?.role) && (
                <nav style={{ padding: collapsed ? '16px 8px' : '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {navItems
                    .filter(item => {
                        if (isPantallaRole(currentUser?.role)) {
                            return item.id === 'guards';
                        }
                        if (item.adminOnly && !canAccessAdminPanel(currentUser)) return false;
                        if ((item as any).hideForAdministracion && !canAccessMySchedule(currentUser) && item.id === 'my_schedule') return false;
                        if ((item as any).hideForAdministracion && !canAccessDashboard(currentUser) && item.id === 'dashboard') return false;
                        if ((item as any).hideForAdministracion && !canAccessFreeClassrooms(currentUser) && item.id === 'free_classrooms') return false;
                        return true;
                    })
                    .map((item) => {
                        const isActive = view === item.id;
                        return (
                            <motion.button
                                key={item.id}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => {
                                    onViewChange(item.id);
                                    setIsMobileMenuOpen(false);
                                }}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: collapsed ? 'center' : 'flex-start',
                                    gap: collapsed ? 0 : 12,
                                    padding: collapsed ? '12px 0' : '12px 16px',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.25s',
                                    border: isActive ? '1px solid rgba(6, 182, 212, 0.2)' : '1px solid transparent',
                                    background: isActive ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                                    color: isActive ? 'var(--brand-500)' : 'var(--text-secondary)',
                                    position: 'relative',
                                    fontFamily: 'var(--font-sans)',
                                    overflow: 'visible',
                                    whiteSpace: 'nowrap',
                                }}
                                className="nav-item-btn"
                            >
                                <item.icon style={{
                                    width: 20,
                                    height: 20,
                                    minWidth: 20,
                                    filter: isActive ? 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.6))' : 'none',
                                }} />
                                {!collapsed && <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>}
                                {collapsed && <span className="premium-tooltip">{item.label}</span>}

                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        style={{
                                            position: 'absolute',
                                            right: 0,
                                            top: '20%',
                                            height: '60%',
                                            width: 3,
                                            borderRadius: 2,
                                            background: 'var(--brand-500)',
                                            boxShadow: '0 0 12px var(--brand-500)',
                                        }}
                                    />
                                )}
                            </motion.button>
                        );
                    })}
                </nav>
            )}
            {isPantallaRole(currentUser?.role) && <div style={{ flex: 1 }} />}
            {/* User Footer */}
            <div style={{
                padding: collapsed ? '10px 8px 8px' : '10px 12px 8px',
                borderTop: isPantallaRole(currentUser?.role) ? 'none' : '1px solid var(--border-subtle)',
                background: isPantallaRole(currentUser?.role) ? 'transparent' : 'var(--bg-sidebar)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, marginBottom: 8, justifyContent: collapsed ? 'center' : 'flex-start' }}>
                    <div style={{ position: 'relative' }}>
                        <TeacherAvatar
                            teacher={currentUser as Teacher}
                            size={collapsed ? 32 : 36}
                            editable={!collapsed && !isPantallaRole(currentUser?.role)}
                            editMode="avatar"
                            forceAvatarViewer={true}
                            showViewer={!isPantallaRole(currentUser?.role)}
                            onUpdate={async () => {
                                await refreshUser();
                                await onRefresh();
                            }}
                        />
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: 'var(--success)',
                            border: '2px solid var(--bg-card)',
                            boxShadow: '0 0 8px rgba(74, 222, 128, 0.4)',
                            zIndex: 1,
                            pointerEvents: 'none'
                        }} />
                    </div>
                    {!collapsed && (
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--heading-color)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                                {currentUser?.name || 'Usuario'}
                            </p>
                            {canSwitchRole ? (
                                <div style={{ marginTop: 2 }}>
                                    <select
                                        value={currentUser?.role || 'Admin'}
                                        onChange={(e) => switchRole(e.target.value)}
                                        style={{
                                            fontSize: '0.68rem',
                                            fontWeight: 600,
                                            background: 'var(--bg-main)',
                                            color: 'var(--brand-400)',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: 'var(--radius-sm)',
                                            padding: '2px 4px',
                                            width: '100%',
                                            cursor: 'pointer',
                                            outline: 'none'
                                        }}
                                        title="Cambiar vista de rol (Simulación Admin)"
                                    >
                                        <option value="Admin">👑 Admin</option>
                                        <option value="Jefatura">🛡️ Jefatura</option>
                                        <option value="Administración">📋 Administración</option>
                                        <option value="Docente">👨‍🏫 Docente</option>
                                        <option value="Pantalla">📺 Pantalla TV</option>
                                    </select>
                                </div>
                            ) : (
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                                    {getRoleDisplayName(currentUser?.role)}
                                </p>
                            )}
                        </div>
                    )}
                </div>
                <button
                    onClick={logout}
                    className="btn btn-danger-subtle nav-item-btn"
                    style={{
                        width: '100%',
                        fontSize: '0.65rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '6px 10px',
                        justifyContent: collapsed ? 'center' : undefined,
                        position: 'relative',
                    }}
                >
                    <LogOut style={{ width: 13, height: 13 }} />
                    {!collapsed && 'Cerrar Sesión'}
                    {collapsed && <span className="premium-tooltip">Cerrar Sesión</span>}
                </button>

                {!collapsed && !isPantallaRole(currentUser?.role) && (
                    <div style={{ marginTop: 6, textAlign: 'center', paddingBottom: 2 }}>
                        <button
                            onClick={() => setIsPrivacyOpen(true)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.65rem', textDecoration: 'underline', cursor: 'pointer', opacity: 0.6, fontWeight: 500 }}
                        >
                            Política de Privacidad (RGPD)
                        </button>
                    </div>
                )}
            </div>
        </>
    );

    return (
        <div style={{
            height: '100vh',
            maxHeight: '100vh',
            display: 'flex',
            flexDirection: 'row',
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--bg-main)',
        }}>
            {/* Background Orbs */}
            <div className="bg-orb" style={{
                top: '-10%', right: '-5%', width: 500, height: 500,
                background: 'rgba(6, 182, 212, 0.05)',
            }} />
            <div className="bg-orb" style={{
                bottom: '-10%', left: '-10%', width: 600, height: 600,
                background: 'rgba(168, 85, 247, 0.05)',
            }} />

            {/* ─── DESKTOP SIDEBAR ──────────────────────────── */}
            {!isPantallaRole(currentUser?.role) && (
                <aside style={{
                    width: sidebarWidth,
                    position: 'fixed',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 30,
                    borderRight: 'none',
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflow: sidebarCollapsed ? 'visible' : 'hidden',
                    background: 'transparent',
                }} className="hide-mobile">
                    <SidebarContent collapsed={sidebarCollapsed} />
                </aside>
            )}

            {/* Sidebar Toggle Button - outside aside to avoid overflow:hidden clipping */}
            {!isMobile && !isPantallaRole(currentUser?.role) && (
                <button
                    onClick={toggleSidebar}
                    title={sidebarCollapsed ? 'Expandir menú' : 'Recoger menú'}
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: sidebarWidth - 14,
                        transform: 'translateY(-50%)',
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 25,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        padding: 0,
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'var(--brand-500)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--brand-500)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                >
                    {sidebarCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
                </button>
            )}

            {/* ─── MOBILE DRAWER SIDEBAR ────────────────────── */}
            <AnimatePresence>
                {isMobileMenuOpen && isMobile && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0,0,0,0.6)',
                                zIndex: 40,
                                backdropFilter: 'blur(4px)',
                            }}
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                bottom: 0,
                                width: '85%',
                                maxWidth: 320,
                                backgroundColor: 'var(--bg-card)',
                                zIndex: 50,
                                display: 'flex',
                                flexDirection: 'column',
                                borderRight: '1px solid var(--border-subtle)',
                                overflowY: 'auto',
                            }}
                            className="glass"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* ─── MAIN CONTENT ────────────────────── */}
            <main 
                className={isPantallaRole(currentUser?.role) ? "kiosk-mode" : ""}
                style={{
                flex: 1,
                marginLeft: isMobile || isPantallaRole(currentUser?.role) ? 0 : sidebarWidth,
                padding: isMobile ? '16px 16px 0' : (isPantallaRole(currentUser?.role) ? 0 : '24px 40px 0'),
                transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden',
                position: 'relative',
                zIndex: 10,
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
            }}>
                {/* Mobile Header */}
                {isMobile && !isPantallaRole(currentUser?.role) && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 20px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: 16,
                        flexShrink: 0,
                    }}>
                        <div
                            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                            onClick={() => setIsAboutOpen(true)}
                        >
                            <div style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--brand-500)', overflow: 'hidden', background: 'var(--bg-main)' }}>
                                <img src={theme === 'dark' ? LOGO_DARK_URL : LOGO_LIGHT_URL} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }} />
                            </div>
                            <span style={{ fontWeight: 800, color: 'var(--heading-color)', fontSize: '1rem' }}>Guardias IES</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <ThemeToggle compact />
                            <button onClick={() => setIsMobileMenuOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}>
                                <Menu size={24} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Page Header */}
                {!isPantallaRole(currentUser?.role) && (
                    <header style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 28,
                    flexShrink: 0,
                    flexWrap: 'wrap',
                    gap: 16,
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.01em', margin: 0 }}>
                            <span className="text-gradient">{viewTitles[view]}</span>
                        </h2>
                        <p style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.75rem',
                            marginTop: 4,
                            marginBottom: 0,
                            fontFamily: 'var(--font-mono)',
                        }}>
                            :: IES SYSTEM V2.0 ::
                        </p>
                    </div>

                    {/* Portal target for view-specific controls */}
                    <div id="header-portal-root" className="hide-mobile" style={{
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}></div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-full, 999px)',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-sidebar)',
                            display: 'flex',
                            alignItems: 'center',
                        }} className="hide-mobile">
                            <ThemeToggle compact />
                        </div>

                        {view === 'guards' && !isAdministracionRole(currentUser?.role) && (
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={onCreateGuard}
                                className="btn btn-primary"
                                style={{ fontWeight: 800, letterSpacing: '0.04em' }}
                            >
                                <Plus style={{ width: 18, height: 18 }} />
                                <span className="hide-mobile">NUEVA GUARDIA</span>
                            </motion.button>
                        )}
                    </div>
                </header>
                )}

                {/* Page Content - scrollable container */}
                <div className={isPantallaRole(currentUser?.role) ? "" : "container-wide"} style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: isPantallaRole(currentUser?.role) ? 'hidden' : 'auto',
                    paddingTop: isPantallaRole(currentUser?.role) ? 0 : 8,
                    paddingBottom: isPantallaRole(currentUser?.role) ? 0 : 24,
                    display: isPantallaRole(currentUser?.role) ? 'flex' : 'block',
                    flexDirection: 'column',
                }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={view}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.25 }}
                            style={isPantallaRole(currentUser?.role) ? { height: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } : undefined}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {isPantallaRole(currentUser?.role) && (
                <div
                    onClick={logout}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') logout(); }}
                    style={{
                        position: 'fixed',
                        bottom: 20,
                        right: 20,
                        zIndex: 9999,
                        background: 'rgba(30, 41, 59, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--text-secondary)',
                        borderRadius: '50%',
                        width: 44,
                        height: 44,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px)',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                        e.currentTarget.style.color = '#ff4a4a';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="Cerrar Sesión"
                >
                    <LogOut size={20} />
                </div>
            )}

            {/* Consolidado: Una única instancia para Desktop y Móvil */}
            <AboutInfo isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} isMobile={isMobile} />
            <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
        </div>
    );
};

export default Layout;
