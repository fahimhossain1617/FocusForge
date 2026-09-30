"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AuthIcons } from "./AuthIcons";
import LegalModal from "./LegalModal";
import { useAppContext } from "../../context/AppContext";

interface AuthLayoutProps {
  children: React.ReactNode;
  screen: "login" | "signup" | "verify";
  showBack?: boolean;
  onBack?: () => void;
  stepInfo?: string;
}

export default function AuthLayout({
  children,
  screen,
  showBack,
  onBack,
  stepInfo,
}: AuthLayoutProps) {
  const router = useRouter();
  const { state } = useAppContext();
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<"terms" | "privacy">("terms");

  useEffect(() => {
    const isLight = state?.theme?.mode === "light";
    setThemeMode(isLight ? "light" : "dark");
  }, [state?.theme?.mode]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const openLegal = (tab: "terms" | "privacy") => {
    setLegalModalTab(tab);
    setLegalModalOpen(true);
  };

  const heroHeadline = (
    <div className="auth-hero-group">
      <span className="auth-hero-lead">Welcome to</span>
      <h1 className="auth-hero-title">Focus Forge</h1>
    </div>
  );

  const heroSubline = (
    <div className="auth-hero-desc">
      <p className="auth-hero-tagline">Your focus. Your progress. Your future.</p>
      <p className="auth-hero-details">
        Plan your day, build better habits, track your focus, learn new skills and become the best version of yourself.
      </p>
    </div>
  );

  const footerElement = (
    <div className="auth-foot">
      © 2026 FocusForge ·{" "}
      <button
        type="button"
        onClick={() => openLegal("privacy")}
        className="font-medium hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer"
      >
        Privacy
      </button>{" "}
      ·{" "}
      <button
        type="button"
        onClick={() => openLegal("terms")}
        className="font-medium hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer"
      >
        Terms
      </button>
    </div>
  );

  const backButton = (
    <button
      type="button"
      onClick={handleBack}
      className="auth-icon-back"
      aria-label="Go back"
      title="Go back"
    >
      <ArrowLeft size={22} strokeWidth={2.2} />
    </button>
  );

  const legalNotice = (
    <div className="auth-legal">
      By continuing, you agree to our{" "}
      <button
        type="button"
        onClick={() => openLegal("terms")}
        className="font-bold text-blue-400 hover:text-blue-300 underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer"
      >
        Terms of Service
      </button>{" "}
      and{" "}
      <button
        type="button"
        onClick={() => openLegal("privacy")}
        className="font-bold text-blue-400 hover:text-blue-300 underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer"
      >
        Privacy Policy
      </button>
      .
    </div>
  );

  return (
    <div className="auth-frame" data-theme={themeMode}>
      {/* Desktop Layout (1024px+) */}
      <div className="hidden lg:grid auth-desktop-layout">
        <div className="auth-desktop-left">
          <div className="mid">
            {heroHeadline}
            {heroSubline}
          </div>
          {footerElement}
        </div>
        <div className="auth-desktop-right">
          <div className="auth-card">
            {showBack && (
              <div className="flex items-center gap-3 mb-4">
                {backButton}
                {stepInfo && (
                  <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
                    {stepInfo}
                  </span>
                )}
              </div>
            )}
            {children}
            {screen === "login" && legalNotice}
          </div>
        </div>
      </div>

      {/* Tablet Layout (700px - 1023px) */}
      <div className="hidden sm:flex lg:hidden auth-tablet-layout">
        {showBack && (
          <div className="flex items-center gap-3 w-full mb-3">
            {backButton}
            {stepInfo && (
              <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
                {stepInfo}
              </span>
            )}
          </div>
        )}
        <div className="mb-6">
          {heroHeadline}
          {heroSubline}
        </div>
        <div className="auth-card">
          {children}
          {screen === "login" && legalNotice}
        </div>
        {footerElement}
      </div>

      {/* Phone Layout (< 700px) */}
      <div className="flex sm:hidden auth-phone-layout">
        {showBack ? (
          <div className="flex flex-col items-start gap-1 w-full mb-3">
            {backButton}
            {stepInfo && (
              <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase mt-1">
                {stepInfo}
              </span>
            )}
          </div>
        ) : screen === "login" ? (
          <div className="auth-hero-mini mb-4">
            <div className="auth-hero-group">
              <span className="auth-hero-lead text-base text-slate-300">Welcome to</span>
              <h1 className="auth-hero-title text-3xl font-extrabold">Focus Forge</h1>
            </div>
            <p className="auth-hero-tagline text-xs font-semibold text-slate-200 mt-1 mb-0">
              Your focus. Your progress. Your future.
            </p>
          </div>
        ) : null}

        <div className="w-full">
          {children}
        </div>

        {footerElement}
      </div>

      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </div>
  );
}
