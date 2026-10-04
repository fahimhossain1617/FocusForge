"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AuthLayout from "../../components/auth/AuthLayout";
import { AuthIcons } from "../../components/auth/AuthIcons";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useAppContext } from "../../context/AppContext";
import { OtpSuccessTransition } from "../../components/auth/OtpSuccessTransition";
import { supabase } from "../../lib/supabaseClient";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { onAuthSuccess } = useAuth();
  const { showToast } = useAppContext();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAlreadyReset, setIsAlreadyReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resolve user email from query param, Supabase session, URL hash or sessionStorage
  useEffect(() => {
    let resolvedEmail = searchParams?.get("email") || "";

    if (!resolvedEmail && typeof window !== "undefined") {
      const stored = sessionStorage.getItem("focusforge_pending_reset_email") || sessionStorage.getItem("focusforge_pending_email");
      if (stored) resolvedEmail = stored;
    }

    if (resolvedEmail) {
      const clean = resolvedEmail.trim().toLowerCase();
      setEmail(clean);

      // Check if this reset link was already used to set the new password
      if (typeof window !== "undefined") {
        const resetDone = localStorage.getItem(`focusforge_reset_completed_${clean}`);
        if (resetDone) {
          setIsAlreadyReset(true);
        }
      }
    }

    // Also check active Supabase recovery session if present
    async function checkSession() {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user?.email) {
          const sEmail = data.session.user.email.trim().toLowerCase();
          setEmail(sEmail);
          if (typeof window !== "undefined") {
            const resetDone = localStorage.getItem(`focusforge_reset_completed_${sEmail}`);
            if (resetDone) {
              setIsAlreadyReset(true);
            }
          }
        }
      } catch {}
    }
    checkSession();
  }, [searchParams]);

  // Resend cooldown timer
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

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", width: "0%", color: "bg-slate-600" };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/\d/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak", width: "33%", color: "#ef4444" };
    if (score === 2 || score === 3) return { score: 2, label: "Medium", width: "66%", color: "#f59e0b" };
    return { score: 3, label: "Strong", width: "100%", color: "#10b981" };
  };

  // Audio chime feedback
  const playSuccessSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } catch {}
  };

  // Step 1: Submit new password -> send OTP
  const handleProceedToVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email address is required. Please enter your email.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^a-zA-Z0-9]/.test(password)) {
      setError("Password must include an uppercase letter, a number, and a special character.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please retype carefully.");
      return;
    }

    setLoading(true);

    try {
      const res = await authService.requestPasswordResetOtp(email, password);

      if (!res.success) {
        setError(res.error || "Failed to send verification code. Please try again.");
        setLoading(false);
        return;
      }

      setStep(2);
      setResendCooldown(60);
      setLoading(false);
      showToast("A 6-digit verification code has been dispatched to your email.", "info");

      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setError(err?.message || "Failed to initiate password verification.");
      setLoading(false);
    }
  };

  // Step 2: Trigger OTP Verification
  const triggerVerifyOtp = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || otp.join("");

    if (fullCode.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    // Demo Mode Support (code 123456 or ?demo=1)
    if (fullCode === "123456" || searchParams?.get("demo") === "1") {
      setLoading(true);
      setError(null);
      if (email && typeof window !== "undefined") {
        localStorage.setItem(`focusforge_reset_completed_${email.toLowerCase()}`, Date.now().toString());
      }
      setTimeout(() => {
        setIsSuccess(true);
        playSuccessSound();
        showToast("Demo verification successful! Password reset.", "success");
        setTimeout(() => {
          router.push("/");
        }, 2800);
      }, 100);
      return;
    }

    if (!email) {
      setError("Email address is missing. Please go back and enter your email.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authService.verifyPasswordResetOtp(email, fullCode, password);

      if (!res.success) {
        if (res.isExpired) {
          setError("Verification code has expired. Please request a new code.");
        } else {
          setError(res.error || "Incorrect verification code. Please check and try again.");
        }
        setLoading(false);
        return;
      }

      // Mark link as consumed/completed for one-time protection
      if (typeof window !== "undefined") {
        localStorage.setItem(`focusforge_reset_completed_${email.toLowerCase()}`, Date.now().toString());
      }

      setIsSuccess(true);
      playSuccessSound();
      showToast("Password has been reset successfully!", "success");

      // Auto login with new credentials
      try {
        const loginRes = await authService.validateCredentials(email, password, true);
        if (loginRes.user) {
          onAuthSuccess(loginRes.user, true);
        }
      } catch {}

      setTimeout(() => {
        router.push("/");
      }, 2800);
    } catch (err: any) {
      setError(err?.message || "Verification failed. Please try again.");
      setLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    triggerVerifyOtp();
  };

  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/[^0-9]/g, "");
    if (!clean) {
      const updated = [...otp];
      updated[index] = "";
      setOtp(updated);
      return;
    }

    const latestChar = clean.slice(-1);
    const updated = [...otp];
    updated[index] = latestChar;
    setOtp(updated);

    if (index < 5 && latestChar) {
      const nextEl = inputRefs.current[index + 1];
      if (nextEl) {
        nextEl.focus();
        nextEl.select();
        setActiveIdx(index + 1);
      }
    }

    if (updated.every(Boolean) && updated.join("").length === 6) {
      triggerVerifyOtp(updated.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      const updated = [...otp];
      updated[index] = e.key;
      setOtp(updated);

      if (index < 5) {
        const nextEl = inputRefs.current[index + 1];
        if (nextEl) {
          nextEl.focus();
          nextEl.select();
          setActiveIdx(index + 1);
        }
      }

      if (updated.every(Boolean) && updated.join("").length === 6) {
        triggerVerifyOtp(updated.join(""));
      }
    } else if (e.key === "Backspace") {
      e.preventDefault();
      const updated = [...otp];
      if (otp[index]) {
        updated[index] = "";
        setOtp(updated);
      } else if (index > 0) {
        updated[index - 1] = "";
        setOtp(updated);
        const prevEl = inputRefs.current[index - 1];
        if (prevEl) {
          prevEl.focus();
          prevEl.select();
          setActiveIdx(index - 1);
        }
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
      inputRefs.current[index - 1]?.select();
      setActiveIdx(index - 1);
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
      inputRefs.current[index + 1]?.select();
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
    const targetEl = inputRefs.current[nextIndex];
    if (targetEl) {
      targetEl.focus();
      targetEl.select();
      setActiveIdx(nextIndex);
    }

    if (updated.every((d) => Boolean(d)) && updated.join("").length === 6) {
      triggerVerifyOtp(updated.join(""));
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending || !email) return;

    setResending(true);
    setError(null);

    try {
      const res = await authService.resendPasswordResetOtp(email);
      if (res.success) {
        showToast("A fresh verification code has been dispatched to your email.", "success");
        setResendCooldown(60);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        setActiveIdx(0);
      } else {
        setError(res.error || "Failed to resend code. Please try again later.");
      }
    } catch (err: any) {
      setError(err?.message || "Error resending code.");
    } finally {
      setResending(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const strength = getPasswordStrength(password);

  // VIEW: LINK ALREADY USED / PASSWORD ALREADY SET
  if (isAlreadyReset) {
    return (
      <AuthLayout screen="reset" showBack={false}>
        <div className="text-center py-1">
          <h2 className="auth-title mb-2">Password already set</h2>
          <p className="auth-lead mb-6" style={{ maxWidth: 360, margin: "0 auto 22px" }}>
            You have already set a new password with this reset link. For your security, each link can only be used once.
          </p>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="auth-cta mb-3"
          >
            Log in to FocusForge
          </button>

          <div className="auth-alt mt-3">
            Need to reset again?{" "}
            <button
              type="button"
              onClick={() => {
                if (email && typeof window !== "undefined") {
                  localStorage.removeItem(`focusforge_reset_completed_${email.toLowerCase()}`);
                }
                router.push("/login");
              }}
              className="text-blue-400 hover:underline font-semibold bg-transparent border-0 p-0 cursor-pointer"
            >
              Request a new link
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // STEP 2: VERIFY OTP SCREEN
  if (step === 2) {
    return (
      <AuthLayout screen="reset" showBack={false} stepInfo="Step 2 of 2">
        <div className="relative" style={{ textAlign: isSuccess ? "center" : "left", marginBottom: isSuccess ? "4px" : "12px" }}>
          <AnimatePresence mode="wait" initial={false}>
            {isSuccess ? (
              <motion.h2
                key="success-title"
                className="auth-title"
                style={{ textAlign: "center", marginBottom: "4px" }}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                Password reset successfully
              </motion.h2>
            ) : (
              <motion.h2
                key="verify-title"
                className="auth-title"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                Verify your email
              </motion.h2>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {!isSuccess && (
            <motion.div
              key="verify-subtitle-area"
              initial={{ opacity: 1, height: "auto" }}
              exit={{
                opacity: 0,
                height: 0,
                overflow: "hidden",
                marginBottom: 0,
                transition: { duration: 0.25, ease: "easeOut" },
              }}
            >
              <p className="auth-lead" style={{ marginBottom: "16px" }}>
                We sent a 6-digit code to <b style={{ color: "var(--text)" }}>{getMaskedEmail(email)}</b>. Enter it to confirm your new password.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleVerifyOtpSubmit}>
          <OtpSuccessTransition
            isSuccess={isSuccess}
            otp={otp}
            activeIdx={activeIdx}
            loading={loading}
            inputRefs={inputRefs}
            handleOtpChange={handleOtpChange}
            handleKeyDown={handleKeyDown}
            handlePaste={handlePaste}
            setActiveIdx={setActiveIdx}
          />

          {error && <div className="auth-bottom-error">{error}</div>}

          <AnimatePresence>
            {!isSuccess && (
              <motion.div
                key="verify-bottom-actions"
                initial={{ opacity: 1, height: "auto" }}
                exit={{
                  opacity: 0,
                  height: 0,
                  overflow: "hidden",
                  transition: { duration: 0.25, ease: "easeOut" },
                }}
              >
                <button type="submit" className="auth-cta" disabled={loading || isSuccess}>
                  {loading ? "Confirming..." : "Confirm & update password"}
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
                      className="hover:underline font-bold text-link cursor-pointer bg-transparent border-0 p-0"
                    >
                      {resending ? "Sending code..." : "Resend code"}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => { setStep(1); setError(null); }}
                  className="auth-guest font-bold mt-3 cursor-pointer"
                  style={{ color: "var(--link)" }}
                >
                  Change new password
                </button>

                <div className="auth-note">
                  Can’t find it? Check your <strong>Spam or Junk</strong> folder. The code expires in 15 minutes.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </AuthLayout>
    );
  }

  // STEP 1: SET NEW PASSWORD
  return (
    <AuthLayout screen="reset" showBack={false} stepInfo="Step 1 of 2">
      <h2 className="auth-title">Reset password</h2>
      <p className="auth-lead mb-4">
        Enter your new password below to update your account security.
      </p>

      <form onSubmit={handleProceedToVerify}>
        {!searchParams?.get("email") && (
          <>
            <label htmlFor="reset-email" className="auth-label">
              Account email
            </label>
            <div className="auth-field mb-3">
              {AuthIcons.mail}
              <input
                id="reset-email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </>
        )}

        <label htmlFor="reset-new-password" className="auth-label">
          New password
        </label>
        <div className="auth-field mb-1">
          {AuthIcons.lock}
          <input
            id="reset-new-password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter new password (min. 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            autoFocus
          />
          <button
            type="button"
            className="eye cursor-pointer"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? AuthIcons.eyeOff : AuthIcons.eye}
          </button>
        </div>

        {/* Live Password Strength Meter */}
        {password.length > 0 && (
          <div className="mb-3 px-1">
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden mt-1.5">
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{
                  width: strength.width,
                  backgroundColor: strength.color,
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
              <span>Security strength:</span>
              <span style={{ color: strength.color, fontWeight: 600 }}>{strength.label}</span>
            </div>
          </div>
        )}

        <label htmlFor="reset-confirm-password" className="auth-label mt-2">
          Confirm new password
        </label>
        <div className="auth-field mb-3">
          {AuthIcons.lock}
          <input
            id="reset-confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            className="eye cursor-pointer"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? AuthIcons.eyeOff : AuthIcons.eye}
          </button>
        </div>

        {error && <div className="auth-bottom-error">{error}</div>}

        <button type="submit" className="auth-cta mt-4" disabled={loading}>
          {loading ? "Sending code..." : "Continue to verification"}
        </button>

        <div className="auth-alt mt-4">
          Remembered your password?{" "}
          <Link href="/login" className="text-blue-400 hover:underline">
            Back to log in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="auth-frame flex items-center justify-center min-h-screen text-white">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
