import { useState, useEffect, useRef, useCallback } from "react";
import { transcribeAudioBlob } from "@/services/aiAgentService";

export type SpeechLanguage = "bn-BD" | "en-US" | "auto";

interface UseSpeechRecognitionProps {
  onResult?: (text: string, isFinal: boolean, isFullReplacement?: boolean) => void;
  onInterimResult?: (text: string) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition({
  onResult,
  onInterimResult,
  onError,
}: UseSpeechRecognitionProps = {}) {
  const [isSupported, setIsSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [error, setErrorState] = useState<string | null>(null);
  const [speechLanguage, setSpeechLanguageState] = useState<SpeechLanguage>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("focusforge_speech_lang") as SpeechLanguage;
        if (saved === "auto" || saved === "bn-BD" || saved === "en-US") return saved;
      } catch {}
    }
    return "auto";
  });

  const recognitionRef = useRef<any>(null);
  const isRecognitionActiveRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const shouldListenRef = useRef(false);
  const restartTimerRef = useRef<any>(null);
  const accumulatedFinalRef = useRef("");
  const interimTextRef = useRef("");
  const currentLangRef = useRef<SpeechLanguage>("auto");
  const chunksDeliveredRef = useRef(0);

  const onResultRef = useRef(onResult);
  const onInterimResultRef = useRef(onInterimResult);
  const onErrorRef = useRef(onError);

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
    if (typeof window !== "undefined") {
      const hasSpeech = Boolean(
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      );
      const hasMedia = Boolean(
        navigator.mediaDevices && typeof MediaRecorder !== "undefined"
      );
      setIsSupported(hasSpeech || hasMedia);
    }
    return () => {
      cleanupAll();
    };
  }, []);

  const cleanupAll = useCallback(() => {
    shouldListenRef.current = false;
    isRecognitionActiveRef.current = false;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

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

    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {}
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      streamRef.current = null;
    }

    audioChunksRef.current = [];
  }, []);

  const handleError = useCallback((msg: string) => {
    setErrorState(msg);
    if (onErrorRef.current) onErrorRef.current(msg);
  }, []);

  const spawnSpeechRecognition = useCallback(
    (lang: SpeechLanguage = "auto") => {
      if (!shouldListenRef.current || typeof window === "undefined") return;

      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognitionClass) {
        return;
      }

      // If an existing instance is active, cleanly detach and abort
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
        isRecognitionActiveRef.current = false;
      }

      try {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        // Auto mode defaults to bn-BD which can recognize both Bengali and transliterated words
        const resolveLang = (l: SpeechLanguage) => {
          if (l === "bn-BD") return "bn-BD";
          if (l === "en-US") return "en-US";
          return "bn-BD";
        };

        recognition.lang = resolveLang(lang);

        recognition.onstart = () => {
          isRecognitionActiveRef.current = true;
          setIsListening(true);
          setErrorState(null);
        };

        recognition.onresult = (event: any) => {
          let sessionInterim = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i];
            const text = (res[0]?.transcript || "").trim();
            if (!text) continue;

            if (res.isFinal) {
              chunksDeliveredRef.current += 1;
              accumulatedFinalRef.current = [accumulatedFinalRef.current, text]
                .filter(Boolean)
                .join(" ")
                .trim();

              setTranscript(accumulatedFinalRef.current);
              interimTextRef.current = "";
              setInterimText("");

              if (onInterimResultRef.current) {
                onInterimResultRef.current("");
              }

              if (onResultRef.current) {
                onResultRef.current(text, true);
              }
            } else {
              sessionInterim = sessionInterim ? `${sessionInterim} ${text}` : text;
            }
          }

          if (sessionInterim) {
            interimTextRef.current = sessionInterim;
            setInterimText(sessionInterim);

            if (onInterimResultRef.current) {
              onInterimResultRef.current(sessionInterim);
            }
          }
        };

        recognition.onerror = (event: any) => {
          const err = event.error;
          if (err === "no-speech" || err === "aborted") {
            return;
          }
          if (err === "not-allowed" || err === "service-not-allowed") {
            handleError("Microphone access is unavailable. Please allow microphone permissions.");
            shouldListenRef.current = false;
            setIsListening(false);
            return;
          }
          if (err === "language-not-supported") {
            try {
              recognition.lang = "en-US";
              recognition.start();
              return;
            } catch {}
          }
        };

        recognition.onend = () => {
          isRecognitionActiveRef.current = false;

          // Commit any pending interim words
          const pending = interimTextRef.current.trim();
          if (pending) {
            chunksDeliveredRef.current += 1;
            accumulatedFinalRef.current = [accumulatedFinalRef.current, pending]
              .filter(Boolean)
              .join(" ")
              .trim();

            setTranscript(accumulatedFinalRef.current);
            interimTextRef.current = "";
            setInterimText("");

            if (onInterimResultRef.current) {
              onInterimResultRef.current("");
            }

            if (onResultRef.current) {
              onResultRef.current(pending, true);
            }
          }

          // Seamless restart loop if still in listening mode (continuous recording support)
          if (shouldListenRef.current) {
            if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
            restartTimerRef.current = setTimeout(() => {
              if (shouldListenRef.current) {
                spawnSpeechRecognition(lang);
              }
            }, 60);
          }
        };

        recognitionRef.current = recognition;

        try {
          recognition.start();
        } catch (startErr: any) {
          // If browser throws InvalidStateError, retry in a clean tick
          if (shouldListenRef.current) {
            setTimeout(() => {
              if (shouldListenRef.current) {
                try {
                  recognition.start();
                } catch {}
              }
            }, 100);
          }
        }
      } catch (err: any) {
        console.warn("[Voice] Speech recognition start notice:", err?.message || err);
      }
    },
    [handleError]
  );

  const setSpeechLanguage = useCallback(
    (newLang: SpeechLanguage) => {
      setSpeechLanguageState(newLang);
      currentLangRef.current = newLang;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("focusforge_speech_lang", newLang);
        } catch {}
      }
      if (shouldListenRef.current) {
        spawnSpeechRecognition(newLang);
      }
    },
    [spawnSpeechRecognition]
  );

  const cycleLanguage = useCallback(() => {
    const order: SpeechLanguage[] = ["auto", "bn-BD", "en-US"];
    const nextIdx = (order.indexOf(speechLanguage) + 1) % order.length;
    setSpeechLanguage(order[nextIdx]);
  }, [speechLanguage, setSpeechLanguage]);

  const startMediaRecorderFallback = useCallback(async () => {
    try {
      if (!streamRef.current && navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;
      }

      if (typeof MediaRecorder !== "undefined" && streamRef.current) {
        audioChunksRef.current = [];
        let mime = "audio/webm";
        if (typeof MediaRecorder.isTypeSupported === "function") {
          if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
            mime = "audio/webm;codecs=opus";
          } else if (MediaRecorder.isTypeSupported("audio/webm")) {
            mime = "audio/webm";
          } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
            mime = "audio/mp4";
          }
        }

        const recorder = new MediaRecorder(streamRef.current, { mimeType: mime });
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        recorder.start(300);
        mediaRecorderRef.current = recorder;
      }
    } catch (err: any) {
      console.warn("[Voice] MediaRecorder fallback notice:", err?.message || err);
      handleError("Microphone access is unavailable. Please allow microphone permissions.");
      shouldListenRef.current = false;
      setIsListening(false);
    }
  }, [handleError]);

  const startListening = useCallback(
    async (language?: SpeechLanguage, options?: { reset?: boolean }) => {
      const targetLang = language || speechLanguage || "auto";
      setErrorState(null);

      if (options?.reset !== false) {
        accumulatedFinalRef.current = "";
        interimTextRef.current = "";
        chunksDeliveredRef.current = 0;
        setTranscript("");
        setInterimText("");
        if (onInterimResultRef.current) onInterimResultRef.current("");
      }

      currentLangRef.current = targetLang;
      shouldListenRef.current = true;
      setIsListening(true);

      const hasSpeech = typeof window !== "undefined" && Boolean(
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      );

      // When Web Speech API is present (Android Chrome, iOS Safari 14.5+, Chrome Desktop, Edge):
      // Use it exclusively! Do NOT start a parallel MediaRecorder stream which steals exclusive mic focus on mobile devices.
      if (hasSpeech) {
        spawnSpeechRecognition(targetLang);
      } else {
        await startMediaRecorderFallback();
      }
    },
    [spawnSpeechRecognition, speechLanguage, startMediaRecorderFallback]
  );

  const stopListening = useCallback(async (): Promise<string> => {
    shouldListenRef.current = false;
    setIsListening(false);

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
    }

    // Commit any last pending interim text
    const pending = interimTextRef.current.trim();
    if (pending) {
      chunksDeliveredRef.current += 1;
      accumulatedFinalRef.current = [accumulatedFinalRef.current, pending]
        .filter(Boolean)
        .join(" ")
        .trim();

      setTranscript(accumulatedFinalRef.current);
      interimTextRef.current = "";
      setInterimText("");

      if (onInterimResultRef.current) {
        onInterimResultRef.current("");
      }

      if (onResultRef.current) {
        onResultRef.current(pending, true);
      }
    }

    const clientFinalText = accumulatedFinalRef.current.trim();

    // FAST-PATH: If real-time recognition captured words OR no MediaRecorder was used, return IMMEDIATELY!
    // No artificial 5-10 second waiting. The user experiences instantaneous responsiveness!
    if (clientFinalText.length > 0 || !mediaRecorderRef.current) {
      cleanupAll();
      return clientFinalText;
    }

    // FALLBACK-PATH: Only if client transcript is completely empty (e.g. browser without Web Speech API or silence)
    // do we attempt fast AI audio transcription
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setIsTranscribing(true);

      const audioPromise = new Promise<Blob>((resolve) => {
        const recorder = mediaRecorderRef.current!;
        const safetyTimer = setTimeout(() => resolve(new Blob([])), 1200);

        recorder.onstop = () => {
          clearTimeout(safetyTimer);
          const mime = recorder.mimeType || "audio/webm";
          const blob = new Blob(audioChunksRef.current, { type: mime });
          resolve(blob);
        };

        try {
          recorder.stop();
        } catch (e) {
          clearTimeout(safetyTimer);
          resolve(new Blob([]));
        }
      });

      try {
        const audioBlob = await audioPromise;
        if (audioBlob && audioBlob.size > 200) {
          const aiText = await transcribeAudioBlob(audioBlob, currentLangRef.current);
          if (aiText && aiText.trim()) {
            const finalAiText = aiText.trim();
            accumulatedFinalRef.current = finalAiText;
            setTranscript(finalAiText);

            if (onResultRef.current) {
              onResultRef.current(finalAiText, true);
            }

            cleanupAll();
            return finalAiText;
          }
        }
      } catch (aiErr: any) {
        console.warn("[Voice] AI fallback notice:", aiErr?.message || aiErr);
      } finally {
        setIsTranscribing(false);
        cleanupAll();
      }
    } else {
      cleanupAll();
    }

    return clientFinalText;
  }, [cleanupAll]);

  const abortListening = useCallback(() => {
    cleanupAll();
    setIsListening(false);
    setIsTranscribing(false);
    setInterimText("");
    interimTextRef.current = "";
    if (onInterimResultRef.current) onInterimResultRef.current("");
  }, [cleanupAll]);

  const resetTranscript = useCallback(() => {
    accumulatedFinalRef.current = "";
    interimTextRef.current = "";
    chunksDeliveredRef.current = 0;
    setTranscript("");
    setInterimText("");
    if (onInterimResultRef.current) onInterimResultRef.current("");
  }, []);

  return {
    isSupported,
    isListening,
    isTranscribing,
    transcript,
    interimText,
    error,
    speechLanguage,
    setSpeechLanguage,
    cycleLanguage,
    startListening,
    stopListening,
    abortListening,
    resetTranscript,
  };
}
