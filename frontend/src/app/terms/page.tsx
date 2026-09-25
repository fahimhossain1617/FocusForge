import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthIcons } from "../../components/auth/AuthIcons";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Review the Terms of Service for using FocusForge productivity suite, personal external brain, and focus tools.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
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

        <h1 className="text-2xl sm:text-3xl font-bold font-['Sora'] text-white mb-2">FocusForge Terms of Service</h1>
        <p className="text-sm text-slate-400 mb-6">Please read these terms carefully before using FocusForge.</p>

        <div className="space-y-5 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-white">1. Acceptance of Terms</h2>
            <p>By creating an account, accessing, or using FocusForge, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-white">2. User Accounts &amp; Security</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account.</p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-white">3. Acceptable Use</h2>
            <p>You agree to use FocusForge only for lawful personal productivity and work management purposes. You may not use the service to transmit malware, abuse rate limits, or disrupt platform infrastructure.</p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-white">4. Data Ownership &amp; Privacy</h2>
            <p>You retain full ownership of all data, notes, tasks, and content you create in FocusForge. We do not sell your personal data or content to third parties.</p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-white">5. Termination</h2>
            <p>You may terminate your account at any time. We reserve the right to suspend or terminate accounts that violate these terms or compromise service integrity.</p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
          <span>© 2026 FocusForge</span>
          <Link href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
