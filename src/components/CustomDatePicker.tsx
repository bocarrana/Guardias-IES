import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
}

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialDate = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState(initialDate);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { if (value) setViewDate(new Date(value)); }, [value]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const handleSelectDate = (day: number) => {
    const year = viewDate.getFullYear();
    const month = (viewDate.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    onChange(`${year}-${month}-${dayStr}`);
    setIsOpen(false);
  };

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return 'Seleccionar fecha';
    return new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const renderDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
      const isSelected = new Date(value).getDate() === d && new Date(value).getMonth() === month && new Date(value).getFullYear() === year;
      days.push(
        <button key={d} type="button" onClick={() => handleSelectDate(d)} className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isSelected ? 'bg-brand-500 text-white shadow-[0_0_10px_#22d3ee]' : 'text-slate-300 hover:bg-slate-700'}`}>{d}</button>
      );
    }
    return days;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div onClick={() => setIsOpen(!isOpen)} className={`w-full bg-slate-950 border ${isOpen ? 'border-brand-500 ring-1 ring-brand-500/50' : 'border-slate-700'} rounded-lg p-2.5 pl-10 text-sm text-white cursor-pointer flex items-center`}>
        <span className="capitalize truncate">{formatDateLabel(value)}</span>
        <Calendar className={`absolute left-3 top-2.5 w-5 h-5 ${isOpen ? 'text-brand-400' : 'text-slate-400'}`} />
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[280px] bg-slate-900 border border-slate-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between p-3 bg-slate-800/50 border-b border-slate-700">
            <button onClick={(e) => {e.preventDefault(); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}} className="p-1 hover:bg-slate-700 rounded-lg text-slate-400"><ChevronLeft className="w-5 h-5" /></button>
            <span className="text-sm font-bold text-white capitalize">{MONTHS[viewDate.getMonth()]} <span className="text-slate-500">{viewDate.getFullYear()}</span></span>
            <button onClick={(e) => {e.preventDefault(); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}} className="p-1 hover:bg-slate-700 rounded-lg text-slate-400"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 p-3 pb-1">{DAYS.map(day => <div key={day} className="text-center text-[10px] font-bold text-slate-500">{day}</div>)}</div>
          <div className="grid grid-cols-7 gap-1 p-3 pt-1 place-items-center">{renderDays()}</div>
        </div>
      )}
    </div>
  );
};
export default CustomDatePicker;