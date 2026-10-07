"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, Copy, Check, ShieldCheck, X } from "lucide-react";

interface RecoveryKeyExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  recoveryKey: string;
  lang?: string;
}

export default function RecoveryKeyExportModal({
  isOpen,
  onClose,
  recoveryKey,
  lang = "en",
}: RecoveryKeyExportModalProps) {
  const isBn = lang === "bn";
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(recoveryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-lg rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-6 sm:p-8 shadow-2xl overflow-hidden relative space-y-5"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Key className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
                {isBn ? "সিক্রেট রিকভারি কি" : "Secret Recovery Key"}
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                {isBn
                  ? "নতুন ডিভাইসে ডেটা আনলক করার জন্য এই কি-টি প্রয়োজন হবে।"
                  : "Keep this key safe to unlock your data on other authorized devices."}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] font-mono text-xs text-center text-[var(--color-text-primary)] break-all select-all tracking-wider">
            {recoveryKey || "No key generated"}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? (isBn ? "কপি হয়েছে!" : "Copied!") : (isBn ? "কপি করুন" : "Copy Key")}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-none cursor-pointer"
            >
              {isBn ? "বন্ধ করুন" : "Close"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
