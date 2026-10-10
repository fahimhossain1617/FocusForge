"use client";

import React from "react";
import { Shield, Sparkles, Lock, X } from "lucide-react";
import { aiConsentService } from "../../services/aiConsentService";

interface AIConsentModalProps {
  isOpen: boolean;
  userId?: string | null;
  lang?: string;
  onClose: () => void;
}

export default function AIConsentModal({ isOpen, userId, lang = "bn", onClose }: AIConsentModalProps) {
  if (!isOpen) return null;

  const isBn = lang === "bn";

  const handleChoice = (choice: "granted" | "private") => {
    aiConsentService.setConsent(userId, choice);
    onClose();
  };

  const handleSkipOrClose = () => {
    // Privacy-First Default: keep chats private if skipped
    handleChoice("private");
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/15 dark:bg-black/35 animate-in fade-in duration-150"
      onClick={handleSkipOrClose}
    >
      <div 
        className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close / Skip button */}
        <button
          type="button"
          onClick={handleSkipOrClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title={isBn ? "স্কিপ করুন" : "Skip"}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4 pr-6">
          <div className="w-10 h-10 rounded-xl bg-[#EBF3FE] dark:bg-blue-500/15 text-[#1E3E7B] dark:text-blue-400 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#111827] dark:text-white">
              {isBn ? "এআই ইমপ্রুভমেন্ট ও প্রাইভেসি" : "AI Improvement & Privacy"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn ? "তোমার এআই অভিজ্ঞতা ও গোপনীয়তা নিয়ন্ত্রণ করো" : "Manage your AI privacy and improvement preferences"}
            </p>
          </div>
        </div>

        <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-3 mb-6 bg-slate-50 dark:bg-white/[0.03] p-4 rounded-xl border border-slate-200 dark:border-white/10">
          <p className="leading-relaxed">
            {isBn
              ? "ফোসেন্টিয়া সম্পূর্ণ গোপনীয়তা মেনে চলে। তুমি কি চাও এআই তোমার পছন্দ মনে রেখে উত্তর আরও পার্সোনালাইজ করুক? তুমি যেকোনো সময় সেটিংস থেকে এটি পরিবর্তন করতে পারবে।"
              : "Focentia is privacy-first. Would you like the AI to remember preferences to personalize future answers? You can change this at any time in Settings."}
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200 font-medium">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              {isBn
                ? "ডিফল্টভাবে চ্যাট সম্পূর্ণ নিরাপদ ও মেমোরি ছাড়া চলে।"
                : "By default, your chats remain completely private without memory retention."}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => handleChoice("private")}
            className="w-full py-2.5 px-4 rounded-xl bg-[#1E3E7B] hover:bg-[#28539E] text-white font-semibold text-sm transition-all shadow-none cursor-pointer flex items-center justify-center"
          >
            {isBn ? "মেমোরি ছাড়া চ্যাট (ডিফল্ট - প্রাইভেট)" : "Keep My Chats Private (Default)"}
          </button>

          <button
            type="button"
            onClick={() => handleChoice("granted")}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 dark:bg-transparent dark:hover:bg-white/5 dark:border-white/20 dark:text-slate-300 font-medium text-sm transition-all shadow-none cursor-pointer flex items-center justify-center"
          >
            {isBn ? "অনুমতি দিন (এআই ইমপ্রুভমেন্ট)" : "Allow AI Improvement (Opt-in)"}
          </button>
        </div>
      </div>
    </div>
  );
}
