"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, Check } from "lucide-react";

export interface FocusForgeDatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (valueOrEvent: any) => void;
  minDate?: string; // "YYYY-MM-DD"
  maxDate?: string; // "YYYY-MM-DD"
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  label?: string;
  ariaLabel?: string;
  required?: boolean;
  clearable?: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseDateStr(str?: string): Date | null {
  if (!str) return null;
  const parts = str.split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return null;
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateStr: string): string {
  const d = parseDateStr(dateStr);
  if (!d) return "";
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatHeaderDate(dateStr: string): string {
  const d = parseDateStr(dateStr);
  if (!d) return "Select date";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export default function FocusForgeDatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Select date",
  disabled = false,
  className = "",
  id,
  name,
  ariaLabel,
  required = false,
  clearable = true,
}: FocusForgeDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "year" | "month">("calendar");

  const [tempDate, setTempDate] = useState<string>(value || "");
  const [activeYear, setActiveYear] = useState<number>(() => {
    const d = parseDateStr(value) || new Date();
    return d.getFullYear();
  });
  const [activeMonth, setActiveMonth] = useState<number>(() => {
    const d = parseDateStr(value) || new Date();
    return d.getMonth();
  });

  const [mounted, setMounted] = useState(false);
  const [panelPos, setPanelPos] = useState<{
    top: number;
    left: number;
    width: number;
    placement: "above" | "below";
  } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const yearListRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute position relative to trigger, positioned directly below option
  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 12;
    const panelH = 380; // approximate calendar height
    const panelW = Math.min(320, vw - pad * 2);

    const spaceAbove = rect.top;
    const spaceBelow = vh - rect.bottom;
    const placement: "above" | "below" = (spaceBelow < panelH && spaceAbove > spaceBelow) ? "above" : "below";

    // Align with trigger left edge, clamp within viewport
    let left = rect.left;
    if (left + panelW > vw - pad) left = vw - pad - panelW;
    if (left < pad) left = pad;

    const top = placement === "above" 
      ? rect.top - panelH - 6 
      : rect.bottom + 6;

    setPanelPos({
      top: Math.max(pad, top),
      left,
      width: panelW,
      placement,
    });
  }, []);

  // Sync state on open
  const handleOpen = () => {
    if (disabled) return;
    const initial = parseDateStr(value) || new Date();
    setTempDate(value || formatDateStr(new Date()));
    setActiveYear(initial.getFullYear());
    setActiveMonth(initial.getMonth());
    setViewMode("calendar");
    computePosition();
    setIsOpen(true);
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setViewMode("calendar");
  }, []);

  // Click outside & Escape key listeners
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  // Reposition on window resize / scroll
  useEffect(() => {
    if (!isOpen) return;
    const handleUpdate = () => computePosition();
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);
    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [isOpen, computePosition]);

  // Scroll active year into view in year view
  useEffect(() => {
    if (isOpen && viewMode === "year" && yearListRef.current) {
      const activeEl = yearListRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "center" });
      }
    }
  }, [isOpen, viewMode]);

  const minD = useMemo(() => parseDateStr(minDate), [minDate]);
  const maxD = useMemo(() => parseDateStr(maxDate), [maxDate]);

  const isDateDisabled = useCallback(
    (date: Date) => {
      if (minD && date < minD) return true;
      if (maxD && date > maxD) return true;
      return false;
    },
    [minD, maxD]
  );

  // Month navigation
  const prevMonth = () => {
    if (activeMonth === 0) {
      setActiveMonth(11);
      setActiveYear((y) => y - 1);
    } else {
      setActiveMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (activeMonth === 11) {
      setActiveMonth(0);
      setActiveYear((y) => y + 1);
    } else {
      setActiveMonth((m) => m + 1);
    }
  };

  // Calendar matrix calculations
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(activeYear, activeMonth, 1).getDay();
    const daysInCurrentMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(activeYear, activeMonth, 0).getDate();

    const days: {
      date: Date;
      dateStr: string;
      isCurrentMonth: boolean;
      isDisabled: boolean;
    }[] = [];

    // Prev month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(activeYear, activeMonth - 1, daysInPrevMonth - i);
      days.push({
        date: d,
        dateStr: formatDateStr(d),
        isCurrentMonth: false,
        isDisabled: isDateDisabled(d),
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const d = new Date(activeYear, activeMonth, i);
      days.push({
        date: d,
        dateStr: formatDateStr(d),
        isCurrentMonth: true,
        isDisabled: isDateDisabled(d),
      });
    }

    // Next month leading days to complete matrix
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(activeYear, activeMonth + 1, i);
      days.push({
        date: d,
        dateStr: formatDateStr(d),
        isCurrentMonth: false,
        isDisabled: isDateDisabled(d),
      });
    }

    return days;
  }, [activeYear, activeMonth, isDateDisabled]);

  const handleConfirm = () => {
    if (!tempDate) return;
    const syntheticEvent = {
      target: { value: tempDate, name, id },
      currentTarget: { value: tempDate, name, id },
      value: tempDate,
    };
    if (typeof onChange === "function") {
      onChange(syntheticEvent);
    }
    handleClose();
  };

  const handleClear = () => {
    const syntheticEvent = {
      target: { value: "", name, id },
      currentTarget: { value: "", name, id },
      value: "",
    };
    if (typeof onChange === "function") {
      onChange(syntheticEvent);
    }
    handleClose();
  };

  const todayStr = formatDateStr(new Date());

  // Generate Year Array (1920 to 2035)
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const list: number[] = [];
    for (let y = current + 5; y >= 1920; y--) {
      list.push(y);
    }
    return list;
  }, []);

  return (
    <div className={`relative inline-block w-full text-left select-none ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? handleClose() : handleOpen())}
        aria-label={ariaLabel || placeholder}
        aria-required={required}
        aria-expanded={isOpen}
        className={`group flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 outline-none cursor-pointer border ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-blue-500/50"
        } ${isOpen ? "ring-2 ring-blue-500/20" : ""}`}
        style={{
          background: "var(--picker-surface, rgba(15, 23, 42, 0.65))",
          borderColor: isOpen ? "var(--picker-border-focus, #3B82F6)" : "var(--picker-border, rgba(255, 255, 255, 0.12))",
          color: value ? "var(--picker-text-primary, #F8FAFC)" : "var(--picker-text-muted, #64748B)",
        }}
      >
        <div className="flex items-center gap-2.5 truncate">
          <CalendarIcon
            size={16}
            className="shrink-0 text-blue-400 group-hover:text-blue-300 transition-colors"
          />
          <span className="truncate">
            {value ? formatDisplayDate(value) : placeholder}
          </span>
        </div>

        <ChevronDown
          size={15}
          className={`shrink-0 ml-2 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-400" : "text-zinc-400 group-hover:text-zinc-200"
          }`}
        />
      </button>

      {/* Date Picker Dropdown directly below option (via Portal without modal backdrop) */}
      {mounted && isOpen && panelPos && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="Select date"
          className="fixed z-[99999] overflow-hidden rounded-2xl shadow-2xl animate-fade-in"
          style={{
            top: `${panelPos.top}px`,
            left: `${panelPos.left}px`,
            width: `${panelPos.width}px`,
            background: "var(--picker-bg, #0C1222)",
            borderColor: "var(--picker-border, rgba(255, 255, 255, 0.14))",
            borderWidth: "1px",
            borderStyle: "solid",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          }}
        >
          {/* Header: Selected Date Preview */}
          <div 
            className="p-3.5 border-b flex flex-col gap-0.5"
            style={{
              borderColor: "var(--picker-border, rgba(255, 255, 255, 0.08))",
              background: "rgba(59, 130, 246, 0.06)",
            }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">
              Select Date
            </span>
            <span 
              className="text-base font-bold tracking-tight"
              style={{ color: "var(--picker-text-primary, #F8FAFC)" }}
            >
              {formatHeaderDate(tempDate)}
            </span>
          </div>

          {/* Navigation & Month/Year selector toggle */}
          <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "var(--picker-border, rgba(255, 255, 255, 0.06))" }}>
            <button
              type="button"
              onClick={() => setViewMode((m) => (m === "year" ? "calendar" : "year"))}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold hover:bg-white/10 dark:hover:bg-white/5 transition-colors cursor-pointer"
              style={{ color: "var(--picker-text-primary, #F8FAFC)" }}
              title="Click to jump to a year"
            >
              <span>{MONTH_NAMES[activeMonth]} {activeYear}</span>
              <ChevronDown size={14} className={`text-blue-400 transition-transform ${viewMode === "year" ? "rotate-180" : ""}`} />
            </button>

            {viewMode === "calendar" && (
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={prevMonth}
                  aria-label="Previous month"
                  className="p-1 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 transition-colors text-zinc-400 hover:text-white cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  aria-label="Next month"
                  className="p-1 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 transition-colors text-zinc-400 hover:text-white cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {/* View Mode: Calendar Grid */}
          {viewMode === "calendar" && (
            <div className="p-2.5">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-1 text-center">
                {WEEKDAY_NAMES.map((d, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-semibold py-1"
                    style={{ color: "var(--picker-text-muted, #64748B)" }}
                  >
                    {d}
                  </span>
                ))}
              </div>

              {/* Calendar Days Matrix */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {calendarDays.map((item, idx) => {
                  const isSelected = item.dateStr === tempDate;
                  const isToday = item.dateStr === todayStr;

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={item.isDisabled}
                      onClick={() => {
                        setTempDate(item.dateStr);
                        if (!item.isCurrentMonth) {
                          setActiveMonth(item.date.getMonth());
                          setActiveYear(item.date.getFullYear());
                        }
                      }}
                      className={`h-8 w-8 mx-auto flex items-center justify-center rounded-xl text-xs font-semibold transition-all duration-100 cursor-pointer ${
                        item.isDisabled
                          ? "opacity-20 cursor-not-allowed"
                          : isSelected
                          ? "bg-blue-600 text-white font-bold shadow-[0_0_10px_rgba(37,99,235,0.45)] scale-105"
                          : isToday
                          ? "border border-blue-500/80 text-blue-400 font-bold hover:bg-blue-500/10"
                          : item.isCurrentMonth
                          ? "hover:bg-white/10 dark:hover:bg-white/5"
                          : "opacity-35 hover:opacity-70"
                      }`}
                      style={{
                        color: isSelected
                          ? "#FFFFFF"
                          : isToday
                          ? "var(--picker-border-focus, #3B82F6)"
                          : "var(--picker-text-primary, #F8FAFC)",
                      }}
                    >
                      {item.date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* View Mode: Fast Year Selector Grid */}
          {viewMode === "year" && (
            <div
              ref={yearListRef}
              className="max-h-[220px] overflow-y-auto p-2.5 grid grid-cols-3 gap-1.5 custom-scrollbar text-center"
            >
              {years.map((y) => {
                const isSelected = y === activeYear;
                return (
                  <button
                    key={y}
                    type="button"
                    data-selected={isSelected}
                    onClick={() => {
                      setActiveYear(y);
                      setViewMode("month");
                    }}
                    className={`py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white font-bold shadow-[0_0_8px_rgba(37,99,235,0.35)]"
                        : "hover:bg-white/10 text-zinc-300 hover:text-white"
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          {/* View Mode: Month Selector Grid */}
          {viewMode === "month" && (
            <div className="p-2.5 grid grid-cols-3 gap-1.5 text-center">
              {MONTH_SHORT.map((m, idx) => {
                const isSelected = idx === activeMonth;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setActiveMonth(idx);
                      setViewMode("calendar");
                    }}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white font-bold shadow-[0_0_8px_rgba(37,99,235,0.35)]"
                        : "hover:bg-white/10 text-zinc-300 hover:text-white"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          )}

          {/* Bottom Actions Bar */}
          <div 
            className="flex items-center justify-between px-3 py-2 border-t gap-2"
            style={{ borderColor: "var(--picker-border, rgba(255, 255, 255, 0.08))" }}
          >
            <div>
              {clearable && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2 py-1 rounded-lg text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleClose}
                className="px-2.5 py-1 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
              >
                <Check size={13} />
                <span>OK</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

