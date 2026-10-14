"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, Key, Copy, Check } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

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
  const { t } = useTranslation();
  const isBn = lang === "bn";

  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
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

    if (passphrase.length < 8) {
      setError(
        isBn
          ? "পাসফ্রেজ কমপক্ষে ৮ অক্ষরের হতে হবে।"
          : "Passphrase must be at least 8 characters long."
      );
      return;
    }

    if (passphrase !== confirmPassphrase) {
      setError(
        isBn
          ? "পাসফ্রেজ দুটি মেলেনি। অনুগ্রহ করে আবার পরীক্ষা করুন।"
          : "Passphrases do not match. Please verify and try again."
      );
      return;
    }

    if (!confirmedWarning) {
      setError(
        isBn
          ? "অনুগ্রহ করে নিশ্চিত করুন যে আপনি রিকভারি সতর্কতা পড়েছেন।"
          : "Please confirm that you understand the recovery warning."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onComplete(passphrase);
      if (res.success) {
        setGeneratedKey(res.recoveryKey || passphrase);
      } else {
        setError(res.error || (isBn ? "এনক্রিপশন সেটআপ ব্যর্থ হয়েছে।" : "Encryption setup failed."));
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-lg rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-6 sm:p-8 shadow-2xl overflow-hidden relative"
        >
          {/* Header Title (Clean, no leading icon, simple friendly words) */}
          <div className="mb-5">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
              {generatedKey
                ? isBn
                  ? "সুরক্ষা সফলভাবে তৈরি হয়েছে!"
                  : "Protection Activated!"
                : isBn
                ? "নোট ও টাস্ক সুরক্ষিত করুন"
                : "Protect Your Private Notes"}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              {isBn
                ? "একটি সহজ পাসওয়ার্ড সেট করুন যাতে আপনার নোট, ডায়েরি ও টাস্ক আপনি ছাড়া কেউ দেখতে না পারে।"
                : "Set a password so only you can unlock and read your notes, diary, and tasks."}
            </p>
          </div>

          {!generatedKey ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Passphrase Input */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">
                  {isBn ? "পাসওয়ার্ড তৈরি করুন" : "Create a Password"} <span className="text-blue-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassphrase ? "text" : "password"}
                    required
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder={isBn ? "কমপক্ষে ৮ অক্ষরের একটি পাসওয়ার্ড লিখুন..." : "Enter at least 8 characters..."}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-xs sm:text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"
                  >
                    {showPassphrase ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Passphrase */}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">
                  {isBn ? "পাসওয়ার্ড নিশ্চিত করুন" : "Confirm Password"} <span className="text-blue-500">*</span>
                </label>
                <input
                  type={showPassphrase ? "text" : "password"}
                  required
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder={isBn ? "একই পাসওয়ার্ড আবার লিখুন..." : "Type your password again..."}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Recovery Warning with simple words */}
              <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-[var(--color-text-primary)] font-medium leading-relaxed">
                    {isBn
                      ? "জরুরি সতর্কতা: আমরা আপনার পাসওয়ার্ড সেভ রাখি না। আপনি পাসওয়ার্ড ভুলে গেলে আপনার লক করা নোট আর উদ্ধার করা সম্ভব নয়।"
                      : "Important Notice: We do not store your password. If you lose or forget it, your locked private notes and tasks cannot be recovered."}
                  </p>
                </div>

                <label className="flex items-center gap-2.5 pt-1 text-xs text-[var(--color-text-secondary)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmedWarning}
                    onChange={(e) => setConfirmedWarning(e.target.checked)}
                    className="rounded border-[var(--color-border-subtle)] text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    {isBn
                      ? "আমি বুঝেছি এবং পাসওয়ার্ডটি মনে রাখব।"
                      : "I understand and will remember my password."}
                  </span>
                </label>
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
                  {error}
                </p>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                {onDismiss && (
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                  >
                    {isBn ? "পরে করুন" : "Later"}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-none cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Lock size={14} />
                  <span>{isSubmitting ? (isBn ? "সংরক্ষণ হচ্ছে..." : "Saving...") : isBn ? "সুরক্ষা চালু করুন" : "Turn On Protection"}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-2 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs text-[var(--color-text-primary)] font-semibold">
                  {isBn ? "আপনার ব্যাকআপ কি সুরক্ষিতভাবে তৈরি হয়েছে" : "Your Backup Key Has Been Created"}
                </p>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  {isBn
                    ? "অন্য কোনো ডিভাইসে লগইন করলে এই কি অথবা আপনার পাসওয়ার্ড দিয়ে নোট আনলক করতে পারবেন।"
                    : "You can use this backup key or your password to unlock your notes on any new device."}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] font-mono text-xs text-center text-[var(--color-text-primary)] break-all select-all tracking-wider">
                {generatedKey}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {keyCopied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{keyCopied ? (isBn ? "কপি হয়েছে!" : "Copied!") : (isBn ? "কি কপি করুন" : "Copy Key")}</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-none cursor-pointer"
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
