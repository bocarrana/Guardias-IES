import React from 'react';
import { Teacher, Guard, GuardStatus, GuardType } from '../types';
import { getStorageUrl } from '../services/supabaseClient';

interface TeacherDirectoryProps { teachers: Teacher[]; guards: Guard[]; }

const TeacherDirectory: React.FC<TeacherDirectoryProps> = ({ teachers, guards }) => {
  const getStats = (teacherId: string) => {
    const ordinary = guards.filter(g => g.covering_teacher_id === teacherId && g.status === GuardStatus.COMPLETED && g.type === GuardType.ORDINARY).length;
    const coexistence = guards.filter(g => g.covering_teacher_id === teacherId && g.status === GuardStatus.COMPLETED && g.type === GuardType.COEXISTENCE).length;
    return { ordinary, coexistence, total: ordinary + coexistence };
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
      {teachers.map((teacher) => {
        const stats = getStats(teacher.id);
        const imageUrl = teacher.avatar_url ? getStorageUrl(teacher.avatar_url) : `https://ui-avatars.com/api/?name=${teacher.name}&background=0f172a&color=22d3ee`;

        return (
          <div key={teacher.id} className="bg-slate-900 rounded-xl shadow border border-slate-800 overflow-hidden hover:border-brand-500/30 transition-all group">
            <div className="p-6 flex items-center gap-5">
              <div className="relative">
                <img src={imageUrl} alt={teacher.name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-700 group-hover:border-brand-400 transition-colors bg-slate-800"/>
                <div className="absolute bottom-1 right-1 w-3 h-3 bg-brand-500 rounded-full border-2 border-slate-900 shadow-[0_0_5px_#22d3ee]"></div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-brand-300 transition-colors">{teacher.name}</h3>
                <p className="text-sm text-slate-500 mb-1">{teacher.department}</p>
                <span className="inline-block px-2 py-0.5 bg-slate-800 text-brand-400 text-[10px] uppercase font-bold tracking-wider rounded border border-slate-700">{teacher.guard_group}</span>
              </div>
            </div>
            <div className="bg-slate-950/50 px-6 py-4 border-t border-slate-800 grid grid-cols-2 divide-x divide-slate-800">
              <div className="text-center"><span className="block text-2xl font-bold text-brand-400">{stats.ordinary}</span><span className="text-[10px] text-slate-500 uppercase">Ordinarias</span></div>
              <div className="text-center"><span className="block text-2xl font-bold text-purple-400">{stats.coexistence}</span><span className="text-[10px] text-slate-500 uppercase">Convivencia</span></div>
            </div>
             <div className="w-full bg-slate-800 h-1"><div className="bg-gradient-to-r from-brand-600 to-purple-500 h-1" style={{ width: `${Math.min(stats.total * 5, 100)}%` }}></div></div>
          </div>
        );
      })}
    </div>
  );
};
export default TeacherDirectory;