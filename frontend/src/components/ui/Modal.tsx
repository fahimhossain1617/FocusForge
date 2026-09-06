"use client";

import { useEffect, useRef } from "react";
import { useAnimateExit } from "../../hooks/useAnimateExit";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxWidth?: string;
}

export default function Modal({ isOpen, onClose, children, title, maxWidth = "max-w-md" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const { shouldRender, isExiting } = useAnimateExit({ isOpen, durationMs: 200 });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return (
    <div
      ref={overlayRef}
      className={`${isExiting ? "motion-exit-fade" : "motion-overlay"} fixed inset-0 z-[90] flex items-center justify-center`}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Content */}
      <div className={`${isExiting ? "motion-exit-reveal" : "motion-reveal"} relative ${maxWidth} w-full mx-4`}>
        <div
          className="app-modal-panel rounded-2xl p-6 border"
          style={{
            background: "var(--color-bg-elevated)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          {title && (
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: "var(--color-text-muted)" }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
