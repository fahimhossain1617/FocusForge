"use client";

import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface FocusForgeSelectProps {
  value: string | number;
  onChange: (e: any) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  ariaLabel?: string;
  required?: boolean;
}

export default function FocusForgeSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  className = "",
  id,
  name,
  ariaLabel,
  required = false,
}: FocusForgeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
    placement: "bottom" | "top";
  } | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Compute position for portal dropdown
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = Math.min(options.length * 44 + 16, 280);
    const placement = spaceBelow < estimatedHeight && rect.top > estimatedHeight ? "top" : "bottom";

    const top = placement === "bottom" 
      ? rect.bottom + 6 
      : rect.top - estimatedHeight - 6;

    setDropdownPos({
      top: Math.max(8, top),
      left: rect.left,
      width: rect.width,
      placement,
    });
  }, [options.length]);

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
    const currentIndex = options.findIndex((opt) => String(opt.value) === String(value));
    setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const handleSelect = useCallback(
    (optionValue: string | number) => {
      if (disabled) return;
      const strVal = String(optionValue);
      // Create synthetic event for compatibility with (e) => e.target.value
      const syntheticEvent = {
        target: { value: strVal, name: name || selectId, id: selectId },
        currentTarget: { value: strVal, name: name || selectId, id: selectId },
        value: strVal,
        preventDefault: () => {},
        stopPropagation: () => {},
      };

      if (typeof onChange === "function") {
        onChange(syntheticEvent);
      }
      handleClose();
      buttonRef.current?.focus();
    },
    [disabled, name, onChange, selectId, handleClose]
  );

  // Click outside & scroll listeners
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };

    const handleWindowResize = () => {
      updatePosition();
    };

    const handleWindowScroll = (e: Event) => {
      // If scroll happened inside the dropdown menu itself, don't close
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      updatePosition();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleWindowResize);
    window.addEventListener("scroll", handleWindowScroll, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleWindowResize);
      window.removeEventListener("scroll", handleWindowScroll, true);
    };
  }, [isOpen, handleClose, updatePosition]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        handleOpen();
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        handleClose();
        buttonRef.current?.focus();
        break;
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev + 1;
          while (next < options.length && options[next]?.disabled) next++;
          return next < options.length ? next : prev;
        });
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev - 1;
          while (next >= 0 && options[next]?.disabled) next--;
          return next >= 0 ? next : prev;
        });
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (highlightedIndex >= 0 && options[highlightedIndex] && !options[highlightedIndex].disabled) {
          handleSelect(options[highlightedIndex].value);
        }
        break;
      case "Tab":
        handleClose();
        break;
      default:
        break;
    }
  };

  return (
    <div className={`relative inline-block w-full text-left select-none ${className}`}>
      {/* Visual Custom FocusForge Select Button */}
      <button
        ref={buttonRef}
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? handleClose() : handleOpen())}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${selectId}-menu`}
        aria-label={ariaLabel || placeholder}
        aria-required={required}
        className={`group flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 outline-none cursor-pointer ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-blue-500/50"
        } ${
          isOpen
            ? "border-blue-500 ring-2 ring-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
            : ""
        }`}
        style={{
          background: "var(--picker-surface, rgba(15, 23, 42, 0.65))",
          borderColor: isOpen ? "var(--picker-border-focus, #3B82F6)" : "var(--picker-border, rgba(255, 255, 255, 0.12))",
          color: selectedOption ? "var(--picker-text-primary, #F8FAFC)" : "var(--picker-text-muted, #64748B)",
          borderWidth: "1px",
        }}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <ChevronDown
          size={16}
          className={`shrink-0 ml-2 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-400" : "text-zinc-400 group-hover:text-zinc-200"
          }`}
        />
      </button>

      {/* Floating Dropdown Menu via Portal */}
      {mounted && isOpen && dropdownPos && createPortal(
        <div
          ref={menuRef}
          id={`${selectId}-menu`}
          role="listbox"
          aria-label={ariaLabel || placeholder}
          className="fixed z-[99999] overflow-hidden rounded-2xl shadow-2xl animate-fade-in"
          style={{
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
            background: "var(--picker-bg, #0C1222)",
            borderColor: "var(--picker-border, rgba(255, 255, 255, 0.14))",
            borderWidth: "1px",
            borderStyle: "solid",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          }}
        >
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
            {options.map((option, idx) => {
              const isSelected = String(option.value) === String(value);
              const isHighlighted = idx === highlightedIndex;

              return (
                <button
                  key={`${option.value}-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-left transition-all duration-100 cursor-pointer ${
                    option.disabled ? "opacity-40 cursor-not-allowed" : ""
                  } ${
                    isSelected
                      ? "bg-blue-600/20 text-blue-400 shadow-[inset_0_0_8px_rgba(59,130,246,0.1)]"
                      : isHighlighted
                      ? "bg-white/10 dark:bg-white/5 text-white"
                      : "text-zinc-300 dark:text-zinc-300 hover:text-white"
                  }`}
                  style={{
                    color: isSelected 
                      ? "var(--picker-border-focus, #3B82F6)" 
                      : isHighlighted 
                      ? "var(--picker-text-primary, #F8FAFC)" 
                      : "var(--picker-text-secondary, #94A3B8)",
                  }}
                >
                  <span className="truncate pr-2">{option.label}</span>
                  {isSelected && (
                    <Check
                      size={15}
                      className="shrink-0 text-blue-500 stroke-[2.5]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
