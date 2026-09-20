"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthIcons } from "./AuthIcons";
import LegalModal from "./LegalModal";
import { useAppContext } from "../../context/AppContext";

interface AuthLayoutProps {
  children: React.ReactNode;
  screen: "login" | "signup" | "verify";
  showBack?: boolean;
  onBack?: () => void;
}

export default function AuthLayout({
  children,
  screen,
  showBack,
  onBack,
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
    <>
      Welcome to
      <br />
      FocusForge
    </>
  );

  const heroSubline = "Track your progress, keep your work in order, and make every day count.";

  const footerElement = (
    <div className="auth-foot">
      © 2026 FocusForge ·{" "}
      <button
        type="button"
        onClick={() => openLegal("privacy")}
        className="hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer"
      >
        Privacy
      </button>{" "}
      ·{" "}
      <button
        type="button"
        onClick={() => openLegal("terms")}
        className="hover:underline text-inherit bg-transparent border-0 p-0 cursor-pointer"
      >
        Terms
      </button>
    </div>
  );

  const backButton = (
    <button type="button" onClick={handleBack} className="auth-back" aria-label="Go back">
      {AuthIcons.back}
      <span>Back</span>
    </button>
  );

  const legalNotice = (
    <div className="auth-legal">
      By continuing, you agree to our{" "}
      <button
        type="button"
        onClick={() => openLegal("terms")}
        className="font-semibold text-white hover:underline bg-transparent border-0 p-0 cursor-pointer"
      >
        Terms of Service
      </button>{" "}
      and{" "}
      <button
        type="button"
        onClick={() => openLegal("privacy")}
        className="font-semibold text-white hover:underline bg-transparent border-0 p-0 cursor-pointer"
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
            <h1 className="auth-hero">{heroHeadline}</h1>
            <p className="auth-hero-sub">{heroSubline}</p>
          </div>
          {footerElement}
        </div>
        <div className="auth-desktop-right">
          <div className="auth-card">
            {children}
            {screen === "login" && legalNotice}
          </div>
        </div>
      </div>

      {/* Tablet Layout (700px - 1023px) */}
      <div className="hidden sm:flex lg:hidden auth-tablet-layout">
        {showBack && (
          <div className="flex justify-start items-center w-full mb-2">
            {backButton}
          </div>
        )}
        <h1 className="auth-hero">{heroHeadline}</h1>
        <p className="auth-hero-sub">{heroSubline}</p>
        <div className="auth-card">
          {children}
          {screen === "login" && legalNotice}
        </div>
        {footerElement}
      </div>

      {/* Phone Layout (< 700px) */}
      <div className="flex sm:hidden auth-phone-layout">
        {screen === "login" ? (
          <div className="auth-hero-mini">
            <h1 className="auth-hero">{heroHeadline}</h1>
            <p className="auth-hero-sub">{heroSubline}</p>
          </div>
        ) : (
          <div className="mb-4">
            {backButton}
          </div>
        )}

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
