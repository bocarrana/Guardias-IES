import React, { useState } from 'react';
import { Guard, GuardStatus, Teacher, GuardType } from '../types';
import { User, Calendar, Clock, MapPin, CheckCircle, Zap, BookOpen, Shield, Pencil, Trash2, FileText } from 'lucide-react';

interface GuardListProps {
  guards: Guard[];
  currentUser: Teacher | null;
  onPickup: (guardId: string) => void;
  onComplete: (guardId: string) => void;
  onDelete: (guardId: string) => void;
  onEdit: (guard: Guard) => void;
}

const GuardList: React.FC<GuardListProps> = ({ guards, currentUser, onPickup, onComplete, onDelete, onEdit }) => {
  const [filter, setFilter] = useState<'all' | 'mine' | 'available'>('all');

  const filteredGuards = guards.filter(g => {
      if (filter === 'available') return g.status === GuardStatus.AVAILABLE;
      if (filter === 'mine') return currentUser && (g.covering_teacher_id === currentUser.id || g.requesting_teacher_id === currentUser.id);
      return true;
  }).sort((a, b) => {
      const score = (s: GuardStatus) => s === GuardStatus.AVAILABLE ? 1 : s === GuardStatus.ASSIGNED ? 2 : 3;
      return score(a.status) - score(b.status) || new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const getStatusStyles = (status: GuardStatus) => {
    if (status === GuardStatus.AVAILABLE) return { badge: 'bg-brand-900/40 text-brand-300 border-brand-500/50', border: 'border-l-4 border-l-brand-400' };
    if (status === GuardStatus.ASSIGNED) return { badge: 'bg-orange-900/40 text-orange-300 border-orange-500/50', border: 'border-l-4 border-l-orange-400' };
    return { badge: 'bg-slate-800 text-slate-400 border-slate-700', border: 'border-l-4 border-l-slate-600' };
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 pb-2 overflow-x-auto">
        {[{k:'all',l:'Todas'},{k:'available',l:'Pendientes'},{k:'mine',l:'Mis Guardias'}].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k as any)} className={`px-5 py-2 rounded-full text-sm font-bold ${filter === f.k ? 'bg-brand-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}>{f.l}</button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredGuards.length === 0 && <div className="text-center py-16 bg-slate-900/50 rounded-xl border border-dashed border-slate-700 text-slate-500">NO SE ENCONTRARON REGISTROS</div>}
        {filteredGuards.map((guard) => {
            const styles = getStatusStyles(guard.status);
            const canManage = currentUser && (currentUser.role === 'Administrador' || currentUser.id === guard.requesting_teacher_id);

            return (
                <div key={guard.id} className={`bg-slate-900 rounded-r-xl rounded-l-md shadow-lg border-y border-r border-slate-800 p-5 group relative ${styles.border}`}>
                    {canManage && (
                        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button onClick={(e) => {e.stopPropagation(); onEdit(guard)}} className="p-1.5 bg-slate-800 text-slate-400 hover:text-brand-400 rounded-lg"><Pencil className="w-4 h-4" /></button>
                            <button onClick={(e) => {e.stopPropagation(); onDelete(guard.id)}} className="p-1.5 bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    )}
                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                           <span className="font-mono text-xs font-bold text-slate-500">{guard.id}</span>
                           <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold border ${styles.badge}`}>{guard.status}</span>
                           {guard.type === GuardType.COEXISTENCE && <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold bg-purple-900/40 text-purple-300 border border-purple-500/50">Convivencia</span>}
                           {guard.has_task === 'Sí' && <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold bg-blue-900/40 text-blue-300 border border-blue-500/50 flex items-center gap-1"><FileText className="w-3 h-3"/> Tarea</span>}
                        </div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4"><BookOpen className="w-5 h-5 text-brand-500"/> {guard.subject?.name || 'Materia'} <span className="text-slate-600">|</span> <span className="text-slate-300">{guard.group?.name || 'Grupo'}</span></h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-4 text-sm text-slate-400">
                            <div className="flex items-center gap-2 bg-slate-800/50 p-2 rounded"><Calendar className="w-4 h-4 text-brand-400"/> {guard.date}</div>
                            <div className="flex items-center gap-2 bg-slate-800/50 p-2 rounded"><Clock className="w-4 h-4 text-brand-400"/> {guard.time_slot?.label}</div>
                            <div className="flex items-center gap-2 bg-slate-800/50 p-2 rounded"><MapPin className="w-4 h-4 text-brand-400"/> {guard.classroom?.name || guard.classroom_name}</div>
                            <div className="flex items-center gap-2 bg-slate-800/50 p-2 rounded"><User className="w-4 h-4 text-brand-400"/> {guard.requesting_teacher?.name}</div>
                        </div>
                        {guard.observations && <div className="mt-4 text-sm text-slate-400 bg-slate-950/50 p-3 rounded border border-slate-800 italic">"{guard.observations}"</div>}
                      </div>
                      <div className="flex flex-col items-end gap-3 min-w-[200px]">
                        {guard.covering_teacher && (
                             <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-lg border border-slate-700 w-full md:w-auto">
                                <img src={guard.covering_teacher.avatar_url || `https://ui-avatars.com/api/?name=${guard.covering_teacher.name}`} className="w-8 h-8 rounded-full" alt=""/>
                                <div className="flex flex-col"><span className="text-[9px] text-brand-400 uppercase font-bold">Asignado a</span><span className="text-sm font-bold text-white">{guard.covering_teacher.name}</span></div>
                             </div>
                        )}
                        <div className="w-full md:w-auto mt-2">
                            {guard.status === GuardStatus.AVAILABLE && currentUser && <button onClick={() => onPickup(guard.id)} className="w-full bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm flex justify-center gap-2"><Zap className="w-4 h-4"/> RECOGER</button>}
                            {guard.status === GuardStatus.ASSIGNED && currentUser && guard.covering_teacher_id === currentUser.id && <button onClick={() => onComplete(guard.id)} className="w-full bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm flex justify-center gap-2"><CheckCircle className="w-4 h-4"/> REALIZADA</button>}
                        </div>
                      </div>
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
};
export default GuardList;