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

  const sortScore = (status: GuardStatus) => {
    if (status === GuardStatus.AVAILABLE) return 1;
    if (status === GuardStatus.ASSIGNED) return 2;
    return 3;
  };

  const filteredGuards = guards
    .filter(g => {
      if (filter === 'available') return g.status === GuardStatus.AVAILABLE;
      if (filter === 'mine') return currentUser && (g.covering_teacher_id === currentUser.id || g.requesting_teacher_id === currentUser.id);
      return true;
    })
    .sort((a, b) => sortScore(a.status) - sortScore(b.status) || new Date(b.date).getTime() - new Date(a.date).getTime());

  const getStatusStyles = (status: GuardStatus) => {
    switch (status) {
      case GuardStatus.AVAILABLE: 
        return {
            badge: 'bg-brand-900/40 text-brand-300 border-brand-500/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]',
            cardBorder: 'border-l-4 border-l-brand-400 hover:border-brand-500/50',
            glow: 'hover:shadow-[0_0_20px_rgba(34,211,238,0.1)]'
        };
      case GuardStatus.ASSIGNED: 
        return {
            badge: 'bg-orange-900/40 text-orange-300 border-orange-500/50 shadow-[0_0_10px_rgba(251,146,60,0.2)]',
            cardBorder: 'border-l-4 border-l-orange-400 hover:border-orange-500/50',
            glow: 'hover:shadow-[0_0_20px_rgba(251,146,60,0.1)]'
        };
      case GuardStatus.COMPLETED: 
        return {
            badge: 'bg-slate-800 text-slate-400 border-slate-700',
            cardBorder: 'border-l-4 border-l-slate-600 border-slate-800',
            glow: ''
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2 pb-2 overflow-x-auto">
        {[
            { key: 'all', label: 'Todas' },
            { key: 'available', label: 'Pendientes' },
            { key: 'mine', label: 'Mis Guardias' }
        ].map((f) => (
            <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={`px-5 py-2 rounded-full text-sm font-bold tracking-wide transition-all duration-300 ${
                filter === f.key 
                ? 'bg-brand-600 text-white shadow-[0_0_15px_rgba(34,211,238,0.4)] border border-brand-400' 
                : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-brand-500/50 hover:text-brand-300'
            }`}
            >
            {f.label}
            </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredGuards.length === 0 && (
            <div className="text-center py-16 bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
                <Shield className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 font-mono">NO SE ENCONTRARON REGISTROS</p>
            </div>
        )}

        {filteredGuards.map((guard) => {
            const styles = getStatusStyles(guard.status);
            
            // Check Permissions
            const isAdmin = currentUser?.role === 'Administrador' || currentUser?.role === 'Admin';
            const isOwner = currentUser?.id === guard.requesting_teacher_id;
            const canManage = isAdmin || isOwner;

            return (
                <div key={guard.id} className={`bg-slate-900 rounded-r-xl rounded-l-md shadow-lg border-y border-r border-slate-800 p-5 transition-all duration-300 ${styles.cardBorder} ${styles.glow} group relative`}>
                    
                    {/* Management Actions (Top Right) */}
                    {canManage && (
                        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEdit(guard); }}
                                className="p-1.5 bg-slate-800 text-slate-400 hover:text-brand-400 rounded-lg hover:bg-slate-700 transition-colors"
                                title="Editar"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(guard.id); }}
                                className="p-1.5 bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-700 transition-colors"
                                title="Eliminar"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                    
                    {/* Left Info */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                        <span className="font-mono text-xs font-bold text-slate-500 group-hover:text-slate-300 transition-colors">
                            {guard.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider border backdrop-blur-sm ${styles.badge}`}>
                            {guard.status}
                        </span>
                        {guard.type === GuardType.COEXISTENCE && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider bg-purple-900/40 text-purple-300 border border-purple-500/50 shadow-[0_0_10px_rgba(192,132,252,0.2)]">
                            Convivencia
                            </span>
                        )}
                        {guard.has_task === 'Sí' && (
                             <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider bg-blue-900/40 text-blue-300 border border-blue-500/50 flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Tarea
                            </span>
                        )}
                        </div>
                        
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                            <BookOpen className="w-5 h-5 text-brand-500" />
                            {guard.subject?.name || 'Materia desconocida'} 
                            <span className="text-slate-600 font-normal text-sm">|</span>
                            <span className="text-slate-300">{guard.group?.name || 'Grupo desconocido'}</span>
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-4 text-sm text-slate-400">
                            <div className="flex items-center gap-2 bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                <Calendar className="w-4 h-4 text-brand-400" />
                                {guard.date}
                            </div>
                            <div className="flex items-center gap-2 bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                <Clock className="w-4 h-4 text-brand-400" />
                                <span className="truncate">{guard.time_slot?.label || 'Hora desconocida'}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                <MapPin className="w-4 h-4 text-brand-400" />
                                {guard.classroom?.name || guard.classroom_name || 'Aula desconocida'}
                            </div>
                            <div className="flex items-center gap-2 bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                <User className="w-4 h-4 text-brand-400" />
                                <span className="truncate">{guard.requesting_teacher?.name || 'Profesor'}</span>
                            </div>
                        </div>

                        {guard.observations && (
                        <div className="mt-4 text-sm text-slate-400 bg-slate-950/50 p-3 rounded border border-slate-800 italic border-l-2 border-l-slate-600">
                            "{guard.observations}"
                        </div>
                        )}
                    </div>

                    {/* Right Action / Status */}
                    <div className="flex flex-col items-end gap-3 min-w-[200px]">
                        {/* Current covering teacher info */}
                        {guard.covering_teacher && (
                        <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-lg border border-slate-700 w-full md:w-auto shadow-md">
                            {guard.covering_teacher.avatar_url && 
                             <img src={guard.covering_teacher.avatar_url} alt="" className="w-8 h-8 rounded-full border border-slate-600" />
                            }
                            <div className="flex flex-col">
                                <span className="text-[9px] text-brand-400 uppercase tracking-widest font-bold">Asignado a</span>
                                <span className="text-sm font-bold text-white">{guard.covering_teacher.name}</span>
                            </div>
                        </div>
                        )}

                        {/* ACTION BUTTONS */}
                        <div className="w-full md:w-auto mt-2">
                            {guard.status === GuardStatus.AVAILABLE && currentUser && (
                            <button
                                onClick={() => onPickup(guard.id)}
                                className="w-full md:w-auto flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] border border-brand-400/30"
                            >
                                <Zap className="w-4 h-4 fill-current" />
                                RECOGER GUARDIA
                            </button>
                            )}

                            {guard.status === GuardStatus.ASSIGNED && currentUser && guard.covering_teacher_id === currentUser.id && (
                            <button
                                onClick={() => onComplete(guard.id)}
                                className="w-full md:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all active:scale-95 shadow-[0_0_15px_rgba(34,197,94,0.3)] border border-green-400/30"
                            >
                                <CheckCircle className="w-4 h-4" />
                                MARCAR REALIZADA
                            </button>
                            )}
                        </div>
                    </div>

                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default GuardList;