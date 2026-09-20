"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLayout from "../../components/auth/AuthLayout";
import { AuthIcons } from "../../components/auth/AuthIcons";
import ForgotPasswordModal from "../../components/auth/ForgotPasswordModal";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useAppContext } from "../../context/AppContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading, onAuthSuccess } = useAuth();
  const { showToast, navigateTo } = useAppContext();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  // If already authenticated, redirect to dashboard immediately
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
      const res = await authService.validateCredentials(email, password);
      
      if (res.isUnconfirmed) {
        // Redirect to verify page if unverified
        showToast("Please verify your email address to log in.", "info");
        router.push(`/verify?email=${encodeURIComponent(email.trim())}`);
        return;
      }

      if (!res.success) {
        setError(res.error || "Invalid email or password.");
        setLoading(false);
        return;
      }

      if (res.user) {
        onAuthSuccess(res.user, false);
        router.push("/");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during login.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.loginWithGoogle();
      if (!res.success) {
        setError(res.error || "Google sign-in could not be initiated.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed.");
      setLoading(false);
    }
  };

  const handleContinueAsGuest = (e: React.MouseEvent) => {
    e.preventDefault();
    navigateTo("today");
    router.push("/");
  };

  return (
    <AuthLayout screen="login">
      <h2 className="auth-title">Welcome back</h2>
      <p className="auth-lead">Log in to continue where you left off.</p>

      {error && <div className="auth-error-banner">{error}</div>}

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

        <button
          type="button"
          onClick={handleContinueAsGuest}
          className="auth-guest"
        >
          or <u>continue as a guest</u>
        </button>
      </form>

      <ForgotPasswordModal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        initialEmail={email}
      />
    </AuthLayout>
  );
}
