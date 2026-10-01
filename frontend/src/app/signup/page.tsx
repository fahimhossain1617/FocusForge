"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLayout from "../../components/auth/AuthLayout";
import { AuthIcons } from "../../components/auth/AuthIcons";
import LegalModal from "../../components/auth/LegalModal";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useAppContext } from "../../context/AppContext";
import { Check, Circle } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { showToast } = useAppContext();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<"terms" | "privacy">("terms");

  const openLegal = (tab: "terms" | "privacy") => {
    setLegalModalTab(tab);
    setLegalModalOpen(true);
  };

  // Password criteria verification
  const hasMinLength = password.length >= 8;
  const hasCapital = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const isAllValid = hasMinLength && hasCapital && hasNumber && hasSpecial;
  const criteriaMetCount = [hasMinLength, hasCapital, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthLabel = criteriaMetCount === 4 ? "Strong" : criteriaMetCount >= 2 ? "Moderate" : criteriaMetCount > 0 ? "Weak" : "Required";
  const strengthColor = criteriaMetCount === 4 ? "text-emerald-400" : criteriaMetCount >= 2 ? "text-amber-400" : "text-slate-400";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!isAllValid) {
      setError("Password must meet all 4 security criteria below.");
      return;
    }

    if (!agreedToTerms) {
      setError("Please accept the Terms of Service and Privacy Policy to continue.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Pre-verification signup: sends OTP, NO user created in DB yet!
      const res = await authService.signUp(fullName, email, password);

      if (!res.success) {
        setError(res.error || "Failed to initiate registration. Please check your credentials.");
        return;
      }

      // Store pending info in sessionStorage for verification fallback
      if (typeof window !== "undefined") {
        sessionStorage.setItem("focusforge_pending_email", email.trim().toLowerCase());
        sessionStorage.setItem("focusforge_pending_name", fullName.trim());
      }

      showToast("A verification code has been dispatched to your email.", "info");
      router.push(`/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during signup.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.loginWithGoogle();
      if (!res.success) {
        setError(res.error || "Google sign-up could not be initiated.");
      }
    } catch (err: any) {
      setError(err?.message || "Google sign-up failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout screen="signup" stepInfo="Step 1 of 2">
      <h2 className="auth-title">Create your account</h2>
      <p className="auth-lead mb-4">Start tracking your progress today.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="signup-name" className="auth-label">
          Full name
        </label>
        <div className="auth-field">
          {AuthIcons.user}
          <input
            id="signup-name"
            type="text"
            placeholder="Your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

        <label htmlFor="signup-email" className="auth-label">
          Email address
        </label>
        <div className="auth-field mb-1">
          {AuthIcons.mail}
          <input
            id="signup-email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="text-[11px] text-slate-400 mb-3 ml-1">
          We’ll send a 6-digit verification code to this address.
        </div>

        <label htmlFor="signup-password" className="auth-label">
          Password
        </label>
        <div className="auth-field mb-1">
          {AuthIcons.lock}
          <input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setIsPasswordFocused(true)}
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            className="eye"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? AuthIcons.eyeOff : AuthIcons.eye}
          </button>
        </div>

        {/* Dynamic Compact Password Strength & Requirement HUD */}
        {(isPasswordFocused || password.length > 0) && (
          <div className="auth-pass-hud">
            {/* Step Progress Bar with 4 Animated Segments */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 flex-1">
                {[hasMinLength, hasCapital, hasNumber, hasSpecial].map((valid, idx) => (
                  <div
                    key={idx}
                    className={`auth-pass-ball ${valid ? "active" : ""}`}
                  />
                ))}
              </div>
              <span className={`text-[11px] font-bold tracking-wide transition-colors ${strengthColor}`}>
                {strengthLabel}
              </span>
            </div>

            {/* Compact Criteria Pills in 2x2 Grid */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className={`auth-pass-pill ${hasMinLength ? "met" : ""}`}>
                <span className="auth-pass-dot" />
                <span>8+ characters</span>
              </div>
              <div className={`auth-pass-pill ${hasCapital ? "met" : ""}`}>
                <span className="auth-pass-dot" />
                <span>Uppercase (A-Z)</span>
              </div>
              <div className={`auth-pass-pill ${hasNumber ? "met" : ""}`}>
                <span className="auth-pass-dot" />
                <span>Number (0-9)</span>
              </div>
              <div className={`auth-pass-pill ${hasSpecial ? "met" : ""}`}>
                <span className="auth-pass-dot" />
                <span>Symbol (!@#$)</span>
              </div>
            </div>
          </div>
        )}

        {/* Terms of Service & Privacy Policy Checkbox */}
        <div
          className="auth-check mt-3"
          onClick={() => setAgreedToTerms(!agreedToTerms)}
          role="checkbox"
          aria-checked={agreedToTerms}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              setAgreedToTerms(!agreedToTerms);
            }
          }}
        >
          <span className={`box ${agreedToTerms ? "" : "unchecked"}`}>
            {agreedToTerms && AuthIcons.check}
          </span>
          <span className="text-xs text-slate-300">
            I agree to the{" "}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openLegal("terms");
              }}
              className="font-bold text-blue-400 hover:text-blue-300 underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer"
            >
              Terms of Service
            </button>{" "}
            and{" "}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openLegal("privacy");
              }}
              className="font-bold text-blue-400 hover:text-blue-300 underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer"
            >
              Privacy Policy
            </button>
          </span>
        </div>

        {/* Bottom Error banner (near user thumb and CTA) */}
        {error && <div className="auth-bottom-error">{error}</div>}

        <button type="submit" className="auth-cta mt-2" disabled={loading}>
          {loading ? "Sending verification..." : "Create account"}
        </button>

        <div className="auth-alt mt-3">
          Already have an account? <Link href="/login" className="text-blue-400 hover:underline">Log in</Link>
        </div>

        <div className="auth-or my-3">or continue with</div>

        {/* Google sign-up positioned at bottom as requested */}
        <button
          type="button"
          className="auth-gbtn"
          onClick={handleGoogleSignup}
          disabled={loading}
        >
          {AuthIcons.google}
          Sign up with Google
        </button>
      </form>

      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </AuthLayout>
  );
}
