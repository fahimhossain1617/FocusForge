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

export default function SignupPage() {
  const router = useRouter();
  const { onAuthSuccess } = useAuth();
  const { showToast } = useAppContext();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<"terms" | "privacy">("terms");

  const openLegal = (tab: "terms" | "privacy") => {
    setLegalModalTab(tab);
    setLegalModalOpen(true);
  };

  // Compute password strength
  const getPasswordStrength = () => {
    if (!password) return { level: 0, text: "" };
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);
    const isLongEnough = password.length >= 8;

    if (password.length >= 10 && hasLetter && hasNumber && hasSpecial) {
      return { level: 4, text: "Strong" };
    }
    if (isLongEnough && hasLetter && hasNumber) {
      return { level: 3, text: "Good" };
    }
    if (isLongEnough && (hasLetter || hasNumber)) {
      return { level: 2, text: "Fair" };
    }
    if (password.length >= 6) {
      return { level: 1, text: "Weak" };
    }
    return { level: 1, text: "Too short" };
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must be at least 8 characters with at least one letter and one number.");
      return;
    }

    if (!agreedToTerms) {
      setError("Please accept the Terms of Service and Privacy Policy to continue.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authService.signUp(fullName, email, password);

      if (!res.success) {
        setError(res.error || "Failed to create account. Please check your credentials.");
        setLoading(false);
        return;
      }

      // If user session is returned or user is active, log in and open dashboard directly
      if (res.user) {
        onAuthSuccess(res.user, true);
        showToast("Account created successfully! Welcome to FocusForge.", "success");
        router.push("/");
        return;
      }

      // Store pending email in sessionStorage for verification screen fallback
      if (typeof window !== "undefined") {
        sessionStorage.setItem("focusforge_pending_email", email.trim().toLowerCase());
        sessionStorage.setItem("focusforge_pending_name", fullName.trim());
      }

      // Redirect to step 2 (Email Verification)
      router.push(`/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during signup.");
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
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "Google sign-up failed.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout screen="signup" showBack>
      <div className="auth-steps">
        <i className="on" />
        <i />
        <span>Step 1 of 2</span>
      </div>

      <h2 className="auth-title">Create your account</h2>
      <p className="auth-lead">Start tracking your progress today.</p>

      <div style={{ height: "12px" }} />

      {error && <div className="auth-error-banner">{error}</div>}

      <button
        type="button"
        className="auth-gbtn"
        onClick={handleGoogleSignup}
        disabled={loading}
      >
        {AuthIcons.google}
        Sign up with Google
      </button>

      <div className="auth-or">or sign up with email</div>

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
        <div className="auth-field" style={{ marginBottom: "8px" }}>
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
        <div className="auth-hint" style={{ marginTop: 0 }}>
          We’ll send a verification code to this address.
        </div>

        <label htmlFor="signup-password" className="auth-label">
          Password
        </label>
        <div className="auth-field" style={{ marginBottom: "12px" }}>
          {AuthIcons.lock}
          <input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

        <div className="auth-meter">
          <i className={strength.level >= 1 ? "on" : ""} />
          <i className={strength.level >= 2 ? "on" : ""} />
          <i className={strength.level >= 3 ? "on" : ""} />
          <i className={strength.level >= 4 ? "on" : ""} />
        </div>
        <div className="auth-strength">
          <span>8+ characters, a letter and a number</span>
          {strength.text && <b>{strength.text}</b>}
        </div>

        <div
          className="auth-check"
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
          <span>
            I agree to the{" "}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openLegal("terms");
              }}
              className="text-link hover:underline bg-transparent border-0 p-0 font-medium cursor-pointer"
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
              className="text-link hover:underline bg-transparent border-0 p-0 font-medium cursor-pointer"
            >
              Privacy Policy
            </button>
          </span>
        </div>

        <button type="submit" className="auth-cta" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>

        <div className="auth-alt">
          Already have an account? <Link href="/login">Log In</Link>
        </div>
      </form>

      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </AuthLayout>
  );
}
