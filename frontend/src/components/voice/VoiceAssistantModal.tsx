"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Mic, MicOff, Square, AlertCircle, Play, Pause } from "lucide-react";
import { VoiceOrbCanvas } from "./VoiceOrbCanvas";
import { VoiceBottomArc } from "./VoiceBottomArc";
import { useAudioAnalyzer } from "./useAudioAnalyzer";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useAppContext } from "@/context/AppContext";
import { useTranslation } from "@/hooks/useTranslation";
import styles from "./voice-assistant.module.css";

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpeechResult?: (text: string) => void;
  language?: "bn" | "en" | "auto";
  themeMode?: "light" | "dark";
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onSpeechResult,
  language = "auto",
  themeMode,
}) => {
  const [mounted, setMounted] = useState(false);
  const { state, showToast, isOnline } = useAppContext();
  const { lang } = useTranslation();
  const activeTheme = themeMode || (state?.theme?.mode === "light" ? "light" : "dark");
  const isLight = activeTheme === "light";

  const onSpeechResultRef = useRef(onSpeechResult);
  useEffect(() => {
    onSpeechResultRef.current = onSpeechResult;
  }, [onSpeechResult]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    isListening,
    isPaused,
    isRecovering,
    isTranscribing,
    transcript,
    interimText,
    fullLiveText,
    mediaStream,
    speechLanguage,
    setSpeechLanguage,
    error: speechError,
    startListening,
    pauseListening,
    resumeListening,
    stopListening,
    abortListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Real-time audio analyzer for 60fps canvas visualizer using shared mediaStream
  const {
    smoothedAmplitudeRef,
    error: audioError,
    retry: retryAudio,
  } = useAudioAnalyzer(
    isOpen && isOnline && isListening,
    Boolean(fullLiveText.trim()),
    mediaStream
  );

  const startListeningRef = useRef(startListening);
  const stopListeningRef = useRef(stopListening);
  const abortListeningRef = useRef(abortListening);
  const resetTranscriptRef = useRef(resetTranscript);

  useEffect(() => {
    startListeningRef.current = startListening;
    stopListeningRef.current = stopListening;
    abortListeningRef.current = abortListening;
    resetTranscriptRef.current = resetTranscript;
  });

  // Lock background page from scrolling while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Manage start/stop lifecycle with modal visibility & offline guard
  useEffect(() => {
    if (isOpen) {
      if (!isOnline) {
        showToast(
          lang === "bn"
            ? "আপনি বর্তমানে অফলাইনে আছেন।"
            : "You are currently offline.",
          "error"
        );
        onClose();
        return;
      }

      resetTranscriptRef.current();
      setSpeechLanguage("auto");
      startListeningRef.current("auto", { reset: true });
    } else {
      abortListeningRef.current();
    }
    return () => {
      abortListeningRef.current();
    };
  }, [isOpen, isOnline, onClose, showToast, lang, setSpeechLanguage]);

  // Handle manual close / stop: finalizes full speech safely
  const handleManualClose = useCallback(async () => {
    const finalAccumulated = await stopListeningRef.current();
    const cleanFinal = (finalAccumulated || fullLiveText).trim();
    if (cleanFinal && onSpeechResultRef.current) {
      onSpeechResultRef.current(cleanFinal);
    }
    onClose();
  }, [fullLiveText, onClose]);

  // Smart auto-scroll transcript smoothly as text builds up without aggressively locking upward scrolling
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef(false);

  const handleScroll = useCallback(() => {
    const el = transcriptScrollRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // If distance from bottom is greater than 50px, consider user scrolled up
    isUserScrolledUpRef.current = distanceToBottom > 50;
  }, []);

  useEffect(() => {
    const el = transcriptScrollRef.current;
    if (!el) return;
    if (!isUserScrolledUpRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [fullLiveText]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleManualClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleManualClose]);

  if (!isOpen || !mounted) return null;

  const hasError = Boolean(audioError || speechError);
  const errorMessage = audioError || speechError;

  const displayedText = fullLiveText.trim();

  const handleMicToggle = () => {
    if (isListening) {
      pauseListening();
    } else if (isPaused) {
      resumeListening();
    } else {
      startListening("auto", { reset: false });
    }
  };

  const modalContent = (
    <div
      className={styles.voiceOverlay}
      data-theme={activeTheme}
      role="dialog"
      aria-modal="true"
      aria-label="Voice Assistant"
    >
      <div className={styles.ambientGlowLeft} />
      <div className={styles.ambientGlowRight} />

      <div style={{ position: "absolute", top: 20, right: 24, zIndex: 30 }}>
        <button
          type="button"
          className={styles.closeButton}
          onClick={handleManualClose}
          disabled={isTranscribing}
          aria-label="Close voice interaction"
        >
          <X size={20} />
        </button>
      </div>

      <main className={styles.orbStage}>
        <div className={styles.orbCanvasWrapper}>
          <VoiceOrbCanvas
            amplitudeRef={smoothedAmplitudeRef}
            isListening={isListening}
            isSpeaking={false}
            isThinking={isTranscribing}
            isLight={isLight}
          />
        </div>
      </main>

      <VoiceBottomArc amplitudeRef={smoothedAmplitudeRef} isListening={isListening} isLight={isLight} />

      <footer className={styles.bottomControls}>
        {isTranscribing ? (
          <div className={styles.liveTranscript} style={{ opacity: 0.95, letterSpacing: '0.02em', color: '#60a5fa' }}>
            <Mic className="w-4 h-4 inline-block mr-1.5 animate-pulse" />
            {lang === "bn" ? "ভয়েস প্রসেস হচ্ছে..." : "Finishing transcript..."}
          </div>
        ) : displayedText ? (
          <div
            className={styles.liveTranscript}
            ref={transcriptScrollRef}
            onScroll={handleScroll}
            aria-live="polite"
          >
            {displayedText}
            {isListening && (
              <span
                style={{
                  display: "inline-block",
                  width: "2px",
                  height: "1em",
                  backgroundColor: "#60a5fa",
                  marginLeft: "4px",
                  verticalAlign: "middle",
                  animation: "pulse 0.8s ease-in-out infinite",
                }}
              />
            )}
          </div>
        ) : (
          <div className={`${styles.liveTranscript} ${styles.listeningStateText}`}>
            <Mic className="w-4 h-4 inline-block mr-1.5 animate-pulse" />
            {lang === "bn"
              ? "বাংলা বা ইংরেজিতে কথা বলুন (অটো ডিটেকশন)..."
              : "Speak naturally in Bengali or English (Auto)..."}
          </div>
        )}

        <div className={styles.voiceControlBox} role="toolbar" aria-label="Voice controls">
          <button
            type="button"
            className={`${styles.voiceActionButton} ${!isListening ? styles.pausedButton : ""}`}
            onClick={handleMicToggle}
            disabled={isTranscribing}
            aria-label={isListening ? "Pause dictation" : "Resume dictation"}
            title={isListening ? "Pause" : "Resume"}
          >
            <span className={isListening ? styles.pulseDot : styles.pausedDot} />
            {isListening ? <Pause size={13} /> : <Play size={13} />}
            <span>
              {isListening
                ? (isRecovering ? (lang === "bn" ? "সংযোগ..." : "Reconnecting...") : (lang === "bn" ? "শুনছি..." : "Listening..."))
                : (lang === "bn" ? "বিরতি (Paused)" : "Paused")}
            </span>
          </button>

          <span className={styles.boxDivider} aria-hidden="true" />

          <button
            type="button"
            className={styles.stopVoiceButton}
            onClick={handleManualClose}
            disabled={isTranscribing}
            aria-label="Stop and save voice text"
            title="Stop voice"
          >
            <Square size={11} className={styles.stopIcon} />
            <span>{isTranscribing ? (lang === "bn" ? "শেষ হচ্ছে..." : "Finishing...") : (lang === "bn" ? "ভয়েস শেষ" : "Done")}</span>
          </button>
        </div>
      </footer>

      {hasError && (
        <div className={styles.errorCard} role="alert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => {
              retryAudio();
              startListening("auto");
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};
