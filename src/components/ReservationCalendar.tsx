/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Responsive Click-to-Open Modal Calendar (Fully Desktop & Mobile Compatible)
 */

import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Sparkles, Clock, Flame, ChevronDown, Check, X 
} from 'lucide-react';
import { getTodayDateString, isPastDate, isWeekend, getAvailableTimeSlots } from '../lib/slotUtils';

interface ReservationCalendarProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  minDate?: string;
  className?: string;
}

export const ReservationCalendar: React.FC<ReservationCalendarProps> = ({
  selectedDate,
  onSelectDate,
  minDate = getTodayDateString(),
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const initialDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); // 0-11

  const todayStr = getTodayDateString();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Prevent background scroll when modal is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const formatDateString = (year: number, month: number, day: number): string => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const calendarCells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push(day);
  }

  const handleSelectDay = (dateStr: string) => {
    onSelectDate(dateStr);
    setIsOpen(false);
  };

  const selectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    handleSelectDay(todayStr);
  };

  const selectTomorrow = (e: React.MouseEvent) => {
    e.stopPropagation();
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    const tomStr = formatDateString(tom.getFullYear(), tom.getMonth(), tom.getDate());
    setViewYear(tom.getFullYear());
    setViewMonth(tom.getMonth());
    handleSelectDay(tomStr);
  };

  const selectThisWeekend = (e: React.MouseEvent) => {
    e.stopPropagation();
    const d = new Date();
    const day = d.getDay();
    const diff = (6 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    const satStr = formatDateString(d.getFullYear(), d.getMonth(), d.getDate());
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    handleSelectDay(satStr);
  };

  const isTodaySelected = selectedDate === todayStr;
  const slotsCount = selectedDate ? getAvailableTimeSlots(selectedDate).length : 0;

  const selectedDateObj = selectedDate ? new Date(selectedDate + 'T00:00:00') : null;
  const formattedDisplay = selectedDateObj && !isNaN(selectedDateObj.getTime())
    ? selectedDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : selectedDate || 'Select Date';

  return (
    <div className={`relative w-full select-none ${className}`}>
      
      {/* ── 1. COMPACT TRIGGER BUTTON ON FORM ── */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full bg-[#050816] border border-white/10 hover:border-[#14F1D9]/50 rounded-xl px-3 py-2.5 flex items-center justify-between text-xs transition-all cursor-pointer shadow-sm group"
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-7 h-7 rounded-lg bg-[#14F1D9]/10 text-[#14F1D9] flex items-center justify-center border border-[#14F1D9]/30 group-hover:scale-105 transition-transform">
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>
          <div className="text-left truncate">
            <div className="text-[10px] uppercase font-mono text-[#9CA3AF] font-bold">Date of Visit</div>
            <div className="font-bold text-white font-mono text-xs flex items-center gap-1.5 truncate">
              <span className="truncate">{formattedDisplay}</span>
              {isTodaySelected && (
                <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/30 flex-shrink-0">
                  🔥 Few slots today
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[#9CA3AF] flex-shrink-0">
          <ChevronDown className="w-4 h-4 text-[#14F1D9]" />
        </div>
      </button>

      {/* ── 2. HIGH Z-INDEX MODAL OVERLAY (IMMUNE TO FOOTER / CLIPPING) ── */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="w-full max-w-[340px] bg-[#070D1E] border border-[#14F1D9]/40 rounded-3xl p-4 sm:p-5 shadow-[0_0_50px_rgba(0,0,0,0.9)] text-white font-sans"
            onClick={e => e.stopPropagation()}
          >
            
            {/* Modal Title & Close Button */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#14F1D9]" />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Select Reservation Date
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-[#9CA3AF] hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Month / Year Bar with Navigation */}
            <div className="flex items-center justify-between mb-3 bg-[#050816] p-2 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs font-black text-white uppercase tracking-wider font-mono">
                {monthNames[viewMonth]} <span className="text-[#14F1D9]">{viewYear}</span>
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick 1-Click Chips */}
            <div className="flex items-center justify-between gap-1 mb-3 font-mono text-[10px]">
              <button
                type="button"
                onClick={selectToday}
                className={`flex-1 py-1 rounded-lg border text-center transition-all cursor-pointer ${
                  isTodaySelected
                    ? 'bg-[#14F1D9] text-[#050816] font-black border-[#14F1D9]'
                    : 'bg-white/5 text-[#CBD5E1] border-white/10 hover:border-white/30'
                }`}
              >
                ⚡ Today
              </button>
              <button
                type="button"
                onClick={selectTomorrow}
                className="flex-1 py-1 rounded-lg bg-white/5 text-[#CBD5E1] border border-white/10 hover:border-white/30 text-center transition-all cursor-pointer"
              >
                🌅 Tomorrow
              </button>
              <button
                type="button"
                onClick={selectThisWeekend}
                className="flex-1 py-1 rounded-lg bg-white/5 text-[#CBD5E1] border border-white/10 hover:border-white/30 text-center transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <Sparkles className="w-2.5 h-2.5 text-[#FFB703]" /> Weekend
              </button>
            </div>

            {/* Day of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] font-bold uppercase text-[#9CA3AF] mb-1.5">
              <div className="text-rose-400">Su</div>
              <div>Mo</div>
              <div>Tu</div>
              <div>We</div>
              <div>Th</div>
              <div>Fr</div>
              <div className="text-[#14F1D9]">Sa</div>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs">
              {calendarCells.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="h-8 w-8" />;
                }

                const cellDateStr = formatDateString(viewYear, viewMonth, day);
                const isSelected = selectedDate === cellDateStr;
                const isToday = cellDateStr === todayStr;
                const isPast = isPastDate(cellDateStr);

                return (
                  <button
                    key={cellDateStr}
                    type="button"
                    disabled={isPast}
                    onClick={() => handleSelectDay(cellDateStr)}
                    className={`h-8 rounded-xl flex items-center justify-center relative transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-tr from-[#14F1D9] to-[#00B4FF] text-[#050816] font-black shadow-[0_0_15px_rgba(20,241,217,0.5)] scale-105 z-10'
                        : isPast
                        ? 'text-white/20 cursor-not-allowed'
                        : isToday
                        ? 'bg-white/10 text-white font-black border border-[#14F1D9]/40 hover:bg-[#14F1D9]/20'
                        : 'text-[#CBD5E1] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{day}</span>
                    {isToday && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-[#14F1D9] absolute bottom-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modal Bottom Status */}
            <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-[#CBD5E1]">
                <Clock className="w-3.5 h-3.5 text-[#14F1D9]" />
                <span>
                  {isTodaySelected 
                    ? `🔥 Only ${slotsCount} slots left today!`
                    : `${slotsCount} slots available`
                  }
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 bg-[#14F1D9] text-[#050816] font-black rounded-lg text-xs hover:bg-[#00B4FF] transition-all cursor-pointer"
              >
                Confirm
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
