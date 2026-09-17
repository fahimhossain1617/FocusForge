"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Bell } from 'lucide-react';

interface CalendarWidgetProps {
  currentDate: Date;
  selectedDateStr: string;
  onDateSelect: (date: Date) => void;
  onAddEvent: () => void;
}

type ViewMode = 'Weekly' | 'Monthly' | 'Yearly';
type SubView = 'Calendar' | 'MonthPicker' | 'YearPicker';

export default function CalendarWidget({ currentDate, selectedDateStr, onDateSelect, onAddEvent }: CalendarWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('Monthly');
  const [subView, setSubView] = useState<SubView>('Calendar');
  const [viewDate, setViewDate] = useState(currentDate);
  const wrapperRef = useRef<HTMLDivElement>(null);
  let closeTimeout: NodeJS.Timeout;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Sync internal view date when external selected date changes
  useEffect(() => {
    if (selectedDateStr) {
      const [y, m, d] = selectedDateStr.split('-').map(Number);
      setViewDate(new Date(y, m - 1, d));
    }
  }, [selectedDateStr]);

  // Click outside listener for mobile/fallback
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsLocked(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hover Mechanics
  const handleMouseEnter = () => {
    clearTimeout(closeTimeout);
    if (!isOpen) setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isLocked) return;
    closeTimeout = setTimeout(() => {
      setIsOpen(false);
      setSubView('Calendar'); // reset on close
    }, 200); // Slight delay for smoother UX
  };

  const handleToggle = () => {
    if (isOpen) {
      if (isLocked) {
        setIsLocked(false);
        setIsOpen(false);
      } else {
        setIsLocked(true);
      }
    } else {
      setIsOpen(true);
      setIsLocked(true);
      setSubView('Calendar');
    }
  };

  // Calendar Math
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const changeMonth = (offset: number) => {
    setViewDate(new Date(year, month + offset, 1));
  };

  const handleDaySelect = (day: number) => {
    const newDate = new Date(year, month, day);
    onDateSelect(newDate);
    setIsOpen(false);
  };

  // Render subviews
  const renderMonthPicker = () => (
    <div className="grid grid-cols-3 gap-2 p-2">
      {monthNames.map((m, i) => (
        <button
          key={m}
          onClick={() => {
            setViewDate(new Date(year, i, 1));
            setSubView('Calendar');
            setViewMode('Monthly');
          }}
          className={`py-3 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            i === month 
              ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-md shadow-blue-500/30' 
              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );

  const renderYearPicker = () => {
    const startYear = year - 5;
    return (
      <div className="grid grid-cols-3 gap-2 p-2 h-[180px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        {Array.from({ length: 15 }).map((_, i) => {
          const y = startYear + i;
          return (
            <button
              key={y}
              onClick={() => {
                setViewDate(new Date(y, month, 1));
                setSubView('MonthPicker');
              }}
              className={`py-3 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                y === year 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-md shadow-blue-500/30' 
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              {y}
            </button>
          );
        })}
      </div>
    );
  };

  const renderCalendarGrid = () => {
    const days = [];
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    if (viewMode === 'Monthly') {
      // Padding before
      for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-8" />);
      }
      // Days
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        const yStr = d.getFullYear();
        const mStr = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yStr}-${mStr}-${dayStr}`;
        const isSelected = dateStr === selectedDateStr;
        const isToday = dateStr === todayStr;

        days.push(
          <button
            key={`day-${i}`}
            onClick={() => handleDaySelect(i)}
            className={`h-8 w-8 mx-auto flex items-center justify-center rounded-full text-xs font-medium transition-all cursor-pointer ${
              isSelected 
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/40 ring-2 ring-blue-400/40' 
                : isToday 
                  ? 'border border-blue-500/50 text-blue-400 bg-blue-500/15' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {i}
          </button>
        );
      }
    } else if (viewMode === 'Weekly') {
      // Just show a 1-row strip of the week of viewDate
      const currentDayOfWeek = viewDate.getDay();
      const weekStart = new Date(viewDate);
      weekStart.setDate(viewDate.getDate() - currentDayOfWeek);
      
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const yStr = d.getFullYear();
        const mStr = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yStr}-${mStr}-${dayStr}`;
        const isSelected = dateStr === selectedDateStr;
        const isToday = dateStr === todayStr;

        days.push(
          <button
            key={`wday-${i}`}
            onClick={() => {
              onDateSelect(d);
              setIsOpen(false);
            }}
            className={`h-11 w-9 mx-auto flex flex-col items-center justify-center rounded-lg transition-all cursor-pointer ${
              isSelected 
                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/40 ring-2 ring-blue-400/40' 
                : isToday 
                  ? 'border border-blue-500/50 text-blue-400 bg-blue-500/15' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="text-[10px] opacity-60 mb-0.5">{daysOfWeek[i]}</span>
            <span className="text-sm font-medium">{d.getDate()}</span>
          </button>
        );
      }
    }

    return (
      <>
        {/* Day Headers (Monthly only) */}
        {viewMode === 'Monthly' && (
          <div className="grid grid-cols-7 mb-2">
            {daysOfWeek.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-bold text-slate-400">{d}</div>
            ))}
          </div>
        )}
        
        {/* Grid */}
        <div className={`grid ${viewMode === 'Weekly' ? 'grid-cols-7 gap-1 mt-4' : 'grid-cols-7 gap-y-1'}`}>
          {days}
        </div>
      </>
    );
  };

  return (
    <div 
      ref={wrapperRef} 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Button */}
      <button 
        onClick={handleToggle}
        className="calendar-trigger w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer text-slate-400 hover:text-blue-400 hover:bg-white/10"
        aria-label="Open Calendar"
      >
        <CalendarIcon className="w-4 h-4" />
      </button>

      {/* Popover */}
      {isOpen && (
        <div 
          className="calendar-popover absolute right-0 top-[110%] mt-2 w-[310px] z-50 overflow-hidden fade-in origin-top-right rounded-2xl"
          style={{
            background: "#0c1424",
            border: "1px solid rgba(59, 130, 246, 0.25)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.95), 0 10px 25px rgba(0, 0, 0, 0.80), inset 1px 1px 1px rgba(255, 255, 255, 0.12)"
          }}
        >
          {/* Tabs */}
          <div 
            className="flex items-center justify-between p-1.5 m-2 rounded-xl"
            style={{
              background: "#070c16",
              boxShadow: "inset 0 2px 5px rgba(0, 0, 0, 0.65), inset 0 -1px 1px rgba(255, 255, 255, 0.05)"
            }}
          >
            {['Weekly', 'Monthly', 'Yearly'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setViewMode(tab as ViewMode);
                  setSubView(tab === 'Yearly' ? 'YearPicker' : 'Calendar');
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === tab 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold shadow-md shadow-blue-500/30' 
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Header Controls */}
          {subView === 'Calendar' && viewMode !== 'Yearly' && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05]">
              <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setSubView('MonthPicker')}
                  className="text-sm font-bold text-white hover:text-blue-400 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-white/5"
                >
                  {monthNames[month]}
                </button>
                <button 
                  onClick={() => setSubView('YearPicker')}
                  className="text-sm font-bold text-white hover:text-blue-400 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-white/5"
                >
                  {year}
                </button>
              </div>

              <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Main Body */}
          <div className="p-3 min-h-[200px] bg-[#0c1424]">
            {subView === 'MonthPicker' ? renderMonthPicker() 
             : subView === 'YearPicker' || viewMode === 'Yearly' ? renderYearPicker() 
             : renderCalendarGrid()}
          </div>

          {/* Action Bar */}
          <div 
            className="flex items-center justify-between p-3 border-t border-white/[0.06]"
            style={{ background: "#080e1a" }}
          >
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer">
              <Bell className="w-3.5 h-3.5 text-blue-400" /> Reminder
            </button>
            <button 
              onClick={() => {
                setIsOpen(false);
                onAddEvent();
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-blue-500/30"
            >
              <Plus className="w-3.5 h-3.5" /> New Event
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

