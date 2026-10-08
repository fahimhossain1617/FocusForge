import { useState, useEffect, useRef, useCallback } from "react";
import {
  VoiceSessionManager,
  VoiceState,
  SupportedSpeechLang,
} from "@/services/voice/voiceSessionManager";

export type SpeechLanguage = "bn-BD" | "en-US" | "auto" | "bn" | "en";

interface UseSpeechRecognitionProps {
  onResult?: (text: string, isFinal: boolean, isFullReplacement?: boolean) => void;
  onInterimResult?: (text: string) => void;
  onError?: (error: string) => void;
  onStateChange?: (state: VoiceState) => void;
  language?: SpeechLanguage;
}

function readSavedSpeechLanguage(fallback: SpeechLanguage = "bn-BD"): SpeechLanguage {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = localStorage.getItem("focusforge_speech_lang") as SpeechLanguage | null;
    if (saved === "bn-BD" || saved === "en-US" || saved === "bn" || saved === "en") {
      return saved;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

export function useSpeechRecognition({
  onResult,
  onInterimResult,
  onError,
  onStateChange,
  language: initialLanguage,
}: UseSpeechRecognitionProps = {}) {
  const [isSupported, setIsSupported] = useState(true);
  const [voiceState, setVoiceState] = useState<VoiceState>("IDLE");
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [error, setErrorState] = useState<string | null>(null);

  const [speechLanguage, setSpeechLanguageState] = useState<SpeechLanguage>(() => {
    if (initialLanguage) return initialLanguage;
    return readSavedSpeechLanguage("bn-BD");
  });

  const sessionManagerRef = useRef<VoiceSessionManager | null>(null);

  const onResultRef = useRef(onResult);
  const onInterimResultRef = useRef(onInterimResult);
  const onErrorRef = useRef(onError);
  const onStateChangeRef = useRef(onStateChange);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onInterimResultRef.current = onInterimResult;
  }, [onInterimResult]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    const manager = new VoiceSessionManager({
      onFinalCommit: (fullFinal, newChunk) => {
        setTranscript(fullFinal);
        setInterimText("");
        onResultRef.current?.(newChunk, true, false);
      },
      onInterimChange: (interim) => {
        setInterimText(interim);
        onInterimResultRef.current?.(interim);
      },
      onStateChange: (newState) => {
        setVoiceState(newState);
        onStateChangeRef.current?.(newState);
      },
      onError: (errMsg) => {
        setErrorState(errMsg);
        onErrorRef.current?.(errMsg);
      },
    });

    sessionManagerRef.current = manager;
    setIsSupported(manager.isBrowserSupported());

    return () => {
      manager.destroy();
      sessionManagerRef.current = null;
    };
  }, []);

  const setSpeechLanguage = useCallback((newLang: SpeechLanguage) => {
    setSpeechLanguageState(newLang);
    sessionManagerRef.current?.setLanguage(newLang as SupportedSpeechLang);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("focusforge_speech_lang", newLang);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const cycleLanguage = useCallback(() => {
    const order: SpeechLanguage[] = ["auto", "bn-BD", "en-US"];
    const nextIdx = (order.indexOf(speechLanguage) + 1) % order.length;
    setSpeechLanguage(order[nextIdx]);
  }, [speechLanguage, setSpeechLanguage]);

  const startListening = useCallback(
    async (lang?: SpeechLanguage, options?: { reset?: boolean }) => {
      setErrorState(null);
      const targetLang = lang || speechLanguage || "auto";

      if (options?.reset !== false) {
        setTranscript("");
        setInterimText("");
      }

      await sessionManagerRef.current?.start({
        language: targetLang as SupportedSpeechLang,
        baseText: options?.reset !== false ? "" : transcript,
      });
    },
    [speechLanguage, transcript]
  );

  const pauseListening = useCallback(async () => {
    return await sessionManagerRef.current?.pause();
  }, []);

  const resumeListening = useCallback(async () => {
    await sessionManagerRef.current?.resume(transcript);
  }, [transcript]);

  const stopListening = useCallback(async (): Promise<string> => {
    if (sessionManagerRef.current) {
      const fullText = await sessionManagerRef.current.stop();
      setTranscript(fullText);
      setInterimText("");
      return fullText;
    }
    return transcript;
  }, [transcript]);

  const abortListening = useCallback(() => {
    sessionManagerRef.current?.abort();
    setInterimText("");
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimText("");
    sessionManagerRef.current?.setManualBaseText("");
  }, []);

  const isListening = voiceState === "RECORDING" || voiceState === "STOPPING" || voiceState === "FINALIZING";
  const isPaused = voiceState === "PAUSED";
  const isRecovering = false;
  const isTranscribing = voiceState === "STOPPING" || voiceState === "FINALIZING";
  const isVoiceGlowActive = isListening;

  const fullLiveText = (
    transcript +
    (interimText ? (transcript && !transcript.endsWith(" ") ? " " : "") + interimText : "")
  ).trim();

  return {
    isSupported,
    isListening,
    isPaused,
    isRecovering,
    isTranscribing,
    isVoiceGlowActive,
    voiceState,
    transcript,
    interimText,
    fullLiveText,
    mediaStream: null,
    error,
    speechLanguage,
    setSpeechLanguage,
    cycleLanguage,
    startListening,
    pauseListening,
    resumeListening,
    stopListening,
    abortListening,
    resetTranscript,
    clearVoiceBuffersSilent: resetTranscript,
  };
}

