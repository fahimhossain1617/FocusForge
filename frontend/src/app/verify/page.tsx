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


function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { onAuthSuccess } = useAuth();
  const { showToast } = useAppContext();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get email from query parameter or sessionStorage
  useEffect(() => {
    const qEmail = searchParams?.get("email");
    const isDemo = searchParams?.get("demo") === "1";
    if (qEmail) {
      setEmail(qEmail);
      setNewEmail(qEmail);
    } else if (isDemo) {
      setEmail("demo@focusforge.app");
      setNewEmail("demo@focusforge.app");
    } else if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("focusforge_pending_email");
      if (stored) {
        setEmail(stored);
        setNewEmail(stored);
      } else {
        setEmail("demo@focusforge.app");
        setNewEmail("demo@focusforge.app");
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

  const triggerVerify = async (codeToVerify?: string) => {
    const fullCode = codeToVerify || otp.join("");

    if (fullCode.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    // Demo Mode Support (code 123456 or ?demo=1)
    if (fullCode === "123456" || searchParams?.get("demo") === "1") {
      setLoading(true);
      setError(null);
      setTimeout(() => {
        setIsSuccess(true);
        playSuccessSound();
        showToast("Demo verification successful! Welcome to FocusForge.", "success");
        setTimeout(() => {
          router.push("/");
        }, 2800);
      }, 100);
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

      setIsSuccess(true);
      playSuccessSound();
      showToast("Email verified successfully! Welcome to FocusForge.", "success");

      if (res.user) {
        onAuthSuccess(res.user, true);
      }

      setTimeout(() => {
        router.push("/");
      }, 2800);
    } catch (err: any) {
      setError(err?.message || "Verification failed. Please try again.");
      setLoading(false);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    triggerVerify();
  };

  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/[^0-9]/g, "");
    if (!clean) {
      const updated = [...otp];
      updated[index] = "";
      setOtp(updated);
      return;
    }

    // Single or Multi character input (handles mobile keyboards & pasting)
    const latestChar = clean.slice(-1);
    const updated = [...otp];
    updated[index] = latestChar;
    setOtp(updated);

    // Instant cursor jump to next box
    if (index < 5 && latestChar) {
      const nextEl = inputRefs.current[index + 1];
      if (nextEl) {
        nextEl.focus();
        nextEl.select();
        setActiveIdx(index + 1);
      }
    }

    if (updated.every(Boolean) && updated.join("").length === 6) {
      triggerVerify(updated.join(""));
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
        triggerVerify(updated.join(""));
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
      triggerVerify(updated.join(""));
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
    <AuthLayout screen="verify" showBack onBack={() => router.push("/signup")} stepInfo="Step 2 of 2">
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
              Verified successfully
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
              <p className="auth-lead" style={{ marginBottom: "16px" }}>
                We sent a 6-digit code to <b style={{ color: "var(--text)" }}>{getMaskedEmail(email)}</b>. Enter it to activate your account.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleVerify}>
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
                Can’t find it? Check your <strong>Spam or Junk</strong> folder. The code expires in 15 minutes.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
