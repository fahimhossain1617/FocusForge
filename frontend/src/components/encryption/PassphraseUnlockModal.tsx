"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";

interface PassphraseUnlockModalProps {
  isOpen: boolean;
  onUnlock: (passphrase: string) => Promise<{ success: boolean; error?: string }>;
  onCancel?: () => void;
  lang?: string;
}

export default function PassphraseUnlockModal({
  isOpen,
  onUnlock,
  onCancel,
  lang = "en",
}: PassphraseUnlockModalProps) {
  const isBn = lang === "bn";

  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await onUnlock(passphrase.trim());
      if (!res.success) {
        setError(res.error || (isBn ? "ভুল পাসফ্রেজ। অনুগ্রহ করে আবার চেষ্টা করুন।" : "Unable to unlock vault. Invalid passphrase."));
      }
    } catch (err: any) {
      setError(err?.message || (isBn ? "একটি ত্রুটি ঘটেছে।" : "An error occurred."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-md rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-6 sm:p-8 shadow-2xl overflow-hidden"
        >
          <div className="text-center space-y-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-500">
              <KeyRound className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
              {isBn ? "এনক্রিপ্ট করা ডেটা আনলক করুন" : "Unlock Encrypted Vault"}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed max-w-xs mx-auto">
              {isBn
                ? "আপনার ক্লাউড ব্যাকআপ ডিক্রিপ্ট এবং সিঙ্ক করতে আপনার মাস্টার পাসফ্রেজ বা রিকভারি কি দিন।"
                : "Enter your master passphrase or recovery key to decrypt your notes, diary, and tasks."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassphrase ? "text" : "password"}
                required
                autoFocus
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder={isBn ? "পাসফ্রেজ বা রিকভারি কি লিখুন..." : "Enter passphrase or FF-XXXX..."}
                className="w-full pl-3.5 pr-10 py-3 rounded-xl text-xs sm:text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"
              >
                {showPassphrase ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between gap-3">
              {onCancel ? (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                >
                  {isBn ? "পরে করুন" : "Later"}
                </button>
              ) : <div />}

              <button
                type="submit"
                disabled={isSubmitting || !passphrase.trim()}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-none cursor-pointer disabled:opacity-40 flex items-center gap-2"
              >
                <ShieldCheck size={14} />
                <span>{isSubmitting ? (isBn ? "আনলক হচ্ছে..." : "Unlocking...") : isBn ? "আনলক করুন" : "Unlock"}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
