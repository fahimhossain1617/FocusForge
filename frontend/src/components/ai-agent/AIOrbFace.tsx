"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import type { OrbMood } from "./useOrbMood";
import { getOrbStatusLabel } from "./useOrbMood";
import type { OrbState } from "@/types/aiAgent";
import styles from "./ai-orb-face.module.css";

export interface AIOrbFaceProps {
  mood: OrbMood;
  orbState?: OrbState;
  statusLabel?: string;
  reaction?: string | null;
  thoughtText?: string | null;
  speechSide?: "top" | "left" | "right";
  isThinking?: boolean;
  isGiggling?: boolean;
  isEnjoying?: boolean;
  isLight?: boolean;
  language?: "bn" | "en" | "auto";
  className?: string;
  onTap?: (source?: "touch" | "mouse") => void;
  compact?: boolean;
  showStatusBadge?: boolean;
  isTypingStream?: boolean;
}

export function AIOrbFace({
  mood: propMood,
  orbState,
  statusLabel,
  reaction,
  thoughtText = "",
  speechSide = "top",
  isThinking = false,
  isGiggling = false,
  isEnjoying = false,
  isLight = false,
  language = "bn",
  className = "",
  onTap,
  compact = false,
  showStatusBadge = false,
  isTypingStream = false,
}: AIOrbFaceProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const headGroupRef = useRef<SVGGElement>(null);
  const specularRef = useRef<SVGGElement>(null);
  const faceFeaturesRef = useRef<SVGGElement>(null);
  const pupilLeftRef = useRef<SVGGElement>(null);
  const pupilRightRef = useRef<SVGGElement>(null);
  const sadPupilLeftRef = useRef<SVGGElement>(null);
  const sadPupilRightRef = useRef<SVGGElement>(null);
  const dropShadowRef = useRef<SVGEllipseElement>(null);

  // Target pointer coordinates & active status
  const targetRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  // Interpolated tracking values for physics LERP
  const currentHeadRef = useRef<{ x: number; y: number; rotX: number; rotY: number; rotZ: number }>({
    x: 0,
    y: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
  });
  const currentFaceRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentPupilRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const reqIdRef = useRef<number | null>(null);

  const [isBlinking, setIsBlinking] = useState(false);

  const isBn = language === "bn";
  const mood: OrbMood = (propMood && propMood !== "idle")
    ? propMood
    : (orbState && orbState !== "idle" ? (orbState as OrbMood) : (propMood || "idle"));
  const effectiveMood: OrbMood = mood;

  // Head tilt angle based on emotion and active state machine
  const headAngle = useMemo(() => {
    if (effectiveMood === "curious") return 6.5;
    if (effectiveMood === "thinking") return 5.5;
    if (effectiveMood === "attentive") return 3.5;
    if (effectiveMood === "focused") return 0;
    if (effectiveMood === "angry") return 4.5;
    if (effectiveMood === "sad" || effectiveMood === "error") return -4.5;
    if (effectiveMood === "sulky") return -3.0;
    if (
      effectiveMood === "playful" ||
      effectiveMood === "laughing" ||
      effectiveMood === "excited" ||
      effectiveMood === "celebrating" ||
      effectiveMood === "success" ||
      isGiggling
    )
      return 4.5;
    if (effectiveMood === "proud") return -4.0;
    if (
      effectiveMood === "caring" ||
      effectiveMood === "supportive" ||
      effectiveMood === "empathetic" ||
      effectiveMood === "encouraging" ||
      effectiveMood === "concerned"
    )
      return 3.5;
    if (effectiveMood === "waiting_confirmation") return 4.0;
    if (effectiveMood === "working") return 1.5;
    if (effectiveMood === "serious" || effectiveMood === "protective") return 0;
    if (isEnjoying) return -2.5;
    return 0;
  }, [effectiveMood, isGiggling, isEnjoying]);

  // 1. Natural Blinking Loop
  useEffect(() => {
    let blinkTimer: NodeJS.Timeout;
    const scheduleNextBlink = () => {
      const delay = Math.random() * 2500 + 3200; // Blink every 3.2 - 5.7s
      blinkTimer = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 130);
      }, delay);
    };
    scheduleNextBlink();
    return () => clearTimeout(blinkTimer);
  }, []);

  // 2. High-Performance Real-Time LERP Animation Loop
  useEffect(() => {
    let active = true;

    const lerp = (current: number, target: number, speed: number) => {
      return current + (target - current) * speed;
    };

    const animate = () => {
      if (!active) return;

      // Emotion / Mood rest targets
      let moodBiasX = 0;
      let moodBiasY = 0;
      let allowCursorTracking = true;

      switch (effectiveMood) {
        case "typing":
        case "composing":
          moodBiasX = 0;
          moodBiasY = 0.42; // eyes looking happily down towards laptop
          allowCursorTracking = false;
          break;
        case "thinking":
          moodBiasX = 0.35;
          moodBiasY = -0.45; // tilted up-right towards thought cloud
          allowCursorTracking = false;
          break;
        case "attentive":
          moodBiasX = 0.08;
          moodBiasY = -0.12;
          allowCursorTracking = true;
          break;
        case "focused":
          moodBiasX = 0;
          moodBiasY = 0;
          allowCursorTracking = true;
          break;
        case "angry":
          moodBiasX = 0.15;
          moodBiasY = -0.15; // cute playful pout gaze
          allowCursorTracking = true;
          break;
        case "working":
          moodBiasX = 0;
          moodBiasY = -0.1;
          allowCursorTracking = true;
          break;
        case "waiting_confirmation":
          moodBiasX = 0.25;
          moodBiasY = -0.18;
          allowCursorTracking = true;
          break;
        case "success":
        case "celebrating":
        case "proud":
          moodBiasX = 0.32;
          moodBiasY = -0.36; // cheerful high tilt
          allowCursorTracking = true;
          break;
        case "sleepy":
        case "resting":
        case "offline":
        case "usage_limit":
          moodBiasX = 0;
          moodBiasY = 0.38; // drooped down in sleep
          allowCursorTracking = false;
          break;
        case "sulky":
          moodBiasX = -0.45;
          moodBiasY = 0; // side-eye glance
          allowCursorTracking = false;
          break;
        case "excited":
        case "playful":
        case "laughing":
          moodBiasX = 0.22;
          moodBiasY = -0.28;
          allowCursorTracking = true;
          break;
        case "curious":
          moodBiasX = 0.3;
          moodBiasY = -0.3; // curious glance
          allowCursorTracking = true;
          break;
        case "sad":
        case "error":
          moodBiasX = 0;
          moodBiasY = 0.32; // apologetic droop
          allowCursorTracking = true;
          break;
        case "caring":
        case "supportive":
        case "empathetic":
        case "encouraging":
        case "concerned":
          moodBiasX = 0;
          moodBiasY = 0.1; // gentle centered gaze
          allowCursorTracking = true;
          break;
        case "serious":
        case "protective":
          moodBiasX = 0;
          moodBiasY = 0; // firm, alert, watchful steady posture
          allowCursorTracking = false;
          break;
        case "listening":
          moodBiasX = 0;
          moodBiasY = -0.05;
          allowCursorTracking = true;
          break;
        default:
          moodBiasX = 0;
          moodBiasY = 0;
          allowCursorTracking = true;
          break;
      }

      // Calculate final target coordinates
      let targetX = moodBiasX;
      let targetY = moodBiasY;

      if (allowCursorTracking && targetRef.current.active) {
        targetX = targetRef.current.x * 0.92 + moodBiasX * 0.15;
        targetY = targetRef.current.y * 0.92 + moodBiasY * 0.15;
        const mag = Math.hypot(targetX, targetY);
        if (mag > 1.0) {
          targetX /= mag;
          targetY /= mag;
        }
      }

      // Multi-rate organic LERP
      const headSpeed = 0.088;
      const faceSpeed = 0.115;
      const pupilSpeed = 0.165;

      const head = currentHeadRef.current;
      head.x = lerp(head.x, targetX * 13.5, headSpeed);
      head.y = lerp(head.y, targetY * 9.8, headSpeed);
      head.rotX = lerp(head.rotX, -targetY * 11.5, headSpeed);
      head.rotY = lerp(head.rotY, targetX * 15.5, headSpeed);
      head.rotZ = lerp(head.rotZ, targetX * 3.5, headSpeed);

      const face = currentFaceRef.current;
      face.x = lerp(face.x, targetX * 19.5, faceSpeed);
      face.y = lerp(face.y, targetY * 14.5, faceSpeed);

      const pupil = currentPupilRef.current;
      pupil.x = lerp(pupil.x, targetX * 6.5, pupilSpeed);
      pupil.y = lerp(pupil.y, targetY * 4.8, pupilSpeed);

      // Direct DOM updates for maximum FPS
      if (stageRef.current) {
        stageRef.current.style.transform = `perspective(750px) rotateX(${head.rotX.toFixed(2)}deg) rotateY(${head.rotY.toFixed(2)}deg) translate3d(${head.x.toFixed(2)}px, ${head.y.toFixed(2)}px, 0px)`;
      }

      if (headGroupRef.current) {
        headGroupRef.current.setAttribute(
          "transform",
          `rotate(${(headAngle + head.rotZ).toFixed(2)}, 140, 126)`
        );
      }

      if (specularRef.current) {
        specularRef.current.setAttribute(
          "transform",
          `translate(${(head.x * 0.45).toFixed(2)}, ${(head.y * 0.45).toFixed(2)})`
        );
      }

      if (faceFeaturesRef.current) {
        faceFeaturesRef.current.setAttribute(
          "transform",
          `translate(${face.x.toFixed(2)}, ${face.y.toFixed(2)})`
        );
      }

      if (pupilLeftRef.current) {
        pupilLeftRef.current.setAttribute(
          "transform",
          `translate(${pupil.x.toFixed(2)}, ${pupil.y.toFixed(2)})`
        );
      }

      if (pupilRightRef.current) {
        pupilRightRef.current.setAttribute(
          "transform",
          `translate(${pupil.x.toFixed(2)}, ${pupil.y.toFixed(2)})`
        );
      }

      if (sadPupilLeftRef.current) {
        sadPupilLeftRef.current.setAttribute(
          "transform",
          `translate(${(pupil.x * 0.45).toFixed(2)}, ${(pupil.y * 0.45).toFixed(2)})`
        );
      }

      if (sadPupilRightRef.current) {
        sadPupilRightRef.current.setAttribute(
          "transform",
          `translate(${(pupil.x * 0.45).toFixed(2)}, ${(pupil.y * 0.45).toFixed(2)})`
        );
      }

      if (dropShadowRef.current) {
        dropShadowRef.current.setAttribute("cx", (140 + head.x * 0.38).toFixed(2));
        dropShadowRef.current.setAttribute(
          "rx",
          Math.max(46, 64 - Math.abs(head.y) * 0.4).toFixed(2)
        );
        dropShadowRef.current.setAttribute(
          "ry",
          Math.max(6, 9 - Math.abs(head.y) * 0.15).toFixed(2)
        );
      }

      reqIdRef.current = requestAnimationFrame(animate);
    };

    reqIdRef.current = requestAnimationFrame(animate);

    return () => {
      active = false;
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
    };
  }, [mood, headAngle]);

  // 3. Pointer Move, Touch, & Window Blur Listeners
  useEffect(() => {
    const updateTargetFromCoords = (clientX: number, clientY: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      // Interactive tracking boundary (e.g. within 950px radius for full screen mobile & desktop reach)
      if (dist < 950) {
        const radius = Math.min(rect.width, rect.height) * 1.8;
        const normX = Math.max(-1, Math.min(1, dx / radius));
        const normY = Math.max(-1, Math.min(1, dy / radius));
        targetRef.current = {
          x: normX,
          y: normY,
          active: true,
        };
      } else {
        targetRef.current.active = false;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      updateTargetFromCoords(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        updateTargetFromCoords(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        updateTargetFromCoords(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handlePointerLeave = () => {
      targetRef.current = { x: 0, y: 0, active: false };
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerLeave, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handlePointerLeave, { passive: true });
    window.addEventListener("touchcancel", handlePointerLeave, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);
    window.addEventListener("blur", handlePointerLeave);

    const checkVisibility = () => {
      if (document.hidden) {
        handlePointerLeave();
      }
    };
    document.addEventListener("visibilitychange", checkVisibility);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerLeave);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handlePointerLeave);
      window.removeEventListener("touchcancel", handlePointerLeave);
      document.removeEventListener("mouseleave", handlePointerLeave);
      window.removeEventListener("blur", handlePointerLeave);
      document.removeEventListener("visibilitychange", checkVisibility);
    };
  }, []);

  const orbMotionClass = useMemo(() => {
    if (isGiggling) return styles.orbGiggling;
    if (isEnjoying) return styles.orbEnjoying;
    if (effectiveMood === "playful" || effectiveMood === "excited" || effectiveMood === "celebrating" || effectiveMood === "success") return styles.orbGiggling;
    if (effectiveMood === "typing" || effectiveMood === "composing") return styles.orbTyping;
    if (effectiveMood === "thinking") return styles.orbThinking;
    if (effectiveMood === "sleepy" || effectiveMood === "offline" || effectiveMood === "usage_limit") return styles.orbSleepy;
    return styles.orbFloating;
  }, [isGiggling, isEnjoying, effectiveMood]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const isTouch = e.pointerType === "touch" || e.pointerType === "pen";
    onTap?.(isTouch ? "touch" : "mouse");
  };

  const isThinkingActive = effectiveMood === "thinking" || isThinking;
  const isWorkingActive = effectiveMood === "working";
  const isWaitingActive = effectiveMood === "waiting_confirmation";
  const isSuccessActive = effectiveMood === "success";

  return (
    <div
      className={`${styles.orbContainer} ${speechSide === "left" ? styles.orbContainerSideLeft : ""} ${className}`.trim()}
      data-theme={isLight ? "light" : "dark"}
    >

      {/* 1. SINGLE AUTHORITATIVE THINKING STATUS BUBBLE (Dynamic staged updates) */}
      {isThinkingActive ? (
        <div className={styles.thoughtCloudWrapper} aria-label="AI is thinking" role="status">
          <div className={styles.thoughtCloud}>
            <span key={thoughtText || "default"} className={styles.thoughtTextAnim}>
              {thoughtText || (isBn ? "AI ভাবছে…" : "AI is thinking…")}
            </span>
            <span className={styles.dotPulse1}>.</span>
            <span className={styles.dotPulse2}>.</span>
            <span className={styles.dotPulse3}>.</span>
          </div>
          <div className={styles.cloudTrail1} />
          <div className={styles.cloudTrail2} />
        </div>
      ) : (
        /* 2. COMPANION REACTION / STATUS SPEECH BUBBLE (Short, contextual, no neon glow) */
        thoughtText && !compact && (
          speechSide === "left" ? (
            <div className={styles.speechBubbleLeftWrapper} aria-live="polite">
              <div className={styles.speechBubble}>
                <span className={styles.speechBubbleText}>{thoughtText}</span>
                {/* Right-pointing speech bubble tail towards the Orb */}
                <svg
                  className={styles.speechTailRight}
                  viewBox="0 0 16 24"
                  width="16"
                  height="24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M 0 2 C 3 5, 9 9, 15 12 C 9 15, 3 19, 0 22 Z"
                    fill="var(--bubble-bg, rgba(11, 17, 34, 0.96))"
                  />
                  <path
                    d="M 0 2 C 3 5, 9 9, 15 12 C 9 15, 3 19, 0 22"
                    stroke="var(--bubble-border, rgba(44, 69, 119, 0.65))"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </div>
            </div>
          ) : (
            <div className={styles.speechBubbleWrapper} aria-live="polite">
              <div className={styles.speechBubble}>
                <span className={styles.speechBubbleText}>{thoughtText}</span>
                {/* Downward speech bubble tail pointing directly to the Orb */}
                <svg
                  className={styles.speechTail}
                  viewBox="0 0 24 16"
                  width="24"
                  height="16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M 2 0 C 5 3, 9 9, 12 15 C 15 9, 19 3, 22 0 Z"
                    fill="var(--bubble-bg, rgba(11, 17, 34, 0.96))"
                  />
                  <path
                    d="M 2 0 C 5 3, 9 9, 12 15 C 15 9, 19 3, 22 0"
                    stroke="var(--bubble-border, rgba(44, 69, 119, 0.65))"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </div>
            </div>
          )
        )
      )}

      {/* 3. THE 3D ORB STAGE WITH PERSPECTIVE HEAD TILT */}
      <div className={`${styles.orbMotionWrapper} ${orbMotionClass}`}>
        <div
          ref={stageRef}
          className={styles.orbStage}
          onPointerDown={handlePointerDown}
          onClick={(e) => {
            if (e.nativeEvent.detail === 0) {
              onTap?.("mouse");
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="FocusForge AI Agent Orb"
          title={language === "bn" ? "ট্যাপ করলে হাসবে!" : "Tap to interact!"}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onTap?.("mouse");
            }
          }}
          style={{
            transform: "perspective(750px) rotateX(0deg) rotateY(0deg) translate3d(0px, 0px, 0px)",
          }}
        >
          <svg
            viewBox="0 0 280 260"
            className={styles.orbSvg}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Ambient Shadow Glow */}
              <radialGradient id="sphereAuraDark" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                <stop offset="65%" stopColor="#1e3a8a" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#020617" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="sphereAuraLight" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.18" />
                <stop offset="70%" stopColor="#cbd5e1" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>

              {/* Vibrant Cobalt 3D Sphere Body - Dark Mode */}
              <radialGradient id="vibrantCobaltDark" cx="36%" cy="26%" r="74%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
                <stop offset="38%" stopColor="#1d4ed8" stopOpacity="1" />
                <stop offset="78%" stopColor="#1e3a8a" stopOpacity="1" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
              </radialGradient>

              {/* Silky Pearl Sphere Body - Light Mode (Clean neutral pearl with soft slate depth) */}
              <radialGradient id="vibrantCobaltLight" cx="36%" cy="26%" r="74%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="40%" stopColor="#f8fafc" stopOpacity="1" />
                <stop offset="82%" stopColor="#e2e8f0" stopOpacity="1" />
                <stop offset="100%" stopColor="#cbd5e1" stopOpacity="1" />
              </radialGradient>

              {/* Hand Gradient - Dark Mode */}
              <radialGradient id="cuteHandGradDark" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="65%" stopColor="#1d4ed8" />
                <stop offset="100%" stopColor="#0f172a" />
              </radialGradient>

              {/* Hand Gradient - Light Mode (Neutral white pearl with subtle depth, no blue tint) */}
              <radialGradient id="cuteHandGradLight" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#f1f5f9" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </radialGradient>

              {/* Elegant Soft Top-Left Specular Shine - Dark Mode */}
              <linearGradient id="softSpecularDark" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                <stop offset="45%" stopColor="#93c5fd" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </linearGradient>

              {/* Elegant Soft Top-Left Specular Shine - Light Mode (Pure clean white shine) */}
              <linearGradient id="softSpecularLight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="45%" stopColor="#ffffff" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>

              {/* Soft, Light Pastel Pink Cheek Blush */}
              <radialGradient id="softPinkBlush" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ff3366" stopOpacity="0.48" />
                <stop offset="60%" stopColor="#ff4d79" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#ff4d79" stopOpacity="0" />
              </radialGradient>

              {/* 3D Glowing Pink/Coral Heart for Caring */}
              <radialGradient id="cute3DHeart" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#ff7597" />
                <stop offset="50%" stopColor="#ff2d60" />
                <stop offset="100%" stopColor="#be123c" />
              </radialGradient>

              {/* Glowing Golden Sparkle Star for Proud */}
              <linearGradient id="goldStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="45%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#ca8a04" />
              </linearGradient>

              {/* Deep Glossy Eye Gradient */}
              <radialGradient id="cuteEyeGrad" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="70%" stopColor="#080d1a" />
                <stop offset="100%" stopColor="#020617" />
              </radialGradient>

              {/* Miniature Laptop Lid - Vibrant Cobalt/Sky Blue (Image 3) */}
              <linearGradient id="cuteBlueLaptopLid" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4f86f7" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>

              {/* Miniature Laptop Base - Modern Blue */}
              <linearGradient id="cuteBlueLaptopBase" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>

              {/* Miniature Laptop Lid - Dark Mode */}
              <linearGradient id="cuteLaptopLidDark" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
              </linearGradient>

              {/* Miniature Laptop Lid - Light Mode */}
              <linearGradient id="cuteLaptopLidLight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.95" />
              </linearGradient>

              {/* Soft Glow Filter */}
              <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Clip path for Sulky eyelid */}
              <clipPath id="sulkyLidClipL">
                <rect x="94" y="107" width="36" height="24" />
              </clipPath>
              <clipPath id="sulkyLidClipR">
                <rect x="150" y="107" width="36" height="24" />
              </clipPath>
            </defs>

            {/* 1. Floor Drop Shadow */}
            <ellipse
              ref={dropShadowRef}
              cx="140"
              cy="214"
              rx="64"
              ry="9"
              fill="rgba(100, 116, 139, 0.22)"
            />

            {/* 2. Soft Ambient Halo Glow */}
            <circle
              cx="140"
              cy="126"
              r="105"
              fill="url(#sphereAuraLight)"
            />

            {/* Processing Orbital Rings (Only shown when mood === 'processing') */}
            {mood === "processing" && (
              <g>
                <ellipse
                  cx="140"
                  cy="126"
                  rx="98"
                  ry="36"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="14 10"
                  opacity="0.8"
                  className={styles.orbitRing1}
                />
                <ellipse
                  cx="140"
                  cy="126"
                  rx="102"
                  ry="32"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="1.6"
                  strokeDasharray="10 8"
                  opacity="0.7"
                  className={styles.orbitRing2}
                />
              </g>
            )}

            {/* 3. Luxury Silky Pearl Sphere Body & Head Group with Natural Head Movement */}
            <g
              ref={headGroupRef}
              transform={`rotate(${headAngle}, 140, 126)`}
              className={styles.headGroup}
            >
              {/* 3D Sphere Main Body (Permanent Silky Pearl White) */}
              <circle
                cx="140"
                cy="126"
                r="78"
                fill="url(#vibrantCobaltLight)"
                stroke="rgba(148, 163, 184, 0.45)"
                strokeWidth="1.5"
              />

              {/* Top-Left Glossy Specular Sheen (Pure clean silky white shine) */}
              <g ref={specularRef} transform="translate(0, 0)">
                <path
                  d="M 88 78 C 100 54, 140 48, 184 62 C 148 55, 108 62, 88 78 Z"
                  fill="url(#softSpecularLight)"
                />
                <ellipse
                  cx="106"
                  cy="78"
                  rx="16"
                  ry="10"
                  fill="url(#softSpecularLight)"
                  transform="rotate(-28, 106, 78)"
                />
                <circle cx="102" cy="74" r="5" fill="#ffffff" opacity="0.7" filter="url(#softGlow)" />
              </g>

              {/* 4. FACIAL FEATURES WRAPPER */}
              <g ref={faceFeaturesRef} transform="translate(0, 0)">
                {/* Cheek Blushes */}
                <ellipse cx="92" cy="130" rx="12" ry="7" fill="url(#softPinkBlush)" filter="url(#softGlow)" className={styles.faceFeaturesGroup} />
                <ellipse cx="188" cy="130" rx="12" ry="7" fill="url(#softPinkBlush)" filter="url(#softGlow)" className={styles.faceFeaturesGroup} />

                {/* REALISTIC EYEBROWS */}
                <g
                  className={styles.faceFeaturesGroup}
                  stroke="#334155"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  opacity="0.85"
                >
                  {mood === "serious" || mood === "protective" ? (
                    /* Serious / Protective: Alert, firm, determined horizontal brows */
                    <>
                      <line x1="97" y1="92" x2="125" y2="92" stroke="#1e293b" strokeWidth="2.5" />
                      <line x1="155" y1="92" x2="183" y2="92" stroke="#1e293b" strokeWidth="2.5" />
                    </>
                  ) : mood === "sad" || mood === "error" ? (
                    /* Sad / Error: Worried/apologetic inverted upward slanted brows */
                    <>
                      <path d="M 96 95 Q 110 86 124 93" fill="none" />
                      <path d="M 156 93 Q 170 86 184 95" fill="none" />
                    </>
                  ) : mood === "curious" ? (
                    /* Curious: Left brow raised high arch, Right brow slightly level */
                    <>
                      <path d="M 98 83 Q 112 74 124 84" fill="none" />
                      <path d="M 156 93 Q 168 90 180 94" fill="none" />
                    </>
                  ) : mood === "sulky" ? (
                    /* Sulky: Left brow flat, Right brow raised skeptically */
                    <>
                      <line x1="98" y1="93" x2="124" y2="93" />
                      <path d="M 156 88 Q 168 81 180 88" fill="none" />
                    </>
                  ) : mood === "playful" || mood === "laughing" || mood === "excited" || mood === "celebrating" || isGiggling ? (
                    /* Playful / Laughing / Excited: Joyfully raised brows */
                    <>
                      <path d="M 98 88 Q 112 82 124 88" fill="none" />
                      <path d="M 156 88 Q 168 82 180 88" fill="none" />
                    </>
                  ) : mood === "sleepy" || mood === "resting" || mood === "offline" || mood === "usage_limit" ? (
                    /* Sleepy / Resting / Offline / Limit: Relaxed downward sloping brows */
                    <>
                      <path d="M 100 96 Q 112 99 124 97" fill="none" />
                      <path d="M 156 97 Q 168 99 180 96" fill="none" />
                    </>
                  ) : mood === "focused" ? (
                    /* Focused (Image 1 top-right): Inward determined focused brows */
                    <>
                      <line x1="97" y1="91" x2="124" y2="95" stroke="#1e293b" strokeWidth="2.6" strokeLinecap="round" />
                      <line x1="183" y1="91" x2="156" y2="95" stroke="#1e293b" strokeWidth="2.6" strokeLinecap="round" />
                    </>
                  ) : mood === "thinking" ? (
                    /* Thinking (Image 1 bottom-left): Left brow lowered pensive, Right brow high quizzical arch */
                    <>
                      <path d="M 98 94 Q 112 90 124 95" fill="none" />
                      <path d="M 156 86 Q 168 76 180 86" fill="none" />
                    </>
                  ) : mood === "angry" ? (
                    /* Playful Pout (Image 1 bottom-right): Gentle sweet arched brows */
                    <>
                      <path d="M 98 88 Q 112 82 124 88" fill="none" />
                      <path d="M 156 88 Q 168 82 180 88" fill="none" />
                    </>
                  ) : mood === "attentive" ? (
                    /* Attentive (Image 1 top-left): Sweet gentle arched brows */
                    <>
                      <path d="M 99 89 Q 112 83 125 89" fill="none" />
                      <path d="M 155 89 Q 168 83 181 89" fill="none" />
                    </>
                  ) : mood === "proud" ? (
                    /* Proud: Confident, cheerfully arched high brows */
                    <>
                      <path d="M 99 86 Q 112 79 125 86" fill="none" />
                      <path d="M 155 86 Q 168 79 181 86" fill="none" />
                    </>
                  ) : mood === "caring" || mood === "supportive" || mood === "empathetic" || mood === "encouraging" || mood === "concerned" ? (
                    /* Caring / Supportive / Empathetic / Encouraging / Concerned: Soft sympathetic upward slant in the middle */
                    <>
                      <path d="M 98 93 Q 112 86 124 93" fill="none" />
                      <path d="M 156 93 Q 168 86 182 93" fill="none" />
                    </>
                  ) : mood === "happy" || isEnjoying ? (
                    /* Happy / Enjoying: Joyfully lifted curved brows */
                    <>
                      <path d="M 99 88 Q 112 81 125 89" fill="none" />
                      <path d="M 155 89 Q 168 81 181 88" fill="none" />
                    </>
                  ) : (
                    /* Default / Idle / Focused / Attentive: Delicate, sweet, perfectly balanced arched eyebrows */
                    <>
                      <path d="M 100 91 Q 112 85 124 91" fill="none" />
                      <path d="M 156 91 Q 168 85 180 91" fill="none" />
                    </>
                  )}
                </g>

                {/* REALISTIC EXPRESSIVE EYES */}
                {mood === "angry" ? (
                  /* Playful Pout (Image 1 bottom-right): Left Eye Open Shiny Anime Eye, Right Eye Sweet Winking Curved Line */
                  <g className={isBlinking ? styles.eyeLidClosed : styles.eyeLidOpen}>
                    <g>
                      <ellipse cx="112" cy="112" rx="13.5" ry="15.5" fill="url(#cuteEyeGrad)" />
                      <ellipse cx="112" cy="116" rx="9" ry="5" fill="#0284c7" opacity="0.35" />
                      <g ref={pupilLeftRef} transform="translate(0, 0)">
                        <circle cx="112" cy="112" r="7.5" fill="#0369a1" opacity="0.4" />
                        <circle cx="115.5" cy="107.5" r="4.3" fill="#ffffff" filter="url(#softGlow)" />
                        <circle cx="108.5" cy="115" r="1.8" fill="#ffffff" opacity="0.85" />
                      </g>
                    </g>
                    <path
                      d="M 154 113 Q 168 120 182 113"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="3.6"
                      strokeLinecap="round"
                    />
                    <line x1="182" y1="113" x2="186" y2="108" stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" />
                  </g>
                ) : mood === "playful" || isGiggling ? (
                  /* A. Playful / Tickle: Left Eye Open, Right Eye Winking */
                  <g>
                    <ellipse cx="112" cy="112" rx="13.5" ry="15.5" fill="url(#cuteEyeGrad)" />
                    <ellipse cx="112" cy="116" rx="9" ry="5" fill="#0284c7" opacity="0.38" />
                    <circle cx="115.5" cy="107.5" r="4.3" fill="#ffffff" filter="url(#softGlow)" />
                    <circle cx="108.5" cy="115" r="1.8" fill="#ffffff" opacity="0.85" />

                    <path
                      d="M 152 114 Q 166 126 180 114"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="3.8"
                      strokeLinecap="round"
                    />
                    <line x1="180" y1="114" x2="186" y2="108" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="178" y1="117" x2="185" y2="117" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
                  </g>
                ) : mood === "sleepy" || mood === "resting" || mood === "offline" || mood === "usage_limit" ? (
                  /* B. Sleepy / Resting / Offline / Usage Limit: Peaceful Closed Sleeping Lines */
                  <g>
                    <path
                      d="M 98 114 Q 112 122 126 114"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <line x1="98" y1="114" x2="95" y2="111" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
                    <path
                      d="M 154 114 Q 168 122 182 114"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <line x1="182" y1="114" x2="185" y2="111" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
                  </g>
                ) : mood === "happy" || mood === "laughing" || mood === "excited" || mood === "celebrating" || isEnjoying ? (
                  /* C. Happy / Laughing / Excited / Celebrating / Enjoying: Arched Joyful Curved Eyes ^ ^ */
                  <g>
                    <path
                      d="M 98 114 Q 112 98 126 114"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 154 114 Q 168 98 182 114"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </g>
                ) : mood === "sulky" ? (
                  /* D. Sulky / Bombastic: Half-lidded Side-Glance */
                  <g>
                    <ellipse cx="112" cy="112" rx="13.5" ry="15" fill="url(#cuteEyeGrad)" clipPath="url(#sulkyLidClipL)" />
                    <line x1="97" y1="107" x2="127" y2="107" stroke="#0f172a" strokeWidth="2.4" />
                    <circle cx="116" cy="113" r="5" fill="#0284c7" />
                    <circle cx="118" cy="111" r="2.8" fill="#ffffff" filter="url(#softGlow)" />

                    <ellipse cx="168" cy="112" rx="13.5" ry="15" fill="url(#cuteEyeGrad)" clipPath="url(#sulkyLidClipR)" />
                    <line x1="153" y1="107" x2="183" y2="107" stroke="#0f172a" strokeWidth="2.4" />
                    <circle cx="172" cy="113" r="5" fill="#0284c7" />
                    <circle cx="174" cy="111" r="2.8" fill="#ffffff" filter="url(#softGlow)" />
                  </g>
                ) : mood === "sad" || mood === "error" ? (
                  /* E. Sad / Error: Pleading Teary Eyes with Glistening Glints */
                  <g className={isBlinking ? styles.eyeLidClosed : styles.eyeLidOpen}>
                    <g>
                      <ellipse cx="112" cy="113" rx="13.5" ry="15.5" fill="url(#cuteEyeGrad)" />
                      <ellipse cx="112" cy="118" rx="10" ry="6" fill="#0284c7" opacity="0.45" />
                      <g ref={sadPupilLeftRef} transform="translate(0, 0)">
                        <circle cx="114.5" cy="108.5" r="4.3" fill="#ffffff" filter="url(#softGlow)" />
                        <circle cx="108" cy="116" r="2.2" fill="#ffffff" opacity="0.9" />
                        <circle cx="113.5" cy="119.5" r="1.4" fill="#ffffff" opacity="0.8" />
                      </g>
                    </g>

                    <g>
                      <ellipse cx="168" cy="113" rx="13.5" ry="15.5" fill="url(#cuteEyeGrad)" />
                      <ellipse cx="168" cy="118" rx="10" ry="6" fill="#0284c7" opacity="0.45" />
                      <g ref={sadPupilRightRef} transform="translate(0, 0)">
                        <circle cx="170.5" cy="108.5" r="4.3" fill="#ffffff" filter="url(#softGlow)" />
                        <circle cx="164" cy="116" r="2.2" fill="#ffffff" opacity="0.9" />
                        <circle cx="169.5" cy="119.5" r="1.4" fill="#ffffff" opacity="0.8" />
                      </g>
                    </g>
                  </g>
                ) : (
                  /* F. Open Anime Eyes with Gaze Tracking */
                  <g className={isBlinking ? styles.eyeLidClosed : styles.eyeLidOpen}>
                    <g>
                      <ellipse cx="112" cy="112" rx="13.5" ry="15.5" fill="url(#cuteEyeGrad)" />
                      <ellipse cx="112" cy="116" rx="9" ry="5" fill="#0284c7" opacity="0.35" />
                      <g ref={pupilLeftRef} transform="translate(0, 0)">
                        <circle cx="112" cy="112" r="7.5" fill="#0369a1" opacity="0.4" />
                        <circle cx="115.5" cy="107.5" r="4.3" fill="#ffffff" filter="url(#softGlow)" />
                        <circle cx="108.5" cy="115" r="1.8" fill="#ffffff" opacity="0.85" />
                      </g>
                    </g>

                    <g>
                      <ellipse cx="168" cy="112" rx="13.5" ry="15.5" fill="url(#cuteEyeGrad)" />
                      <ellipse cx="168" cy="116" rx="9" ry="5" fill="#0284c7" opacity="0.35" />
                      <g ref={pupilRightRef} transform="translate(0, 0)">
                        <circle cx="168" cy="112" r="7.5" fill="#0369a1" opacity="0.4" />
                        <circle cx="171.5" cy="107.5" r="4.3" fill="#ffffff" filter="url(#softGlow)" />
                        <circle cx="164.5" cy="115" r="1.8" fill="#ffffff" opacity="0.85" />
                      </g>
                    </g>
                  </g>
                )}

                {/* REALISTIC MOUTH EXPRESSIONS */}
                <g className={styles.faceFeaturesGroup}>
                  {mood === "serious" || mood === "protective" ? (
                    /* Serious / Protective: Firm, calm, composed straight line */
                    <line
                      x1="134"
                      y1="128"
                      x2="146"
                      y2="128"
                      stroke="#0f172a"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  ) : mood === "curious" ? (
                    /* Curious: Tiny cute open 'o' mouth */
                    <ellipse cx="140" cy="128" rx="3.5" ry="4" fill="#0b1328" stroke="#0f172a" strokeWidth="1.2" />
                  ) : mood === "sulky" ? (
                    /* Sulky: Downturned pouty frown */
                    <path
                      d="M 132 133 Q 140 125 148 133"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  ) : mood === "playful" || mood === "laughing" || isGiggling ? (
                    /* Playful / Laughing: Open smiling mouth with pink tongue */
                    <g>
                      <path
                        d="M 131 123 Q 140 133 149 123"
                        fill="none"
                        stroke="#0f172a"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 135 126 Q 140 140 145 126 Z"
                        fill="#ff4d79"
                        stroke="#e11d48"
                        strokeWidth="0.8"
                      />
                    </g>
                  ) : mood === "sleepy" || mood === "resting" || mood === "offline" || mood === "usage_limit" ? (
                    /* Sleepy / Resting / Offline: Yawning or peaceful mouth */
                    <g>
                      <ellipse cx="140" cy="129" rx="6.5" ry="8" fill="#090e21" stroke="#0f172a" strokeWidth="1.5" />
                      <ellipse cx="140" cy="133.5" rx="4.2" ry="2.8" fill="#ff4d79" />
                    </g>
                  ) : mood === "thinking" ? (
                    /* Thinking (Image 1 bottom-left): Wondering curious slight open mouth */
                    <ellipse cx="140" cy="128" rx="2.8" ry="3.4" fill="#0b1328" stroke="#0f172a" strokeWidth="1.2" />
                  ) : mood === "angry" ? (
                    /* Playful Pout (Image 1 bottom-right): Adorable kissy/pout "3" mouth */
                    <path
                      d="M 137 124.5 C 140.2 124.5, 141.2 127.5, 138.8 129 C 141.2 130.5, 140.2 133.5, 137 133.5"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  ) : mood === "focused" ? (
                    /* Focused (Image 1 top-right): Confident subtle smile */
                    <path
                      d="M 133 125 Q 140 130 147 125"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  ) : mood === "attentive" ? (
                    /* Attentive (Image 1 top-left): Sweet curved friendly smile */
                    <path
                      d="M 133 124 Q 140 131 147 124"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  ) : mood === "happy" || mood === "excited" || mood === "celebrating" || isEnjoying ? (
                    /* Happy / Excited / Celebrating / Enjoying: Joyful smile with tongue */
                    <path
                      d="M 132 125 Q 140 138 148 125 Z"
                      fill="#ff4d79"
                      stroke="#0f172a"
                      strokeWidth="1.8"
                    />
                  ) : mood === "proud" ? (
                    /* Proud: Confident, sweet curved smile */
                    <path
                      d="M 133 125 Q 140 132 149 124"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  ) : mood === "caring" || mood === "supportive" || mood === "empathetic" || mood === "encouraging" || mood === "concerned" ? (
                    /* Caring / Supportive / Empathetic / Encouraging / Concerned: Warm gentle comforting smile */
                    <path
                      d="M 134 125 Q 140 131 146 125"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  ) : mood === "sad" || mood === "error" ? (
                    /* Sad / Error: Apologetic soft mouth pout */
                    <g>
                      <path
                        d="M 133 133 Q 140 126 147 133"
                        fill="none"
                        stroke="#0f172a"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                      <ellipse cx="178" cy="125" rx="3" ry="4.5" fill="#38bdf8" opacity="0.9" filter="url(#softGlow)" />
                      <circle cx="177" cy="124" r="1.2" fill="#ffffff" />
                    </g>
                  ) : (
                    /* Default / Idle / Focused / Attentive: Sweet, clean, friendly smile */
                    <path
                      d="M 133 125 Q 140 131 147 125"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  )}
                </g>

                {/* ACCESSORIES & EMOTION SYMBOLS */}
                {/* Attentive (Image 1 top-left): Three Radiating Energy Shine Lines */}
                {mood === "attentive" && (
                  <g stroke="#38bdf8" strokeWidth="2.6" strokeLinecap="round" filter="url(#softGlow)">
                    <line x1="188" y1="64" x2="198" y2="48" />
                    <line x1="202" y1="68" x2="216" y2="56" />
                    <line x1="210" y1="76" x2="226" y2="70" />
                  </g>
                )}

                {/* Focused (Image 1 top-right): 4 Glowing Corner Scanner Brackets */}
                {mood === "focused" && (
                  <g stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#softGlow)">
                    {/* Top-Left */}
                    <path d="M 64 82 L 64 64 L 82 64" />
                    {/* Top-Right */}
                    <path d="M 198 64 L 216 64 L 216 82" />
                    {/* Bottom-Left */}
                    <path d="M 64 170 L 64 188 L 82 188" />
                    {/* Bottom-Right */}
                    <path d="M 198 188 L 216 188 L 216 170" />
                  </g>
                )}

                {/* Playful Pout (Image 1 bottom-right): Glowing Heart Outline + Sparkle Dashes */}
                {mood === "angry" && (
                  <g transform="translate(194, 52)">
                    <path
                      d="M 0 -4 C -2 -10 -10 -9 -10 -3 C -10 3 -3 7 0 11 C 3 7 10 3 10 -3 C 10 -9 2 -10 0 -4 Z"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.4"
                      filter="url(#softGlow)"
                      transform="rotate(16)"
                    />
                    <line x1="14" y1="10" x2="22" y2="8" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" filter="url(#softGlow)" />
                    <line x1="12" y1="17" x2="19" y2="19" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" filter="url(#softGlow)" />
                  </g>
                )}

                {/* Serious / Protective: Glowing Protective Shield Badge 🛡️ */}
                {(mood === "serious" || mood === "protective") && (
                  <g transform="translate(196, 50)" filter="url(#softGlow)">
                    <path
                      d="M 0 0 L 8 -4 L 16 0 C 16 8 8 16 8 16 C 8 16 0 8 0 0 Z"
                      fill="#2563eb"
                      stroke="#38bdf8"
                      strokeWidth="1.2"
                      opacity="0.92"
                    />
                    <path
                      d="M 4 4 L 8 2 L 12 4 C 12 8 8 12 8 12 C 8 12 4 8 4 4 Z"
                      fill="#60a5fa"
                      opacity="0.75"
                    />
                  </g>
                )}

                {/* Thinking (Image 1 bottom-left) & Curious: Floating Glowing Question Mark ? */}
                {(mood === "thinking" || mood === "curious") && (
                  <g transform="translate(196, 62)">
                    <text
                      x="0"
                      y="0"
                      fill="#38bdf8"
                      fontSize="26"
                      fontWeight="bold"
                      fontFamily="system-ui, sans-serif"
                      filter="url(#softGlow)"
                    >
                      ?
                    </text>
                  </g>
                )}

                {/* Sulky: Floating Comic Puff */}
                {mood === "sulky" && (
                  <g transform="translate(192, 52)" stroke="#2563eb" strokeWidth="1.8" fill="none">
                    <path d="M 0 4 Q 4 0 8 4 Q 12 0 16 4 Q 20 8 16 12 Q 20 16 16 20 Q 12 16 8 20 Q 4 16 0 20 Q -4 16 0 12 Z" opacity="0.85" />
                  </g>
                )}

                {/* Playful / Laughing / Tickle: Floating Radiating Energy */}
                {(mood === "playful" || mood === "laughing" || isGiggling) && (
                  <g
                    stroke="#0284c7"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    filter="url(#softGlow)"
                  >
                    <line x1="68" y1="62" x2="56" y2="52" />
                    <line x1="62" y1="84" x2="48" y2="82" />
                    <line x1="212" y1="62" x2="224" y2="52" />
                    <line x1="218" y1="84" x2="232" y2="82" />
                  </g>
                )}

                {/* Sleepy / Resting / Offline / Usage Limit: Floating Zzz */}
                {(mood === "sleepy" || mood === "resting" || mood === "offline" || mood === "usage_limit") && (
                  <g className={styles.sleepyZzzWrapper} transform="translate(196, 68)">
                    <text x="0" y="0" fill="#2563eb" fontSize="13" fontWeight="bold" className={styles.zzz1}>
                      z
                    </text>
                    <text x="7" y="-8" fill="#3b82f6" fontSize="16" fontWeight="bold" className={styles.zzz2}>
                      Z
                    </text>
                    <text x="16" y="-18" fill="#60a5fa" fontSize="20" fontWeight="bold" className={styles.zzz3}>
                      Z
                    </text>
                  </g>
                )}

                {/* Proud / Celebrating: Floating Golden Sparkle Stars ✦ ✦ */}
                {(mood === "proud" || mood === "celebrating" || isEnjoying) && (
                  <g transform="translate(196, 50)">
                    <path
                      d="M 0 -13 Q 1.5 -2 11 0 Q 1.5 2 0 13 Q -1.5 2 -11 0 Q -1.5 -2 0 -13 Z"
                      fill="url(#goldStarGrad)"
                      filter="url(#softGlow)"
                      className={styles.proudStar1}
                    />
                    <path
                      d="M 0 -8 Q 1 -1.5 7 0 Q 1 1.5 0 8 Q -1 1.5 -7 0 Q -1 -1.5 0 -8 Z"
                      fill="url(#goldStarGrad)"
                      filter="url(#softGlow)"
                      className={styles.proudStar2}
                      transform="translate(-6, 20)"
                    />
                  </g>
                )}

                {/* Caring / Supportive / Empathetic / Encouraging: Floating Pink Hearts */}
                {(mood === "caring" || mood === "supportive" || mood === "empathetic" || mood === "encouraging") && (
                  <g transform="translate(194, 52)">
                    <path
                      d="M 0 -4 C -2 -11 -12 -10 -12 -3 C -12 4 -4 8 0 13 C 4 8 12 4 12 -3 C 12 -10 2 -11 0 -4 Z"
                      fill="#ff3b7a"
                      filter="url(#softGlow)"
                      className={styles.floatingHeart1}
                      transform="rotate(14) scale(0.9)"
                    />
                    <path
                      d="M 0 -4 C -2 -11 -12 -10 -12 -3 C -12 4 -4 8 0 13 C 4 8 12 4 12 -3 C 12 -10 2 -11 0 -4 Z"
                      fill="#ff4d79"
                      filter="url(#softGlow)"
                      className={styles.floatingHeart2}
                      transform="translate(10, 20) rotate(22) scale(0.62)"
                    />
                  </g>
                )}

                {/* Serious / Protective: Glowing Cyber Shield Badge */}
                {(mood === "serious" || mood === "protective") && (
                  <g transform="translate(196, 52)" className={styles.seriousShieldBadge}>
                    <path
                      d="M 0 -10 L 10 -5 L 10 3 C 10 9 0 14 0 14 C 0 14 -10 9 -10 3 L -10 -5 Z"
                      fill="#2563eb"
                      stroke="#60a5fa"
                      strokeWidth="1.5"
                      filter="url(#softGlow)"
                    />
                    <path
                      d="M -3 1 L -1 3 L 4 -2"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                )}
              </g>

              {/* 5. HAND POSES FOR EMOTIONS */}
              {/* A. Thinking Hand Pose (Image 1 bottom-left): Cute white rounded paw nestled under the chin */}
              {mood === "thinking" && (
                <g transform="translate(136, 144)">
                  {/* Subtle lower arm shadow/depth */}
                  <path
                    d="M -12 28 C -22 18, -18 6, -8 0"
                    fill="none"
                    stroke="url(#cuteHandGradLight)"
                    strokeWidth="14"
                    strokeLinecap="round"
                    filter="url(#softGlow)"
                  />
                  <path
                    d="M -12 28 C -22 18, -18 6, -8 0"
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity="0.5"
                  />
                  {/* Cute rounded fist/paw resting under chin */}
                  <circle
                    cx="-6"
                    cy="0"
                    r="12"
                    fill="url(#cuteHandGradLight)"
                    stroke="#94a3b8"
                    strokeWidth="1.6"
                    filter="url(#softGlow)"
                  />
                  {/* Paw knuckle creases */}
                  <path d="M -11 -4 Q -6 -7 -1 -4" fill="none" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M -11 1 Q -6 -2 -1 1" fill="none" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" />
                </g>
              )}

              {/* B. Caring / Supportive / Empathetic Hand Pose: Holding 3D Glowing Pink Heart with two paws */}
              {(mood === "caring" || mood === "supportive" || mood === "empathetic" || mood === "encouraging") && (
                <g transform="translate(140, 158)">
                  <g className={styles.pulsingHeart}>
                    <path
                      d="M 0 -7 C -3 -18 -20 -16 -20 -5 C -20 6 -7 13 0 20 C 7 13 20 6 20 -5 C 20 -16 3 -18 0 -7 Z"
                      fill="url(#cute3DHeart)"
                      filter="url(#softGlow)"
                    />
                    <ellipse cx="-6" cy="-7" rx="4.5" ry="2.6" fill="#ffffff" opacity="0.65" transform="rotate(-30, -6, -7)" />
                    <circle cx="-16" cy="3" r="8" fill="url(#cuteHandGradLight)" stroke="#94a3b8" strokeWidth="1.4" />
                    <circle cx="16" cy="3" r="8" fill="url(#cuteHandGradLight)" stroke="#94a3b8" strokeWidth="1.4" />
                  </g>
                </g>
              )}
            </g>

            {/* 6. MINIATURE BLUE LAPTOP & TYPING ARMS (Image 3) */}
            {(mood === "typing" || mood === "composing" || isTypingStream) && (
              <g transform="translate(0, 8)">
                {/* Floor glow / ring under laptop */}
                <ellipse
                  cx="140"
                  cy="210"
                  rx="62"
                  ry="11"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  opacity="0.35"
                  filter="url(#softGlow)"
                />

                {/* Glowing Typing Sparks on Right of Laptop Screen (Image 3) */}
                <g stroke="#38bdf8" strokeWidth="3.2" strokeLinecap="round" filter="url(#softGlow)">
                  <line x1="184" y1="152" x2="194" y2="144" />
                  <line x1="190" y1="160" x2="202" y2="156" />
                </g>

                {/* Laptop Lid Facing Viewer - Vibrant Blue (Image 3) */}
                <g transform="translate(98, 158)">
                  <rect
                    x="0"
                    y="0"
                    width="84"
                    height="46"
                    rx="8"
                    fill="url(#cuteBlueLaptopLid)"
                    stroke="#60a5fa"
                    strokeWidth="1.8"
                  />

                  {/* Inner screen border bevel */}
                  <rect
                    x="3"
                    y="3"
                    width="78"
                    height="40"
                    rx="6"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeWidth="1"
                  />

                  {/* White Focentia 'fo' Logo on Laptop Lid (Image 3) */}
                  <g transform="translate(35, 14)">
                    {/* Stylized lowercase 'f' */}
                    <path
                      d="M 1 18 L 1 6.5 C 1 3 3.5 1 7 1 L 9 1 C 9.8 1 10.4 1.6 10.4 2.4 C 10.4 3.2 9.8 3.8 9 3.8 L 7 3.8 C 5.2 3.8 4 4.8 4 6.8 L 4 8.5 L 9 8.5 C 9.8 8.5 10.4 9.1 10.4 9.9 C 10.4 10.7 9.8 11.3 9 11.3 L 4 11.3 L 4 18 Z"
                      fill="#ffffff"
                    />
                    {/* Stylized lowercase 'o' */}
                    <circle cx="16" cy="12" r="5" fill="none" stroke="#ffffff" strokeWidth="2.8" />
                  </g>
                </g>

                {/* Laptop Base / Keyboard (Image 3) */}
                <path
                  d="M 88 204 L 192 204 L 182 212 L 98 212 Z"
                  fill="url(#cuteBlueLaptopBase)"
                  stroke="#3b82f6"
                  strokeWidth="1.4"
                />
                {/* Keyboard keys subtle line */}
                <line x1="104" y1="207" x2="176" y2="207" stroke="#60a5fa" strokeWidth="1.2" opacity="0.65" />

                {/* Left Typing Arm & Paw */}
                <path
                  d="M 82 152 Q 86 172 96 172"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity="0.65"
                />
                <circle
                  cx="96"
                  cy="172"
                  r="9.5"
                  fill="url(#cuteHandGradLight)"
                  stroke="#94a3b8"
                  strokeWidth="1.6"
                  className={styles.pawLeft}
                />

                {/* Right Typing Arm & Paw */}
                <path
                  d="M 198 152 Q 194 172 184 172"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity="0.65"
                />
                <circle
                  cx="184"
                  cy="172"
                  r="9.5"
                  fill="url(#cuteHandGradLight)"
                  stroke="#94a3b8"
                  strokeWidth="1.6"
                  className={styles.pawRight}
                />
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

export default AIOrbFace;
