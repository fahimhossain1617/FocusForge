"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "../../context/AppContext";

interface NotificationPermissionPromptProps {
  isOpen: boolean;
  onEnable: () => void;
  onLater: () => void;
}

export function NotificationPermissionPrompt({
  isOpen,
  onEnable,
  onLater,
}: NotificationPermissionPromptProps) {
  const { state } = useAppContext();
  const isLight = state.theme?.mode === "light";
  const isBn = state.lang === "bn";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="focentia-notification-permission-prompt"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="fixed bottom-20 sm:bottom-6 right-3 left-3 sm:left-auto sm:right-6 z-[999] pointer-events-auto select-none sm:w-[360px]"
        >
          <div
            className={`w-full rounded-xl p-4 transition-colors shadow-lg ${
              isLight
                ? "bg-white text-slate-900 border border-slate-200"
                : "bg-[#0F172A] text-slate-100 border border-slate-700"
            }`}
          >
            {/* Direct Title */}
            <h3 className="text-sm font-semibold tracking-tight">
              {isBn ? "নোটিফিকেশন সক্রিয় করুন" : "Enable Notifications"}
            </h3>

            {/* Direct Context & Subtitle Note */}
            <p
              className={`mt-1.5 text-xs leading-relaxed ${
                isLight ? "text-slate-600" : "text-slate-300"
              }`}
            >
              {isBn
                ? "নোটিফিকেশন চালু না থাকলে অ্যান্ড্রয়েড বা ব্রাউজারে সময়মতো টাস্ক রিমাইন্ডার ও নোটিফিকেশন আসবে না। সঠিক সময়ে কাজ সম্পন্ন করতে এবং প্রোডাক্টিভিটি বজায় রাখতে নোটিফিকেশন চালু রাখুন।"
                : "Without notifications enabled, you won't receive timely task reminders or alerts on Android or your browser. Keep them on to stay productive and stick to your schedule."}
            </p>

            {/* Clean Action Buttons */}
            <div className="mt-3.5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onLater}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  isLight
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {isBn ? "পরে করব" : "Later"}
              </button>

              <button
                type="button"
                onClick={onEnable}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors"
              >
                {isBn ? "অনুমতি দিন" : "Enable"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NotificationPermissionPrompt;
