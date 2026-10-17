"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authService } from "../../services/authService";
import { cryptoSyncService } from "../../services/cryptoSyncService";
import { syncEngine } from "../../lib/sync";
import { useAuth } from "../../context/AuthContext";
import { useAppContext } from "../../context/AppContext";
import PinCodeInput from "../ui/PinCodeInput";

interface ResetSyncCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  lang?: string;
}

export default function ResetSyncCodeModal({
  isOpen,
  onClose,
  onSuccess,
  lang = "en",
}: ResetSyncCodeModalProps) {
  const { user } = useAuth();
  const { showToast } = useAppContext();
  const isBn = lang === "bn";

  // Step 1: Verify Account Login Password
  // Step 2: Set New 6-Digit Device Sync PIN
  const [step, setStep] = useState<1 | 2>(1);

  // Cooldown status
  const [checkingMetadata, setCheckingMetadata] = useState(true);
  const [canReset, setCanReset] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(0);

  // Form states
  const [accountPassword, setAccountPassword] = useState("");
  const [newCode, setNewCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check 30-day cooldown when modal opens
  useEffect(() => {
    if (!isOpen || !user?.id) return;
    setCheckingMetadata(true);
    setError(null);
    setStep(1);
    setAccountPassword("");
    setNewCode("");
    setConfirmCode("");

    cryptoSyncService
      .getKeyMetadata(user.id)
      .then((meta) => {
        setCanReset(meta.canReset);
        setDaysRemaining(meta.daysRemaining);
      })
      .catch(() => {
        setCanReset(true);
        setDaysRemaining(0);
      })
      .finally(() => {
        setCheckingMetadata(false);
      });
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  // Step 1: Verify Account Password
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !accountPassword) return;

    if (!canReset) {
      setError(
        isBn
          ? `৩০ দিনের নিরাপত্তা নীতি সক্রিয়: পিন পরিবর্তন করতে আরও ${daysRemaining} দিন অপেক্ষা করতে হবে।`
          : `30-day cooldown active: Please wait ${daysRemaining} more days before changing your PIN.`
      );
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await authService.validateCredentials(user.email, accountPassword);
      if (!res.success) {
        setError(
          isBn
            ? "ভুল পাসওয়ার্ড। আপনার ফোসেন্টিয়া লগইন পাসওয়ার্ডটি সঠিকভাবে লিখুন।"
            : "Incorrect password. Please enter your valid Focentia login password."
        );
        return;
      }

      // Password verified! Proceed to Step 2
      setStep(2);
      setError(null);
    } catch (err: any) {
      setError(err?.message || (isBn ? "পাসওয়ার্ড যাচাই করতে সমস্যা হয়েছে।" : "Failed to verify password."));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Set New 6-Digit Device Sync PIN
  const handleSaveNewCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const cleanCode = newCode.trim();
    const cleanConfirm = confirmCode.trim();

    if (!/^\d{6}$/.test(cleanCode)) {
      setError(
        isBn
          ? "সিঙ্ক পিন অবশ্যই ঠিক ৬টি সংখ্যার হতে হবে।"
          : "Sync PIN must be exactly 6 numeric digits."
      );
      return;
    }

    if (cleanCode !== cleanConfirm) {
      setError(
        isBn
          ? "পিন দুটি মিলছে না। অনুগ্রহ করে পুনরায় পরীক্ষা করুন।"
          : "The PINs do not match. Please verify and re-enter."
      );
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await cryptoSyncService.resetSyncCode(user.id, cleanCode);
      if (!res.success) {
        if (res.daysRemaining && res.daysRemaining > 0) {
          setCanReset(false);
          setDaysRemaining(res.daysRemaining);
          setStep(1);
        }
        setError(res.error || (isBn ? "সিঙ্ক পিন সংরক্ষণ করতে সমস্যা হয়েছে।" : "Failed to save new sync PIN."));
        return;
      }

      // Success! Trigger background sync so local records are updated
      syncEngine.syncNow(user.id).catch(() => null);

      showToast(
        isBn
          ? "ডিভাইস সিঙ্ক পিন সফলভাবে সেট হয়েছে!"
          : "Device sync PIN successfully updated!",
        "success"
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || (isBn ? "একটি অপ্রত্যাশিত সমস্যা হয়েছে।" : "An unexpected error occurred."));
    } finally {
      setIsLoading(false);
    }
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
              {step === 1
                ? isBn
                  ? "লগইন পাসওয়ার্ড নিশ্চিত করুন"
                  : "Verify Account Password"
                : isBn
                ? "নতুন ৬ ডিজিটের সিঙ্ক পিন"
                : "Set New 6-Digit Sync PIN"}
            </h2>
            <p className="text-xs sm:text-[13px] text-[#52627A] dark:text-[#94A3B8] font-['Manrope'] mt-1.5 leading-relaxed">
              {step === 1
                ? isBn
                  ? "ডিভাইস সিঙ্ক পিন পরিবর্তন করতে আপনার ফোসেন্টিয়া অ্যাকাউন্টের মূল লগইন পাসওয়ার্ডটি লিখুন।"
                  : "Enter your primary Focentia account login password to change your device sync PIN."
                : isBn
                ? "অন্যান্য ডিভাইসে নিরাপদে ডেটা সিঙ্ক ও অ্যাক্সেস করতে ৬টি সংখ্যা দিয়ে আপনার পিন সেট করুন।"
                : "Set a 6-digit numeric PIN to decrypt and sync your data across your other devices."}
            </p>
          </div>

          {/* 30-Day Cooldown Notice */}
          {!canReset && daysRemaining > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/35 text-amber-800 dark:text-amber-200 text-xs leading-relaxed text-left">
              <strong className="block font-semibold mb-1">
                {isBn ? "৩০ দিনের সুরক্ষা নীতি সক্রিয়" : "30-Day Security Policy Active"}
              </strong>
              {isBn
                ? `নিরাপত্তার স্বার্থে পুনরায় পিন পরিবর্তন করতে আরও ${daysRemaining} দিন অপেক্ষা করতে হবে।`
                : `To protect your data, you can change your PIN again in ${daysRemaining} day${daysRemaining > 1 ? "s" : ""}.`}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-2.5 rounded-xl bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/35 text-red-700 dark:text-red-200 text-xs text-left leading-relaxed">
              {error}
            </div>
          )}

          {/* Step 1: Account Password Verification Form */}
          {step === 1 ? (
            <form onSubmit={handleVerifyPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] dark:text-[#F5F7FA] mb-1.5 font-['Manrope'] text-left">
                  {isBn ? "ফোসেন্টিয়া লগইন পাসওয়ার্ড" : "Focentia Login Password"}
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  disabled={isLoading || checkingMetadata || !canReset}
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder={isBn ? "আপনার লগইন পাসওয়ার্ড লিখুন..." : "Enter your account password..."}
                  className="w-full h-[42px] rounded-xl border border-[#DCE5F0] dark:border-slate-700/60 bg-[#FFFFFF] dark:bg-[#030816] text-[#111827] dark:text-white px-3.5 text-[14px] placeholder:text-[#8290A5] dark:placeholder:text-slate-500 focus:border-[#1a6cff] focus:outline-none transition-colors disabled:opacity-50"
                  style={{ boxShadow: "none" }}
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  style={{ boxShadow: "none", transform: "none", filter: "none" }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/60 cursor-pointer"
                >
                  {isBn ? "বাতিল" : "Cancel"}
                </button>

                <button
                  type="submit"
                  disabled={isLoading || checkingMetadata || !canReset || !accountPassword.trim()}
                  style={{ boxShadow: "none", transform: "none", filter: "none" }}
                  className="h-[42px] px-6 rounded-xl bg-[#1a6cff] text-white font-['Sora'] font-bold text-xs sm:text-[13px] cursor-pointer disabled:opacity-40 border-0"
                >
                  {isLoading
                    ? isBn ? "যাচাই হচ্ছে..." : "Verifying..."
                    : isBn ? "পরবর্তী ধাপ" : "Next Step"}
                </button>
              </div>
            </form>
          ) : (
            /* Step 2: Set New 6-Digit PIN Form with PinCodeInput */
            <form onSubmit={handleSaveNewCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] dark:text-[#F5F7FA] mb-2 font-['Manrope'] text-left">
                  {isBn ? "নতুন ৬ ডিজিটের পিন" : "New 6-Digit PIN"}
                </label>
                <PinCodeInput
                  value={newCode}
                  onChange={(val) => {
                    setNewCode(val);
                    if (error) setError(null);
                  }}
                  disabled={isLoading}
                  autoFocus
                  error={Boolean(error)}
                  idPrefix="modal-new-pin"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] dark:text-[#F5F7FA] mb-2 font-['Manrope'] text-left">
                  {isBn ? "পিন পুনরায় নিশ্চিত করুন" : "Confirm New PIN"}
                </label>
                <PinCodeInput
                  value={confirmCode}
                  onChange={(val) => {
                    setConfirmCode(val);
                    if (error) setError(null);
                  }}
                  disabled={isLoading}
                  autoFocus={false}
                  error={Boolean(error)}
                  idPrefix="modal-confirm-pin"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError(null);
                  }}
                  style={{ boxShadow: "none", transform: "none", filter: "none" }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/60 cursor-pointer"
                >
                  {isBn ? "পেছনে" : "Back"}
                </button>

                <button
                  type="submit"
                  disabled={isLoading || newCode.length !== 6 || confirmCode.length !== 6}
                  style={{ boxShadow: "none", transform: "none", filter: "none" }}
                  className="h-[42px] px-6 rounded-xl bg-[#1a6cff] text-white font-['Sora'] font-bold text-xs sm:text-[13px] cursor-pointer disabled:opacity-40 border-0"
                >
                  {isLoading
                    ? isBn ? "সংরক্ষণ হচ্ছে..." : "Saving..."
                    : isBn ? "নতুন পিন সেভ করুন" : "Save New PIN"}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
