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
      const saved = localStorage.getItem("focusforge_speech_lang") as SpeechLanguage;
      if (saved === "auto" || saved === "bn-BD" || saved === "en-US") return saved;
    }
    return "auto";
  });

  const recognitionRef = useRef<any>(null);
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
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

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        console.warn("[Voice] Web Speech API not supported; relying on AI audio fallback.");
        return;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        const resolveLang = (l: SpeechLanguage) => {
          if (l === "bn-BD") return "bn-BD";
          if (l === "en-US") return "en-US";
          // In "auto" mode, use bn-BD which recognizes Bengali script while capturing English words
          return "bn-BD";
        };

        recognition.lang = resolveLang(lang);

        recognition.onstart = () => {
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
              // 1. Immediately deliver newly finalized chunk with isFinal = true!
              // This permanently commits words to state so they NEVER disappear when pausing.
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

          // Live interim preview during active speaking
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
            console.warn("[Voice] Web Speech language not supported, attempting fallback");
            if (recognition.lang === "bn-BD") {
              recognition.lang = "bn-IN";
              try { recognition.start(); return; } catch {}
            } else if (recognition.lang === "bn-IN") {
              recognition.lang = typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";
              try { recognition.start(); return; } catch {}
            }
          }
          console.warn("[Voice] Web Speech notice:", err);
        };

        recognition.onend = () => {
          // CRITICAL PAUSE PROTECTION:
          // If the user paused speaking, Web Speech API ends the recognition session.
          // If there were any unfinalized interim words, commit them IMMEDIATELY so they don't vanish!
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

          // LONG VOICE TRACKING:
          // If the user hasn't clicked stop (still in listening mode), seamlessly restart in 60ms!
          // Previous text is preserved in accumulatedFinalRef and in component state.
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
        recognition.start();
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

      // 1. Start real-time speech recognition for live typing
      spawnSpeechRecognition(targetLang);

      // 2. Parallel audio recording for auto-language AI verification (English vs Bengali)
      try {
        if (!streamRef.current && navigator.mediaDevices) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        console.warn("[Voice] MediaRecorder init notice:", err?.message || err);
      }
    },
    [spawnSpeechRecognition]
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

    // 3. AI Audio Verification for True Multilingual Auto-Detection (Bangla vs English):
    // Gemini 3.6 Flash listens to the actual recorded audio.
    // If the user spoke English, it returns English. If Bengali, Bengali script!
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setIsTranscribing(true);

      const audioPromise = new Promise<Blob>((resolve) => {
        const recorder = mediaRecorderRef.current!;
        recorder.onstop = () => {
          let mime = recorder.mimeType || "audio/webm";
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
        if (audioBlob && audioBlob.size > 150) {
          const aiText = await transcribeAudioBlob(audioBlob, "auto");
          if (aiText && aiText.trim()) {
            const finalAiText = aiText.trim();
            accumulatedFinalRef.current = finalAiText;
            setTranscript(finalAiText);

            // If Web Speech didn't deliver any chunks (e.g. mobile unsupported), deliver Gemini text directly:
            if (chunksDeliveredRef.current === 0 && onResultRef.current) {
              onResultRef.current(finalAiText, true);
            } else if (onResultRef.current) {
              // Inform component of full AI refined text (e.g. converting English phonetic transliterations to clean English):
              onResultRef.current(finalAiText, true, true);
            }

            cleanupAll();
            return finalAiText;
          }
        }
      } catch (aiErr: any) {
        console.warn("[Voice] AI auto-transcribe fallback notice:", aiErr?.message || aiErr);
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
