"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { authService } from "../../services/authService";
import { cryptoSyncService } from "../../services/cryptoSyncService";
import { syncEngine } from "../../lib/sync";
import { useAuth } from "../../context/AuthContext";
import { useAppContext } from "../../context/AppContext";
import PinCodeInput from "../../components/ui/PinCodeInput";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";

function ResetPinContent() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { state, navigateTo } = useAppContext();

  const isBn = state?.lang === "bn";

  // Screen 1: Password Verification
  // Screen 2: Set 6-Digit PIN
  // Screen 3: Success Confirmation
  const [screen, setScreen] = useState<1 | 2 | 3>(1);

  // Cooldown status
  const [canReset, setCanReset] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(0);

  // Form states
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login");
    }
  }, [user, isAuthLoading, router]);

  // Check 30-day cooldown on mount
  useEffect(() => {
    if (!user?.id) return;
    cryptoSyncService
      .getKeyMetadata(user.id)
      .then((meta) => {
        setCanReset(meta.canReset);
        setDaysRemaining(meta.daysRemaining);
      })
      .catch(() => {
        setCanReset(true);
        setDaysRemaining(0);
      });
  }, [user?.id]);

  // Screen 1: Verify Account Login Password
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError(
        isBn
          ? "অনুগ্রহ করে আপনার ফোসেন্টিয়া পাসওয়ার্ডটি লিখুন।"
          : "Please enter your Focentia account password."
      );
      return;
    }

    if (!user?.email) {
      setError(isBn ? "ইউজার সেশন পাওয়া যায়নি।" : "User session not found.");
      return;
    }

    if (!canReset) {
      setError(
        isBn
          ? `৩০ দিনের নিরাপত্তা নীতি সক্রিয়: পিন পরিবর্তন করতে আরও ${daysRemaining} দিন অপেক্ষা করতে হবে।`
          : `30-day security policy active: You can reset your PIN in ${daysRemaining} days.`
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authService.validateCredentials(user.email, password);
      if (!res.success) {
        setError(
          isBn
            ? "ভুল পাসওয়ার্ড। আপনার ফোসেন্টিয়া অ্যাকাউন্টের সঠিক পাসওয়ার্ডটি দিন।"
            : "Incorrect password. Please enter your valid Focentia account password."
        );
        return;
      }

      // Password verified! Smoothly switch to Screen 2
      setScreen(2);
      setError(null);
    } catch (err: any) {
      setError(
        err?.message ||
          (isBn ? "পাসওয়ার্ড যাচাই করতে সমস্যা হয়েছে।" : "Password verification failed. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  // Screen 2: Save New 6-Digit PIN
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!/^\d{6}$/.test(newPin)) {
      setError(
        isBn
          ? "নতুন পিন অবশ্যই ঠিক ৬টি সংখ্যার হতে হবে।"
          : "PIN must be exactly 6 numeric digits."
      );
      return;
    }

    if (newPin !== confirmPin) {
      setError(
        isBn
          ? "উভয় পিন মেলেনি। অনুগ্রহ করে আবার পরীক্ষা করে লিখুন।"
          : "PINs do not match. Please verify and re-enter."
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await cryptoSyncService.resetSyncCode(user.id, newPin);
      if (!res.success) {
        if (res.daysRemaining && res.daysRemaining > 0) {
          setCanReset(false);
          setDaysRemaining(res.daysRemaining);
          setScreen(1);
        }
        setError(
          res.error ||
            (isBn ? "পিন সেভ করতে সমস্যা হয়েছে।" : "Failed to update sync PIN.")
        );
        return;
      }

      // Trigger background sync
      syncEngine.syncNow(user.id).catch(() => {});

      // Switch to Screen 3: Confirmation
      setScreen(3);

      // Smoothly navigate to dashboard after 2 seconds
      setTimeout(() => {
        navigateTo("today");
        router.replace("/");
      }, 2000);
    } catch (err: any) {
      setError(
        err?.message ||
          (isBn ? "পিন সংরক্ষণ করতে সমস্যা হয়েছে।" : "Failed to save new PIN.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-dvh w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-[#F3F7FC] dark:bg-[#0A0E1A] text-[#111827] dark:text-[#F5F7FA] transition-colors duration-150">
      {/* Centered Dedicated Card (Exact login card width, padding & radius) */}
      <div
        className="w-full max-w-[410px] rounded-[20px] p-[22px_26px] bg-[#FFFFFF] dark:bg-[#0F1729] border border-[#DCE5F0] dark:border-[rgba(26,108,255,0.22)] shadow-none box-border"
        style={{ boxShadow: "none" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {screen === 1 ? (
            /* =======================================================
               INTERFACE 1: VERIFY FOCENTIA ACCOUNT PASSWORD
               ======================================================= */
            <motion.div
              key="interface-1"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {/* Back navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer border-0 bg-transparent p-0 text-[#52627A] hover:text-[#111827] dark:text-[#94A3B8] dark:hover:text-white transition-colors"
                  aria-label="Back"
                >
                  <ArrowLeft size={16} strokeWidth={2.2} />
                  <span>{isBn ? "ফিরে যান" : "Back"}</span>
                </button>

                <span className="text-[11px] font-bold tracking-wider uppercase text-[#1a6cff] dark:text-[#3B82F6]">
                  {isBn ? "ধাপ ১: পাসওয়ার্ড যাচাই" : "Step 1 of 2"}
                </span>
              </div>

              {/* Title & Easy-to-understand Description */}
              <h1 className="text-xl sm:text-[22px] font-bold font-['Sora'] tracking-tight text-[#111827] dark:text-[#F5F7FA]">
                {isBn ? "অ্যাকাউন্ট পাসওয়ার্ড দিন" : "Verify Account Password"}
              </h1>

              <p className="text-xs sm:text-[13px] font-['Manrope'] mt-1.5 leading-relaxed text-[#52627A] dark:text-[#94A3B8]">
                {isBn
                  ? "আপনার সিঙ্ক পিন পরিবর্তন করার আগে আপনিই যে এই অ্যাকাউন্টের মালিক তা নিশ্চিত করতে ফোসেন্টিয়া লগইন পাসওয়ার্ড দিন। এটি আপনার নোট ও ডেটা সুরক্ষিত রাখে।"
                  : "Enter your Focentia login password to make sure it's you before changing your sync PIN. This keeps your private notes and tasks safe."}
              </p>

              {/* 30-Day Cooldown Notice */}
              {!canReset && daysRemaining > 0 && (
                <div className="my-3 p-3 rounded-[11px] text-xs leading-relaxed text-left border bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">
                  <strong className="block font-semibold mb-0.5">
                    {isBn ? "সুরক্ষা নীতি সক্রিয়:" : "Security Notice:"}
                  </strong>
                  {isBn
                    ? `আপনি আরও ${daysRemaining} দিন পর আবার পিন পরিবর্তন করতে পারবেন।`
                    : `You can change your PIN again in ${daysRemaining} day${daysRemaining > 1 ? "s" : ""}.`}
                </div>
              )}

              {/* Password Form */}
              <form onSubmit={handleVerifyPassword} className="mt-5 space-y-3.5">
                <div>
                  <label
                    htmlFor="focentia-login-password"
                    className="block text-xs font-semibold font-['Manrope'] mb-1.5 text-left text-[#111827] dark:text-[#F5F7FA]"
                  >
                    {isBn ? "ফোসেন্টিয়া লগইন পাসওয়ার্ড" : "Focentia Login Password"}
                  </label>

                  <div className="relative w-full">
                    <input
                      id="focentia-login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isBn ? "আপনার পাসওয়ার্ড লিখুন" : "Enter your password"}
                      required
                      autoFocus
                      disabled={loading || !canReset}
                      className="w-full h-[42px] rounded-[11px] px-3.5 pr-10 text-[14px] font-['Manrope'] outline-none box-border bg-[#FFFFFF] dark:bg-[#030816] border border-[#DCE5F0] dark:border-[rgba(26,108,255,0.25)] text-[#111827] dark:text-[#F5F7FA] placeholder:text-[#8290A5] dark:placeholder:text-[#64748B] focus:border-[#1a6cff]"
                      style={{ boxShadow: "none" }}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-transparent border-0 cursor-pointer text-[#52627A] dark:text-[#94A3B8]"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-2.5 rounded-[11px] text-xs text-left leading-relaxed border bg-red-50 border-red-200 text-red-700 dark:bg-red-500/15 dark:border-red-500/35 dark:text-red-200">
                    {error}
                  </div>
                )}

                {/* Flat solid button with NO hover effects or shadows */}
                <button
                  type="submit"
                  disabled={loading || !canReset || !password.trim()}
                  className="w-full h-[42px] rounded-[11px] bg-[#1a6cff] text-white font-['Sora'] font-bold text-[14px] tracking-tight cursor-pointer disabled:opacity-45 mt-2 flex items-center justify-center border-0"
                  style={{
                    boxShadow: "none",
                    transform: "none",
                    filter: "none",
                  }}
                >
                  {loading
                    ? isBn ? "যাচাই করা হচ্ছে..." : "Verifying..."
                    : isBn ? "পিন সেট করতে এগিয়ে যান" : "Continue to Set PIN"}
                </button>
              </form>
            </motion.div>
          ) : screen === 2 ? (
            /* =======================================================
               INTERFACE 2: CREATE NEW 6-DIGIT SYNC PIN
               ======================================================= */
            <motion.div
              key="interface-2"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              {/* Back navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setScreen(1);
                    setError(null);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer border-0 bg-transparent p-0 text-[#52627A] hover:text-[#111827] dark:text-[#94A3B8] dark:hover:text-white transition-colors"
                  aria-label="Back to password"
                >
                  <ArrowLeft size={16} strokeWidth={2.2} />
                  <span>{isBn ? "পাসওয়ার্ড ধাপে ফিরুন" : "Back to password"}</span>
                </button>

                <span className="text-[11px] font-bold tracking-wider uppercase text-[#1a6cff] dark:text-[#3B82F6]">
                  {isBn ? "ধাপ ২: নতুন পিন" : "Step 2 of 2"}
                </span>
              </div>

              {/* Title & Easy Explanation */}
              <h1 className="text-xl sm:text-[22px] font-bold font-['Sora'] tracking-tight text-[#111827] dark:text-[#F5F7FA]">
                {isBn ? "নতুন ৬ ডিজিটের পিন দিন" : "Create New Sync PIN"}
              </h1>

              <p className="text-xs sm:text-[13px] font-['Manrope'] mt-1.5 leading-relaxed text-[#52627A] dark:text-[#94A3B8]">
                {isBn
                  ? "একটি ৬ ডিজিটের পিন দিন। অন্য যেকোনো নতুন ফোন, ল্যাপটপ বা ট্যাবলেটে লগইন করলে এই পিন দিয়ে আপনার ডেটা সঙ্গে সঙ্গে সিঙ্ক হবে।"
                  : "Enter a 6-digit numeric PIN. When you log in on a new phone, laptop, or tablet, you will enter this PIN once to securely sync your data."}
              </p>

              {/* PIN Input Form with 6 separate boxes */}
              <form onSubmit={handleSavePin} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold font-['Manrope'] mb-2 text-left text-[#111827] dark:text-[#F5F7FA]">
                    {isBn ? "নতুন পিন (৬টি সংখ্যা)" : "New 6-Digit PIN"}
                  </label>
                  <PinCodeInput
                    value={newPin}
                    onChange={(val) => {
                      setNewPin(val);
                      if (error) setError(null);
                    }}
                    disabled={loading}
                    autoFocus={true}
                    error={Boolean(error)}
                    idPrefix="screen2-new-pin"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold font-['Manrope'] mb-2 text-left text-[#111827] dark:text-[#F5F7FA]">
                    {isBn ? "নতুন পিন নিশ্চিত করুন" : "Confirm New PIN"}
                  </label>
                  <PinCodeInput
                    value={confirmPin}
                    onChange={(val) => {
                      setConfirmPin(val);
                      if (error) setError(null);
                    }}
                    disabled={loading}
                    autoFocus={false}
                    error={Boolean(error)}
                    idPrefix="screen2-confirm-pin"
                  />
                </div>

                {error && (
                  <div className="p-2.5 rounded-[11px] text-xs text-left leading-relaxed border bg-red-50 border-red-200 text-red-700 dark:bg-red-500/15 dark:border-red-500/35 dark:text-red-200">
                    {error}
                  </div>
                )}

                {/* Flat solid button with NO hover effects or shadows */}
                <button
                  type="submit"
                  disabled={loading || newPin.length !== 6 || confirmPin.length !== 6}
                  className="w-full h-[42px] rounded-[11px] bg-[#1a6cff] text-white font-['Sora'] font-bold text-[14px] tracking-tight cursor-pointer disabled:opacity-45 mt-2 flex items-center justify-center border-0"
                  style={{
                    boxShadow: "none",
                    transform: "none",
                    filter: "none",
                  }}
                >
                  {loading
                    ? isBn ? "সংরক্ষণ করা হচ্ছে..." : "Saving PIN..."
                    : isBn ? "পিন সেভ ও ডিভাইস সিঙ্ক করুন" : "Save PIN & Sync Device"}
                </button>
              </form>
            </motion.div>
          ) : (
            /* =======================================================
               INTERFACE 3: CONFIRMATION SCREEN
               ======================================================= */
            <motion.div
              key="interface-3"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="text-center py-2"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <CheckCircle2 size={28} strokeWidth={2.4} />
              </div>

              <h2 className="text-xl font-bold font-['Sora'] tracking-tight text-[#111827] dark:text-[#F5F7FA]">
                {isBn ? "সিঙ্ক পিন সফলভাবে সেট হয়েছে!" : "Sync PIN Successfully Created!"}
              </h2>

              <p className="text-xs sm:text-[13px] font-['Manrope'] mt-2 leading-relaxed text-[#52627A] dark:text-[#94A3B8]">
                {isBn
                  ? "আপনার নতুন ৬ ডিজিটের সিঙ্ক পিন এখন সক্রিয়। যেকোনো ডিভাইসে ফোসেন্টিয়ায় লগইন করলে এই পিন দিয়ে আপনার সব ডেটা নিরাপদভাবে পেয়ে যাবেন।"
                  : "Your new 6-digit sync PIN is active. When you log in on any device, use this PIN to securely sync all your notes, tasks, and data."}
              </p>

              <button
                type="button"
                onClick={() => {
                  navigateTo("today");
                  router.replace("/");
                }}
                className="w-full h-[42px] rounded-[11px] bg-[#1a6cff] text-white font-['Sora'] font-bold text-[14px] tracking-tight cursor-pointer mt-5 flex items-center justify-center border-0"
                style={{
                  boxShadow: "none",
                  transform: "none",
                  filter: "none",
                }}
              >
                {isBn ? "ড্যাশবোর্ডে প্রবেশ করুন" : "Open Dashboard"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function ResetPinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F3F7FC] dark:bg-[#0A0E1A]" />}>
      <ResetPinContent />
    </Suspense>
  );
}
