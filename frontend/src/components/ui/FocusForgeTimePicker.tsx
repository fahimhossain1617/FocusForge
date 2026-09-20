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

const DIAL = 150;
const R = 54;

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
    const pad = 8;
    const panelH = 265;
    const panelW = Math.min(230, vw - pad * 2);

    const spaceAbove = rect.top;
    const spaceBelow = vh - rect.bottom;
    const placement: "above" | "below" = (spaceBelow < panelH && spaceAbove > spaceBelow) ? "above" : "below";

    let left = rect.left;
    if (left + panelW > vw - pad) left = vw - pad - panelW;
    if (left < pad) left = pad;

    const top = placement === "above" 
      ? rect.top - panelH - 4 
      : rect.bottom + 4;

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
          className={`absolute flex items-center justify-center rounded-full select-none pointer-events-none ${
            isSelected
              ? "!text-white font-extrabold shadow-sm scale-110"
              : "!text-slate-900 font-bold"
          }`}
          style={{
            width: 24,
            height: 24,
            fontSize: 10,
            fontWeight: isSelected ? 800 : 700,
            left: x - 12,
            top: y - 12,
            color: isSelected ? "#FFFFFF" : "#0F172A",
            backgroundColor: isSelected ? "#223A5E" : "transparent",
          }}
        >
          {label}
        </span>
      );
    });
  };

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
        className={`group flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors outline-none cursor-pointer border bg-slate-50 border-slate-200 hover:border-[#223A5E] text-slate-900 shadow-xs ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${isOpen ? "ring-2 ring-[#223A5E]/20 border-[#223A5E]" : ""}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <Clock size={15} className="shrink-0 text-[#223A5E]" />
          <span className="truncate font-semibold text-slate-900">{value ? format12Display(value) : placeholder}</span>
        </div>
      </button>

      {/* Dropdown Panel — Compact Pure Light UI matching #223A5E */}
      {mounted && isOpen && pos && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="Select time"
          className="fixed z-[99999]"
          style={{
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            width: `${pos.width}px`,
          }}
        >
          <div
            className="rounded-2xl overflow-hidden shadow-xl bg-white border border-slate-200"
            style={{
              boxShadow: "0 12px 36px rgba(34, 58, 94, 0.14), 0 0 0 1px rgba(34, 58, 94, 0.04)",
            }}
          >
            {/* Header: HH:MM + AM/PM */}
            <div className="px-3 pt-2.5 pb-2 flex items-center justify-between border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-0.5 font-bold">
                <button
                  type="button"
                  onClick={() => setActiveUnit("hour")}
                  className={`text-base w-9 h-7 flex items-center justify-center rounded-lg cursor-pointer font-mono font-bold ${
                    activeUnit === "hour"
                      ? "!text-white shadow-xs"
                      : "text-slate-800 hover:bg-slate-200/70"
                  }`}
                  style={{
                    color: activeUnit === "hour" ? "#FFFFFF" : "#1E293B",
                    backgroundColor: activeUnit === "hour" ? "#223A5E" : "transparent",
                    borderColor: activeUnit === "hour" ? "#223A5E" : "transparent",
                  }}
                >
                  {String(hour12).padStart(2, "0")}
                </button>
                <span className="text-base text-slate-700 font-bold px-0.5">:</span>
                <button
                  type="button"
                  onClick={() => setActiveUnit("minute")}
                  className={`text-base w-9 h-7 flex items-center justify-center rounded-lg cursor-pointer font-mono font-bold ${
                    activeUnit === "minute"
                      ? "!text-white shadow-xs"
                      : "text-slate-800 hover:bg-slate-200/70"
                  }`}
                  style={{
                    color: activeUnit === "minute" ? "#FFFFFF" : "#1E293B",
                    backgroundColor: activeUnit === "minute" ? "#223A5E" : "transparent",
                    borderColor: activeUnit === "minute" ? "#223A5E" : "transparent",
                  }}
                >
                  {String(minute).padStart(2, "0")}
                </button>
              </div>

              <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-slate-100 p-0.5 gap-0.5">
                {(["AM", "PM"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-md cursor-pointer ${
                      period === p
                        ? "!text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    style={{
                      color: period === p ? "#FFFFFF" : "#475569",
                      backgroundColor: period === p ? "#223A5E" : "transparent",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Dial Area */}
            {inputMode === "dial" ? (
              <div className="flex items-center justify-center py-2.5 px-2 bg-white">
                <div
                  ref={dialRef}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  className="relative touch-none cursor-pointer select-none rounded-full bg-slate-50 border border-slate-200"
                  style={{
                    width: DIAL,
                    height: DIAL,
                  }}
                >
                  {renderNumbers()}

                  {/* Hand */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      width: 2,
                      height: R - 8,
                      left: center - 1,
                      top: center - (R - 8),
                      transformOrigin: `1px ${R - 8}px`,
                      transform: `rotate(${handAngle}deg)`,
                      background: "#223A5E",
                      borderRadius: 2,
                    }}
                  />

                  {/* Center dot */}
                  <div
                    className="absolute rounded-full bg-[#223A5E]"
                    style={{ width: 6, height: 6, left: center - 3, top: center - 3 }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 px-3 bg-white">
                <div className="flex flex-col items-center gap-0.5">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={typedHour}
                    onChange={(e) => setTypedHour(e.target.value)}
                    className="w-10 h-8 text-sm text-center font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-[#223A5E]"
                  />
                  <span className="text-[9px] text-slate-500 font-semibold">Hour</span>
                </div>
                <span className="text-base text-slate-700 font-bold mb-2.5">:</span>
                <div className="flex flex-col items-center gap-0.5">
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={typedMinute}
                    onChange={(e) => setTypedMinute(e.target.value)}
                    className="w-10 h-8 text-sm text-center font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-[#223A5E]"
                  />
                  <span className="text-[9px] text-slate-500 font-semibold">Min</span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setInputMode((m) => m === "dial" ? "keyboard" : "dial")}
                className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
                title={inputMode === "dial" ? "Switch to keyboard input" : "Switch to clock dial"}
              >
                {inputMode === "dial" ? <Keyboard size={13} /> : <Clock size={13} />}
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold !text-white shadow-xs cursor-pointer hover:opacity-90"
                  style={{
                    color: "#FFFFFF",
                    backgroundColor: "#223A5E",
                  }}
                >
                  <Check size={11} /> Set
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
