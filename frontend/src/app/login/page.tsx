"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "../../components/auth/AuthLayout";
import { AuthIcons } from "../../components/auth/AuthIcons";
import ForgotPasswordModal from "../../components/auth/ForgotPasswordModal";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useAppContext } from "../../context/AppContext";
import { User, Users, Trash2, ArrowRight } from "lucide-react";
import { RememberedAccount } from "../../services/accountManager";


function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    isLoading: isAuthLoading,
    isGuestModeDisabled,
    rememberedAccounts,
    removeRememberedAccount,
    loginWithCredentials,
    loginWithGoogle,
  } = useAuth();
  const { showToast, navigateTo } = useAppContext();

  const [viewMode, setViewMode] = useState<"login" | "forgot" | "reset-sent">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSavedSheet, setShowSavedSheet] = useState(false);

  // Pre-fill email from query parameters
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
      setShowSavedSheet(false);
    } else if (rememberedAccounts.length > 0) {
      setShowSavedSheet(true);
    }
  }, [searchParams, rememberedAccounts.length]);

  // If already authenticated and stable, redirect to home
  useEffect(() => {
    if (!isAuthLoading && user) {
      router.replace("/");
    }
  }, [user, isAuthLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await loginWithCredentials(email, password, rememberMe);

      if (res.isUnconfirmed) {
        try {
          await authService.resendOtp(email.trim());
          showToast("A verification code has been dispatched to your email. Please verify to log in.", "info");
        } catch {
          showToast("Please verify your email address to log in.", "info");
        }
        router.push(`/verify?email=${encodeURIComponent(email.trim())}&fromLogin=1`);
        return;
      }

      if (!res.success) {
        let errorMessage = res.error || "Invalid email or password.";
        if (errorMessage.toLowerCase().includes("invalid login credentials")) {
          errorMessage = "No account found with this email, or incorrect password. Please create a new account if you don't have one.";
        }
        setError(errorMessage);
        return;
      }

      router.replace("/");
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const success = await loginWithGoogle();
      if (!success) {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed.");
      setLoading(false);
    }
  };

  const handleContinueAsGuest = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isGuestModeDisabled) {
      showToast("Guest mode is no longer available on this browser profile.", "info");
      return;
    }
    navigateTo("today");
    router.push("/");
  };

  const handleSelectRememberedAccount = (account: RememberedAccount) => {
    setEmail(account.email);
    setShowSavedSheet(false);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authService.sendPasswordResetEmail(email.trim());
      if (res.success) {
        setViewMode("reset-sent");
      } else {
        setError(res.error || "Failed to send password reset link. Please try again.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to send password reset link.");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // VIEW: RESET LINK SENT CONFIRMATION
  // ----------------------------------------------------
  if (viewMode === "reset-sent") {
    return (
      <AuthLayout screen="login" showBack onBack={() => { setViewMode("login"); setError(null); }}>
        <h2 className="auth-title">Check your email</h2>
        <p className="auth-lead">
          We’ve sent a password reset link to <strong className="text-white">{email}</strong>.
        </p>

        <div className="my-5 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-left text-xs leading-relaxed text-blue-200">
          <strong className="block text-white font-semibold mb-1">Check your Gmail Spam folder:</strong>
          If you don’t see the email in your inbox within a few minutes, please check your <strong>Spam</strong> or <strong>Junk</strong> folder, as password reset links often land there.
        </div>

        <button
          type="button"
          onClick={() => { setViewMode("login"); setError(null); }}
          className="auth-cta mb-3"
        >
          Back to log in
        </button>

        <div className="text-center text-xs text-slate-400">
          Didn’t receive it?{" "}
          <button
            type="button"
            onClick={handleForgotPasswordSubmit}
            disabled={loading}
            className="text-blue-400 font-semibold hover:underline bg-transparent border-0 p-0 cursor-pointer"
          >
            Resend reset link
          </button>
        </div>
      </AuthLayout>
    );
  }

  // ----------------------------------------------------
  // VIEW: FORGOT PASSWORD FORM (NO BLUR POPUP)
  // ----------------------------------------------------
  if (viewMode === "forgot") {
    return (
      <AuthLayout screen="login" showBack onBack={() => { setViewMode("login"); setError(null); }}>
        <h2 className="auth-title">Reset password</h2>
        <p className="auth-lead">
          Enter your email address, and we will send a request with a reset link.
        </p>

        <form onSubmit={handleForgotPasswordSubmit} className="mt-5">
          <div className="auth-row">
            <label htmlFor="reset-email" className="auth-label">
              Email address
            </label>
          </div>
          <div className="auth-field">
            {AuthIcons.mail}
            <input
              id="reset-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {error && <div className="auth-bottom-error">{error}</div>}

          <button type="submit" className="auth-cta mt-4" disabled={loading}>
            {loading ? "Sending link..." : "Send reset link"}
          </button>

          <div className="auth-alt mt-4">
            Remembered your password?{" "}
            <button
              type="button"
              onClick={() => { setViewMode("login"); setError(null); }}
              className="text-blue-400 hover:underline"
            >
              Back to log in
            </button>
          </div>
        </form>
      </AuthLayout>
    );
  }

  // ----------------------------------------------------
  // VIEW: MAIN LOGIN
  // ----------------------------------------------------
  return (
    <AuthLayout screen="login">
      <div className="flex items-center justify-between mb-1">
        <h2 className="auth-title">Welcome back</h2>
        {rememberedAccounts.length > 0 && (
          <button
            type="button"
            onClick={() => setShowSavedSheet(true)}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <Users size={13} />
            Saved ({rememberedAccounts.length})
          </button>
        )}
      </div>
      <p className="auth-lead mb-4">Log in to continue where you left off.</p>

      {/* Primary Login Form: Email -> Password -> Remember Me -> Login CTA */}
      <form onSubmit={handleSubmit}>
        <div className="auth-row">
          <label htmlFor="login-email" className="auth-label">
            Email address
          </label>
        </div>
        <div className="auth-field">
          {AuthIcons.mail}
          <input
            id="login-email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="auth-row">
          <label htmlFor="login-password" className="auth-label">
            Password
          </label>
          <button
            type="button"
            onClick={() => { setViewMode("forgot"); setError(null); }}
            className="text-xs text-blue-400 hover:underline cursor-pointer"
          >
            Forgot password?
          </button>
        </div>
        <div className="auth-field">
          {AuthIcons.lock}
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
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

        <div
          className="auth-check"
          onClick={() => setRememberMe(!rememberMe)}
          role="checkbox"
          aria-checked={rememberMe}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              setRememberMe(!rememberMe);
            }
          }}
        >
          <span className={`box ${rememberMe ? "" : "unchecked"}`}>
            {rememberMe && AuthIcons.check}
          </span>
          <span>Remember me</span>
        </div>

        {/* Error placed at the bottom near CTA */}
        {error && <div className="auth-bottom-error">{error}</div>}

        <button type="submit" className="auth-cta mt-2" disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </button>

        <div className="auth-alt mt-3">
          Don’t have an account? <Link href="/signup" className="text-blue-400 hover:underline">Create account</Link>
        </div>

        <div className="auth-or my-3">or continue with</div>

        {/* Continue with Google at bottom */}
        <button
          type="button"
          className="auth-gbtn"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {AuthIcons.google}
          Continue with Google
        </button>

        {!isGuestModeDisabled && (
          <button
            type="button"
            onClick={handleContinueAsGuest}
            className="auth-guest mt-3"
          >
            or <u>continue as a guest</u>
          </button>
        )}
      </form>

      {/* Saved Accounts Bottom Sheet Modal */}
      {showSavedSheet && rememberedAccounts.length > 0 && (
        <div
          className="auth-sheet-backdrop"
          onClick={() => setShowSavedSheet(false)}
        >
          <div
            className="auth-sheet-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users size={16} className="text-blue-400" />
                  Continue with a Saved Account
                </h3>
                <p className="text-[11px] text-slate-400">Select an account to log in instantly</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSavedSheet(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {rememberedAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-blue-400/80 transition-all cursor-pointer"
                  onClick={() => handleSelectRememberedAccount(account)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {account.avatarUrl ? (
                      <img
                        src={account.avatarUrl}
                        alt={account.displayName}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold uppercase shrink-0">
                        {account.displayName ? account.displayName[0] : <User size={14} />}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-xs font-semibold text-white truncate">
                        {account.displayName}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {account.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <ArrowRight size={14} className="text-blue-400" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRememberedAccount(account.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-1"
                      title="Remove from saved accounts"
                      aria-label="Remove account"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowSavedSheet(false)}
              className="w-full mt-3 py-2 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors font-medium"
            >
              Use a different account
            </button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-frame flex items-center justify-center min-h-screen text-white">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
