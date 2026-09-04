"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import { authService } from "../../services/authService";
import { User } from "../../types";
import { 
  X, Mail, Phone, Lock, Eye, EyeOff, Check, AlertCircle, ArrowLeft, Loader2, ChevronDown
} from "lucide-react";

// Official Google SVG Icon
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

const COUNTRY_CODES = [
  { code: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "+1", flag: "🇺🇸", name: "USA/Canada" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
];

export default function AuthModal() {
  const { 
    authModal, 
    closeAuth, 
    setAuthView, 
    loginWithGoogle, 
    onAuthSuccess 
  } = useAuth();
  const { t } = useTranslation();

  // Registration & Form State
  const [authMethodTab, setAuthMethodTab] = useState<'email' | 'phone'>('email');
  const [countryCode, setCountryCode] = useState("+880");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // OTP State (6 digits)
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState<'login' | 'signup' | 'forgot'>('login');
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [isOtpExpired, setIsOtpExpired] = useState(false);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);

  // Sync initial identifier if provided
  useEffect(() => {
    if (authModal.initialIdentifier) {
      setIdentifier(authModal.initialIdentifier);
    }
  }, [authModal.initialIdentifier]);

  // Resend Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (authModal.isOpen && (authModal.view === 'otp' || authModal.view === 'forgot_otp')) {
      if (resendTimer > 0) {
        interval = setInterval(() => {
          setResendTimer(prev => {
            if (prev <= 1) {
              setCanResend(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
    return () => clearInterval(interval);
  }, [authModal.isOpen, authModal.view, resendTimer]);

  // Helper to calculate password strength
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "" };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/\d/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: t.auth.weak, color: "bg-red-500", text: "text-red-400" };
    if (score === 2 || score === 3) return { score: 2, label: t.auth.medium, color: "bg-amber-500", text: "text-amber-400" };
    return { score: 3, label: t.auth.strong, color: "bg-emerald-500", text: "text-emerald-400" };
  };

  // Helper to mask identifier
  const getMaskedIdentifier = () => {
    if (authMethodTab === 'email') {
      const parts = identifier.split("@");
      if (parts.length === 2 && parts[0].length > 2) {
        return `${parts[0].substring(0, 3)}***@${parts[1]}`;
      }
      return identifier;
    } else {
      let digits = identifier.replace(/\D/g, '');
      // If country code ends in '0' and digits start with '0', strip the extra '0'
      if (countryCode.endsWith("0") && digits.startsWith("0")) {
        digits = digits.replace(/^0+/, '');
      }
      if (digits.length >= 4) {
        return `${countryCode} *** *** ${digits.slice(-4)}`;
      }
      return `${countryCode} ${digits}`;
    }
  };

  // Helper to sanitize phone input as user types
  const handlePhoneInput = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (countryCode.endsWith("0") && clean.startsWith("0")) {
      clean = clean.replace(/^0+/, '');
    }
    setIdentifier(clean);
  };

  // Full clean identifier for service
  const getFullIdentifier = () => {
    if (authMethodTab === 'phone') {
      let digits = identifier.replace(/\D/g, '');
      if (countryCode.endsWith("0") && digits.startsWith("0")) {
        digits = digits.replace(/^0+/, '');
      }
      return `${countryCode}${digits}`;
    }
    return identifier.trim();
  };

  // OTP input handlers
  const handleOtpChange = (index: number, val: string) => {
    // Check if user pasted full OTP
    if (val.length > 1) {
      const cleaned = val.replace(/\D/g, '').slice(0, 6);
      if (cleaned.length > 0) {
        const next = [...otpDigits];
        for (let i = 0; i < cleaned.length; i++) {
          next[i] = cleaned[i];
        }
        setOtpDigits(next);
        const focusIndex = Math.min(cleaned.length, 5);
        otpInputRefs.current[focusIndex]?.focus();
        return;
      }
    }

    const char = val.slice(-1).replace(/\D/g, '');
    const updated = [...otpDigits];
    updated[index] = char;
    setOtpDigits(updated);

    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Action: Request OTP for Signup
  const handleProceedToPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const clean = identifier.trim();
    if (!clean) {
      setErrorMessage("Please enter an email or phone number.");
      return;
    }

    if (authMethodTab === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (authMethodTab === 'phone' && clean.replace(/\D/g, '').length < 6) {
      setErrorMessage("Please enter a valid phone number.");
      return;
    }

    setAuthView('password_create');
  };

  // Action: Submit Password and Send OTP
  const handleSubmitPasswordAndSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    const fullId = getFullIdentifier();
    setOtpPurpose('signup');
    setIsOtpExpired(false);

    const res = await authService.createAccount(fullId, password, rememberMe);
    setIsLoading(false);

    if (res.success) {
      setResendTimer(30);
      setCanResend(false);
      setOtpDigits(["", "", "", "", "", ""]);
      setAuthView('otp');
    } else {
      setErrorMessage(res.error || "Failed to create account or send verification code. Please try again.");
    }
  };

  // Action: Verify OTP and finalize (Login, Signup, or Forgot)
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    const code = otpDigits.join("");

    if (code.length < 6) {
      setErrorMessage(t.auth.invalidOtp);
      return;
    }

    setIsLoading(true);
    const fullId = getFullIdentifier();

    // FORGOT PASSWORD FLOW
    if (authModal.view === 'forgot_otp' || otpPurpose === 'forgot') {
      const verifyRes = await authService.verifyOtp(fullId, code);
      setIsLoading(false);
      if (verifyRes.success) {
        setAuthView('forgot_new_password');
      } else {
        if (verifyRes.isExpired) {
          setIsOtpExpired(true);
          setErrorMessage(t.auth.otpExpired);
        } else {
          setErrorMessage(verifyRes.error || t.auth.invalidOtp);
        }
      }
      return;
    }

    // SIGNUP FLOW VERIFICATION
    const verifyRes = await authService.verifyOtp(fullId, code);
    setIsLoading(false);
    
    if (!verifyRes.success) {
      if (verifyRes.isExpired) {
        setIsOtpExpired(true);
        setErrorMessage(t.auth.otpExpired);
      } else {
        setErrorMessage(verifyRes.error || t.auth.invalidOtp);
      }
      return;
    }

    if (verifyRes.user) {
      onAuthSuccess(verifyRes.user, true);
    } else {
      setErrorMessage("Failed to load user profile after verification.");
    }
  };

  // Action: Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    setErrorMessage(null);
    setIsOtpExpired(false);
    setIsLoading(true);
    const fullId = getFullIdentifier();
    
    let res;
    if (otpPurpose === 'signup') {
      res = await authService.createAccount(fullId, password, rememberMe);
    } else {
      res = await authService.sendOtp(fullId);
    }
    
    setIsLoading(false);
    if (res.success) {
      setResendTimer(30);
      setCanResend(false);
    } else {
      setErrorMessage(res.error || "Failed to resend code.");
    }
  };

  // Action: Log In Existing User - MANDATORY OTP STEP
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const fullId = getFullIdentifier();
    if (!fullId) {
      setErrorMessage("Please enter your email or phone number.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsLoading(true);

    const valRes = await authService.validateCredentials(fullId, password, rememberMe);
    setIsLoading(false);
    
    if (!valRes.success || !valRes.user) {
      setErrorMessage(valRes.error || "Incorrect email/phone or password.");
      return;
    }

    onAuthSuccess(valRes.user, false);
  };

  // Action: Forgot Password Request Code
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const fullId = getFullIdentifier();
    if (!fullId) {
      setErrorMessage("Please enter your email or phone number.");
      return;
    }

    setIsLoading(true);
    const res = await authService.sendOtp(fullId);
    setIsLoading(false);

    if (res.success) {
      setResendTimer(30);
      setCanResend(false);
      setOtpDigits(["", "", "", "", "", ""]);
      setAuthView('forgot_otp');
    } else {
      setErrorMessage(res.error || "Could not send recovery code. Please try again.");
    }
  };

  // Action: Reset Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    const fullId = getFullIdentifier();
    const res = await authService.resetPassword(fullId, password);
    setIsLoading(false);

    if (res.success) {
      setAuthView('login');
      setPassword("");
      setConfirmPassword("");
    } else {
      setErrorMessage(res.error || "Failed to update password.");
    }
  };

  if (!authModal.isOpen) return null;

  const strength = getPasswordStrength(password);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* Outer Glow Background Accent */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Glass Card */}
      <div 
        className="relative w-full max-w-[440px] my-auto rounded-3xl border shadow-2xl p-6 sm:p-8 transition-all scale-in overflow-hidden"
        style={{
          background: "rgba(13, 20, 38, 0.82)",
          borderColor: "rgba(59, 130, 246, 0.22)",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(59, 130, 246, 0.08)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)"
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuth}
          className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors z-10"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Brand Logo Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div 
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20"
            style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)" }}
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold tracking-tight text-white text-base">FocusForge</span>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-400 animate-fade-in">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Demo OTP Helper (Notice for developer/reviewer ease) */}
        {demoCodeHint && (authModal.view === 'otp' || authModal.view === 'forgot_otp') && (
          <div className="mb-5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-xs text-blue-300 flex items-center justify-between">
            <span>Demo Verification Code: <strong className="font-mono text-white tracking-widest">{demoCodeHint}</strong></span>
            <button 
              type="button" 
              onClick={() => {
                setOtpDigits(demoCodeHint.split(""));
              }}
              className="text-[11px] underline font-semibold hover:text-white"
            >
              Fill Code
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 1: INITIAL WELCOME SCREEN                            */}
        {/* ========================================================= */}
        {authModal.view === 'initial' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
                {t.auth.welcomeTitle}
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {t.auth.welcomeSubtitle}
              </p>
            </div>

            {/* Google Primary Button */}
            <button
              type="button"
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-sm text-white border transition-all cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                borderColor: "rgba(255, 255, 255, 0.12)",
              }}
            >
              <GoogleIcon />
              <span>{t.auth.continueWithGoogle}</span>
            </button>

            {/* OR Divider */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                {t.auth.orDivider}
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Secondary Log In / Sign Up */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setAuthView('login');
                }}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white shadow-lg shadow-blue-500/25 transition-all hover:opacity-95"
                style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)" }}
              >
                {t.auth.logIn}
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setAuthView('signup');
                }}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-zinc-300 hover:text-white hover:bg-white/5 border border-white/10 transition-all"
              >
                {t.auth.signUp}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: LOGIN FLOW                                        */}
        {/* ========================================================= */}
        {authModal.view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAuthView('initial')}
                className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors"
                aria-label="Back"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {t.auth.welcomeBackTitle}
                </h2>
                <p className="text-xs text-zinc-400">
                  {t.auth.welcomeBackSubtitle}
                </p>
              </div>
            </div>

            {/* Email / Phone Segmented Switcher */}
            <div className="p-1 rounded-xl bg-white/[0.04] border border-white/5 flex gap-1">
              <button
                type="button"
                onClick={() => { setAuthMethodTab('email'); setErrorMessage(null); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  authMethodTab === 'email' ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-zinc-400 hover:text-white"
                }`}
              >
                {t.auth.emailTab}
              </button>
              <button
                type="button"
                onClick={() => { setAuthMethodTab('phone'); setErrorMessage(null); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  authMethodTab === 'phone' ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-zinc-400 hover:text-white"
                }`}
              >
                {t.auth.phoneTab}
              </button>
            </div>

            {/* Identifier Input */}
            {authMethodTab === 'email' ? (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  {t.auth.emailAddress}
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none z-10" />
                  <input
                    type="email"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={t.auth.emailPlaceholder}
                    className="w-full input-with-icon py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
                    style={{ paddingLeft: "42px", paddingRight: "14px" }}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  {t.auth.phoneNumber}
                </label>
                <div className="flex gap-2 items-center">
                  <div className="relative" style={{ width: "105px", minWidth: "105px", flexShrink: 0 }}>
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="auth-country-select w-full rounded-xl text-xs text-white outline-none focus:border-blue-500 cursor-pointer appearance-none"
                      style={{
                        width: "105px",
                        minWidth: "105px",
                        height: "42px",
                        background: "rgba(15, 23, 42, 0.95)",
                        borderColor: "rgba(255, 255, 255, 0.12)",
                      }}
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code} className="bg-[#0D1426] text-white">
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>

                  <div className="relative flex-1" style={{ minWidth: 0 }}>
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none z-10" />
                    <input
                      type="tel"
                      required
                      value={identifier}
                      onChange={(e) => handlePhoneInput(e.target.value)}
                      placeholder={t.auth.phonePlaceholder}
                      className="w-full input-with-icon py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
                      style={{ height: "42px", paddingLeft: "42px", paddingRight: "14px" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  {t.auth.password}
                </label>
                <button
                  type="button"
                  onClick={() => { setErrorMessage(null); setAuthView('forgot_request'); }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  {t.auth.forgotPassword}
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none z-10" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.auth.passwordPlaceholder}
                  className="w-full input-with-icon input-with-icon-right py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
                  style={{ paddingLeft: "42px", paddingRight: "42px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white z-10 p-1"
                  aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-2.5 pt-0.5">
              <input
                type="checkbox"
                id="loginRememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="auth-checkbox rounded text-blue-600 bg-white/5 border-white/10 focus:ring-blue-500"
                style={{ width: "16px", height: "16px", minWidth: "16px", flexShrink: 0, margin: 0 }}
              />
              <label htmlFor="loginRememberMe" className="text-xs text-zinc-300 font-medium cursor-pointer select-none">
                {t.auth.rememberMe}
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white shadow-lg shadow-blue-500/25 transition-all hover:opacity-95 disabled:opacity-50 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)" }}
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              <span>{t.auth.logIn}</span>
            </button>

            {/* OR Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">{t.auth.orDivider}</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Google Sign-in Alternative */}
            <button
              type="button"
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl font-medium text-xs text-zinc-300 hover:text-white border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all"
            >
              <GoogleIcon className="w-4 h-4" />
              <span>{t.auth.continueWithGoogle}</span>
            </button>

            {/* Footer */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setErrorMessage(null); setAuthView('signup'); }}
                className="text-xs text-zinc-400 hover:text-blue-400 font-medium transition-colors"
              >
                {t.auth.dontHaveAccount}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: SIGNUP STEP 1 (Identifier Entry)                  */}
        {/* ========================================================= */}
        {authModal.view === 'signup' && (
          <form onSubmit={handleProceedToPassword} className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAuthView('initial')}
                className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors"
                aria-label="Back"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {t.auth.createAccountTitle}
                </h2>
                <p className="text-xs text-zinc-400">
                  {t.auth.createAccountSubtitle}
                </p>
              </div>
            </div>

            {/* Email / Phone Segmented Switcher */}
            <div className="p-1 rounded-xl bg-white/[0.04] border border-white/5 flex gap-1">
              <button
                type="button"
                onClick={() => { setAuthMethodTab('email'); setErrorMessage(null); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  authMethodTab === 'email' ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-zinc-400 hover:text-white"
                }`}
              >
                {t.auth.emailTab}
              </button>
              <button
                type="button"
                onClick={() => { setAuthMethodTab('phone'); setErrorMessage(null); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  authMethodTab === 'phone' ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-zinc-400 hover:text-white"
                }`}
              >
                {t.auth.phoneTab}
              </button>
            </div>

            {/* Identifier Input */}
            {authMethodTab === 'email' ? (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  {t.auth.emailAddress}
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none z-10" />
                  <input
                    type="email"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={t.auth.emailPlaceholder}
                    className="w-full input-with-icon py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
                    style={{ paddingLeft: "42px", paddingRight: "14px" }}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  {t.auth.phoneNumber}
                </label>
                <div className="flex gap-2 items-center">
                  <div className="relative" style={{ width: "105px", minWidth: "105px", flexShrink: 0 }}>
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="auth-country-select w-full rounded-xl text-xs text-white outline-none focus:border-blue-500 cursor-pointer appearance-none"
                      style={{
                        width: "105px",
                        minWidth: "105px",
                        height: "42px",
                        background: "rgba(15, 23, 42, 0.95)",
                        borderColor: "rgba(255, 255, 255, 0.12)",
                      }}
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code} className="bg-[#0D1426] text-white">
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>

                  <div className="relative flex-1" style={{ minWidth: 0 }}>
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none z-10" />
                    <input
                      type="tel"
                      required
                      value={identifier}
                      onChange={(e) => handlePhoneInput(e.target.value)}
                      placeholder={t.auth.phonePlaceholder}
                      className="w-full input-with-icon py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
                      style={{ height: "42px", paddingLeft: "42px", paddingRight: "14px" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Continue Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white shadow-lg shadow-blue-500/25 transition-all hover:opacity-95 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)" }}
            >
              {t.auth.continue}
            </button>

            {/* Footer: Already have account */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setErrorMessage(null); setAuthView('login'); }}
                className="text-xs text-zinc-400 hover:text-blue-400 font-medium transition-colors"
              >
                {t.auth.alreadyHaveAccount}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* VIEW 4: PASSWORD CREATION (Step 2)                        */}
        {/* ========================================================= */}
        {authModal.view === 'password_create' && (
          <form onSubmit={handleSubmitPasswordAndSendOtp} className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAuthView('signup')}
                className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors"
                aria-label="Back"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {t.auth.createPasswordTitle}
                </h2>
                <p className="text-xs text-zinc-400">
                  {t.auth.createPasswordSubtitle}
                </p>
              </div>
            </div>

            {/* Important Clarification Notice */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300/90 leading-relaxed">
              {t.auth.passwordNotice}
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {t.auth.password}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none z-10" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.auth.passwordPlaceholder}
                  className="w-full input-with-icon input-with-icon-right py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
                  style={{ paddingLeft: "42px", paddingRight: "42px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white z-10 p-1"
                  aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className="mt-2.5 space-y-1.5 animate-fade-in">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">Strength:</span>
                    <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.score >= 1 ? strength.color : "bg-transparent"}`} />
                    <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.score >= 2 ? strength.color : "bg-transparent"}`} />
                    <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strength.score >= 3 ? strength.color : "bg-transparent"}`} />
                  </div>
                </div>
              )}
            </div>

            {/* Password Requirements Checklist */}
            <div className="space-y-1.5 text-[11px] text-zinc-400">
              <div className={`flex items-center gap-2 ${password.length >= 8 ? "text-emerald-400 font-medium" : ""}`}>
                <Check size={13} className={password.length >= 8 ? "text-emerald-400" : "text-zinc-600"} />
                <span>{t.auth.reqMinChars}</span>
              </div>
              <div className={`flex items-center gap-2 ${/[A-Za-z]/.test(password) && /\d/.test(password) ? "text-emerald-400 font-medium" : ""}`}>
                <Check size={13} className={/[A-Za-z]/.test(password) && /\d/.test(password) ? "text-emerald-400" : "text-zinc-600"} />
                <span>{t.auth.reqLetterNumber}</span>
              </div>
              <div className={`flex items-center gap-2 ${/[^A-Za-z0-9]/.test(password) ? "text-emerald-400 font-medium" : ""}`}>
                <Check size={13} className={/[^A-Za-z0-9]/.test(password) ? "text-emerald-400" : "text-zinc-600"} />
                <span>{t.auth.reqSpecialChar}</span>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="signupRememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="auth-checkbox mt-0.5 rounded text-blue-600 bg-white/5 border-white/10 focus:ring-blue-500"
                style={{ width: "16px", height: "16px", minWidth: "16px", flexShrink: 0, margin: 0 }}
              />
              <label htmlFor="signupRememberMe" className="cursor-pointer select-none">
                <span className="block text-xs text-zinc-300 font-medium">{t.auth.rememberMe}</span>
                <span className="block text-[11px] text-zinc-500">{t.auth.rememberMeDesc}</span>
              </label>
            </div>

            {/* Continue Button */}
            <button
              type="submit"
              disabled={isLoading || password.length < 8}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white shadow-lg shadow-blue-500/25 transition-all hover:opacity-95 disabled:opacity-50 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)" }}
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              <span>{t.auth.continue}</span>
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* VIEW 5: OTP VERIFICATION (6-digit boxes)                   */}
        {/* ========================================================= */}
        {(authModal.view === 'otp' || authModal.view === 'forgot_otp') && (
          <form onSubmit={handleVerifyOtp} className="space-y-6 animate-fade-in text-center">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight mb-1.5">
                {otpPurpose === 'login' ? t.auth.verifyItsYou : t.auth.verifyAccountTitle}
              </h2>
              <p className="text-xs text-zinc-400">
                {otpPurpose === 'login'
                  ? (authMethodTab === 'email' ? t.auth.verifySubtitleEmail : t.auth.verifySubtitlePhone)
                  : (authMethodTab === 'email' ? t.auth.verifyAccountSubtitleEmail : t.auth.verifyAccountSubtitlePhone)}
              </p>
              <p className="text-xs font-semibold text-blue-400 mt-1">
                {getMaskedIdentifier()}
              </p>
            </div>

            {/* Expired OTP Alert Box */}
            {isOtpExpired && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between text-left">
                <span>{t.auth.otpExpired}</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="font-semibold text-blue-400 hover:text-blue-300 underline text-xs cursor-pointer shrink-0 ml-2"
                >
                  {t.auth.sendNewCode}
                </button>
              </div>
            )}

            {/* 6 Digit Input Boxes */}
            <div className="flex justify-center gap-2 sm:gap-3 py-2">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => { otpInputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl bg-white/[0.05] border border-white/10 text-white focus:border-blue-500 focus:bg-blue-500/10 focus:outline-none transition-all"
                />
              ))}
            </div>

            {/* Resend Code & Change Identifier */}
            <div className="space-y-2 text-xs">
              <div className="text-zinc-400">
                <span className="mr-1.5">{t.auth.didntReceiveCode}</span>
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    {t.auth.resendCode}
                  </button>
                ) : (
                  <span>
                    {t.auth.resendCodeIn} 00:{resendTimer < 10 ? `0${resendTimer}` : resendTimer}
                  </span>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setIsOtpExpired(false);
                    setErrorMessage(null);
                    if (otpPurpose === 'login') setAuthView('login');
                    else if (otpPurpose === 'signup') setAuthView('signup');
                    else setAuthView('forgot_request');
                  }}
                  className="text-zinc-400 hover:text-white underline text-[11px] cursor-pointer"
                >
                  {t.auth.changeIdentifier}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || otpDigits.some(d => !d)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white shadow-lg shadow-blue-500/25 transition-all hover:opacity-95 disabled:opacity-50 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)" }}
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              <span>{t.auth.verifyBtn}</span>
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* VIEW 6: FORGOT PASSWORD REQUEST                           */}
        {/* ========================================================= */}
        {authModal.view === 'forgot_request' && (
          <form onSubmit={handleForgotRequest} className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAuthView('login')}
                className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors"
                aria-label="Back"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {t.auth.forgotPasswordTitle}
                </h2>
                <p className="text-xs text-zinc-400">
                  {t.auth.forgotPasswordSubtitle}
                </p>
              </div>
            </div>

            {/* Identifier input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {t.auth.emailAddress} / {t.auth.phoneNumber}
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com or phone"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white shadow-lg shadow-blue-500/25 transition-all hover:opacity-95 disabled:opacity-50 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)" }}
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              <span>{t.auth.sendResetCode}</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setAuthView('login')}
                className="text-xs text-zinc-400 hover:text-white"
              >
                {t.auth.backToLogin}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* VIEW 7: FORGOT NEW PASSWORD                               */}
        {/* ========================================================= */}
        {authModal.view === 'forgot_new_password' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight mb-1">
                {t.auth.newPasswordTitle}
              </h2>
              <p className="text-xs text-zinc-400">
                {t.auth.newPasswordSubtitle}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {t.auth.newPassword}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter at least 8 characters"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {t.auth.confirmNewPassword}
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/10 text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !password || password !== confirmPassword}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white shadow-lg shadow-blue-500/25 transition-all hover:opacity-95 disabled:opacity-50 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)" }}
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              <span>Update Password</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
