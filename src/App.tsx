import React, { useEffect, useState } from 'react';
import { getGuards, getTeachers, updateGuardStatus, createGuard, getMetaOptions, signInWithGoogle, signOut, getCurrentSession, getStorageUrl, getTeacherByEmail, deleteGuard, updateGuardDetails } from './services/supabaseClient';
import { Guard, Teacher, GuardStatus, GuardType, TimeSlot, Classroom, Group, Subject } from './types';
import GuardList from './components/GuardList';
import Dashboard from './components/Dashboard';
import TeacherDirectory from './components/TeacherDirectory';
import CustomDatePicker from './components/CustomDatePicker';
import { LayoutDashboard, ListTodo, Users, Plus, Loader2, Zap, LogOut, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [view, setView] = useState<'guards' | 'dashboard' | 'teachers'>('guards');
  const [currentUser, setCurrentUser] = useState<Teacher | null>(null);
  const [guards, setGuards] = useState<Guard[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuardId, setEditingGuardId] = useState<string | null>(null);
  const logoUrl = 'https://ipijmhqafrwobvnmmzgy.supabase.co/storage/v1/object/public/Logos/logo_reyes_catolicos_negativo%20(1).png';

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], time_slot_id: '', classroom_id: '', group_id: '', subject_id: '',
    type: GuardType.ORDINARY, has_task: 'No', observations: ''
  });

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
      setLoading(true);
      const sess = await getCurrentSession();
      if (sess && sess.user && sess.user.email) {
          const teacher = await getTeacherByEmail(sess.user.email);
          if (teacher) { setSession(sess); setCurrentUser(teacher); setAuthError(null); await fetchData(); }
          else { await signOut(); setSession(null); setCurrentUser(null); setAuthError("Acceso denegado: Email no registrado."); setLoading(false); }
      } else { setSession(null); setLoading(false); }
  };

  const fetchData = async () => {
    try {
      const [g, t, m] = await Promise.all([getGuards(), getTeachers(), getMetaOptions()]);
      setGuards(g); setTeachers(t); setSlots(m.slots); setClassrooms(m.classrooms); setGroups(m.groups); setSubjects(m.subjects);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    try {
        if (editingGuardId) await updateGuardDetails(editingGuardId, formData);
        else await createGuard({ ...formData, requesting_teacher_id: currentUser.id });
        await fetchData(); setIsModalOpen(false);
    } catch (e) { alert('Error guardando'); } finally { setLoading(false); }
  };

  if (!session) {
      return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-sans">
              <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-brand-600/10 rounded-full blur-[120px]"></div>
              <div className="z-10 bg-slate-900/50 backdrop-blur-xl border border-slate-700 p-8 rounded-2xl max-w-md w-full text-center">
                 <div className="mb-6 flex justify-center"><img src={logoUrl} alt="Logo" className="w-24 h-24 object-contain" onError={(e) => { e.currentTarget.style.display='none'; }} /></div>
                 <h1 className="text-3xl font-bold text-white mb-2">Guardias <span className="text-brand-400">IES</span></h1>
                 {authError && <div className="mb-6 bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-sm text-red-200 flex gap-2"><AlertTriangle className="w-5 h-5"/>{authError}</div>}
                 <button onClick={() => { setAuthError(null); signInWithGoogle(); }} className="w-full bg-white text-slate-900 hover:bg-gray-100 font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-3"><Zap className="w-5 h-5"/> Entrar con Google Workspace</button>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 flex flex-col md:flex-row overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"><div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-[100px]"></div></div>
      <aside className="bg-slate-900/50 backdrop-blur-md border-r border-slate-800 w-full md:w-64 md:fixed md:h-screen z-20 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3"><img src={logoUrl} className="w-10 h-10 object-contain" alt="Logo"/> <h1 className="text-xl font-bold">Guardias <span className="text-brand-400">IES</span></h1></div>
        <nav className="p-4 space-y-2 flex-1">
          {[{id:'guards',l:'Panel',i:ListTodo},{id:'dashboard',l:'Estadísticas',i:LayoutDashboard},{id:'teachers',l:'Profesorado',i:Users}].map(i => (
             <button key={i.id} onClick={() => setView(i.id as any)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${view === i.id ? 'text-brand-400 bg-brand-900/20 border border-brand-500/30' : 'text-slate-400 hover:text-white'}`}><i.i className="w-5 h-5"/>{i.l}</button>
          ))}
        </nav>
        <div className="p-4 mt-auto border-t border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3 mb-3"><img src={currentUser?.avatar_url ? getStorageUrl(currentUser.avatar_url, 'Fotos') : `https://ui-avatars.com/api/?name=${currentUser?.name}`} className="w-10 h-10 rounded-full bg-slate-800" alt=""/><div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">{currentUser?.name}</p></div></div>
          <button onClick={signOut} className="w-full p-2 bg-slate-800 border border-slate-700 text-red-400 rounded hover:bg-slate-700 text-xs font-bold flex justify-center gap-2"><LogOut className="w-4 h-4"/> Cerrar Sesión</button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto relative z-10">
        <header className="flex justify-between items-center gap-4 mb-8">
            <h2 className="text-3xl font-bold text-white">IES SYSTEM V2.0</h2>
            {view === 'guards' && <button onClick={() => { setEditingGuardId(null); setIsModalOpen(true); }} className="bg-brand-600/20 text-brand-300 border border-brand-500/50 px-5 py-3 rounded-lg font-bold flex items-center gap-2"><Plus className="w-5 h-5"/> NUEVA GUARDIA</button>}
        </header>

        {loading ? <div className="h-96 flex flex-col items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-brand-500"/></div> : (
            <div className="animate-fade-in">
                {view === 'guards' && <GuardList guards={guards} currentUser={currentUser} onPickup={(id) => { updateGuardStatus(id, GuardStatus.ASSIGNED, currentUser!.id); fetchData(); }} onComplete={(id) => { updateGuardStatus(id, GuardStatus.COMPLETED); fetchData(); }} onDelete={async (id) => { if(window.confirm("Borrar?")) { await deleteGuard(id); fetchData(); }}} onEdit={(g) => { setEditingGuardId(g.id); setFormData({ ...g, date: g.date, time_slot_id: g.time_slot_id, classroom_id: g.classroom_id, group_id: g.group_id, subject_id: g.subject_id, type: g.type, has_task: g.has_task || 'No', observations: g.observations || '' }); setIsModalOpen(true); }} />}
                {view === 'dashboard' && <Dashboard guards={guards} teachers={teachers} />}
                {view === 'teachers' && <TeacherDirectory teachers={teachers} guards={guards} />}
            </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="bg-slate-800/50 px-6 py-5 flex justify-between items-center border-b border-slate-700"><h3 className="text-white font-bold text-lg">{editingGuardId ? 'Editar' : 'Nueva'} Guardia</h3><button onClick={() => setIsModalOpen(false)} className="text-slate-400">✕</button></div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-xs font-mono text-brand-400 uppercase">Fecha</label><CustomDatePicker value={formData.date} onChange={(d) => setFormData({...formData, date: d})} /></div>
                        <div className="space-y-1"><label className="text-xs font-mono text-brand-400 uppercase">Franja</label><select required value={formData.time_slot_id} onChange={e => setFormData({...formData, time_slot_id: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm"><option value="">Seleccionar</option>{slots.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-xs font-mono text-brand-400 uppercase">Aula</label><select required value={formData.classroom_id} onChange={e => setFormData({...formData, classroom_id: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm"><option value="">Seleccionar</option>{classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                        <div className="space-y-1"><label className="text-xs font-mono text-brand-400 uppercase">Grupo</label><select required value={formData.group_id} onChange={e => setFormData({...formData, group_id: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm"><option value="">Seleccionar</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                    </div>
                    <div className="space-y-1"><label className="text-xs font-mono text-brand-400 uppercase">Materia</label><select required value={formData.subject_id} onChange={e => setFormData({...formData, subject_id: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm"><option value="">Seleccionar</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-xs font-mono text-brand-400 uppercase">Tipo</label><select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as GuardType})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm"><option value={GuardType.ORDINARY}>Ordinaria</option><option value={GuardType.COEXISTENCE}>Convivencia</option></select></div>
                        <div className="space-y-1"><label className="text-xs font-mono text-brand-400 uppercase">¿Tarea?</label><div className="flex gap-4 pt-2"><label className="flex gap-2 text-sm"><input type="radio" checked={formData.has_task === 'Sí'} onChange={() => setFormData({...formData, has_task: 'Sí'})} /> Sí</label><label className="flex gap-2 text-sm"><input type="radio" checked={formData.has_task === 'No'} onChange={() => setFormData({...formData, has_task: 'No'})} /> No</label></div></div>
                    </div>
                    <div className="space-y-1"><label className="text-xs font-mono text-brand-400 uppercase">Observaciones</label><textarea rows={3} value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm"></textarea></div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-800"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-lg text-sm">Cancelar</button><button type="submit" className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-brand-500/20">{editingGuardId ? 'GUARDAR' : 'CREAR'}</button></div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
export default App;