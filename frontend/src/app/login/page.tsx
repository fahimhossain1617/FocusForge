"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from "../../components/auth/AuthLayout";
import { AuthIcons } from "../../components/auth/AuthIcons";
import ForgotPasswordModal from "../../components/auth/ForgotPasswordModal";
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [showAccountList, setShowAccountList] = useState(true);

  // Pre-fill email from query parameters if passed from switcher or verification
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
      setShowAccountList(false);
    }
  }, [searchParams]);

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
        showToast("Please verify your email address to log in.", "info");
        router.push(`/verify?email=${encodeURIComponent(email.trim())}`);
        return;
      }

      if (!res.success) {
        setError(res.error || "Invalid email or password.");
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
    setShowAccountList(false);
  };

  return (
    <AuthLayout screen="login">
      <h2 className="auth-title">Welcome back</h2>
      <p className="auth-lead">Log in to continue where you left off.</p>

      {error && <div className="auth-error-banner">{error}</div>}

      {/* Quick Remembered Accounts List */}
      {showAccountList && rememberedAccounts.length > 0 && (
        <div className="mb-4 p-3.5 rounded-2xl bg-blue-50/50 dark:bg-white/[0.02] border border-blue-200/60 dark:border-white/10 text-left">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-[#0F172A] dark:text-foreground flex items-center gap-1.5">
              <Users size={14} className="text-blue-500" />
              Saved Accounts ({rememberedAccounts.length})
            </span>
            <button
              type="button"
              onClick={() => setShowAccountList(false)}
              className="text-[11px] text-blue-500 hover:underline"
            >
              Use another account
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {rememberedAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-[#151922] border border-slate-200/80 dark:border-white/[0.05] hover:border-blue-400 transition-all"
              >
                <button
                  type="button"
                  onClick={() => handleSelectRememberedAccount(account)}
                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                >
                  {account.avatarUrl ? (
                    <img
                      src={account.avatarUrl}
                      alt={account.displayName}
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
                      {account.displayName ? account.displayName[0] : <User size={12} />}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#0F172A] dark:text-foreground truncate leading-tight">
                      {account.displayName}
                    </p>
                    <p className="text-[10px] text-[#52627A] dark:text-muted-foreground truncate">
                      {account.email}
                    </p>
                  </div>
                  <ArrowRight size={13} className="text-blue-500 shrink-0 mr-1" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRememberedAccount(account.id);
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  title="Remove from saved accounts"
                  aria-label="Remove account"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        className="auth-gbtn mt-2.5"
        onClick={handleGoogleLogin}
        disabled={loading}
      >
        {AuthIcons.google}
        Continue with Google
      </button>

      <div className="auth-or">or log in with email</div>

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
            onClick={() => setForgotModalOpen(true)}
            className="hover:underline"
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

        <button type="submit" className="auth-cta" disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </button>

        <div className="auth-alt">
          Don’t have an account? <Link href="/signup">Create account</Link>
        </div>

        {!isGuestModeDisabled && (
          <button
            type="button"
            onClick={handleContinueAsGuest}
            className="auth-guest"
          >
            or <u>continue as a guest</u>
          </button>
        )}
      </form>

      <ForgotPasswordModal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        initialEmail={email}
      />
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
