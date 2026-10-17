"use client";

import React, { useState } from "react";
import Link from "next/link";
import PassphraseUnlockModal from "@/components/encryption/PassphraseUnlockModal";
import ResetSyncCodeModal from "@/components/encryption/ResetSyncCodeModal";

export default function DeviceSyncDemoPage() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const [showUnlockModal, setShowUnlockModal] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [currentSyncCode, setCurrentSyncCode] = useState("482910");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  const isBn = lang === "bn";

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    const root = document.documentElement;
    if (nextDark) {
      root.classList.add("dark");
      root.classList.remove("light");
      root.dataset.theme = "dark";
      localStorage.setItem("focusforge_theme", "dark");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      root.dataset.theme = "light";
      localStorage.setItem("focusforge_theme", "light");
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleUnlock = async (code: string) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (code === currentSyncCode) {
      triggerToast(
        isBn
          ? "সিঙ্ক পিন সঠিক! ডিভাইস সফলভাবে আনলক ও ডেটা সিঙ্ক হয়েছে।"
          : "Sync PIN valid! Device successfully unlocked & synced."
      );
      setShowUnlockModal(false);
      return { success: true };
    }
    return {
      success: false,
      error: isBn
        ? "ভুল পিন। আপনার ৬ ডিজিটের সঠিক পিন দিন বা 'ফরগেট পিন?' লিঙ্কে ক্লিক করুন।"
        : "Invalid PIN. Enter your valid 6-digit PIN or click 'Forgot PIN?'.",
    };
  };

  return (
    <main className="min-h-screen w-full bg-[#F3F7FC] dark:bg-[#0A0E1A] text-[#111827] dark:text-white flex flex-col items-center p-4 sm:p-8 font-['Manrope'] relative transition-colors duration-150">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 z-50 px-5 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-medium shadow-none animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Header bar */}
      <div className="w-full max-w-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 mb-6 border-b border-slate-200 dark:border-blue-500/20">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-['Sora'] tracking-tight text-[#111827] dark:text-white">
            {isBn ? "ডিভাইস সিঙ্ক ও ফরগেট পিন ডেমো" : "Device Sync & Forgot PIN Demo"}
          </h1>
          <p className="text-xs text-[#52627A] dark:text-slate-400 mt-1">
            {isBn
              ? "৬ ডিজিটের বক্স পিন, ব্লারহীন ব্যাকড্রপ, ফরগেট পিন এবং সম্পূর্ণ নতুন ইন্টারফেসের লাইভ প্রিভিউ।"
              : "Live preview of 6-box numeric PIN, blurless backdrop, Forgot PIN flow & dedicated auth layout."}
          </p>
        </div>

        {/* Controls: Language & Theme toggles */}
        <div className="flex items-center gap-2">
          {/* Theme Switcher Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border border-[#DCE5F0] dark:border-blue-500/25 bg-white dark:bg-[#090e1f] text-[#111827] dark:text-white hover:bg-slate-50 dark:hover:bg-blue-500/10 transition-colors shadow-none"
            style={{ boxShadow: "none" }}
          >
            {isDark ? (
              <>
                <span>🌙</span>
                <span>Dark</span>
              </>
            ) : (
              <>
                <span>☀️</span>
                <span>Light</span>
              </>
            )}
          </button>

          {/* Language switch */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-[#090e1f] border border-[#DCE5F0] dark:border-blue-500/25">
            <button
              type="button"
              onClick={() => setLang("bn")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                isBn ? "bg-[#1a6cff] text-white" : "text-[#52627A] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white"
              }`}
            >
              বাংলা
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                !isBn ? "bg-[#1a6cff] text-white" : "text-[#52627A] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white"
              }`}
            >
              English
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Current State Dashboard Card */}
      <div className="w-full max-w-2xl rounded-2xl border border-[#DCE5F0] dark:border-blue-500/20 bg-[#FFFFFF] dark:bg-[#0F1729] p-6 space-y-5 mb-8 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-blue-500/15">
          <div>
            <span className="text-xs text-[#52627A] dark:text-slate-400 uppercase tracking-wider font-semibold block">
              {isBn ? "বর্তমান সক্রিয় সিঙ্ক পিন (টেস্টিংয়ের জন্য)" : "Active Sync PIN (For Testing)"}
            </span>
            <span className="text-2xl font-bold font-mono tracking-widest text-blue-600 dark:text-blue-400 mt-1 block">
              {currentSyncCode}
            </span>
          </div>

          <div className="text-xs text-[#52627A] dark:text-slate-400 sm:text-right">
            <span>{isBn ? "ফরমেট: আলাদা ৬টি ছোট বক্স" : "Format: 6 Distinct Input Boxes"}</span>
            <span className="block text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              {isBn ? "জিরো-নলেজ এন্ড-টু-এন্ড এনক্রিপশন সক্রিয়" : "Zero-Knowledge E2EE Active"}
            </span>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold font-['Sora'] text-[#111827] dark:text-white">
            {isBn ? "ইন্টারঅ্যাক্টিভ ডেমো টেস্ট বাটনসমূহ:" : "Interactive Demo Test Buttons:"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setShowResetModal(false);
                setShowUnlockModal(true);
              }}
              className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-left transition-colors cursor-pointer"
            >
              <div className="font-semibold text-xs text-[#111827] dark:text-white">
                1. {isBn ? "ডিভাইস সিঙ্ক আনলক পপ-আপ" : "Device Sync Unlock Pop-up"}
              </div>
              <div className="text-[11px] text-[#52627A] dark:text-slate-400 mt-1">
                {isBn
                  ? "৬টি ছোট বক্স, ব্লারহীন ব্যাকগ্রাউন্ড ও 'ফরগেট পিন?' লিঙ্ক টেস্ট করুন।"
                  : "Test 6 separate boxes, blurless backdrop & 'Forgot PIN?' link."}
              </div>
            </button>

            <Link
              href="/reset-pin"
              className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 text-left transition-colors cursor-pointer block no-underline"
            >
              <div className="font-semibold text-xs text-[#111827] dark:text-white">
                2. {isBn ? "ফরগেট পিন ডেডিকেটেড পেজ (/reset-pin)" : "Dedicated Reset PIN Page (/reset-pin)"}
              </div>
              <div className="text-[11px] text-[#52627A] dark:text-slate-400 mt-1">
                {isBn
                  ? "পাসওয়ার্ড যাচাই, নতুন পিন বক্স ও কনফার্মেশনের ২টি আলাদা ইন্টারফেস।"
                  : "2 separate dedicated screens: password check & new PIN boxes."}
              </div>
            </Link>
          </div>
        </div>

        {/* Feature Checkpoints */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#030816] border border-slate-200 dark:border-blue-500/15 text-xs space-y-2 text-[#52627A] dark:text-slate-300">
          <strong className="text-[#111827] dark:text-white block font-semibold">
            {isBn ? "যাচাইকৃত বৈশিষ্ট্যসমূহ:" : "Verified Feature Improvements:"}
          </strong>
          <ul className="list-disc list-inside space-y-1">
            <li>
              {isBn
                ? "লাইট ও ডার্ক মোড কালার পারফেক্ট: লাইট মোডে সাদা সারফেস ও কালো ফন্ট, ডার্ক মোডে ডার্ক সারফেস ও সাদা ফন্ট।"
                : "Full Light & Dark Theme Support: Crisp white surface with dark font in light mode, dark surface with white font in dark mode."}
            </li>
            <li>
              {isBn
                ? "ব্লারহীন ব্যাকগ্রাউন্ড: পপ-আপে পেছনের ব্যাকগ্রাউন্ড সম্পূর্ণ স্পষ্ট এবং কোনো ব্লার নেই।"
                : "Zero Backdrop Blur: Background remains completely clear and unblurred behind modal."}
            </li>
            <li>
              {isBn
                ? "৬টি আলাদা বক্স: টাইপ করার সময় বর্ডারে উজ্জ্বল ব্লু কালার।"
                : "6 Segmented Boxes: Highlight blue upon digit entry."}
            </li>
            <li>
              {isBn
                ? "বাটনে জিরো এফেক্ট: কোনো শ্যাডো বা হোভার স্কেলিং নেই।"
                : "Zero Button Effects: Flat solid buttons with no hover jumps or shadows."}
            </li>
          </ul>
        </div>
      </div>

      {/* 1. Device Sync Unlock Modal with 6 boxes & 'Forgot PIN?' link */}
      {showUnlockModal && (
        <PassphraseUnlockModal
          isOpen={showUnlockModal}
          onUnlock={handleUnlock}
          onCancel={() => setShowUnlockModal(false)}
          lang={lang}
        />
      )}

      {/* 2. Reset Sync Code 2-Step Modal fallback */}
      {showResetModal && (
        <ResetSyncCodeModal
          isOpen={showResetModal}
          onClose={() => setShowResetModal(false)}
          onSuccess={() => {
            setShowResetModal(false);
            triggerToast(
              isBn
                ? "ডিভাইস সিঙ্ক পিন সফলভাবে আপডেট হয়েছে! নতুন পিন সক্রিয়।"
                : "Device sync PIN successfully updated! New PIN active."
            );
          }}
          lang={lang}
        />
      )}
    </main>
  );
}
