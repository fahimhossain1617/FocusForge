"use client";

import React, { useEffect } from "react";
import { Trash2 } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  isLoading = false,
}: ConfirmDeleteModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-none select-none"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-[#DCE5F0] dark:border-white/10 bg-white dark:bg-[#0F1729] p-6 shadow-2xl flex flex-col gap-4 text-center items-center"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "var(--color-surface-elevated, #0F1729)",
        }}
      >
        {/* Red Icon Badge */}
        <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0">
          <Trash2 size={20} strokeWidth={2.2} />
        </div>

        {/* Text Area */}
        <div className="space-y-1.5 w-full">
          <h3
            id="confirm-delete-title"
            className="text-base font-semibold text-slate-900 dark:text-[#F5F7FA] tracking-tight"
          >
            {title}
          </h3>
          <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed px-1">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 w-full pt-1">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-[#DCE5F0] dark:border-white/10 transition-colors cursor-pointer disabled:opacity-50 shadow-none outline-none"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-none outline-none border-none"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
