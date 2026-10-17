"use client";

import React, { useRef, useEffect } from "react";

interface PinCodeInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: boolean;
  idPrefix?: string;
}

export default function PinCodeInput({
  value,
  onChange,
  disabled = false,
  autoFocus = true,
  error = false,
  idPrefix = "pin-input",
}: PinCodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  useEffect(() => {
    if (autoFocus && !disabled && inputRefs.current[0]) {
      const firstEmptyIdx = digits.findIndex((d) => d === "");
      const targetIdx = firstEmptyIdx === -1 ? 5 : firstEmptyIdx;
      inputRefs.current[targetIdx]?.focus();
    }
  }, []);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    if (!rawVal) {
      // Cleared
      const newChars = [...digits];
      newChars[index] = "";
      onChange(newChars.join(""));
      return;
    }

    // Single or multiple digits
    const chars = rawVal.split("");
    const newChars = [...digits];
    let nextFocusIdx = index;

    for (let i = 0; i < chars.length && index + i < 6; i++) {
      newChars[index + i] = chars[i];
      nextFocusIdx = Math.min(5, index + i + 1);
    }

    onChange(newChars.join(""));
    inputRefs.current[nextFocusIdx]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Move back and clear previous
        const newChars = [...digits];
        newChars[index - 1] = "";
        onChange(newChars.join(""));
        inputRefs.current[index - 1]?.focus();
        e.preventDefault();
      } else if (digits[index]) {
        const newChars = [...digits];
        newChars[index] = "";
        onChange(newChars.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasteData) return;
    onChange(pasteData);
    const focusIdx = Math.min(5, pasteData.length);
    inputRefs.current[focusIdx]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-2.5 w-full">
      {Array.from({ length: 6 }).map((_, idx) => {
        const isFilled = Boolean(digits[idx]);
        return (
          <input
            key={idx}
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            id={`${idPrefix}-${idx}`}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            disabled={disabled}
            value={digits[idx] || ""}
            onChange={(e) => handleChange(idx, e)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            style={{ boxShadow: "none" }}
            className={`w-10 h-12 sm:w-11 sm:h-13 text-center text-lg sm:text-xl font-bold font-mono rounded-xl outline-none transition-colors duration-150 box-border
              ${
                error
                  ? "border-2 border-red-500 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                  : isFilled
                  ? "border-2 border-[#1a6cff] bg-[#FFFFFF] text-[#111827] dark:bg-[#030816] dark:text-[#F5F7FA] dark:border-[#1a6cff]"
                  : "border border-[#DCE5F0] bg-[#FFFFFF] text-[#111827] dark:border-slate-700/70 dark:bg-[#030816] dark:text-[#F5F7FA] focus:border-[#1a6cff] dark:focus:border-[#1a6cff]"
              }
            `}
            aria-label={`PIN digit ${idx + 1}`}
          />
        );
      })}
    </div>
  );
}
