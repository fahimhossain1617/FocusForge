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
  const pastSessionsFinalRef = useRef("");
  const currentSessionFinalRef = useRef("");
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const currentLangRef = useRef<SpeechLanguage>("bn-BD");

  const interimTextRef = useRef("");

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
        let sessionFinal = "";
        let sessionInterim = "";

        // Iterate through all results in the current recognition session
        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = (res[0]?.transcript || "").trim();
          if (!text) continue;

          if (res.isFinal) {
            sessionFinal = sessionFinal ? `${sessionFinal} ${text}` : text;
          } else {
            sessionInterim = sessionInterim ? `${sessionInterim} ${text}` : text;
          }
        }

        currentSessionFinalRef.current = sessionFinal;
        interimTextRef.current = sessionInterim;

        // Combined finalized text across past sessions and current session
        const combinedFinal = [pastSessionsFinalRef.current, sessionFinal]
          .filter(Boolean)
          .join(" ")
          .trim();

        setTranscript(combinedFinal);
        setInterimText(sessionInterim);

        // Combined live text (final + interim) for real-time streaming
        const combinedLive = [combinedFinal, sessionInterim]
          .filter(Boolean)
          .join(" ")
          .trim();

        if (combinedLive && onResultRef.current) {
          onResultRef.current(combinedLive, Boolean(sessionFinal));
        }
      };

      recognition.onerror = (event: any) => {
        const err = event.error;
        // Non-fatal errors that occur routinely during pauses:
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

        if (err === "audio-capture") {
          console.warn("[SpeechRecognition] Audio capture notice, retrying in background...");
          if (shouldListenRef.current) {
            if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
            restartTimerRef.current = setTimeout(() => {
              if (shouldListenRef.current) {
                spawnAndStartRecognition();
              }
            }, 600);
          }
          return;
        }

        // Transient speech server network glitch: re-establish instance
        if (shouldListenRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (shouldListenRef.current) {
              spawnAndStartRecognition();
            }
          }, 450);
        }
      };

      recognition.onend = () => {
        // Commit any finalized text from this session to persistent past storage
        if (currentSessionFinalRef.current) {
          pastSessionsFinalRef.current = [pastSessionsFinalRef.current, currentSessionFinalRef.current]
            .filter(Boolean)
            .join(" ")
            .trim();
          currentSessionFinalRef.current = "";
        }

        if (shouldListenRef.current) {
          // Seamlessly restart for long speech
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (shouldListenRef.current) {
              spawnAndStartRecognition();
            }
          }, 150);
          return;
        }

        setIsListening(false);
        setInterimText("");
        interimTextRef.current = "";
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
        }, 300);
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
        pastSessionsFinalRef.current = "";
        currentSessionFinalRef.current = "";
        interimTextRef.current = "";
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

    // Merge session final and any pending interim before stopping
    if (currentSessionFinalRef.current) {
      pastSessionsFinalRef.current = [pastSessionsFinalRef.current, currentSessionFinalRef.current]
        .filter(Boolean)
        .join(" ")
        .trim();
      currentSessionFinalRef.current = "";
    }

    const pendingInterim = interimTextRef.current.trim();
    if (pendingInterim) {
      pastSessionsFinalRef.current = [pastSessionsFinalRef.current, pendingInterim]
        .filter(Boolean)
        .join(" ")
        .trim();
      interimTextRef.current = "";
    }

    setTranscript(pastSessionsFinalRef.current);
    if (pastSessionsFinalRef.current && onResultRef.current) {
      onResultRef.current(pastSessionsFinalRef.current, true);
    }

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
    interimTextRef.current = "";
    currentSessionFinalRef.current = "";
  }, [cleanupRecognition]);

  const resetTranscript = useCallback(() => {
    pastSessionsFinalRef.current = "";
    currentSessionFinalRef.current = "";
    interimTextRef.current = "";
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
