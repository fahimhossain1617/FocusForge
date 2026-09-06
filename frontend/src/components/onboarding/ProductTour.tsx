"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRight, CheckCircle2, Sparkles, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import styles from "./onboarding.module.css";

interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  desc: string;
  fallbackPosition?: { top: number; left: number };
}

interface ProductTourProps {
  isOpen: boolean;
  onCompleteTour: () => void;
}

export const ProductTour: React.FC<ProductTourProps> = ({
  isOpen,
  onCompleteTour,
}) => {
  const { t } = useTranslation();
  const ob = t.onboarding.tour;

  const steps: TourStep[] = [
    {
      id: "dashboard",
      targetSelector: '[data-tour="tour-today"]',
      title: ob.dashboard.title,
      desc: ob.dashboard.desc,
    },
    {
      id: "planner",
      targetSelector: '[data-tour="tour-planner"]',
      title: ob.planner.title,
      desc: ob.planner.desc,
    },
    {
      id: "aiAgent",
      targetSelector: '[data-tour="tour-ai-agent"]',
      title: ob.aiAgent.title,
      desc: ob.aiAgent.desc,
    },
    {
      id: "workspace",
      targetSelector: '[data-tour="tour-tasks"]',
      title: ob.workspace.title,
      desc: ob.workspace.desc,
    },
    {
      id: "mind",
      targetSelector: '[data-tour="tour-mind"]',
      title: ob.mind.title,
      desc: ob.mind.desc,
    },
    {
      id: "learning",
      targetSelector: '[data-tour="tour-learning"]',
      title: ob.learning.title,
      desc: ob.learning.desc,
    },
    {
      id: "focus",
      targetSelector: '[data-tour="tour-focus"]',
      title: ob.focus.title,
      desc: ob.focus.desc,
    },
    {
      id: "ready",
      targetSelector: "",
      title: ob.ready.title,
      desc: ob.ready.desc,
    },
  ];

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 120, left: 280 });

  const currentStep = steps[currentStepIndex];
  const isFinalStep = currentStepIndex === steps.length - 1;

  // Reposition highlight ring and tooltip to target element
  const updatePosition = useCallback(() => {
    if (!isOpen) return;

    if (isFinalStep || !currentStep?.targetSelector) {
      // Center on screen for final ready message
      setHighlightRect(null);
      const top = Math.max(80, window.innerHeight / 2 - 120);
      const left = Math.max(16, window.innerWidth / 2 - 160);
      setTooltipPos({ top, left });
      return;
    }

    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setHighlightRect(rect);

      // Desktop: place tooltip to the right of the highlighted sidebar item
      let top = rect.top;
      let left = rect.right + 18;

      // Viewport bounds detection
      const tooltipWidth = 320;
      const tooltipHeight = 180;

      // If overflowing right, place below or left
      if (left + tooltipWidth > window.innerWidth - 16) {
        left = Math.max(16, rect.left);
        top = rect.bottom + 14;
      }

      // If overflowing bottom, shift upward
      if (top + tooltipHeight > window.innerHeight - 16) {
        top = Math.max(16, window.innerHeight - tooltipHeight - 20);
      }

      setTooltipPos({ top, left });
    } else {
      // If target element is not in view (e.g. collapsed menu), fallback to safe center
      setHighlightRect(null);
      setTooltipPos({
        top: Math.max(60, window.innerHeight / 2 - 100),
        left: Math.max(16, window.innerWidth / 2 - 160),
      });
    }
  }, [isOpen, isFinalStep, currentStep]);

  useEffect(() => {
    updatePosition();
    const handleResize = () => updatePosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [updatePosition]);

  // Advance to next step
  const handleNext = () => {
    if (isFinalStep) {
      onCompleteTour();
    } else {
      setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
    }
  };

  // Skip tour directly
  const handleSkip = () => {
    onCompleteTour();
  };

  // Clicking on the highlighted element also advances
  const handleHighlightClick = () => {
    handleNext();
  };

  if (!isOpen) return null;

  const stepCountText = ob.stepCount
    .replace("{current}", String(currentStepIndex + 1))
    .replace("{total}", String(steps.length));

  return (
    <>
      {/* Semi-transparent interactive backdrop */}
      <div className={styles.tourBackdrop} onClick={handleNext} />

      {/* Spotlight Ring over real UI element */}
      {highlightRect && (
        <div
          className={styles.tourSpotlightRing}
          onClick={handleHighlightClick}
          style={{
            top: `${highlightRect.top - 4}px`,
            left: `${highlightRect.left - 4}px`,
            width: `${highlightRect.width + 8}px`,
            height: `${highlightRect.height + 8}px`,
            pointerEvents: "auto",
            cursor: "pointer",
          }}
          title={ob.next}
        />
      )}

      {/* Glassmorphism Tour Message Card */}
      <div
        className={styles.tourCard}
        style={{
          top: `${tooltipPos.top}px`,
          left: `${tooltipPos.left}px`,
        }}
        role="dialog"
        aria-label="Product Tour Step"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className={styles.tourStepBadge}>
            {isFinalStep ? (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <CheckCircle2 size={13} />
                FocusForge
              </span>
            ) : (
              stepCountText
            )}
          </span>

          {!isFinalStep && (
            <button
              type="button"
              className={styles.tourSkipBtn}
              onClick={handleSkip}
              aria-label="Skip product tour"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <h3 className={styles.tourTitle}>{currentStep.title}</h3>
        <p className={styles.tourDesc}>{currentStep.desc}</p>

        <div className={styles.tourActions}>
          {!isFinalStep ? (
            <>
              <button
                type="button"
                className={styles.tourSkipBtn}
                onClick={handleSkip}
              >
                {ob.skip}
              </button>

              <button
                type="button"
                className={styles.tourNextBtn}
                onClick={handleNext}
                autoFocus
              >
                <span>{ob.next}</span>
                <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.primaryButton}
              style={{ width: "100%", padding: "10px 18px", fontSize: "14px" }}
              onClick={onCompleteTour}
              autoFocus
            >
              <Sparkles size={16} />
              <span>{ob.finish}</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
