"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import type { OrbMood } from "./useOrbMood";
import styles from "./ai-orb-face.module.css";

export interface AIOrbFaceProps {
  mood: OrbMood;
  thoughtText?: string;
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
  mood,
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

  // Head tilt angle based on emotion (Matching Reference Images)
  const headAngle = useMemo(() => {
    if (mood === "curious") return 6.5;
    if (mood === "thinking") return 5.5;
    if (mood === "sad") return -4.5;
    if (mood === "sulky") return -3.0;
    if (mood === "playful" || isGiggling) return 4.5;
    if (mood === "proud") return -4.0;
    if (mood === "caring") return 3.5;
    if (isEnjoying) return -2.5;
    return 0;
  }, [mood, isGiggling, isEnjoying]);

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

  // 2. High-Performance Real-Time LERP Animation Loop (60Hz / 120Hz Silk-Smooth Tracking)
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

      switch (mood) {
        case "typing":
          moodBiasX = 0;
          moodBiasY = 0.55; // eyes cast down towards laptop
          allowCursorTracking = false;
          break;
        case "thinking":
          moodBiasX = 0.42;
          moodBiasY = -0.58; // tilted up-right towards thought cloud
          allowCursorTracking = false;
          break;
        case "sleepy":
          moodBiasX = 0;
          moodBiasY = 0.38; // drooped down in sleep
          allowCursorTracking = false;
          break;
        case "sulky":
          moodBiasX = -0.45;
          moodBiasY = 0; // side-eye glance
          allowCursorTracking = false;
          break;
        case "proud":
          moodBiasX = 0.32;
          moodBiasY = -0.36; // cheerful high tilt towards stars
          allowCursorTracking = true;
          break;
        case "curious":
          moodBiasX = 0.3;
          moodBiasY = -0.3; // curious glance
          allowCursorTracking = true;
          break;
        case "sad":
          moodBiasX = 0;
          moodBiasY = 0.32; // apologetic droop
          allowCursorTracking = true;
          break;
        case "caring":
          moodBiasX = 0;
          moodBiasY = 0.1; // gentle centered gaze
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
        // Blend real-time mouse position with subtle mood personality bias
        targetX = targetRef.current.x * 0.92 + moodBiasX * 0.15;
        targetY = targetRef.current.y * 0.92 + moodBiasY * 0.15;
        const mag = Math.hypot(targetX, targetY);
        if (mag > 1.0) {
          targetX /= mag;
          targetY /= mag;
        }
      }

      // Multi-rate organic LERP (Eye saccades fastest, facial features medium, 3D head with inertial weight)
      const headSpeed = 0.088;
      const faceSpeed = 0.115;
      const pupilSpeed = 0.165;

      const head = currentHeadRef.current;
      head.x = lerp(head.x, targetX * 13.5, headSpeed);
      head.y = lerp(head.y, targetY * 9.8, headSpeed);
      head.rotY = lerp(head.rotY, targetX * 15.5, headSpeed);
      head.rotX = lerp(head.rotX, -targetY * 11.5, headSpeed);
      head.rotZ = lerp(head.rotZ, targetX * 4.0, headSpeed);

      const face = currentFaceRef.current;
      face.x = lerp(face.x, targetX * 7.0, faceSpeed);
      face.y = lerp(face.y, targetY * 5.4, faceSpeed);

      const pupil = currentPupilRef.current;
      pupil.x = lerp(pupil.x, targetX * 5.5, pupilSpeed);
      pupil.y = lerp(pupil.y, targetY * 4.5, pupilSpeed);

      // Direct Ref Updates for 60/120fps Zero-Lag Fluidity
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
          `translate(${(face.x * 0.35).toFixed(2)}, ${(face.y * 0.35).toFixed(2)})`
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
    const handlePointerMove = (e: PointerEvent) => {
      if (!stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const orbCenterX = rect.left + rect.width / 2;
      const orbCenterY = rect.top + rect.height / 2;

      const dx = e.clientX - orbCenterX;
      const dy = e.clientY - orbCenterY;

      // Proportional normalization across screen sizes (-1 to +1)
      const maxDistanceX = Math.max(window.innerWidth * 0.44, 260);
      const maxDistanceY = Math.max(window.innerHeight * 0.44, 260);

      const rawNormX = dx / maxDistanceX;
      const rawNormY = dy / maxDistanceY;
      const dist = Math.hypot(rawNormX, rawNormY);

      if (dist > 0.002) {
        // Smooth non-linear sinusoidal easing for organic responsiveness
        const clampedDist = Math.min(1.0, dist);
        const easedDist = Math.sin((clampedDist * Math.PI) / 2);
        const scale = easedDist / dist;
        targetRef.current = {
          x: rawNormX * scale,
          y: rawNormY * scale,
          active: true,
        };
      } else {
        targetRef.current = { x: 0, y: 0, active: true };
      }
    };

    // When cursor leaves window or frame, smoothly re-center orb
    const handlePointerLeave = () => {
      targetRef.current = { x: 0, y: 0, active: false };
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerLeave, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);
    window.addEventListener("blur", handlePointerLeave);
    window.addEventListener("mouseout", (e: MouseEvent) => {
      if (!e.relatedTarget && !(e as unknown as { toElement?: Element }).toElement) {
        handlePointerLeave();
      }
    });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerLeave);
      document.removeEventListener("mouseleave", handlePointerLeave);
      window.removeEventListener("blur", handlePointerLeave);
    };
  }, []);

  // Determine active mood animation class
  const orbMotionClass = useMemo(() => {
    if (isGiggling) return styles.orbGiggling;
    if (isEnjoying) return styles.orbEnjoying;
    if (mood === "playful") return styles.orbGiggling;
    if (mood === "typing") return styles.orbTyping;
    if (mood === "thinking") return styles.orbThinking;
    if (mood === "sleepy") return styles.orbSleepy;
    return styles.orbFloating;
  }, [isGiggling, isEnjoying, mood]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const isTouch = e.pointerType === "touch" || e.pointerType === "pen";
    onTap?.(isTouch ? "touch" : "mouse");
  };

  return (
    <div
      className={`${styles.orbContainer} ${speechSide === "left" ? styles.orbContainerSideLeft : ""} ${className}`.trim()}
      data-theme={isLight ? "light" : "dark"}
    >
      {/* 1. TOP SPEECH BUBBLE (Centered above Orb with Downward Speech Tail) */}
      {thoughtText && !compact && speechSide === "top" && (
        <div className={styles.speechBubbleWrapper} aria-live="polite">
          <div className={styles.speechBubble}>
            <span className={styles.speechBubbleText}>
              {thoughtText}
              {isTypingStream && <span className={styles.typewriterCursor} />}
            </span>

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
                fill="var(--bubble-bg, rgba(10, 22, 50, 0.9))"
              />
              <path
                d="M 2 0 C 5 3, 9 9, 12 15 C 15 9, 19 3, 22 0"
                stroke="var(--bubble-border, rgba(59, 130, 246, 0.7))"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M 0 -2 L 24 -2 L 24 2 L 0 2 Z"
                fill="var(--bubble-bg, rgba(10, 22, 50, 0.9))"
              />
            </svg>
          </div>
        </div>
      )}

      {/* 2. LEFT SPEECH BUBBLE (Beside Orb on the Left with Right-Pointing Tail) */}
      {thoughtText && !compact && speechSide === "left" && (
        <div className={styles.speechBubbleLeftWrapper} aria-live="polite">
          <div className={styles.speechBubble}>
            <span className={styles.speechBubbleText}>
              {thoughtText}
              {isTypingStream && <span className={styles.typewriterCursor} />}
            </span>

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
                fill="var(--bubble-bg, rgba(10, 22, 50, 0.9))"
              />
              <path
                d="M 0 2 C 3 5, 9 9, 15 12 C 9 15, 3 19, 0 22"
                stroke="var(--bubble-border, rgba(59, 130, 246, 0.7))"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
        </div>
      )}

      {/* 3. THOUGHT CLOUD FOR THINKING (Matching Image 2 Reference) */}
      {(mood === "thinking" || isThinking) && (
        <div className={styles.thoughtCloudWrapper} aria-label="AI is thinking">
          <div className={styles.thoughtCloud}>
            <span>{language === "bn" ? "AI ভাবছে" : "AI is thinking"}</span>
            <span className={styles.dotPulse1}>.</span>
            <span className={styles.dotPulse2}>.</span>
            <span className={styles.dotPulse3}>.</span>
          </div>
          <div className={styles.cloudTrail1} />
          <div className={styles.cloudTrail2} />
        </div>
      )}

      {/* 4. THE 3D COBALT ORB STAGE WITH 3D PERSPECTIVE HEAD TILT */}
      <div className={`${styles.orbMotionWrapper} ${orbMotionClass}`}>
        <div
          ref={stageRef}
          className={styles.orbStage}
          onPointerDown={handlePointerDown}
          onClick={(e) => {
            // If onPointerDown was bypassed, trigger fallback click
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
              {/* Ambient Ambient Shadow Glow */}
              <radialGradient id="sphereAuraDark" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                <stop offset="65%" stopColor="#1e3a8a" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#020617" stopOpacity="0" />
              </radialGradient>

              <radialGradient id="sphereAuraLight" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.25" />
                <stop offset="70%" stopColor="#93c5fd" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>

              {/* Vibrant Cobalt 3D Sphere Body - Dark Mode (Reference Image 1 & 2) */}
              <radialGradient id="vibrantCobaltDark" cx="36%" cy="26%" r="74%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
                <stop offset="38%" stopColor="#1d4ed8" stopOpacity="1" />
                <stop offset="78%" stopColor="#1e3a8a" stopOpacity="1" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
              </radialGradient>

              {/* Silky Pearl Azure Sphere Body - Light Mode */}
              <radialGradient id="vibrantCobaltLight" cx="36%" cy="26%" r="74%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="45%" stopColor="#f1f7fe" stopOpacity="1" />
                <stop offset="85%" stopColor="#dbeafe" stopOpacity="1" />
                <stop offset="100%" stopColor="#bfdbfe" stopOpacity="1" />
              </radialGradient>

              {/* Hand Gradient for Thinking Pose */}
              <radialGradient id="cuteHandGrad" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="65%" stopColor="#1d4ed8" />
                <stop offset="100%" stopColor="#0f172a" />
              </radialGradient>

              {/* Elegant Soft Top-Left Specular Shine */}
              <linearGradient id="softSpecular" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                <stop offset="45%" stopColor="#93c5fd" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </linearGradient>

              {/* Soft, Light Pastel Pink Cheek Blush (Low opacity, natural & cute) */}
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

              {/* Miniature Laptop Glow for typing */}
              <linearGradient id="cuteLaptopLid" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
              </linearGradient>

              {/* Soft Glow Filter */}
              <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Clip path for Sulky / Bombastic straight eyelid */}
              <clipPath id="sulkyLidClipL">
                <rect x="94" y="107" width="36" height="24" />
              </clipPath>
              <clipPath id="sulkyLidClipR">
                <rect x="150" y="107" width="36" height="24" />
              </clipPath>
            </defs>

            {/* 1. Floor Drop Shadow (Follows subtle body motion while staying grounded) */}
            <ellipse
              ref={dropShadowRef}
              cx="140"
              cy="214"
              rx="64"
              ry="9"
              fill={isLight ? "rgba(30, 58, 138, 0.1)" : "rgba(0, 0, 0, 0.45)"}
            />

            {/* 2. Soft Ambient Halo Glow */}
            <circle
              cx="140"
              cy="126"
              r="105"
              fill={isLight ? "url(#sphereAuraLight)" : "url(#sphereAuraDark)"}
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

            {/* 3. Smooth, Luxury Cobalt Sphere Body & Head Group with Natural Head Movement */}
            <g
              ref={headGroupRef}
              transform={`rotate(${headAngle}, 140, 126)`}
              className={styles.headGroup}
            >
              {/* 3D Cobalt Sphere Main Body */}
              <circle
                cx="140"
                cy="126"
                r="78"
                fill={isLight ? "url(#vibrantCobaltLight)" : "url(#vibrantCobaltDark)"}
                stroke={isLight ? "rgba(191, 219, 254, 0.7)" : "rgba(96, 165, 250, 0.3)"}
                strokeWidth="1.5"
              />

              {/* Top-Left Glossy Studio Specular Sheen (Dynamic 3D depth) */}
              <g ref={specularRef} transform="translate(0, 0)">
                <path
                  d="M 88 78 C 100 54, 140 48, 184 62 C 148 55, 108 62, 88 78 Z"
                  fill="url(#softSpecular)"
                />
                <ellipse cx="106" cy="78" rx="16" ry="10" fill="url(#softSpecular)" transform="rotate(-28, 106, 78)" />
                <circle cx="102" cy="74" r="5" fill="#ffffff" opacity="0.6" filter="url(#softGlow)" />
              </g>

              {/* 4. FACIAL FEATURES WRAPPER (Spherical Parallax Movement inside the Orb) */}
              <g ref={faceFeaturesRef} transform="translate(0, 0)">
                {/* Soft Glowing Neon Coral-Pink Cheek Blushes */}
                <ellipse cx="92" cy="130" rx="12" ry="7" fill="url(#softPinkBlush)" filter="url(#softGlow)" className={styles.faceFeaturesGroup} />
                <ellipse cx="188" cy="130" rx="12" ry="7" fill="url(#softPinkBlush)" filter="url(#softGlow)" className={styles.faceFeaturesGroup} />

                {/* REALISTIC EYEBROWS */}
                <g
                  className={styles.faceFeaturesGroup}
                  stroke={isLight ? "#334155" : "#93c5fd"}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  opacity={isLight ? "0.8" : "0.9"}
                >
                  {mood === "sad" ? (
                    /* Sad: Worried/apologetic inverted upward slanted brows */
                    <>
                      <path d="M 96 95 Q 110 86 124 93" fill="none" />
                      <path d="M 156 93 Q 170 86 184 95" fill="none" />
                    </>
                  ) : mood === "curious" ? (
                    /* Curious: Left brow raised high arch, Right brow slightly lower/level */
                    <>
                      <path d="M 98 83 Q 112 74 124 84" fill="none" />
                      <path d="M 156 93 Q 168 90 180 94" fill="none" />
                    </>
                  ) : mood === "sulky" ? (
                    /* Sulky: Left brow flat, Right brow raised skeptically (bombastic side-eye) */
                    <>
                      <line x1="98" y1="93" x2="124" y2="93" />
                      <path d="M 156 88 Q 168 81 180 88" fill="none" />
                    </>
                  ) : mood === "playful" || isGiggling ? (
                    /* Playful: Joyful raised brows over the open eye and wink */
                    <>
                      <path d="M 98 88 Q 112 82 124 88" fill="none" />
                      <path d="M 156 88 Q 168 82 180 88" fill="none" />
                    </>
                  ) : mood === "sleepy" ? (
                    /* Sleepy: Relaxed, downward sloping brows */
                    <>
                      <path d="M 100 96 Q 112 99 124 97" fill="none" />
                      <path d="M 156 97 Q 168 99 180 96" fill="none" />
                    </>
                  ) : mood === "thinking" ? (
                    /* Thinking: Left brow lowered pensive, Right brow high in thought */
                    <>
                      <path d="M 98 94 Q 112 90 124 95" fill="none" />
                      <path d="M 156 87 Q 168 80 180 87" fill="none" />
                    </>
                  ) : mood === "angry" ? (
                    /* Playful angry: Slanted determined brows */
                    <>
                      <line x1="98" y1="90" x2="124" y2="97" />
                      <line x1="182" y1="90" x2="156" y2="97" />
                    </>
                  ) : mood === "proud" ? (
                    /* Proud: Confident, cheerfully arched high brows */
                    <>
                      <path d="M 99 86 Q 112 79 125 86" fill="none" />
                      <path d="M 155 86 Q 168 79 181 86" fill="none" />
                    </>
                  ) : mood === "caring" ? (
                    /* Caring: Soft sympathetic upward slant in the middle */
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
                    /* Default / Idle: Delicate, sweet, perfectly balanced arched eyebrows */
                    <>
                      <path d="M 100 91 Q 112 85 124 91" fill="none" />
                      <path d="M 156 91 Q 168 85 180 91" fill="none" />
                    </>
                  )}
                </g>

                {/* REALISTIC EXPRESSIVE EYES */}
                {mood === "playful" || isGiggling ? (
                  /* A. Playful / Touch Tickle: Left Eye Open & Glossy, Right Eye Winking */
                  <g>
                    {/* Left Open Shiny Anime Eye */}
                    <ellipse cx="112" cy="112" rx="13.5" ry="15.5" fill="url(#cuteEyeGrad)" />
                    <ellipse cx="112" cy="116" rx="9" ry="5" fill="#0284c7" opacity="0.38" />
                    <circle cx="115.5" cy="107.5" r="4.3" fill="#ffffff" filter="url(#softGlow)" />
                    <circle cx="108.5" cy="115" r="1.8" fill="#ffffff" opacity="0.85" />

                    {/* Right Winking Eye Arc */}
                    <path
                      d="M 152 114 Q 166 126 180 114"
                      fill="none"
                      stroke={isLight ? "#0f172a" : "#38bdf8"}
                      strokeWidth="3.8"
                      strokeLinecap="round"
                    />
                    <line
                      x1="180"
                      y1="114"
                      x2="186"
                      y2="108"
                      stroke={isLight ? "#0f172a" : "#38bdf8"}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <line
                      x1="178"
                      y1="117"
                      x2="185"
                      y2="117"
                      stroke={isLight ? "#0f172a" : "#38bdf8"}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </g>
                ) : mood === "sleepy" ? (
                  /* B. Sleepy: Peaceful Closed Sleeping Lines */
                  <g>
                    <path
                      d="M 98 114 Q 112 122 126 114"
                      fill="none"
                      stroke={isLight ? "#0f172a" : "#38bdf8"}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <line x1="98" y1="114" x2="95" y2="111" stroke={isLight ? "#0f172a" : "#38bdf8"} strokeWidth="2.2" strokeLinecap="round" />
                    <path
                      d="M 154 114 Q 168 122 182 114"
                      fill="none"
                      stroke={isLight ? "#0f172a" : "#38bdf8"}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <line x1="182" y1="114" x2="185" y2="111" stroke={isLight ? "#0f172a" : "#38bdf8"} strokeWidth="2.2" strokeLinecap="round" />
                  </g>
                ) : mood === "happy" || isEnjoying ? (
                  /* C. Happy / Enjoying: Arched Joyful Curved Eyes ^ ^ */
                  <g>
                    <path
                      d="M 98 114 Q 112 98 126 114"
                      fill="none"
                      stroke={isLight ? "#0f172a" : "#38bdf8"}
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 154 114 Q 168 98 182 114"
                      fill="none"
                      stroke={isLight ? "#0f172a" : "#38bdf8"}
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </g>
                ) : mood === "sulky" ? (
                  /* D. Sulky / Bombastic: Half-lidded Side-Glance (Bombastic Side-eye) */
                  <g>
                    {/* Left Eye Half-Lidded */}
                    <ellipse cx="112" cy="112" rx="13.5" ry="15" fill="url(#cuteEyeGrad)" clipPath="url(#sulkyLidClipL)" />
                    <line x1="97" y1="107" x2="127" y2="107" stroke={isLight ? "#0f172a" : "#38bdf8"} strokeWidth="2.4" />
                    <circle cx="116" cy="113" r="5" fill="#0284c7" />
                    <circle cx="118" cy="111" r="2.8" fill="#ffffff" filter="url(#softGlow)" />

                    {/* Right Eye Half-Lidded */}
                    <ellipse cx="168" cy="112" rx="13.5" ry="15" fill="url(#cuteEyeGrad)" clipPath="url(#sulkyLidClipR)" />
                    <line x1="153" y1="107" x2="183" y2="107" stroke={isLight ? "#0f172a" : "#38bdf8"} strokeWidth="2.4" />
                    <circle cx="172" cy="113" r="5" fill="#0284c7" />
                    <circle cx="174" cy="111" r="2.8" fill="#ffffff" filter="url(#softGlow)" />
                  </g>
                ) : mood === "sad" ? (
                  /* E. Sad: Big Pleading Watery Teary Eyes with Glistening Water Drops */
                  <g className={isBlinking ? styles.eyeLidClosed : styles.eyeLidOpen}>
                    {/* Left Eye */}
                    <g>
                      <ellipse cx="112" cy="113" rx="13.5" ry="15.5" fill="url(#cuteEyeGrad)" />
                      <ellipse cx="112" cy="118" rx="10" ry="6" fill="#0284c7" opacity="0.45" />
                      <g ref={sadPupilLeftRef} transform="translate(0, 0)">
                        <circle cx="114.5" cy="108.5" r="4.3" fill="#ffffff" filter="url(#softGlow)" />
                        <circle cx="108" cy="116" r="2.2" fill="#ffffff" opacity="0.9" />
                        <circle cx="113.5" cy="119.5" r="1.4" fill="#ffffff" opacity="0.8" />
                      </g>
                    </g>

                    {/* Right Eye */}
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
                  /* F. Open Anime Eyes with Gaze / Cursor Tracking */
                  <g className={isBlinking ? styles.eyeLidClosed : styles.eyeLidOpen}>
                    {/* LEFT EYE */}
                    <g>
                      <ellipse cx="112" cy="112" rx="13.5" ry="15.5" fill="url(#cuteEyeGrad)" />
                      <ellipse cx="112" cy="116" rx="9" ry="5" fill="#0284c7" opacity="0.35" />
                      <g ref={pupilLeftRef} transform="translate(0, 0)">
                        <circle cx="112" cy="112" r="7.5" fill="#0369a1" opacity="0.4" />
                        <circle cx="115.5" cy="107.5" r="4.3" fill="#ffffff" filter="url(#softGlow)" />
                        <circle cx="108.5" cy="115" r="1.8" fill="#ffffff" opacity="0.85" />
                      </g>
                    </g>

                    {/* RIGHT EYE */}
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
                {mood === "curious" ? (
                  /* Curious: Tiny cute open 'o' mouth */
                  <ellipse cx="140" cy="128" rx="3.5" ry="4" fill="#0b1328" stroke={isLight ? "#0f172a" : "#60a5fa"} strokeWidth="1.2" />
                ) : mood === "sulky" ? (
                  /* Sulky: Downturned pouty frown */
                  <path
                    d="M 132 133 Q 140 125 148 133"
                    fill="none"
                    stroke={isLight ? "#0f172a" : "#60a5fa"}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                ) : mood === "playful" || isGiggling ? (
                  /* Playful: Open smiling mouth with pink tongue sticking out! */
                  <g>
                    <path
                      d="M 131 123 Q 140 133 149 123"
                      fill="none"
                      stroke={isLight ? "#0f172a" : "#38bdf8"}
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                    {/* Pink Tongue Sticking Out */}
                    <path
                      d="M 135 126 Q 140 140 145 126 Z"
                      fill="#ff4d79"
                      stroke="#e11d48"
                      strokeWidth="0.8"
                    />
                  </g>
                ) : mood === "sleepy" ? (
                  /* Sleepy: Yawning open mouth */
                  <g>
                    <ellipse cx="140" cy="129" rx="6.5" ry="8" fill="#090e21" stroke={isLight ? "#0f172a" : "#60a5fa"} strokeWidth="1.5" />
                    <ellipse cx="140" cy="133.5" rx="4.2" ry="2.8" fill="#ff4d79" />
                  </g>
                ) : mood === "thinking" ? (
                  /* Thinking: Thoughtful pensive curve */
                  <path
                    d="M 134 130 Q 140 126 146 130"
                    fill="none"
                    stroke={isLight ? "#0f172a" : "#60a5fa"}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                ) : mood === "happy" || isEnjoying ? (
                  /* Happy / Enjoying: Wide open joyful smile with laughing tongue */
                  <path
                    d="M 132 125 Q 140 138 148 125 Z"
                    fill="#ff4d79"
                    stroke={isLight ? "#0f172a" : "#38bdf8"}
                    strokeWidth="1.8"
                  />
                ) : mood === "proud" ? (
                  /* Proud: Confident, sweet curved smile */
                  <path
                    d="M 133 125 Q 140 132 149 124"
                    fill="none"
                    stroke={isLight ? "#0f172a" : "#38bdf8"}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                ) : mood === "caring" ? (
                  /* Caring: Warm, gentle sweet smile */
                  <path
                    d="M 134 125 Q 140 131 146 125"
                    fill="none"
                    stroke={isLight ? "#0f172a" : "#93c5fd"}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                ) : mood === "angry" ? (
                  /* Angry: Pouty triangle mouth */
                  <path
                    d="M 134 126 L 140 130 L 146 126"
                    fill="none"
                    stroke={isLight ? "#0f172a" : "#38bdf8"}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                ) : mood === "sad" ? (
                  /* Sad: Apologetic soft downward mouth pout */
                  <g>
                    <path
                      d="M 133 133 Q 140 126 147 133"
                      fill="none"
                      stroke={isLight ? "#0f172a" : "#60a5fa"}
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                    {/* Subtle cute tear glint */}
                    <ellipse cx="178" cy="125" rx="3" ry="4.5" fill="#38bdf8" opacity="0.9" filter="url(#softGlow)" />
                    <circle cx="177" cy="124" r="1.2" fill="#ffffff" />
                  </g>
                ) : (
                  /* Default / Idle / Typing: Sweet, clean, friendly smile */
                  <path
                    d="M 133 125 Q 140 131 147 125"
                    fill="none"
                    stroke={isLight ? "#0f172a" : "#93c5fd"}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                )}
              </g>

              {/* ACCESSORIES & EMOTION SYMBOLS */}
              {/* Curious: Floating Question Mark ? */}
              {mood === "curious" && (
                <g transform="translate(196, 62)">
                  <text
                    x="0"
                    y="0"
                    fill={isLight ? "#2563eb" : "#38bdf8"}
                    fontSize="22"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    filter="url(#softGlow)"
                  >
                    ?
                  </text>
                </g>
              )}

              {/* Sulky: Floating Comic Anger/Frustration Puff 💢 */}
              {mood === "sulky" && (
                <g transform="translate(192, 52)" stroke={isLight ? "#2563eb" : "#38bdf8"} strokeWidth="1.8" fill="none">
                  <path d="M 0 4 Q 4 0 8 4 Q 12 0 16 4 Q 20 8 16 12 Q 20 16 16 20 Q 12 16 8 20 Q 4 16 0 20 Q -4 16 0 12 Z" opacity="0.85" />
                </g>
              )}

              {/* Playful / Tickle: Floating Radiating Energy Slashes \ | */}
              {(mood === "playful" || isGiggling) && (
                <g
                  stroke={isLight ? "#0284c7" : "#38bdf8"}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  filter="url(#softGlow)"
                  className={styles.playfulSlashes}
                >
                  <line x1="188" y1="58" x2="197" y2="42" />
                  <line x1="202" y1="65" x2="215" y2="54" />
                </g>
              )}

              {/* Sleepy: Floating z Z Z */}
              {mood === "sleepy" && (
                <g fill={isLight ? "#2563eb" : "#38bdf8"} fontWeight="bold" fontFamily="sans-serif">
                  <text x="188" y="70" fontSize="13" className={styles.sleepyZ1}>z</text>
                  <text x="196" y="56" fontSize="16" className={styles.sleepyZ2}>Z</text>
                  <text x="207" y="40" fontSize="20" className={styles.sleepyZ3}>Z</text>
                </g>
              )}

              {/* Thinking: Floating Thought Bubble 💭 */}
              {mood === "thinking" && (
                <g transform="translate(194, 54)" opacity="0.9">
                  <circle cx="0" cy="12" r="3" fill="#38bdf8" />
                  <circle cx="6" cy="4" r="5" fill="#38bdf8" />
                  <ellipse cx="18" cy="-6" rx="12" ry="9" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
                </g>
              )}

              {/* Proud / Joyful Click: Floating Golden Sparkle Stars ✦ ✦ */}
              {(mood === "proud" || isEnjoying) && (
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

              {/* Caring: Floating Pink Hearts at Top-Right */}
              {mood === "caring" && (
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

              {/* Sad: Animated Falling Teardrops & Apologetic Sweatdrop */}
              {mood === "sad" && (
                <g>
                  <g transform="translate(93, 130)" className={styles.sadTeardropLeft}>
                    <path
                      d="M 0 -7 C 3 -3, 5 2, 0 7 C -5 2, -3 -3, 0 -7 Z"
                      fill="#38bdf8"
                      filter="url(#softGlow)"
                      opacity="0.95"
                    />
                    <circle cx="1" cy="2" r="1.4" fill="#ffffff" />
                  </g>
                  <g transform="translate(187, 132)" className={styles.sadTeardropRight}>
                    <path
                      d="M 0 -6 C 2.5 -2.5, 4.5 1.5, 0 6 C -4.5 1.5, -2.5 -2.5, 0 -6 Z"
                      fill="#60a5fa"
                      filter="url(#softGlow)"
                      opacity="0.9"
                    />
                    <circle cx="0.8" cy="1.5" r="1.2" fill="#ffffff" />
                  </g>
                  <g transform="translate(196, 56)" className={styles.sadSweatdrop}>
                    <path
                      d="M 0 -8 C 3 -3, 6 2, 0 8 C -6 2, -3 -3, 0 -8 Z"
                      fill="#38bdf8"
                      filter="url(#softGlow)"
                      opacity="0.9"
                    />
                    <circle cx="1.2" cy="2.2" r="1.5" fill="#ffffff" />
                  </g>
                </g>
              )}
            </g>

            {/* 5. HAND POSES FOR EMOTIONS */}
            {/* A. Thinking Hand Pose: Cute arm & spherical paw resting on chin */}
            {mood === "thinking" && (
              <g>
                <ellipse cx="94" cy="152" rx="10" ry="7" fill="url(#cuteHandGrad)" stroke="#38bdf8" strokeWidth="1.2" opacity="0.6" transform="rotate(-15, 94, 152)" />
                <path
                  d="M 194 162 C 206 148, 198 132, 172 134"
                  fill="none"
                  stroke="url(#cuteHandGrad)"
                  strokeWidth="15"
                  strokeLinecap="round"
                  filter="url(#softGlow)"
                />
                <path
                  d="M 194 162 C 206 148, 198 132, 172 134"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  opacity="0.85"
                />
                <g transform="translate(162, 136)">
                  <circle cx="0" cy="0" r="11" fill="url(#cuteHandGrad)" stroke="#38bdf8" strokeWidth="1.6" filter="url(#softGlow)" />
                  <path d="M -5 -4 Q 0 -7 5 -4" fill="none" stroke="#60a5fa" strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M -5 1 Q 0 -2 5 1" fill="none" stroke="#60a5fa" strokeWidth="1.4" strokeLinecap="round" />
                </g>
              </g>
            )}

            {/* B. Caring Hand Pose: Holding 3D Glowing Pink Heart with two paws */}
            {mood === "caring" && (
              <g transform="translate(140, 158)">
                <g className={styles.pulsingHeart}>
                  <path
                    d="M 0 -7 C -3 -18 -20 -16 -20 -5 C -20 6 -7 13 0 20 C 7 13 20 6 20 -5 C 20 -16 3 -18 0 -7 Z"
                    fill="url(#cute3DHeart)"
                    filter="url(#softGlow)"
                  />
                  <ellipse cx="-6" cy="-7" rx="4.5" ry="2.6" fill="#ffffff" opacity="0.65" transform="rotate(-30, -6, -7)" />
                  <circle cx="-16" cy="3" r="8" fill="url(#cuteHandGrad)" stroke="#38bdf8" strokeWidth="1.4" />
                  <circle cx="16" cy="3" r="8" fill="url(#cuteHandGrad)" stroke="#38bdf8" strokeWidth="1.4" />
                </g>
              </g>
            )}
          </g>

          {/* 6. MINIATURE LAPTOP & TYPING ARMS */}
          {mood === "typing" && (
            <g transform="translate(0, 8)">
              {/* Floating animated typing wave dots (...) */}
              <g transform="translate(122, 122)">
                <circle cx="8" cy="0" r="3.2" fill="#38bdf8" className={styles.typingDot1} />
                <circle cx="18" cy="0" r="3.2" fill="#38bdf8" className={styles.typingDot2} />
                <circle cx="28" cy="0" r="3.2" fill="#38bdf8" className={styles.typingDot3} />
              </g>

              {/* Glowing floor ring under laptop */}
              <ellipse
                cx="140"
                cy="210"
                rx="58"
                ry="10"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.5"
                opacity="0.6"
                filter="url(#softGlow)"
              />

              {/* Laptop Screen / Lid Facing Viewer */}
              <g transform="translate(98, 160)">
                <rect
                  x="0"
                  y="0"
                  width="84"
                  height="44"
                  rx="7"
                  fill="url(#cuteLaptopLid)"
                  stroke="#38bdf8"
                  strokeWidth="1.8"
                />

                <rect
                  x="3"
                  y="3"
                  width="78"
                  height="38"
                  rx="5"
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.35)"
                  strokeWidth="1"
                />

                {/* FocusForge 'F' Logo on Laptop Lid */}
                <path
                  d="M 39 14 L 47 14 C 48 14 49 14.8 49 15.8 L 49 16.5 C 49 17.5 48.2 18 47.2 18 L 42.5 18 L 42.5 20.5 L 46 20.5 C 46.8 20.5 47.5 21.2 47.5 22 L 47.5 22.5 C 47.5 23.3 46.8 24 46 24 L 42.5 24 L 42.5 29 C 42.5 29.8 41.8 30.5 41 30.5 L 40 30.5 C 39.2 30.5 38.5 29.8 38.5 29 Z"
                  fill="#38bdf8"
                  filter="url(#softGlow)"
                />
              </g>

              {/* Laptop Keyboard Tray & Base */}
              <path
                d="M 90 204 L 190 204 L 182 210 L 98 210 Z"
                fill="#0b1329"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />

              {/* Left Typing Arm & Paw */}
              <path
                d="M 82 152 Q 86 172 96 172"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.8"
              />
              <circle
                cx="96"
                cy="172"
                r="8.5"
                fill="url(#cuteHandGrad)"
                stroke="#38bdf8"
                strokeWidth="1.5"
                className={styles.pawLeft}
              />

              {/* Right Typing Arm & Paw */}
              <path
                d="M 198 152 Q 194 172 184 172"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.8"
              />
              <circle
                cx="184"
                cy="172"
                r="8.5"
                fill="url(#cuteHandGrad)"
                stroke="#38bdf8"
                strokeWidth="1.5"
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
