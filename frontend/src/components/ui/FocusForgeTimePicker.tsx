"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Clock, Keyboard, Check } from "lucide-react";

export interface FocusForgeTimePickerProps {
  value: string;
  onChange: (valueOrEvent: any) => void;
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

function parse24to12(timeStr?: string): { hour12: number; minute: number; period: "AM" | "PM" } {
  if (!timeStr) {
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes();
    const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return { hour12: h, minute: m, period };
  }
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr || "12", 10);
  const m = parseInt(mStr || "0", 10);
  if (isNaN(h)) h = 12;
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  return { hour12: h % 12 || 12, minute: isNaN(m) ? 0 : Math.min(59, Math.max(0, m)), period };
}

function format12to24(hour12: number, minute: number, period: "AM" | "PM"): string {
  let h = hour12 % 12;
  if (period === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function format12Display(timeStr?: string): string {
  if (!timeStr) return "";
  const { hour12, minute, period } = parse24to12(timeStr);
  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
}

const DIAL = 180;
const R = 68;

export default function FocusForgeTimePicker({
  value, onChange, placeholder = "Select time", disabled = false,
  className = "", id, name, ariaLabel, required = false, clearable = true,
}: FocusForgeTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeUnit, setActiveUnit] = useState<"hour" | "minute">("hour");
  const [inputMode, setInputMode] = useState<"dial" | "keyboard">("dial");
  const [hour12, setHour12] = useState(12);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<"AM" | "PM">("AM");
  const [typedHour, setTypedHour] = useState("12");
  const [typedMinute, setTypedMinute] = useState("00");
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; placement: "above" | "below" } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dialRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  // Position the dropdown relative to the trigger, clamped inside viewport
  const computePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 12;
    const panelH = 340;
    const panelW = Math.min(260, vw - pad * 2);

    const spaceAbove = rect.top;
    const spaceBelow = vh - rect.bottom;
    const placement: "above" | "below" = (spaceBelow < panelH && spaceAbove > spaceBelow) ? "above" : "below";

    let left = rect.left;
    if (left + panelW > vw - pad) left = vw - pad - panelW;
    if (left < pad) left = pad;

    const top = placement === "above" 
      ? rect.top - panelH - 6 
      : rect.bottom + 6;

    setPos({ top: Math.max(pad, top), left, width: panelW, placement });
  }, []);

  const handleOpen = () => {
    if (disabled) return;
    const parsed = parse24to12(value);
    setHour12(parsed.hour12);
    setMinute(parsed.minute);
    setPeriod(parsed.period);
    setTypedHour(String(parsed.hour12));
    setTypedMinute(String(parsed.minute).padStart(2, "0"));
    setActiveUnit("hour");
    setInputMode("dial");
    computePos();
    setIsOpen(true);
  };

  const handleClose = useCallback(() => { setIsOpen(false); }, []);

  // Close on outside click & Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, handleClose]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    const handler = () => computePos();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [isOpen, computePos]);

  const handleDialPointer = useCallback((clientX: number, clientY: number, commit: boolean) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let angle = Math.atan2(clientX - cx, -(clientY - cy)) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    if (activeUnit === "hour") {
      const raw = Math.round(angle / 30) % 12;
      const h = raw === 0 ? 12 : raw;
      setHour12(h);
      setTypedHour(String(h));
      if (commit) setTimeout(() => setActiveUnit("minute"), 150);
    } else {
      const m = Math.round(angle / 6) % 60;
      setMinute(m);
      setTypedMinute(String(m).padStart(2, "0"));
    }
  }, [activeUnit]);

  const onPointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    handleDialPointer(e.clientX, e.clientY, false);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (isDraggingRef.current) handleDialPointer(e.clientX, e.clientY, false);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    handleDialPointer(e.clientX, e.clientY, true);
  };

  const handleConfirm = () => {
    let fH = hour12, fM = minute;
    if (inputMode === "keyboard") {
      const pH = parseInt(typedHour, 10);
      const pM = parseInt(typedMinute, 10);
      if (!isNaN(pH)) fH = Math.min(12, Math.max(1, pH));
      if (!isNaN(pM)) fM = Math.min(59, Math.max(0, pM));
    }
    const v = format12to24(fH, fM, period);
    onChange?.({ target: { value: v, name, id }, currentTarget: { value: v, name, id }, value: v });
    handleClose();
  };

  const handleClear = () => {
    onChange?.({ target: { value: "", name, id }, currentTarget: { value: "", name, id }, value: "" });
    handleClose();
  };

  const handAngle = activeUnit === "hour" ? (hour12 % 12) * 30 : minute * 6;
  const center = DIAL / 2;

  const renderNumbers = () => {
    const items = activeUnit === "hour"
      ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    return items.map((n) => {
      const deg = activeUnit === "hour" ? ((n % 12) * 30 - 90) : (n * 6 - 90);
      const rad = (deg * Math.PI) / 180;
      const x = center + R * Math.cos(rad);
      const y = center + R * Math.sin(rad);
      const isSelected = activeUnit === "hour" ? n === hour12 : n === Math.round(minute / 5) * 5;
      const label = activeUnit === "hour" ? String(n) : String(n).padStart(2, "0");

      return (
        <span
          key={n}
          className={`absolute flex items-center justify-center rounded-full select-none pointer-events-none transition-all duration-100 ${
            isSelected
              ? "bg-blue-600 text-white font-bold shadow-[0_0_10px_rgba(37,99,235,0.5)]"
              : "text-zinc-400"
          }`}
          style={{
            width: 28, height: 28, fontSize: 11, fontWeight: isSelected ? 700 : 600,
            left: x - 14, top: y - 14,
          }}
        >
          {label}
        </span>
      );
    });
  };

  return (
    <div className={`relative inline-block w-full text-left select-none ${className}`}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? handleClose() : handleOpen())}
        aria-label={ariaLabel || placeholder}
        aria-required={required}
        aria-expanded={isOpen}
        className={`group flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm font-medium transition-all outline-none cursor-pointer border ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-blue-500/40"
        }`}
        style={{
          background: "var(--picker-surface, rgba(15,23,42,0.65))",
          borderColor: isOpen ? "var(--picker-border-focus, #3B82F6)" : "var(--picker-border, rgba(255,255,255,0.12))",
          color: value ? "var(--picker-text-primary, #F8FAFC)" : "var(--picker-text-muted, #64748B)",
        }}
      >
        <div className="flex items-center gap-2 truncate">
          <Clock size={14} className="shrink-0 text-blue-400" />
          <span className="truncate">{value ? format12Display(value) : placeholder}</span>
        </div>
      </button>

      {/* Dropdown Panel — positioned directly below/above trigger */}
      {mounted && isOpen && pos && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="Select time"
          className="fixed z-[99999] animate-fade-in"
          style={{
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            width: `${pos.width}px`,
          }}
        >
          <div
            className="rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: "var(--picker-bg, #0C1222)",
              border: "1px solid var(--picker-border, rgba(255,255,255,0.10))",
              boxShadow: "0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            {/* Header: HH:MM + AM/PM */}
            <div className="px-3 pt-3 pb-2 flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--picker-border, rgba(255,255,255,0.08))" }}
            >
              <div className="flex items-center gap-0.5 font-bold">
                <button type="button" onClick={() => setActiveUnit("hour")}
                  className={`text-xl w-10 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer font-mono ${
                    activeUnit === "hour"
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/35"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  {String(hour12).padStart(2, "0")}
                </button>
                <span className="text-lg text-zinc-500 px-0.5">:</span>
                <button type="button" onClick={() => setActiveUnit("minute")}
                  className={`text-xl w-10 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer font-mono ${
                    activeUnit === "minute"
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/35"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  {String(minute).padStart(2, "0")}
                </button>
              </div>

              <div className="flex rounded-lg overflow-hidden border"
                style={{ background: "rgba(0,0,0,0.25)", borderColor: "var(--picker-border, rgba(255,255,255,0.08))" }}
              >
                {(["AM", "PM"] as const).map((p) => (
                  <button key={p} type="button" onClick={() => setPeriod(p)}
                    className={`px-2 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                      period === p ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Dial */}
            {inputMode === "dial" ? (
              <div className="flex items-center justify-center py-3 px-2">
                <div
                  ref={dialRef}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  className="relative touch-none cursor-pointer select-none rounded-full"
                  style={{
                    width: DIAL, height: DIAL,
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid var(--picker-border, rgba(255,255,255,0.07))",
                  }}
                >
                  {renderNumbers()}

                  {/* Hand */}
                  <div className="absolute pointer-events-none"
                    style={{
                      width: 2, height: R - 10,
                      left: center - 1, top: center - (R - 10),
                      transformOrigin: `1px ${R - 10}px`,
                      transform: `rotate(${handAngle}deg)`,
                      background: "linear-gradient(to top, rgba(37,99,235,0.5), #3B82F6)",
                      borderRadius: 2, transition: "transform 0.08s ease",
                    }}
                  />

                  {/* Center dot */}
                  <div className="absolute rounded-full bg-blue-500"
                    style={{ width: 8, height: 8, left: center - 4, top: center - 4 }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-4 px-4">
                <div className="flex flex-col items-center gap-0.5">
                  <input type="number" min={1} max={12} value={typedHour}
                    onChange={(e) => setTypedHour(e.target.value)}
                    className="w-12 h-10 text-lg text-center font-bold rounded-xl border bg-white/5 focus:outline-none focus:border-blue-500"
                    style={{ borderColor: "var(--picker-border)", color: "var(--picker-text-primary, #F8FAFC)" }}
                  />
                  <span className="text-[9px] text-zinc-500">Hour</span>
                </div>
                <span className="text-lg text-zinc-500 font-bold mb-3">:</span>
                <div className="flex flex-col items-center gap-0.5">
                  <input type="number" min={0} max={59} value={typedMinute}
                    onChange={(e) => setTypedMinute(e.target.value)}
                    className="w-12 h-10 text-lg text-center font-bold rounded-xl border bg-white/5 focus:outline-none focus:border-blue-500"
                    style={{ borderColor: "var(--picker-border)", color: "var(--picker-text-primary, #F8FAFC)" }}
                  />
                  <span className="text-[9px] text-zinc-500">Min</span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-2"
              style={{ borderTop: "1px solid var(--picker-border, rgba(255,255,255,0.08))" }}
            >
              <button type="button"
                onClick={() => setInputMode((m) => m === "dial" ? "keyboard" : "dial")}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                {inputMode === "dial" ? <Keyboard size={14} /> : <Clock size={14} />}
              </button>
              <div className="flex items-center gap-1">
                {clearable && (
                  <button type="button" onClick={handleClear}
                    className="px-2 py-1 rounded-lg text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >Clear</button>
                )}
                <button type="button" onClick={handleClose}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >Cancel</button>
                <button type="button" onClick={handleConfirm}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Check size={12} /> Set
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
