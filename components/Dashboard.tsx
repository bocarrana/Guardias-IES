import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Guard, Teacher, GuardStatus, GuardType } from '../types';
import { Activity, CheckCircle, Clock, Shield, Users } from 'lucide-react';

interface DashboardProps {
  guards: Guard[];
  teachers: Teacher[];
}

const Dashboard: React.FC<DashboardProps> = ({ guards, teachers }) => {
  
  const teacherStats = useMemo(() => {
    // Initialize stats
    const stats: Record<string, { name: string, completedOrdinary: number, completedCoexistence: number, total: number }> = {};
    
    teachers.forEach(t => {
      stats[t.id] = { name: t.name, completedOrdinary: 0, completedCoexistence: 0, total: 0 };
    });

    guards.forEach(g => {
      if (g.covering_teacher_id && stats[g.covering_teacher_id] && g.status === GuardStatus.COMPLETED) {
        if (g.type === GuardType.ORDINARY) {
          stats[g.covering_teacher_id].completedOrdinary += 1;
        } else if (g.type === GuardType.COEXISTENCE) {
          stats[g.covering_teacher_id].completedCoexistence += 1;
        }
        stats[g.covering_teacher_id].total += 1;
      }
    });

    return Object.values(stats).sort((a, b) => b.total - a.total);
  }, [guards, teachers]);

  const guardTypeData = useMemo(() => {
    const ordinary = guards.filter(g => g.type === GuardType.ORDINARY && g.status === GuardStatus.COMPLETED).length;
    const coexistence = guards.filter(g => g.type === GuardType.COEXISTENCE && g.status === GuardStatus.COMPLETED).length;
    return [
      { name: 'Ordinarias', value: ordinary, fill: '#22d3ee' },
      { name: 'Convivencia', value: coexistence, fill: '#c084fc' }
    ];
  }, [guards]);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* TOTAL ORDINARIAS */}
        <div className="bg-slate-900 p-6 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.3)] border border-slate-800 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-brand-500/10 rounded-full blur-2xl group-hover:bg-brand-500/20 transition-all"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
                 <h3 className="text-brand-400 text-[10px] font-bold uppercase tracking-widest mb-1">Ordinarias Realizadas</h3>
                 <p className="text-4xl font-bold text-white mt-2 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
                    {guards.filter(g => g.status === GuardStatus.COMPLETED && g.type === GuardType.ORDINARY).length}
                 </p>
            </div>
            <div className="p-2 bg-slate-800 rounded-lg border border-slate-700 text-brand-400">
                <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
             <div className="h-full bg-brand-500 w-full shadow-[0_0_10px_#22d3ee]"></div>
          </div>
        </div>

        {/* TOTAL CONVIVENCIA */}
        <div className="bg-slate-900 p-6 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.3)] border border-slate-800 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
                 <h3 className="text-purple-400 text-[10px] font-bold uppercase tracking-widest mb-1">Convivencia Realizadas</h3>
                 <p className="text-4xl font-bold text-white mt-2 drop-shadow-[0_0_5px_rgba(192,132,252,0.5)]">
                    {guards.filter(g => g.status === GuardStatus.COMPLETED && g.type === GuardType.COEXISTENCE).length}
                 </p>
            </div>
            <div className="p-2 bg-slate-800 rounded-lg border border-slate-700 text-purple-400">
                <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
             <div className="h-full bg-purple-500 w-full shadow-[0_0_10px_#c084fc]"></div>
          </div>
        </div>

        {/* PENDIENTES */}
        <div className="bg-slate-900 p-6 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.3)] border border-slate-800 relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all"></div>
           <div className="flex justify-between items-start relative z-10">
              <div>
                <h3 className="text-orange-400 text-[10px] font-bold uppercase tracking-widest mb-1">Sin Asignar</h3>
                <p className="text-4xl font-bold text-white mt-2 drop-shadow-[0_0_5px_rgba(251,146,60,0.5)]">
                    {guards.filter(g => g.status === GuardStatus.AVAILABLE).length}
                </p>
              </div>
              <div className="p-2 bg-slate-800 rounded-lg border border-slate-700 text-orange-400">
                  <Clock className="w-5 h-5" />
              </div>
           </div>
           <div className="mt-4 text-[10px] text-orange-400 font-bold flex items-center gap-1">
             <Activity className="w-3 h-3 animate-pulse" />
             NECESITAN ATENCIÓN
           </div>
        </div>

        {/* TOTAL GENERAL */}
         <div className="bg-slate-900 p-6 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.3)] border border-slate-800 relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-20 h-20 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-all"></div>
           <div className="flex justify-between items-start relative z-10">
              <div>
                <h3 className="text-green-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Intervenciones</h3>
                <p className="text-4xl font-bold text-white mt-2 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">
                    {guards.filter(g => g.status === GuardStatus.COMPLETED).length}
                </p>
              </div>
              <div className="p-2 bg-slate-800 rounded-lg border border-slate-700 text-green-400">
                  <Users className="w-5 h-5" />
              </div>
           </div>
           <div className="mt-4 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
             <div className="h-full bg-green-500 w-full shadow-[0_0_10px_#4ade80]"></div>
          </div>
        </div>

      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TOP TEACHERS */}
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-1 h-5 bg-brand-500 rounded-full"></span>
            Ranking de Actividad (Ordinarias vs Convivencia)
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teacherStats.slice(0, 7)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#1e293b" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11, fill: '#94a3b8'}} stroke="#334155" />
                <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', color: '#fff', boxShadow: '0 0 15px rgba(34,211,238,0.2)' }} 
                />
                <Bar dataKey="completedOrdinary" name="Ordinarias" stackId="a" fill="#22d3ee" barSize={20} />
                <Bar dataKey="completedCoexistence" name="Convivencia" stackId="a" fill="#c084fc" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DISTRIBUTION */}
        <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
            Distribución por Tipo
          </h3>
          <div className="h-80 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={guardTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {guardTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <span className="text-2xl font-bold text-white block">
                    {guards.filter(g => g.status === GuardStatus.COMPLETED).length}
                </span>
                <span className="text-xs text-slate-500 uppercase">Total</span>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-[-20px]">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-brand-400"></div>
                <span className="text-xs text-slate-400">Ordinarias</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                <span className="text-xs text-slate-400">Convivencia</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;