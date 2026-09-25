import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthIcons } from "../../components/auth/AuthIcons";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how FocusForge protects your personal data, ensures data ownership, and maintains end-to-end privacy for your notes and tasks.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="auth-frame min-h-screen py-10 px-4 sm:px-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl rounded-3xl border border-white/15 bg-[#03081e]/90 p-6 sm:p-10 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
            {AuthIcons.back}
            <span>Back to Login</span>
          </Link>
          <span className="text-xs text-slate-400">September 2026</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold font-['Sora'] text-white mb-2">FocusForge Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-6">Your privacy and data ownership are our core priorities.</p>

        <div className="space-y-5 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-white">1. Information We Collect</h2>
            <p>We collect information necessary to provide the FocusForge service, including your name, email address, authentication credentials, and user preferences. For guest users, data remains stored locally on your device unless you choose to sign up.</p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-white">2. How We Use Your Information</h2>
            <p>Your information is used strictly to authenticate your identity, sync your tasks and focus data securely across your devices, and communicate essential service updates (such as verification OTP codes and security alerts).</p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-white">3. Data Storage &amp; Security</h2>
            <p>We utilize enterprise-grade PostgreSQL databases with Row Level Security (RLS) and encrypted transport layers to ensure that only you can read and manage your personal records.</p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-white">4. Third-Party Services</h2>
            <p>We do not sell, rent, or monetize your personal data. We only utilize trusted infrastructure providers (such as Supabase for database &amp; auth, Google OAuth, and secure email relay providers).</p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-white">5. Your Data Rights</h2>
            <p>You have the right to access, export, update, or permanently delete your account and all associated data at any time directly through the FocusForge Settings menu.</p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
          <span>© 2026 FocusForge</span>
          <Link href="/terms" className="text-blue-400 hover:underline">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
