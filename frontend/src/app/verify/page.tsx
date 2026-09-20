"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "../../components/auth/AuthLayout";
import { AuthIcons } from "../../components/auth/AuthIcons";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useAppContext } from "../../context/AppContext";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { onAuthSuccess } = useAuth();
  const { showToast } = useAppContext();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get email from query parameter or sessionStorage
  useEffect(() => {
    const qEmail = searchParams?.get("email");
    if (qEmail) {
      setEmail(qEmail);
      setNewEmail(qEmail);
    } else if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("focusforge_pending_email");
      if (stored) {
        setEmail(stored);
        setNewEmail(stored);
      }
    }
  }, [searchParams]);

  // Focus the first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Countdown timer for 60s cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Mask email for privacy (e.g. na****@example.com)
  const getMaskedEmail = (rawEmail: string) => {
    if (!rawEmail) return "your email";
    const parts = rawEmail.split("@");
    if (parts.length !== 2) return rawEmail;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) {
      return `${name}****@${domain}`;
    }
    return `${name.slice(0, 2)}****@${domain}`;
  };

  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/[^0-9]/g, "");
    if (!clean) {
      const updated = [...otp];
      updated[index] = "";
      setOtp(updated);
      return;
    }

    // Single digit input
    const digit = clean[clean.length - 1];
    const updated = [...otp];
    updated[index] = digit;
    setOtp(updated);

    // Jump to next input
    if (index < 5 && digit) {
      inputRefs.current[index + 1]?.focus();
      setActiveIdx(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        setActiveIdx(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setActiveIdx(index - 1);
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
      setActiveIdx(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (!pasted) return;

    const digits = pasted.split("");
    const updated = [...otp];
    digits.forEach((d, i) => {
      if (i < 6) updated[i] = d;
    });
    setOtp(updated);

    const nextIndex = Math.min(digits.length, 5);
    inputRefs.current[nextIndex]?.focus();
    setActiveIdx(nextIndex);
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullCode = otp.join("");

    if (fullCode.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    if (!email) {
      setError("Email address is missing. Please enter your email.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authService.verifyOtp(email, fullCode, "signup");

      if (!res.success) {
        if (res.isExpired) {
          setError("Verification code has expired. Please request a new code.");
        } else {
          setError(res.error || "Incorrect verification code. Please check and try again.");
        }
        setLoading(false);
        return;
      }

      showToast("Email verified successfully! Welcome to FocusForge.", "success");

      if (res.user) {
        onAuthSuccess(res.user, true);
      }

      router.push("/");
    } catch (err: any) {
      setError(err?.message || "Verification failed. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending || !email) return;

    setResending(true);
    setError(null);

    try {
      const res = await authService.resendOtp(email);
      if (res.success) {
        showToast("A fresh verification code has been sent to your email.", "success");
        setResendCooldown(60);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        setActiveIdx(0);
      } else {
        setError(res.error || "Failed to resend verification code. Please try again later.");
      }
    } catch (err: any) {
      setError(err?.message || "Error resending code.");
    } finally {
      setResending(false);
    }
  };

  const handleSaveDifferentEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    const clean = newEmail.trim().toLowerCase();
    setEmail(clean);
    setIsEditingEmail(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("focusforge_pending_email", clean);
    }

    // Trigger resend to new email
    setResending(true);
    setError(null);
    try {
      const res = await authService.resendOtp(clean);
      if (res.success) {
        showToast(`Verification code sent to ${clean}`, "success");
        setResendCooldown(60);
      }
    } catch {}
    setResending(false);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <AuthLayout screen="verify" showBack onBack={() => router.push("/signup")}>
      <div className="auth-steps">
        <i className="on" />
        <i className="on" />
        <span>Step 2 of 2</span>
      </div>

      <div className="auth-vicon">{AuthIcons.mailok}</div>

      <h2 className="auth-title">Verify your email</h2>
      
      {isEditingEmail ? (
        <form onSubmit={handleSaveDifferentEmail} className="mt-3 mb-4">
          <label className="auth-label text-xs">Enter your correct email address:</label>
          <div className="auth-field" style={{ marginBottom: 8 }}>
            {AuthIcons.mail}
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="name@example.com"
              required
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="auth-cta" style={{ height: 40, fontSize: 13 }}>
              Update & Resend Code
            </button>
            <button
              type="button"
              onClick={() => setIsEditingEmail(false)}
              className="text-xs text-slate-400 hover:text-white px-3"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="auth-lead">
          We sent a 6-digit code to <b style={{ color: "var(--text)" }}>{getMaskedEmail(email)}</b>. Enter it to activate your account.
        </p>
      )}

      {error && <div className="auth-error-banner mt-3">{error}</div>}

      <form onSubmit={handleVerify}>
        <div className="auth-otp">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              className={activeIdx === i ? "act" : ""}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onFocus={() => setActiveIdx(i)}
              onPaste={handlePaste}
              aria-label={`Digit ${i + 1}`}
              autoComplete="one-time-code"
            />
          ))}
        </div>

        <button type="submit" className="auth-cta" disabled={loading}>
          {loading ? "Verifying..." : "Verify email"}
        </button>

        <div className="auth-alt" style={{ marginTop: "18px" }}>
          {resendCooldown > 0 ? (
            <>
              Resend code in <b style={{ color: "var(--text)" }}>{formatTimer(resendCooldown)}</b>
            </>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="hover:underline font-bold text-link"
            >
              {resending ? "Sending code..." : "Resend code"}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsEditingEmail(true)}
          className="auth-guest font-bold"
          style={{ color: "var(--link)" }}
        >
          Use a different email
        </button>

        <div className="auth-note">
          Can’t find it? Check your spam folder. The code expires in 10 minutes.
        </div>
      </form>
    </AuthLayout>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="auth-frame flex items-center justify-center text-white">Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
