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
  captureAudioStream?: boolean;
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
  captureAudioStream = false,
}: UseSpeechRecognitionProps = {}) {
  const [isSupported, setIsSupported] = useState(true);
  const [voiceState, setVoiceState] = useState<VoiceState>("IDLE");
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [error, setErrorState] = useState<string | null>(null);

  const [speechLanguage, setSpeechLanguageState] = useState<SpeechLanguage>(() => {
    if (initialLanguage) return initialLanguage;
    return readSavedSpeechLanguage("bn-BD");
  });

  const sessionManagerRef = useRef<VoiceSessionManager | null>(null);
  const captureAudioStreamRef = useRef(captureAudioStream);
  captureAudioStreamRef.current = captureAudioStream;

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

  // Construct the manager once, outside render-driven recreation.
  // Callbacks always read latest refs so editor setState does not rebuild recognition.
  useEffect(() => {
    const manager = new VoiceSessionManager({
      onFinalResult: (fullFinal, newChunk) => {
        setTranscript(fullFinal);
        setInterimText("");
        onResultRef.current?.(newChunk, true, false);
      },
      onInterimResult: (interim) => {
        setInterimText(interim);
        onInterimResultRef.current?.(interim);
      },
      onStateChange: (newState) => {
        setVoiceState(newState);
        setMediaStream(manager.getMediaStream());
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
    sessionManagerRef.current?.setLanguage(newLang);
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
        reset: options?.reset !== false,
        captureAudioStream: captureAudioStreamRef.current,
      });
      setMediaStream(sessionManagerRef.current?.getMediaStream() ?? null);
    },
    [speechLanguage]
  );

  const pauseListening = useCallback(() => {
    sessionManagerRef.current?.pause();
  }, []);

  const resumeListening = useCallback(async () => {
    await sessionManagerRef.current?.resume();
    setMediaStream(sessionManagerRef.current?.getMediaStream() ?? null);
  }, []);

  const stopListening = useCallback(async (): Promise<string> => {
    if (sessionManagerRef.current) {
      const fullText = await sessionManagerRef.current.stop();
      setTranscript(fullText);
      setInterimText("");
      setMediaStream(null);
      return fullText;
    }
    return transcript;
  }, [transcript]);

  const abortListening = useCallback(() => {
    sessionManagerRef.current?.abort();
    setInterimText("");
    setMediaStream(null);
  }, []);

  const resetTranscript = useCallback(() => {
    sessionManagerRef.current?.resetTranscript();
    setTranscript("");
    setInterimText("");
  }, []);

  const clearVoiceBuffersSilent = useCallback(() => {
    sessionManagerRef.current?.clearVoiceBuffersSilent();
    setTranscript("");
    setInterimText("");
  }, []);

  const isListening = voiceState === "LISTENING" || voiceState === "RECOVERING";
  const isPaused = voiceState === "PAUSED";
  const isRecovering = voiceState === "RECOVERING";
  const isTranscribing = voiceState === "STOPPING";
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
    mediaStream,
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
    clearVoiceBuffersSilent,
  };
}
