import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
}

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial value or default to today
  const initialDate = value ? new Date(value) : new Date();
  
  // State for the calendar view (navigation)
  const [viewDate, setViewDate] = useState(initialDate);
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync view if value changes externally
  useEffect(() => {
    if (value) {
        setViewDate(new Date(value));
    }
  }, [value]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    // 0 = Sunday, 1 = Monday ... 6 = Saturday
    // We want 0 = Monday ... 6 = Sunday
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDate = (day: number) => {
    // Create date string YYYY-MM-DD manually to avoid timezone issues
    const year = viewDate.getFullYear();
    const month = (viewDate.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    
    onChange(dateStr);
    setIsOpen(false);
  };

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return 'Seleccionar fecha';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  // Render Grid
  const renderCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    
    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      // Check if this day is selected
      const currentValDate = new Date(value);
      const isSelected = 
        currentValDate.getDate() === d && 
        currentValDate.getMonth() === month && 
        currentValDate.getFullYear() === year;

      // Check if is today
      const today = new Date();
      const isToday = 
        today.getDate() === d && 
        today.getMonth() === month && 
        today.getFullYear() === year;

      days.push(
        <button
          key={d}
          type="button"
          onClick={() => handleSelectDate(d)}
          className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200
            ${isSelected 
                ? 'bg-brand-500 text-white shadow-[0_0_10px_#22d3ee]' 
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'}
            ${isToday && !isSelected ? 'border border-brand-400 text-brand-400' : ''}
          `}
        >
          {d}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Input Trigger */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-slate-950 border ${isOpen ? 'border-brand-500 ring-1 ring-brand-500/50' : 'border-slate-700'} 
        rounded-lg p-2.5 pl-10 text-sm text-white cursor-pointer transition-all hover:border-brand-500/50 flex items-center`}
      >
        <span className="capitalize truncate">{formatDateLabel(value)}</span>
        <Calendar className={`absolute left-3 top-2.5 w-5 h-5 transition-colors ${isOpen ? 'text-brand-400' : 'text-slate-400'}`} />
      </div>

      {/* Calendar Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[280px] bg-slate-900 border border-slate-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-fade-in">
          
          {/* Header */}
          <div className="flex items-center justify-between p-3 bg-slate-800/50 border-b border-slate-700">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-white capitalize">
              {MONTHS[viewDate.getMonth()]} <span className="text-slate-500">{viewDate.getFullYear()}</span>
            </span>
            <button onClick={handleNextMonth} className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 p-3 pb-1">
            {DAYS.map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-slate-500">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 p-3 pt-1 place-items-center">
            {renderCalendarDays()}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;