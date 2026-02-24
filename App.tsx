
import React, { useEffect, useState, useRef } from 'react';
import { 
  getGuards, 
  getTeachers, 
  updateGuardStatus, 
  createGuard, 
  getMetaOptions,
  signInWithGoogle,
  signOut,
  getCurrentSession,
  getStorageUrl,
  getTeacherByEmail,
  deleteGuard,
  updateGuardDetails
} from './services/supabaseClient';
import { Guard, Teacher, GuardStatus, GuardType, TimeSlot, Classroom, Group, Subject, TaskStatus } from './types';
import GuardList from './components/GuardList';
import Dashboard from './components/Dashboard';
import TeacherDirectory from './components/TeacherDirectory';
import CustomDatePicker from './components/CustomDatePicker';
import { LayoutDashboard, ListTodo, Users, Plus, Loader2, Zap, LogOut, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  // --- STATE ---
  const [session, setSession] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [view, setView] = useState<'guards' | 'dashboard' | 'teachers'>('guards');
  const [currentUser, setCurrentUser] = useState<Teacher | null>(null);
  
  const [guards, setGuards] = useState<Guard[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  
  // Meta Options
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuardId, setEditingGuardId] = useState<string | null>(null);

  // Logo URL (using new Logo bucket if needed, but keeping this direct link or public URL)
  // Assuming 'Logos' bucket contains 'logo_reyes_catolicos_negativo (1).png'
  const logoUrl = 'https://ipijmhqafrwobvnmmzgy.supabase.co/storage/v1/object/public/Logos/logo_reyes_catolicos_negativo%20(1).png';

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time_slot_id: '',
    classroom_id: '',
    group_id: '',
    subject_id: '',
    type: GuardType.ORDINARY,
    has_task: 'No', // Nuevo campo: "Tarea dejada"
    observations: ''
  });

  // --- EFFECTS ---
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
      setLoading(true);
      const sess = await getCurrentSession();
      
      if (sess && sess.user && sess.user.email) {
          // STRICT AUTH CHECK: Check if email exists in 'Profesores' table
          const teacher = await getTeacherByEmail(sess.user.email);
          
          if (teacher) {
              setSession(sess);
              setCurrentUser(teacher);
              setAuthError(null);
              await fetchData();
          } else {
              // Unauthorized email
              await signOut(); 
              setSession(null);
              setCurrentUser(null);
              setAuthError("Acceso denegado: Tu email no está registrado en el sistema del centro.");
              setLoading(false);
          }
      } else {
          setSession(null);
          setLoading(false);
      }
  };

  const fetchData = async () => {
    try {
      const [gData, tData, meta] = await Promise.all([
        getGuards(),
        getTeachers(),
        getMetaOptions()
      ]);
      setGuards(gData);
      setTeachers(tData);
      
      setSlots(meta.slots);
      setClassrooms(meta.classrooms);
      setGroups(meta.groups);
      setSubjects(meta.subjects);
      
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---
  const handlePickupGuard = async (guardId: string) => {
    if (!currentUser) return;
    const oldGuards = [...guards];
    setGuards(guards.map(g => g.id === guardId ? { ...g, status: GuardStatus.ASSIGNED, covering_teacher_id: currentUser.id, covering_teacher: currentUser } : g));
    
    try {
      await updateGuardStatus(guardId, GuardStatus.ASSIGNED, currentUser.id);
    } catch (e) {
      setGuards(oldGuards); 
      alert('Error al recoger la guardia');
    }
  };

  const handleCompleteGuard = async (guardId: string) => {
    const oldGuards = [...guards];
    setGuards(guards.map(g => g.id === guardId ? { ...g, status: GuardStatus.COMPLETED } : g));
    
    try {
      await updateGuardStatus(guardId, GuardStatus.COMPLETED);
    } catch (e) {
      setGuards(oldGuards);
      alert('Error al finalizar la guardia');
    }
  };

  const handleDeleteGuard = async (guardId: string) => {
    if(!window.confirm("¿Seguro que quieres eliminar esta guardia?")) return;

    setLoading(true);
    try {
        await deleteGuard(guardId);
        setGuards(guards.filter(g => g.id !== guardId));
    } catch (error) {
        alert("Error al eliminar la guardia");
    } finally {
        setLoading(false);
    }
  };

  const handleOpenEditModal = (guard: Guard) => {
    setEditingGuardId(guard.id);
    setFormData({
        date: guard.date,
        time_slot_id: guard.time_slot_id || '',
        classroom_id: guard.classroom_id || '',
        group_id: guard.group_id || '',
        subject_id: guard.subject_id || '',
        type: guard.type || GuardType.ORDINARY,
        has_task: guard.has_task || 'No',
        observations: guard.observations || ''
    });
    setIsModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingGuardId(null);
    setFormData({
        date: new Date().toISOString().split('T')[0],
        time_slot_id: slots[0]?.id || '',
        classroom_id: '',
        group_id: '',
        subject_id: '',
        type: GuardType.ORDINARY,
        has_task: 'No',
        observations: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setLoading(true);
    try {
        if (editingGuardId) {
            // EDIT MODE
            await updateGuardDetails(editingGuardId, formData);
        } else {
            // CREATE MODE
            const newGuardPart = {
                ...formData,
                requesting_teacher_id: currentUser.id,
            };
            await createGuard(newGuardPart);
        }
        
        await fetchData(); 
        setIsModalOpen(false);
    } catch (error) {
        console.error(error);
        alert('Error guardando. Revisa la consola.');
    } finally {
        setLoading(false);
    }
  };

  // --- RENDER LOGIN IF NO SESSION ---
  if (!session && process.env.REACT_APP_SUPABASE_URL) {
      return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-sans">
              <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-brand-600/10 rounded-full blur-[120px]"></div>
              <div className="absolute bottom-[-20%] right-[-20%] w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px]"></div>
              
              <div className="z-10 bg-slate-900/50 backdrop-blur-xl border border-slate-700 p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-md w-full text-center group">
                 <div className="mb-6 flex justify-center">
                    <div className="w-24 h-24 rounded-xl bg-slate-800 border-2 border-brand-400 shadow-[0_0_20px_rgba(34,211,238,0.4)] flex items-center justify-center overflow-hidden relative">
                         <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" onError={(e) => { e.currentTarget.style.display='none'; }} />
                    </div>
                 </div>
                 
                 <h1 className="text-3xl font-bold text-white mb-2">Guardias <span className="text-brand-400">IES</span></h1>
                 <p className="text-slate-400 mb-8">Sistema de Gestión de Sustituciones</p>
                 
                 {authError && (
                     <div className="mb-6 bg-red-900/30 border border-red-500/50 rounded-lg p-3 flex items-start gap-3 text-left animate-fade-in">
                         <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                         <p className="text-sm text-red-200">{authError}</p>
                     </div>
                 )}
                 
                 <button 
                    onClick={() => { setAuthError(null); signInWithGoogle(); }}
                    className="w-full bg-white text-slate-900 hover:bg-gray-100 font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-lg"
                 >
                     <Zap className="w-5 h-5 fill-slate-900" />
                     Entrar con Google Workspace
                 </button>
              </div>
          </div>
      )
  }

  // --- RENDER MAIN APP ---
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 flex flex-col md:flex-row overflow-hidden relative">
      
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]"></div>
      </div>

      {/* SIDEBAR */}
      <aside className="bg-slate-900/50 backdrop-blur-md border-r border-slate-800 w-full md:w-64 md:fixed md:h-screen z-20 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="relative w-10 h-10 bg-slate-900 border border-brand-400 rounded-lg flex items-center justify-center overflow-hidden shadow-[0_0_10px_rgba(34,211,238,0.3)]">
             <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" onError={(e) => {e.currentTarget.style.opacity='0'}} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">
            Guardias <span className="text-brand-400">IES</span>
          </h1>
        </div>
        
        <nav className="p-4 space-y-2 flex-1">
          {[
              { id: 'guards', label: 'Panel de Guardias', icon: ListTodo },
              { id: 'dashboard', label: 'Estadísticas', icon: LayoutDashboard },
              { id: 'teachers', label: 'Profesorado', icon: Users }
          ].map((item) => (
             <button 
                key={item.id}
                onClick={() => setView(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-300 relative overflow-hidden group 
                ${view === item.id 
                    ? 'text-brand-400 bg-brand-900/20 border border-brand-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
             >
                <item.icon className={`w-5 h-5 ${view === item.id ? 'text-brand-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' : ''}`} />
                {item.label}
                {view === item.id && <div className="absolute right-0 top-0 h-full w-1 bg-brand-400 shadow-[0_0_10px_#22d3ee]"></div>}
             </button>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3 mb-3">
             <div className="relative">
                <img 
                    src={currentUser?.avatar_url ? getStorageUrl(currentUser.avatar_url, 'Fotos') : `https://ui-avatars.com/api/?name=${currentUser?.name || 'U'}`} 
                    className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700" 
                    alt="Avatar"
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-slate-900 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
             </div>
             <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{currentUser?.name || 'Usuario'}</p>
                <p className="text-xs text-slate-500 truncate">{currentUser?.department || 'Docente'}</p>
             </div>
          </div>
          <button 
                onClick={signOut}
                className="w-full p-2 bg-slate-800 border border-slate-700 text-red-400 rounded hover:bg-slate-700 hover:text-red-300 transition-colors flex items-center justify-center gap-2 text-xs font-bold uppercase"
            >
                <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto relative z-10">
        
        <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                    {view === 'guards' && <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400">Gestión de Guardias</span>}
                    {view === 'dashboard' && <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400">Centro de Mando</span>}
                    {view === 'teachers' && <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400">Directorio de Personal</span>}
                </h2>
                <p className="text-slate-400 text-sm mt-1 font-mono">:: IES SYSTEM V2.0 ::</p>
            </div>
            
            {view === 'guards' && (
                <button 
                    onClick={handleOpenCreateModal}
                    className="bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/50 px-5 py-3 rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.15)] font-medium flex items-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] active:scale-95"
                >
                    <Plus className="w-5 h-5 text-brand-400" />
                    <span className="hidden sm:inline font-bold tracking-wide">NUEVA GUARDIA</span>
                </button>
            )}
        </header>

        {loading ? (
            <div className="h-96 flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="w-12 h-12 animate-spin mb-4 text-brand-500" />
                <p className="font-mono text-sm tracking-widest animate-pulse">CARGANDO DATOS...</p>
            </div>
        ) : (
            <div className="animate-fade-in">
                {view === 'guards' && (
                    <GuardList 
                        guards={guards} 
                        currentUser={currentUser}
                        onPickup={handlePickupGuard}
                        onComplete={handleCompleteGuard}
                        onDelete={handleDeleteGuard}
                        onEdit={handleOpenEditModal}
                    />
                )}
                {view === 'dashboard' && <Dashboard guards={guards} teachers={teachers} />}
                {view === 'teachers' && <TeacherDirectory teachers={teachers} guards={guards} />}
            </div>
        )}
      </main>

      {/* CREATE/EDIT GUARD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-lg w-full overflow-hidden animate-fade-in-up relative" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/20 blur-[50px] rounded-full pointer-events-none"></div>

                <div className="bg-slate-800/50 px-6 py-5 flex justify-between items-center border-b border-slate-700 sticky top-0 backdrop-blur-md z-20">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <span className="w-2 h-6 bg-brand-500 rounded-full shadow-[0_0_10px_#06b6d4]"></span>
                        {editingGuardId ? 'Editar Guardia' : 'Solicitar Guardia'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">✕</button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-5 relative z-10">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-mono text-brand-400 uppercase tracking-wider">Fecha</label>
                            {/* CUSTOM DATE PICKER */}
                            <CustomDatePicker 
                                value={formData.date}
                                onChange={(date) => setFormData({...formData, date})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-mono text-brand-400 uppercase tracking-wider">Franja</label>
                            <select 
                                required
                                value={formData.time_slot_id}
                                onChange={e => setFormData({...formData, time_slot_id: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-brand-500 outline-none"
                            >
                                <option value="">Seleccionar</option>
                                {slots.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                             <label className="text-xs font-mono text-brand-400 uppercase tracking-wider">Aula</label>
                             <select 
                                required
                                value={formData.classroom_id}
                                onChange={e => setFormData({...formData, classroom_id: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-brand-500 outline-none"
                            >
                                <option value="">Seleccionar</option>
                                {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-mono text-brand-400 uppercase tracking-wider">Grupo</label>
                            <select 
                                required
                                value={formData.group_id}
                                onChange={e => setFormData({...formData, group_id: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-brand-500 outline-none"
                            >
                                <option value="">Seleccionar</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-mono text-brand-400 uppercase tracking-wider">Materia</label>
                        <select 
                            required
                            value={formData.subject_id}
                            onChange={e => setFormData({...formData, subject_id: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-brand-500 outline-none"
                        >
                            <option value="">Seleccionar</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-mono text-brand-400 uppercase tracking-wider">Tipo</label>
                            <select 
                                value={formData.type}
                                onChange={e => setFormData({...formData, type: e.target.value as GuardType})}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-brand-500 outline-none"
                            >
                                <option value={GuardType.ORDINARY}>Ordinaria</option>
                                <option value={GuardType.COEXISTENCE}>Convivencia</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                             <label className="text-xs font-mono text-brand-400 uppercase tracking-wider">¿Tarea Dejada?</label>
                             <div className="flex gap-4 pt-2">
                                <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-300 hover:text-white">
                                    <input 
                                        type="radio" 
                                        name="has_task" 
                                        value="Sí"
                                        checked={formData.has_task === 'Sí'}
                                        onChange={() => setFormData({...formData, has_task: 'Sí'})}
                                        className="accent-brand-500 w-4 h-4"
                                    />
                                    Sí
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-300 hover:text-white">
                                    <input 
                                        type="radio" 
                                        name="has_task" 
                                        value="No"
                                        checked={formData.has_task === 'No'}
                                        onChange={() => setFormData({...formData, has_task: 'No'})}
                                        className="accent-slate-500 w-4 h-4"
                                    />
                                    No
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-mono text-brand-400 uppercase tracking-wider">Observaciones</label>
                        <textarea 
                            rows={3}
                            value={formData.observations}
                            onChange={e => setFormData({...formData, observations: e.target.value})}
                            placeholder="Instrucciones para la guardia..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-brand-500 outline-none resize-none"
                        ></textarea>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all"
                        >
                            {editingGuardId ? 'GUARDAR CAMBIOS' : 'CREAR GUARDIA'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;