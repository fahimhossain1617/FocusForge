"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Mic, MicOff, Square, AlertCircle } from "lucide-react";
import { VoiceOrbCanvas } from "./VoiceOrbCanvas";
import { VoiceBottomArc } from "./VoiceBottomArc";
import { useAudioAnalyzer } from "./useAudioAnalyzer";
import { useSpeechRecognition, SpeechLanguage } from "@/hooks/useSpeechRecognition";
import { transcribeAudioBlob } from "@/services/aiAgentService";
import { useAppContext } from "@/context/AppContext";
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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { state } = useAppContext();
  const activeTheme = themeMode || (state?.theme?.mode === "light" ? "light" : "dark");
  const isLight = activeTheme === "light";

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const latestSpeechTextRef = useRef("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Real-time audio analyzer for 60fps canvas visualizer
  const {
    smoothedAmplitudeRef,
    error: audioError,
    retry: retryAudio,
    getMediaStream,
  } = useAudioAnalyzer(isOpen);

  // Speech recognition for converting speech to text
  const speechLang: SpeechLanguage = language === "en" ? "en-US" : "bn-BD";

  const {
    isListening,
    transcript,
    interimText,
    error: speechError,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onResult: (text, isFinal) => {
      latestSpeechTextRef.current = text;
      if (text && onSpeechResult) {
        onSpeechResult(text);
      }
    },
  });

  const startListeningRef = useRef(startListening);
  const stopListeningRef = useRef(stopListening);
  useEffect(() => {
    startListeningRef.current = startListening;
    stopListeningRef.current = stopListening;
  });

  // Lock background page from scrolling or showing scrollbars while modal is open
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
      startListeningRef.current(speechLang, { reset: true });
    } else {
      stopListeningRef.current();
    }

    return () => {
      stopListeningRef.current();
    };
  }, [isOpen, speechLang]);

  // Secondary audio recorder on the MediaStream for fallback Gemini transcription
  useEffect(() => {
    if (!isOpen) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      setIsTranscribing(false);
      return;
    }

    let intervalId: any;
    const initRecorder = () => {
      const stream = getMediaStream();
      if (stream && typeof MediaRecorder !== "undefined" && !mediaRecorderRef.current) {
        try {
          audioChunksRef.current = [];
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };
          recorder.start(250);
          mediaRecorderRef.current = recorder;
          if (intervalId) clearInterval(intervalId);
        } catch (e) {
          console.warn("[VoiceModal] MediaRecorder start warning:", e);
        }
      }
    };

    initRecorder();
    intervalId = setInterval(initRecorder, 300);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, getMediaStream]);

  // Gracefully finalize speech on close or stop button
  const handleFinishVoice = async () => {
    stopListening();

    const clientRecognized = (
      latestSpeechTextRef.current ||
      transcript ||
      interimText
    ).trim();

    if (clientRecognized) {
      if (onSpeechResult) onSpeechResult(clientRecognized);
      onClose();
      return;
    }

    // If Web Speech yielded no text (common on Android mic locks or offline devices):
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      setIsTranscribing(true);
      const audioPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const mime = recorder.mimeType || "audio/webm";
          const blob = new Blob(audioChunksRef.current, { type: mime });
          resolve(blob);
        };
        try {
          recorder.stop();
        } catch (e) {
          resolve(new Blob([]));
        }
      });

      try {
        const audioBlob = await audioPromise;
        if (audioBlob.size > 1500) {
          const transcribed = await transcribeAudioBlob(
            audioBlob,
            language === "en" ? "en" : "bn"
          );
          if (transcribed && onSpeechResult) {
            onSpeechResult(transcribed);
          }
        }
      } catch (err) {
        console.warn("[VoiceModal] Gemini Audio Fallback error:", err);
      } finally {
        setIsTranscribing(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Auto-scroll transcript smoothly as text builds up without showing ugly scrollbars
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcript, interimText]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleFinishVoice();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const hasError = Boolean(audioError || speechError);
  const errorMessage = audioError || speechError;

  const modalContent = (
    <div
      className={styles.voiceOverlay}
      data-theme={activeTheme}
      role="dialog"
      aria-modal="true"
      aria-label="Voice Assistant"
    >
      {/* Ambient background glows */}
      <div className={styles.ambientGlowLeft} />
      <div className={styles.ambientGlowRight} />

      {/* Top right minimalist close button */}
      <button
        type="button"
        className={styles.closeButton}
        onClick={handleFinishVoice}
        disabled={isTranscribing}
        aria-label="Close voice interaction"
      >
        <X size={20} />
      </button>

      {/* Central 3D AI Orb */}
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

      {/* Bottom curved glowing gradient horizon */}
      <VoiceBottomArc amplitudeRef={smoothedAmplitudeRef} isListening={isListening} isLight={isLight} />

      {/* Minimalist, uncluttered interaction controls */}
      <footer className={styles.bottomControls}>
        {/* Real-time speech display or transcription indicator */}
        {isTranscribing ? (
          <div className={styles.liveTranscript} style={{ opacity: 0.9, letterSpacing: '0.02em' }}>
            {language === "bn" ? "ভয়েস প্রসেস হচ্ছে (AI Transcribing)..." : "Transcribing speech with AI..."}
          </div>
        ) : (
          (transcript || interimText) && (
            <div className={styles.liveTranscript} ref={transcriptScrollRef} aria-live="polite">
              {transcript ? (interimText ? `${transcript} ${interimText}` : transcript) : interimText}
            </div>
          )
        )}

        {/* Compact glassmorphic box hosting the listening status and stop voice action */}
        <div className={styles.voiceControlBox} role="toolbar" aria-label="Voice controls">
          {/* Listening status / pause toggle button */}
          <button
            type="button"
            className={`${styles.voiceActionButton} ${!isListening ? styles.pausedButton : ""}`}
            onClick={isListening ? stopListening : () => startListening(speechLang, { reset: false })}
            disabled={isTranscribing}
            aria-label={isListening ? "Pause microphone" : "Resume microphone"}
            title={isListening ? (language === "bn" ? "পজ করুন" : "Pause") : (language === "bn" ? "শুরু করুন" : "Resume")}
          >
            <span className={isListening ? styles.pulseDot : styles.pausedDot} />
            {isListening ? <Mic size={14} /> : <MicOff size={14} />}
            <span>{isListening ? (language === "bn" ? "শুনছি..." : "Listening...") : (language === "bn" ? "পজ করা" : "Paused")}</span>
          </button>

          <span className={styles.boxDivider} aria-hidden="true" />

          {/* Stop / Turn off voice button */}
          <button
            type="button"
            className={styles.stopVoiceButton}
            onClick={handleFinishVoice}
            disabled={isTranscribing}
            aria-label="Stop and turn off voice"
            title={language === "bn" ? "ভয়েস বন্ধ করুন" : "Stop voice"}
          >
            <Square size={11} className={styles.stopIcon} />
            <span>{language === "bn" ? (isTranscribing ? "প্রসেসিং..." : "ভয়েস বন্ধ") : (isTranscribing ? "Processing..." : "Stop")}</span>
          </button>
        </div>
      </footer>

      {/* Error state if microphone permission fails */}
      {hasError && (
        <div className={styles.errorCard} role="alert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => {
              retryAudio();
              startListening(speechLang);
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
