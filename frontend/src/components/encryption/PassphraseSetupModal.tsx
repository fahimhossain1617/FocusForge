"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PinCodeInput from "../ui/PinCodeInput";

interface PassphraseSetupModalProps {
  isOpen: boolean;
  onComplete: (passphrase: string) => Promise<{ success: boolean; recoveryKey: string; error?: string }>;
  onDismiss?: () => void;
  lang?: string;
}

export default function PassphraseSetupModal({
  isOpen,
  onComplete,
  onDismiss,
  lang = "en",
}: PassphraseSetupModalProps) {
  const isBn = lang === "bn";

  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [confirmedWarning, setConfirmedWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success step to show generated recovery key
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPass = passphrase.trim();
    if (!/^\d{6}$/.test(cleanPass)) {
      setError(
        isBn
          ? "পিন কোড অবশ্যই ঠিক ৬টি সংখ্যার হতে হবে।"
          : "Sync PIN must be exactly 6 numeric digits."
      );
      return;
    }

    if (cleanPass !== confirmPassphrase.trim()) {
      setError(
        isBn
          ? "পিন দুটি মেলেনি। অনুগ্রহ করে আবার পরীক্ষা করুন।"
          : "PINs do not match. Please verify and try again."
      );
      return;
    }

    if (!confirmedWarning) {
      setError(
        isBn
          ? "অনুগ্রহ করে নিশ্চিত করুন যে আপনি সতর্কতা পড়েছেন।"
          : "Please confirm that you understand the security notice."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onComplete(passphrase);
      if (res.success) {
        setGeneratedKey(res.recoveryKey || passphrase);
      } else {
        setError(res.error || (isBn ? "সেটআপ ব্যর্থ হয়েছে।" : "Setup failed."));
      }
    } catch (err: any) {
      setError(err?.message || (isBn ? "একটি ত্রুটি ঘটেছে।" : "An unexpected error occurred."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2500);
  };

  const handleFinish = () => {
    if (onDismiss) onDismiss();
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
          {/* Header Title */}
          <div className="mb-5 text-left">
            <h2 className="text-xl font-bold font-['Sora'] tracking-tight text-[#111827] dark:text-[#F5F7FA]">
              {generatedKey
                ? isBn
                  ? "ডিভাইস সিঙ্ক সক্রিয় হয়েছে"
                  : "Device Sync Activated"
                : isBn
                ? "ডিভাইস সিঙ্ক পিন সেট করুন"
                : "Set Device Sync PIN"}
            </h2>
            <p className="text-xs sm:text-[13px] text-[#52627A] dark:text-[#94A3B8] font-['Manrope'] mt-1.5 leading-relaxed">
              {isBn
                ? "অন্য ডিভাইসে ডেটা সিঙ্ক ও অ্যাক্সেস করতে ৬টি সংখ্যার একটি পিন দিন।"
                : "Set a 6-digit numeric PIN to decrypt and sync your data across all your devices."}
            </p>
          </div>

          {!generatedKey ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 6-Digit Sync PIN */}
              <div>
                <label className="block text-xs font-semibold text-[#111827] dark:text-[#F5F7FA] mb-2 font-['Manrope'] text-left">
                  {isBn ? "৬ ডিজিটের পিন" : "6-Digit Sync PIN"}
                </label>
                <PinCodeInput
                  value={passphrase}
                  onChange={(val) => {
                    setPassphrase(val);
                    if (error) setError(null);
                  }}
                  disabled={isSubmitting}
                  autoFocus
                  error={Boolean(error)}
                  idPrefix="setup-pin"
                />
              </div>

              {/* Confirm 6-Digit PIN */}
              <div>
                <label className="block text-xs font-semibold text-[#111827] dark:text-[#F5F7FA] mb-2 font-['Manrope'] text-left">
                  {isBn ? "পিন পুনরায় নিশ্চিত করুন" : "Confirm 6-Digit PIN"}
                </label>
                <PinCodeInput
                  value={confirmPassphrase}
                  onChange={(val) => {
                    setConfirmPassphrase(val);
                    if (error) setError(null);
                  }}
                  disabled={isSubmitting}
                  autoFocus={false}
                  error={Boolean(error)}
                  idPrefix="setup-confirm-pin"
                />
              </div>

              {/* Security Notice */}
              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-left space-y-2">
                <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-['Manrope']">
                  {isBn
                    ? "অন্য যেকোনো ডিভাইসে লগইন করলে এই ৬ ডিজিটের পিন দিয়েই আপনি আপনার সব ডেটা সিঙ্ক করবেন।"
                    : "When logging in on another device, you will use this 6-digit PIN to access your synced data."}
                </p>

                <label className="flex items-center gap-2 pt-1 text-xs text-amber-800 dark:text-amber-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmedWarning}
                    onChange={(e) => setConfirmedWarning(e.target.checked)}
                    className="rounded border-slate-400 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    {isBn
                      ? "আমি বুঝেছি এবং পিনটি মনে রাখব।"
                      : "I understand and will remember my PIN."}
                  </span>
                </label>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/35 text-red-700 dark:text-red-200 text-xs text-left leading-relaxed">
                  {error}
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-3">
                {onDismiss ? (
                  <button
                    type="button"
                    onClick={onDismiss}
                    disabled={isSubmitting}
                    style={{ boxShadow: "none", transform: "none", filter: "none" }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/60 cursor-pointer"
                  >
                    {isBn ? "পরে করুন" : "Later"}
                  </button>
                ) : <div />}
                <button
                  type="submit"
                  disabled={isSubmitting || passphrase.length !== 6 || confirmPassphrase.length !== 6}
                  style={{ boxShadow: "none", transform: "none", filter: "none" }}
                  className="h-[42px] px-6 rounded-xl bg-[#1a6cff] text-white font-['Sora'] font-bold text-xs sm:text-[13px] cursor-pointer disabled:opacity-40 border-0"
                >
                  {isSubmitting ? (isBn ? "সংরক্ষণ হচ্ছে..." : "Saving...") : isBn ? "সেভ করুন" : "Save PIN"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-left">
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-center">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold mb-1">
                  {isBn ? "আপনার সিঙ্ক পিন সফলভাবে সেট হয়েছে" : "Sync PIN Successfully Set"}
                </p>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-200/90 leading-relaxed">
                  {isBn
                    ? "অন্য কোনো ডিভাইসে লগইন করলে এই ৬ ডিজিটের পিন দিয়ে আপনার সব ডেটা সিঙ্ক ও অ্যাক্সেস করতে পারবেন।"
                    : "When logging in on another device, use this 6-digit PIN to access your synced data."}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#030816] border border-slate-200 dark:border-slate-700/60 font-mono text-base text-center text-[#111827] dark:text-white tracking-widest font-bold">
                {generatedKey}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#1a6cff] dark:text-blue-400 hover:underline transition-colors cursor-pointer bg-transparent border-0"
                >
                  {keyCopied ? (isBn ? "কপি হয়েছে!" : "Copied!") : (isBn ? "পিন কপি করুন" : "Copy PIN")}
                </button>

                <button
                  type="button"
                  onClick={handleFinish}
                  style={{ boxShadow: "none", transform: "none", filter: "none" }}
                  className="h-[42px] px-6 rounded-xl bg-[#1a6cff] text-white font-['Sora'] font-bold text-xs sm:text-[13px] transition-colors cursor-pointer border-0"
                >
                  {isBn ? "সম্পন্ন" : "Done"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
