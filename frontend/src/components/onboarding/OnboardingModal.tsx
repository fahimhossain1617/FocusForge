"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { onboardingStorage } from "@/services/onboardingStorage";
import { userService } from "@/services/userService";
import styles from "./onboarding.module.css";

interface OnboardingModalProps {
  isOpen: boolean;
  onEnterApp?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onEnterApp,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const [isExiting, setIsExiting] = useState(false);

  // Lock document scrolling while onboarding screen is open & prefetch login
  useEffect(() => {
    if (!isOpen) return;
    router.prefetch("/login");
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, router]);

  if (!isOpen) return null;

  const handleGetStarted = () => {
    try {
      // Persist onboarding completion so it never prompts again
      onboardingStorage.saveLocalState({
        onboardingCompleted: true,
        productTourCompleted: true,
      });

      if (user?.id) {
        userService.saveOnboardingState(user.id, {
          onboardingCompleted: true,
          productTourCompleted: true,
        }).catch((err) => {
          console.warn("[OnboardingModal] Failed to sync onboarding to server:", err);
        });
      }
    } catch (err) {
      console.warn("[OnboardingModal] Storage update error:", err);
    }

    // Instantly close onboarding and replace URL without history back to onboarding
    if (onEnterApp) {
      onEnterApp();
    }
    router.replace("/login");
  };

  return (
    <div
      className={`${styles.onboardingRoot} ${isExiting ? styles.isExiting : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Focentia"
    >
      {/* Background Gradient Atmosphere */}
      <div className={styles.backgroundAtmosphere} aria-hidden="true" />

      {/* Main Content Layout */}
      <div className={styles.contentContainer}>
        {/* Top spacer for mobile vertical breathing room */}
        <div className={styles.topSpacer} aria-hidden="true" />

        {/* Text Block: Headline, Accent Line, Subtitle */}
        <div className={styles.textBlock}>
          <h1 className={styles.headline}>
            <span className={styles.headlineLine}>PLAN,</span>
            <span className={styles.headlineLine}>FOCUS &amp;</span>
            <span className={styles.headlineLine}>GROW</span>
            <span className={styles.withFocentiaLine}>
              <span className={styles.withWord}>WITH </span>
              <span className={styles.focentiaWord}>FOCENTIA</span>
            </span>
          </h1>

          <div className={styles.accentLine} aria-hidden="true" />

          <p className={styles.subtitle}>
            Plan your day, focus deeply, track your progress, and keep your notes and ideas organized—all in one place.
          </p>
        </div>

        {/* Action Button Container */}
        <div className={styles.buttonContainer}>
          <button
            type="button"
            className={styles.getStartedButton}
            onClick={handleGetStarted}
            aria-label="Get Started"
          >
            <span className={styles.buttonText}>Get Started</span>
            <div className={styles.buttonIconCircle} aria-hidden="true">
              <ArrowUpRight className={styles.arrowIcon} strokeWidth={2.5} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
