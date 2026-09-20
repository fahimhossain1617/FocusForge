"use client";

import React, { useState, useEffect } from "react";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "terms" | "privacy";
}

export default function LegalModal({
  isOpen,
  onClose,
  initialTab = "terms",
}: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-white/15 bg-[#03081e]/95 text-slate-200 shadow-2xl overflow-hidden backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(150, 180, 255, 0.2)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("terms")}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "terms"
                  ? "bg-[#1f6fe0] text-white shadow-md shadow-blue-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("privacy")}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "privacy"
                  ? "bg-[#1f6fe0] text-white shadow-md shadow-blue-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Privacy Policy
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans select-text">
          {activeTab === "terms" ? (
            <div className="space-y-4">
              <h2 className="text-lg sm:text-xl font-bold font-['Sora'] text-white">FocusForge Terms of Service</h2>
              <p className="text-xs text-slate-400">Last updated: September 2026</p>

              <section className="space-y-2">
                <h3 className="font-semibold text-white">1. Acceptance of Terms</h3>
                <p>
                  By creating an account, accessing, or using FocusForge (the &quot;Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-white">2. User Accounts &amp; Security</h3>
                <p>
                  You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-white">3. Acceptable Use</h3>
                <p>
                  You agree to use FocusForge only for lawful personal productivity and work management purposes. You may not use the service to transmit malware, abuse rate limits, or disrupt platform infrastructure.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-white">4. Data Ownership &amp; Privacy</h3>
                <p>
                  You retain full ownership of all data, notes, tasks, and content you create in FocusForge. We do not sell your personal data or content to third parties.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-white">5. Termination</h3>
                <p>
                  You may terminate your account at any time. We reserve the right to suspend or terminate accounts that violate these terms or compromise service integrity.
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg sm:text-xl font-bold font-['Sora'] text-white">FocusForge Privacy Policy</h2>
              <p className="text-xs text-slate-400">Last updated: September 2026</p>

              <section className="space-y-2">
                <h3 className="font-semibold text-white">1. Information We Collect</h3>
                <p>
                  We collect information necessary to provide the FocusForge service, including your name, email address, authentication credentials, and user preferences. For guest users, data remains stored locally on your device unless you choose to sign up.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-white">2. How We Use Your Information</h3>
                <p>
                  Your information is used strictly to authenticate your identity, sync your tasks and focus data securely across your devices, and communicate essential service updates (such as verification OTP codes and security alerts).
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-white">3. Data Storage &amp; Security</h3>
                <p>
                  We utilize enterprise-grade PostgreSQL databases with Row Level Security (RLS) and encrypted transport layers to ensure that only you can read and manage your personal records.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-white">4. Third-Party Services</h3>
                <p>
                  We do not sell, rent, or monetize your personal data. We only utilize trusted infrastructure providers (such as Supabase for database &amp; auth, Google OAuth, and secure email relay providers).
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold text-white">5. Your Data Rights</h3>
                <p>
                  You have the right to access, export, update, or permanently delete your account and all associated data at any time directly through the FocusForge Settings menu.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-white/[0.02] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#1f6fe0] hover:bg-blue-600 text-white transition-all cursor-pointer shadow-md shadow-blue-500/20"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
