import { useState, useEffect, useRef, useCallback } from "react";

// Extend Window interface for webkitSpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export type SpeechLanguage = "bn-BD" | "en-US";

interface UseSpeechRecognitionProps {
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition({ onResult, onError }: UseSpeechRecognitionProps = {}) {
  const [isSupported, setIsSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [error, setErrorState] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const restartTimerRef = useRef<any>(null);
  const accumulatedTranscriptRef = useRef("");
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const currentLangRef = useRef<SpeechLanguage>("bn-BD");

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const handleError = useCallback((msg: string) => {
    setErrorState(msg);
    if (onErrorRef.current) onErrorRef.current(msg);
  }, []);

  const cleanupRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
  }, []);

  const spawnAndStartRecognition = useCallback(() => {
    if (!shouldListenRef.current) return;
    if (typeof window === "undefined") return;

    cleanupRecognition();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      handleError("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = currentLangRef.current;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorState(null);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0]?.transcript || "";
          if (res.isFinal) {
            finalChunk += text;
          } else {
            currentInterim += text;
          }
        }

        if (finalChunk.trim()) {
          const cleaned = finalChunk.trim();
          accumulatedTranscriptRef.current = accumulatedTranscriptRef.current
            ? `${accumulatedTranscriptRef.current} ${cleaned}`
            : cleaned;
          setTranscript(accumulatedTranscriptRef.current);
          if (onResultRef.current) {
            onResultRef.current(accumulatedTranscriptRef.current, true);
          }
        }

        setInterimText(currentInterim);
      };

      recognition.onerror = (event: any) => {
        const err = event.error;
        // Non-fatal errors that occur routinely during long continuous sessions or pauses:
        if (err === "no-speech" || err === "aborted") {
          return;
        }

        if (err === "not-allowed" || err === "service-not-allowed") {
          handleError("Microphone access is unavailable. Please allow microphone permissions.");
          shouldListenRef.current = false;
          setIsListening(false);
          cleanupRecognition();
          return;
        }

        // Transient speech server network glitch or notice: re-establish fresh instance
        if (shouldListenRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (shouldListenRef.current) {
              spawnAndStartRecognition();
            }
          }, 350);
        }
      };

      recognition.onend = () => {
        // If user hasn't explicitly stopped listening, immediately spawn a fresh instance for unlimited speech
        if (shouldListenRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (shouldListenRef.current) {
              spawnAndStartRecognition();
            }
          }, 40);
          return;
        }
        setIsListening(false);
        setInterimText("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      if (shouldListenRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (shouldListenRef.current) {
            spawnAndStartRecognition();
          }
        }, 150);
      }
    }
  }, [cleanupRecognition, handleError]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
      }
    }

    return () => {
      shouldListenRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      cleanupRecognition();
    };
  }, [cleanupRecognition]);

  const startListening = useCallback(
    (language: SpeechLanguage = "bn-BD", options?: { reset?: boolean }) => {
      setErrorState(null);
      if (options?.reset !== false) {
        accumulatedTranscriptRef.current = "";
        setTranscript("");
        setInterimText("");
      }
      currentLangRef.current = language;
      shouldListenRef.current = true;
      spawnAndStartRecognition();
    },
    [spawnAndStartRecognition]
  );

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    cleanupRecognition();
    setIsListening(false);
    setInterimText("");
  }, [cleanupRecognition]);

  const abortListening = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    cleanupRecognition();
    setIsListening(false);
    setInterimText("");
  }, [cleanupRecognition]);

  const resetTranscript = useCallback(() => {
    accumulatedTranscriptRef.current = "";
    setTranscript("");
    setInterimText("");
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimText,
    error,
    startListening,
    stopListening,
    abortListening,
    resetTranscript,
  };
}
