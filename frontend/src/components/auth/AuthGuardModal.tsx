"use client";

import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import { ShieldCheck, X } from "lucide-react";
import { useAnimateExit } from "../../hooks/useAnimateExit";

function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
    </svg>
  );
}

export default function AuthGuardModal() {
  const { 
    authGuardModal, 
    closeAuthGuard, 
    openAuth, 
    loginWithGoogle 
  } = useAuth();
  const { t } = useTranslation();
  const { shouldRender, isExiting } = useAnimateExit({ isOpen: authGuardModal.isOpen, durationMs: 200 });

  if (!shouldRender) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md ${isExiting ? "motion-exit-fade" : "motion-overlay"}`}>
      <div 
        className={`relative w-full max-w-md rounded-3xl border shadow-2xl p-6 sm:p-8 overflow-hidden text-center ${isExiting ? "motion-exit-reveal" : "motion-scale-in"}`}
        style={{
          background: "rgba(13, 20, 38, 0.88)",
          borderColor: "rgba(59, 130, 246, 0.25)",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(59, 130, 246, 0.12)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)"
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthGuard}
          className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Shield Icon Badge */}
        <div 
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-blue-500/20 border border-blue-400/30"
          style={{ background: "linear-gradient(135deg, rgba(37, 99, 235, 0.25), rgba(59, 130, 246, 0.1))" }}
        >
          <ShieldCheck size={28} className="text-blue-400" />
        </div>

        {/* Headings */}
        <h3 className="text-xl font-bold text-white tracking-tight mb-2">
          {t.auth.authGuardTitle}
        </h3>
        <p className="text-xs text-zinc-300/80 leading-relaxed mb-6 max-w-sm mx-auto">
          {t.auth.authGuardDesc}
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Continue with Google */}
          <button
            type="button"
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-sm text-white border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-all cursor-pointer shadow-sm"
          >
            <GoogleIcon />
            <span>{t.auth.continueWithGoogle}</span>
          </button>

          {/* Log In Button */}
          <button
            type="button"
            onClick={() => {
              openAuth('login', {
                targetPage: authGuardModal.targetPage,
                onAuthenticated: authGuardModal.onAuthenticated
              });
            }}
            className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white shadow-lg shadow-blue-500/25 transition-all hover:opacity-95 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)" }}
          >
            {t.auth.logIn}
          </button>

          {/* Create Account Button */}
          <button
            type="button"
            onClick={() => {
              openAuth('signup', {
                targetPage: authGuardModal.targetPage,
                onAuthenticated: authGuardModal.onAuthenticated
              });
            }}
            className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-zinc-300 hover:text-white hover:bg-white/5 border border-white/10 transition-all cursor-pointer"
          >
            {t.auth.signUp}
          </button>

          {/* Secondary Action: Not Now / Maybe Later */}
          <button
            type="button"
            onClick={closeAuthGuard}
            className="pt-2 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {t.auth.maybeLater}
          </button>
        </div>
      </div>
    </div>
  );
}
