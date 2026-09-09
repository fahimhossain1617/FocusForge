"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Mic, MicOff, Square, AlertCircle } from "lucide-react";
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
  const [accumulatedText, setAccumulatedText] = useState("");
  const { state } = useAppContext();
  const { lang } = useTranslation();
  const activeTheme = themeMode || (state?.theme?.mode === "light" ? "light" : "dark");
  const isLight = activeTheme === "light";

  const latestSpeechTextRef = useRef("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Real-time audio analyzer for 60fps canvas visualizer
  const {
    smoothedAmplitudeRef,
    error: audioError,
    retry: retryAudio,
  } = useAudioAnalyzer(isOpen);

  // Speech recognition for converting speech to text
  const handleSpeechResultChunk = useCallback(
    (chunk: string, isFinal: boolean, isFullReplacement?: boolean) => {
      if (isFullReplacement && chunk) {
        setAccumulatedText(chunk.trim());
        latestSpeechTextRef.current = chunk.trim();
        return;
      }

      if (isFinal && chunk && chunk.trim()) {
        setAccumulatedText((prev) => {
          const trimmedChunk = chunk.trim();
          const needsSpace = prev.length > 0 && !prev.endsWith(" ") && !prev.endsWith("\n");
          const next = prev + (needsSpace ? " " : "") + trimmedChunk;
          latestSpeechTextRef.current = next;
          return next;
        });
      }
    },
    []
  );

  const {
    isListening,
    isTranscribing,
    transcript,
    interimText,
    speechLanguage,
    setSpeechLanguage,
    error: speechError,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onResult: handleSpeechResultChunk,
  });

  const startListeningRef = useRef(startListening);
  const stopListeningRef = useRef(stopListening);
  useEffect(() => {
    startListeningRef.current = startListening;
    stopListeningRef.current = stopListening;
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

  // Manage start/stop lifecycle with modal visibility
  useEffect(() => {
    if (isOpen) {
      latestSpeechTextRef.current = "";
      setAccumulatedText("");
      const initialLang = language === "bn" ? "bn-BD" : language === "en" ? "en-US" : "auto";
      setSpeechLanguage(initialLang);
      startListeningRef.current(initialLang, { reset: true });
    }
  }, [isOpen]);

  // Handle manual close / stop: finalizes full speech (supports arbitrarily long speaking sessions)
  const handleManualClose = useCallback(async () => {
    const aiResult = await stopListeningRef.current();
    const finalText = (aiResult || latestSpeechTextRef.current || accumulatedText).trim();
    if (finalText && onSpeechResult) {
      onSpeechResult(finalText);
    }
    onClose();
  }, [accumulatedText, onClose, onSpeechResult]);

  // Auto-scroll transcript smoothly as text builds up without showing scrollbars
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [accumulatedText, interimText]);

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

  const liveInterim = interimText.trim();
  const displayedText = (
    accumulatedText + (liveInterim ? ((accumulatedText && !accumulatedText.endsWith(" ")) ? " " : "") + liveInterim : "")
  ).trim();

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
            <Mic className="w-4 h-4 inline-block mr-1.5 animate-pulse" />ভয়েস প্রসেস হচ্ছে (AI Transcribing)...
          </div>
        ) : displayedText ? (
          <div className={styles.liveTranscript} ref={transcriptScrollRef} aria-live="polite">
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
            {speechLanguage === "bn-BD"
              ? "বাংলায় কথা বলুন..."
              : speechLanguage === "en-US"
              ? "Speak in English..."
              : "বাংলা বা ইংরেজিতে কথা বলুন (Auto)..."}
          </div>
        )}

        {/* Auto / Bangla / English Mode Selector */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10, zIndex: 10 }}>
          <button
            type="button"
            onClick={() => setSpeechLanguage('auto')}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: speechLanguage === 'auto' ? 600 : 400,
              borderRadius: '20px',
              background: speechLanguage === 'auto' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.08)',
              border: speechLanguage === 'auto' ? '1px solid rgba(59, 130, 246, 0.6)' : '1px solid rgba(255, 255, 255, 0.12)',
              color: speechLanguage === 'auto' ? '#60a5fa' : 'inherit',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            🌐 Auto
          </button>
          <button
            type="button"
            onClick={() => setSpeechLanguage('bn-BD')}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: speechLanguage === 'bn-BD' ? 600 : 400,
              borderRadius: '20px',
              background: speechLanguage === 'bn-BD' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.08)',
              border: speechLanguage === 'bn-BD' ? '1px solid rgba(59, 130, 246, 0.6)' : '1px solid rgba(255, 255, 255, 0.12)',
              color: speechLanguage === 'bn-BD' ? '#60a5fa' : 'inherit',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            🇧🇩 বাংলা
          </button>
          <button
            type="button"
            onClick={() => setSpeechLanguage('en-US')}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: speechLanguage === 'en-US' ? 600 : 400,
              borderRadius: '20px',
              background: speechLanguage === 'en-US' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.08)',
              border: speechLanguage === 'en-US' ? '1px solid rgba(59, 130, 246, 0.6)' : '1px solid rgba(255, 255, 255, 0.12)',
              color: speechLanguage === 'en-US' ? '#60a5fa' : 'inherit',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            🇺🇸 English
          </button>
        </div>

        <div className={styles.voiceControlBox} role="toolbar" aria-label="Voice controls">
          <button
            type="button"
            className={`${styles.voiceActionButton} ${!isListening ? styles.pausedButton : ""}`}
            onClick={isListening ? stopListening : () => startListening(speechLanguage, { reset: false })}
            disabled={isTranscribing}
            aria-label={isListening ? "Pause microphone" : "Resume microphone"}
            title={isListening ? "Pause" : "Resume"}
          >
            <span className={isListening ? styles.pulseDot : styles.pausedDot} />
            {isListening ? <Mic size={14} /> : <MicOff size={14} />}
            <span>{isListening ? "শুনছি..." : "Paused"}</span>
          </button>

          <span className={styles.boxDivider} aria-hidden="true" />

          <button
            type="button"
            className={styles.stopVoiceButton}
            onClick={handleManualClose}
            disabled={isTranscribing}
            aria-label="Stop and turn off voice"
            title="Stop voice"
          >
            <Square size={11} className={styles.stopIcon} />
            <span>{isTranscribing ? "Processing..." : "ভয়েস শেষ"}</span>
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
