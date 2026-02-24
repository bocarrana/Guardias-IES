import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Guard, Teacher, GuardStatus, GuardType } from '../types';
import { Activity, CheckCircle, Clock, Shield, Users } from 'lucide-react';

interface DashboardProps { guards: Guard[]; teachers: Teacher[]; }

const Dashboard: React.FC<DashboardProps> = ({ guards, teachers }) => {
  const teacherStats = useMemo(() => {
    const stats: Record<string, { name: string, completedOrdinary: number, completedCoexistence: number, total: number }> = {};
    teachers.forEach(t => stats[t.id] = { name: t.name, completedOrdinary: 0, completedCoexistence: 0, total: 0 });
    guards.forEach(g => {
      if (g.covering_teacher_id && stats[g.covering_teacher_id] && g.status === GuardStatus.COMPLETED) {
        if (g.type === GuardType.ORDINARY) stats[g.covering_teacher_id].completedOrdinary += 1;
        else if (g.type === GuardType.COEXISTENCE) stats[g.covering_teacher_id].completedCoexistence += 1;
        stats[g.covering_teacher_id].total += 1;
      }
    });
    return Object.values(stats).sort((a, b) => b.total - a.total).slice(0, 7);
  }, [guards, teachers]);

  const guardTypeData = useMemo(() => [
      { name: 'Ordinarias', value: guards.filter(g => g.type === GuardType.ORDINARY && g.status === GuardStatus.COMPLETED).length, fill: '#22d3ee' },
      { name: 'Convivencia', value: guards.filter(g => g.type === GuardType.COEXISTENCE && g.status === GuardStatus.COMPLETED).length, fill: '#c084fc' }
  ], [guards]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
            { title: 'Ordinarias Realizadas', val: guards.filter(g => g.status === GuardStatus.COMPLETED && g.type === GuardType.ORDINARY).length, color: 'text-brand-400', icon: CheckCircle, border: 'shadow-[0_0_10px_#22d3ee] bg-brand-500' },
            { title: 'Convivencia Realizadas', val: guards.filter(g => g.status === GuardStatus.COMPLETED && g.type === GuardType.COEXISTENCE).length, color: 'text-purple-400', icon: Shield, border: 'shadow-[0_0_10px_#c084fc] bg-purple-500' },
            { title: 'Sin Asignar', val: guards.filter(g => g.status === GuardStatus.AVAILABLE).length, color: 'text-orange-400', icon: Clock, border: '', isAlert: true },
            { title: 'Total Intervenciones', val: guards.filter(g => g.status === GuardStatus.COMPLETED).length, color: 'text-green-400', icon: Users, border: 'shadow-[0_0_10px_#4ade80] bg-green-500' }
        ].map((kpi, i) => (
             <div key={i} className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800 relative overflow-hidden group">
               <div className="flex justify-between items-start relative z-10">
                 <div><h3 className={`${kpi.color} text-[10px] font-bold uppercase tracking-widest mb-1`}>{kpi.title}</h3><p className="text-4xl font-bold text-white mt-2">{kpi.val}</p></div>
                 <div className="p-2 bg-slate-800 rounded-lg border border-slate-700"><kpi.icon className={`w-5 h-5 ${kpi.color}`} /></div>
               </div>
               {kpi.border ? <div className="mt-4 w-full h-1 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full w-full ${kpi.border}`}></div></div> : null}
               {kpi.isAlert && <div className="mt-4 text-[10px] text-orange-400 font-bold flex items-center gap-1"><Activity className="w-3 h-3 animate-pulse" /> NECESITAN ATENCIÓN</div>}
             </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800">
          <h3 className="text-lg font-bold text-white mb-6">Ranking de Actividad</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teacherStats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#1e293b" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11, fill: '#94a3b8'}} stroke="#334155" />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', color: '#fff' }} />
                <Bar dataKey="completedOrdinary" name="Ordinarias" stackId="a" fill="#22d3ee" barSize={20} />
                <Bar dataKey="completedCoexistence" name="Convivencia" stackId="a" fill="#c084fc" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800">
          <h3 className="text-lg font-bold text-white mb-6">Distribución</h3>
          <div className="h-80 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={guardTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {guardTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <span className="text-2xl font-bold text-white block">{guards.filter(g => g.status === GuardStatus.COMPLETED).length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;