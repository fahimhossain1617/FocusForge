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
  screen: "login" | "signup" | "verify" | "reset";
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
    // Check saved theme in localStorage or state or document
    let isLight = state?.theme?.mode === "light";
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("focusforge_theme") || localStorage.getItem("theme");
      if (storedTheme === "light") isLight = true;
      else if (storedTheme === "dark") isLight = false;
      else if (document.documentElement.classList.contains("light")) isLight = true;
    }
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
      <h1 className="auth-hero-title">Focentia</h1>
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
      © 2026 Focentia ·{" "}
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
            {(showBack || stepInfo) && (
              <div className="flex items-center gap-3 mb-4">
                {showBack && backButton}
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
        {(showBack || stepInfo) && (
          <div className="flex items-center gap-3 w-full mb-4">
            {showBack && backButton}
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
        {showBack && (
          <div className="auth-phone-top-bar">
            <div className="flex items-center gap-2.5">
              {backButton}
              {stepInfo && (
                <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
                  {stepInfo}
                </span>
              )}
            </div>
          </div>
        )}

        <div className={`auth-phone-main ${showBack ? "auth-phone-main-top" : ""}`}>
          {screen === "login" && !showBack && (
            <div className="auth-hero-mobile">
              <div className="auth-hero-group">
                <span className="auth-hero-lead">Welcome to</span>
                <h1 className="auth-hero-title">Focentia</h1>
              </div>
              <div className="auth-hero-desc">
                <p className="auth-hero-tagline">Your focus. Your progress. Your future.</p>
                <p className="auth-hero-details">
                  Plan your day, build better habits, track your focus, learn new skills and become the best version of yourself.
                </p>
              </div>
            </div>
          )}

          {!showBack && stepInfo && (
            <div className="flex items-center justify-between mb-3 w-full">
              <span className="text-[11px] font-bold text-blue-400 tracking-widest uppercase">
                {stepInfo}
              </span>
            </div>
          )}

          <div className="w-full">
            {children}
          </div>

          {footerElement}
        </div>
      </div>

      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </div>
  );
}
