"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import PinCodeInput from "../ui/PinCodeInput";

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
  const router = useRouter();
  const isBn = lang === "bn";

  const [passphrase, setPassphrase] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = passphrase.trim();
    if (!/^\d{6}$/.test(cleanPass)) {
      setError(
        isBn
          ? "পিন কোড অবশ্যই ঠিক ৬টি সংখ্যার হতে হবে।"
          : "Sync PIN must be exactly 6 numeric digits."
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await onUnlock(cleanPass);
      if (!res.success) {
        setError(
          res.error ||
            (isBn
              ? "ভুল পিন কোড। অনুগ্রহ করে আবার চেষ্টা করুন।"
              : "Incorrect PIN. Please try again.")
        );
      }
    } catch (err: any) {
      setError(err?.message || (isBn ? "একটি ত্রুটি ঘটেছে।" : "An error occurred."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPinClick = () => {
    if (onCancel) onCancel();
    router.push("/reset-pin");
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/25 dark:bg-black/60">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="w-full max-w-[420px] rounded-[20px] border border-[#DCE5F0] dark:border-[rgba(26,108,255,0.22)] bg-[#FFFFFF] dark:bg-[#0F1729] p-6 sm:p-7 shadow-none overflow-hidden"
          style={{ boxShadow: "none" }}
        >
          {/* Header */}
          <div className="mb-5 text-left">
            <h2 className="text-xl font-bold font-['Sora'] tracking-tight text-[#111827] dark:text-[#F5F7FA]">
              {isBn ? "ডিভাইস সিঙ্ক আনলক" : "Unlock Device Sync"}
            </h2>
            <p className="text-xs sm:text-[13px] text-[#52627A] dark:text-[#94A3B8] font-['Manrope'] mt-1.5 leading-relaxed">
              {isBn
                ? "অন্য ডিভাইসে ডেটা সিঙ্ক ও অ্যাক্সেস করতে আপনার ৬ ডিজিটের পিন দিন।"
                : "Enter your 6-digit PIN to access your synced data on this device."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#111827] dark:text-[#F5F7FA] mb-2 font-['Manrope'] text-left">
                {isBn ? "৬ ডিজিটের পিন দিন" : "Enter 6-Digit PIN"}
              </label>

              {/* 6-box PIN input */}
              <PinCodeInput
                value={passphrase}
                onChange={(val) => {
                  setPassphrase(val);
                  if (error) setError(null);
                }}
                disabled={isSubmitting}
                autoFocus={true}
                error={Boolean(error)}
                idPrefix="unlock-pin"
              />

              {/* Forgot PIN link under boxes on right side */}
              <div className="flex justify-end mt-2.5">
                <button
                  type="button"
                  onClick={handleForgotPinClick}
                  className="text-xs font-semibold text-[#1a6cff] dark:text-blue-400 hover:underline cursor-pointer transition-colors bg-transparent border-0 p-0"
                >
                  {isBn ? "ফরগেট পিন?" : "Forgot PIN?"}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/35 text-red-700 dark:text-red-200 text-xs text-left leading-relaxed">
                {error}
              </div>
            )}

            <div className="pt-2 flex items-center justify-between gap-3">
              {onCancel ? (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  style={{ boxShadow: "none", transform: "none", filter: "none" }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700/60 cursor-pointer transition-colors"
                >
                  {isBn ? "পরে করুন" : "Later"}
                </button>
              ) : <div />}

              <button
                type="submit"
                disabled={isSubmitting || passphrase.length !== 6}
                style={{ boxShadow: "none", transform: "none", filter: "none" }}
                className="h-[42px] px-6 rounded-xl bg-[#1a6cff] text-white font-['Sora'] font-bold text-xs sm:text-[13px] cursor-pointer disabled:opacity-40 border-0"
              >
                {isSubmitting
                  ? isBn
                    ? "আনলক হচ্ছে..."
                    : "Unlocking..."
                  : isBn
                  ? "সিঙ্ক আনলক করুন"
                  : "Unlock & Sync"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
