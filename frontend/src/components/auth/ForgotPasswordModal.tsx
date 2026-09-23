"use client";

import React, { useState } from "react";
import { authService } from "../../services/authService";
import { AuthIcons } from "./AuthIcons";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  initialEmail = "",
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await authService.sendPasswordResetEmail(email.trim());
    setLoading(false);

    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || "Failed to send reset email. Please try again.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="auth-card relative w-full max-w-md p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
        style={{
          borderRadius: "24px",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="auth-mark overflow-hidden" style={{ width: 34, height: 34, borderRadius: 10 }}>
              <img src="/logo.png" alt="FocusForge" className="w-full h-full object-cover" />
            </div>
            <h3 className="text-xl font-bold font-['Sora'] text-white">Reset Password</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="text-center py-4">
            <div className="auth-vicon mx-auto mb-4" style={{ width: 48, height: 48 }}>
              {AuthIcons.mailok}
            </div>
            <h4 className="font-semibold text-lg text-white mb-2">Check your email</h4>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              We have sent a password reset link to <b className="text-white">{email}</b>. Please follow the instructions in the email to set a new password.
            </p>
            <button
              type="button"
              className="auth-cta"
              onClick={onClose}
            >
              Back to Log In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="auth-lead mb-6 text-sm">
              Enter your email address and we will send you a link to reset your password.
            </p>

            {error && <div className="auth-error-banner text-xs">{error}</div>}

            <label htmlFor="forgot-email" className="auth-label">Email address</label>
            <div className="auth-field">
              {AuthIcons.mail}
              <input
                id="forgot-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className="auth-cta"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-center text-sm font-semibold text-slate-400 hover:text-white transition-colors py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
