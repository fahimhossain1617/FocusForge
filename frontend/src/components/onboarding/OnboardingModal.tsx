"use client";

import React, { useState, useEffect } from "react";
import { Moon, Sun, ArrowRight, ArrowLeft, Check, Compass, LogIn } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { onboardingStorage } from "@/services/onboardingStorage";
import styles from "./onboarding.module.css";

export type OnboardingStep = "WELCOME" | "LANGUAGE" | "THEME" | "PHILOSOPHY" | "ACCOUNT_MODE";

interface OnboardingModalProps {
  isOpen: boolean;
  onEnterApp: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onEnterApp,
}) => {
  const { state, updateState } = useAppContext();
  const { openAuth } = useAuth();
  const { t } = useTranslation();

  const [step, setStep] = useState<OnboardingStep>("WELCOME");
  const [selectedLang, setSelectedLang] = useState<"en" | "bn">(state.lang === "bn" ? "bn" : "en");
  const [selectedTheme, setSelectedTheme] = useState<"dark" | "light">(state.theme.mode === "light" ? "light" : "dark");

  // Keep local choices in sync with current state
  useEffect(() => {
    if (state.lang) setSelectedLang(state.lang === "bn" ? "bn" : "en");
  }, [state.lang]);

  useEffect(() => {
    if (state.theme?.mode) setSelectedTheme(state.theme.mode);
  }, [state.theme?.mode]);

  // Lock background scrolling while onboarding modal is active
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const ob = t.onboarding;

  // Language selection handler
  const handleSelectLanguage = (lang: "en" | "bn") => {
    setSelectedLang(lang);
    updateState({ lang });
    onboardingStorage.saveLocalState({ preferredLanguage: lang });
  };

  // Theme selection handler - immediately updates live UI
  const handleSelectTheme = (mode: "dark" | "light") => {
    setSelectedTheme(mode);
    updateState({
      theme: {
        ...state.theme,
        mode,
        background: mode === "light" ? "#F8FAFC" : "#070A12",
      },
    });
    onboardingStorage.saveLocalState({ preferredTheme: mode });
  };

  // Guest flow completion
  const handleContinueAsGuest = () => {
    onboardingStorage.saveLocalState({
      accountMode: "guest",
      preferredLanguage: selectedLang,
      preferredTheme: selectedTheme,
    });
    onEnterApp();
  };

  // Auth flow initiation
  const handleLoginOrSignup = () => {
    onboardingStorage.saveLocalState({
      accountMode: "authenticated",
      preferredLanguage: selectedLang,
      preferredTheme: selectedTheme,
    });
    openAuth("login", {
      onAuthenticated: () => {
        onEnterApp();
      },
    });
  };

  return (
    <div
      className={styles.onboardingOverlay}
      role="dialog"
      aria-modal="true"
      aria-label="FocusForge Onboarding"
    >
      <div className={styles.ambientGlowPrimary} />
      <div className={styles.ambientGlowSecondary} />

      <div className={styles.onboardingCard}>
        {/* ==================== STEP 1: WELCOME ==================== */}
        {step === "WELCOME" && (
          <div className="fade-in flex flex-col items-center text-center">
            <h1 className={styles.cardTitle} style={{ marginTop: "12px", marginBottom: "14px" }}>
              {ob.welcome.title}
            </h1>

            <p className={styles.cardSubtitle} style={{ marginBottom: "28px" }}>
              {ob.welcome.description}
            </p>

            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setStep("LANGUAGE")}
              autoFocus
            >
              <span>{ob.welcome.getStarted}</span>
              <ArrowRight size={17} />
            </button>
          </div>
        )}

        {/* ==================== STEP 2: LANGUAGE ==================== */}
        {step === "LANGUAGE" && (
          <div className="fade-in flex flex-col">
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>{ob.language.title}</h2>
              <p className={styles.cardSubtitle}>{ob.language.subtitle}</p>
            </div>

            <div className={styles.optionsGrid}>
              <button
                type="button"
                className={`${styles.optionCard} ${selectedLang === "bn" ? styles.optionCardActive : ""}`}
                onClick={() => handleSelectLanguage("bn")}
              >
                <div className={styles.optionIconWrapper}>
                  <span style={{ fontSize: "19px", fontWeight: 700 }}>ক</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className={styles.optionLabel}>বাংলা</p>
                  <p className={styles.optionDesc}>Bengali Interface</p>
                </div>
                {selectedLang === "bn" && (
                  <div className="absolute top-3 right-3 text-blue-500">
                    <Check size={16} strokeWidth={2.8} />
                  </div>
                )}
              </button>

              <button
                type="button"
                className={`${styles.optionCard} ${selectedLang === "en" ? styles.optionCardActive : ""}`}
                onClick={() => handleSelectLanguage("en")}
              >
                <div className={styles.optionIconWrapper}>
                  <span style={{ fontSize: "17px", fontWeight: 700 }}>EN</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className={styles.optionLabel}>English</p>
                  <p className={styles.optionDesc}>English Interface</p>
                </div>
                {selectedLang === "en" && (
                  <div className="absolute top-3 right-3 text-blue-500">
                    <Check size={16} strokeWidth={2.8} />
                  </div>
                )}
              </button>
            </div>

            <div className={styles.buttonRow}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => setStep("WELCOME")}
                title={ob.back}
              >
                <ArrowLeft size={16} />
                <span>{ob.back}</span>
              </button>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => setStep("THEME")}
                style={{ flex: 1 }}
                autoFocus
              >
                <span>{ob.language.next}</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}

        {/* ==================== STEP 3: THEME ==================== */}
        {step === "THEME" && (
          <div className="fade-in flex flex-col">
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>{ob.theme.title}</h2>
              <p className={styles.cardSubtitle}>{ob.theme.subtitle}</p>
            </div>

            <div className={styles.optionsGrid}>
              <button
                type="button"
                className={`${styles.optionCard} ${selectedTheme === "dark" ? styles.optionCardActive : ""}`}
                onClick={() => handleSelectTheme("dark")}
              >
                <div className={styles.optionIconWrapper}>
                  <Moon size={20} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className={styles.optionLabel}>{ob.theme.dark}</p>
                  <p className={styles.optionDesc}>{ob.theme.darkDesc}</p>
                </div>
                {selectedTheme === "dark" && (
                  <div className="absolute top-3 right-3 text-blue-500">
                    <Check size={16} strokeWidth={2.8} />
                  </div>
                )}
              </button>

              <button
                type="button"
                className={`${styles.optionCard} ${selectedTheme === "light" ? styles.optionCardActive : ""}`}
                onClick={() => handleSelectTheme("light")}
              >
                <div className={styles.optionIconWrapper}>
                  <Sun size={20} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className={styles.optionLabel}>{ob.theme.light}</p>
                  <p className={styles.optionDesc}>{ob.theme.lightDesc}</p>
                </div>
                {selectedTheme === "light" && (
                  <div className="absolute top-3 right-3 text-blue-500">
                    <Check size={16} strokeWidth={2.8} />
                  </div>
                )}
              </button>
            </div>

            <div className={styles.buttonRow}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => setStep("LANGUAGE")}
                title={ob.back}
              >
                <ArrowLeft size={16} />
                <span>{ob.back}</span>
              </button>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => setStep("PHILOSOPHY")}
                style={{ flex: 1 }}
                autoFocus
              >
                <span>{ob.theme.next}</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}

        {/* ==================== STEP 4: PHILOSOPHY ==================== */}
        {step === "PHILOSOPHY" && (
          <div className="fade-in flex flex-col">
            <div className={styles.philosophyBody}>
              <p className={styles.philosophyIntro}>{ob.philosophy.title}</p>
              <p className={styles.philosophySub}>{ob.philosophy.subtitle}</p>
              <p className={styles.philosophyGoodNews}>{ob.philosophy.goodNewsTitle}</p>

              <div className={styles.philosophyList}>
                {ob.philosophy.points.map((pt, idx) => (
                  <div key={idx} className={styles.philosophyItem}>
                    <span className={styles.bulletDot} />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>

              <div className={styles.philosophyQuoteBox}>
                <p className={styles.philosophyQuote}>"{ob.philosophy.quote1}"</p>
                <p className={styles.philosophyQuote}>"{ob.philosophy.quote2}"</p>
              </div>
            </div>

            <div className={styles.buttonRow}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => setStep("THEME")}
                title={ob.back}
              >
                <ArrowLeft size={16} />
                <span>{ob.back}</span>
              </button>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => setStep("ACCOUNT_MODE")}
                style={{ flex: 1 }}
                autoFocus
              >
                <span>{ob.philosophy.continueBtn}</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}

        {/* ==================== STEP 5: ACCOUNT MODE ==================== */}
        {step === "ACCOUNT_MODE" && (
          <div className="fade-in flex flex-col">
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>{ob.account.title}</h2>
              <p className={styles.cardSubtitle}>{ob.account.subtitle}</p>
            </div>

            <div className={styles.optionsGrid}>
              <button
                type="button"
                className={styles.optionCard}
                onClick={handleContinueAsGuest}
                title={ob.account.guestDesc}
              >
                <div className={styles.optionIconWrapper}>
                  <Compass size={22} />
                </div>
                <div className="flex flex-col gap-1">
                  <p className={styles.optionLabel}>{ob.account.guestTitle}</p>
                  <p className={styles.optionDesc}>{ob.account.guestDesc}</p>
                </div>
              </button>

              <button
                type="button"
                className={`${styles.optionCard} ${styles.optionCardActive}`}
                onClick={handleLoginOrSignup}
                title={ob.account.authDesc}
              >
                <div className={styles.optionIconWrapper}>
                  <LogIn size={22} />
                </div>
                <div className="flex flex-col gap-1">
                  <p className={styles.optionLabel}>{ob.account.authTitle}</p>
                  <p className={styles.optionDesc}>{ob.account.authDesc}</p>
                </div>
              </button>
            </div>

            <button
              type="button"
              className={styles.backButton}
              onClick={() => setStep("PHILOSOPHY")}
              style={{ width: "100%", marginTop: "16px" }}
              title={ob.back}
            >
              <ArrowLeft size={16} />
              <span>{ob.back}</span>
            </button>
          </div>
        )}

        {/* Step Indicator Dots */}
        <div className={styles.stepDots} aria-hidden="true">
          <span className={`${styles.stepDot} ${step === "WELCOME" ? styles.stepDotActive : ""}`} />
          <span className={`${styles.stepDot} ${step === "LANGUAGE" ? styles.stepDotActive : ""}`} />
          <span className={`${styles.stepDot} ${step === "THEME" ? styles.stepDotActive : ""}`} />
          <span className={`${styles.stepDot} ${step === "PHILOSOPHY" ? styles.stepDotActive : ""}`} />
          <span className={`${styles.stepDot} ${step === "ACCOUNT_MODE" ? styles.stepDotActive : ""}`} />
        </div>
      </div>
    </div>
  );
};
