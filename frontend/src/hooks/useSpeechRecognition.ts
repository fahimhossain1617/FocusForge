import { useState, useEffect, useRef, useCallback } from "react";
import { transcribeAudioBlob } from "@/services/aiAgentService";

export type SpeechLanguage = "bn-BD" | "en-US" | "auto" | "bn" | "en";

interface UseSpeechRecognitionProps {
  onResult?: (text: string, isFinal: boolean, isFullReplacement?: boolean) => void;
  onInterimResult?: (text: string) => void;
  onError?: (error: string) => void;
}

/**
 * Normalizes numbers, percentages, and common speech patterns.
 * e.g., "৫০ শতাংশ" / "৫০ পার্সেন্ট" -> "৫০%", "25 percent" -> "25%"
 */
function normalizeText(text: string): string {
  if (!text) return "";
  let clean = text;

  // Bengali percentages: ৫০ শতাংশ / ৫০ পার্সেন্ট / ৫০ পারসেন্ট -> ৫০%
  clean = clean.replace(/([\d\u09E6-\u09EF]+)\s*(?:শতাংশ|পার্সেন্ট|পারসেন্ট|ভাগ)/gu, "$1%");

  // English percentages: 25 percent / 25 % -> 25%
  clean = clean.replace(/(\d+)\s*(?:percent|%)\b/gi, "$1%");

  // Collapse multiple whitespace
  clean = clean.replace(/\s+/g, " ").trim();

  return clean;
}

/**
 * Cleans immediate word stutter from audio packet jitter (e.g. "I I want" -> "I want").
 */
function removeStutterDuplicates(text: string): string {
  if (!text) return "";
  const words = text.split(/\s+/);
  const result: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const cur = words[i];
    const prev = result[result.length - 1];
    if (prev && cur.length >= 2 && cur.toLowerCase() === prev.toLowerCase()) {
      continue;
    }
    result.push(cur);
  }

  return result.join(" ");
}

/**
 * Intelligently stitches new finalized speech chunk onto previously accumulated speech.
 * Eliminates duplicate overlapping words caused by streaming segment boundaries.
 */
function stitchTranscripts(
  previous: string,
  incoming: string
): { merged: string; newChunk: string } {
  const prev = (previous || "").trim();
  const next = normalizeText(removeStutterDuplicates(incoming || "")).trim();

  if (!prev) return { merged: next, newChunk: next };
  if (!next) return { merged: prev, newChunk: "" };

  // If next is already completely identical or contained at the tail of prev, reject duplicate
  if (prev.endsWith(next) || prev === next) {
    return { merged: prev, newChunk: "" };
  }

  const prevWords = prev.split(/\s+/);
  const nextWords = next.split(/\s+/);

  const clean = (w: string) =>
    w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

  // Check for word overlap of 1 to up to 12 words between the tail of prev and head of next
  const maxOverlap = Math.min(prevWords.length, nextWords.length, 12);
  let overlapCount = 0;

  for (let k = maxOverlap; k >= 1; k--) {
    const prevSlice = prevWords.slice(prevWords.length - k);
    const nextSlice = nextWords.slice(0, k);

    let match = true;
    for (let i = 0; i < k; i++) {
      if (clean(prevSlice[i]) !== clean(nextSlice[i])) {
        match = false;
        break;
      }
    }

    if (match) {
      overlapCount = k;
      break;
    }
  }

  const remainingWords = nextWords.slice(overlapCount);
  if (remainingWords.length === 0) {
    return { merged: prev, newChunk: "" };
  }

  const newChunk = remainingWords.join(" ");
  const merged = `${prev} ${newChunk}`.trim();
  return { merged, newChunk };
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
        if (saved === "auto" || saved === "bn-BD" || saved === "en-US" || saved === "bn" || saved === "en") return saved;
      } catch {}
    }
    return "auto";
  });

  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const isExplicitStopRef = useRef(false);

  const accumulatedFinalRef = useRef("");
  const interimTextRef = useRef("");
  const targetLangRef = useRef<string>("bn");

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
      const hasMedia = Boolean(navigator.mediaDevices && typeof MediaRecorder !== "undefined");
      const hasWebSpeech = Boolean(
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      );
      setIsSupported(hasMedia || hasWebSpeech);
    }
    return () => {
      cleanupAll();
    };
  }, []);

  const cleanupAll = useCallback(() => {
    isListeningRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
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

    setMediaStream(null);
    setIsListening(false);
    setIsTranscribing(false);
  }, []);

  const handleError = useCallback((msg: string) => {
    setErrorState(msg);
    if (onErrorRef.current) onErrorRef.current(msg);
    cleanupAll();
  }, [cleanupAll]);

  const setSpeechLanguage = useCallback((newLang: SpeechLanguage) => {
    setSpeechLanguageState(newLang);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("focusforge_speech_lang", newLang);
      } catch {}
    }
  }, []);

  const cycleLanguage = useCallback(() => {
    const order: SpeechLanguage[] = ["auto", "bn-BD", "en-US"];
    const nextIdx = (order.indexOf(speechLanguage) + 1) % order.length;
    setSpeechLanguage(order[nextIdx]);
  }, [speechLanguage, setSpeechLanguage]);

  const startListening = useCallback(
    async (language?: SpeechLanguage, options?: { reset?: boolean }) => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        handleError("You are currently offline. Voice recognition requires an active internet connection.");
        return;
      }

      const rawLang = language || speechLanguage || "auto";
      const targetLang =
        rawLang === "bn-BD" || rawLang === "bn"
          ? "bn"
          : rawLang === "en-US" || rawLang === "en"
          ? "en"
          : "auto";

      targetLangRef.current = targetLang;
      setErrorState(null);
      isExplicitStopRef.current = false;

      if (options?.reset !== false) {
        accumulatedFinalRef.current = "";
        interimTextRef.current = "";
        setTranscript("");
        setInterimText("");
        if (onInterimResultRef.current) onInterimResultRef.current("");
      }

      try {
        // 1. Acquire microphone MediaStream for visualizer orb & audio recording
        let stream = streamRef.current;
        if (!stream || !stream.active || stream.getAudioTracks().length === 0) {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
              sampleRate: 48000,
            },
          });
          streamRef.current = stream;
          setMediaStream(stream);
        }

        const audioTracks = stream.getAudioTracks();
        if (!audioTracks || audioTracks.length === 0 || !audioTracks[0].enabled) {
          throw new Error("Microphone track is not available or disabled.");
        }

        isListeningRef.current = true;
        setIsListening(true);
        audioChunksRef.current = [];

        // 2. Start MediaRecorder as continuous high-fidelity audio collector for AI transcription
        try {
          let mime = "audio/webm";
          if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
            mime = "audio/webm;codecs=opus";
          } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
            mime = "audio/mp4";
          }
          const recorder = new MediaRecorder(stream, {
            mimeType: mime,
            audioBitsPerSecond: 128000,
          });
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };
          recorder.start(250);
          mediaRecorderRef.current = recorder;
        } catch (recErr) {
          console.warn("[useSpeechRecognition] MediaRecorder warning:", recErr);
        }

        // 3. Web Speech API for instant, latency-free real-time recognition
        const SpeechRecognitionClass =
          typeof window !== "undefined"
            ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
            : null;

        if (SpeechRecognitionClass) {
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch (e) {}
          }

          const recognition = new SpeechRecognitionClass();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;

          // Determine language tag
          if (targetLang === "en") {
            recognition.lang = "en-US";
          } else if (targetLang === "bn") {
            recognition.lang = "bn-BD";
          } else {
            // Auto mode: default to bn-BD or navigator language
            const navLang = typeof navigator !== "undefined" ? navigator.language : "bn-BD";
            recognition.lang = navLang.startsWith("en") ? "en-US" : "bn-BD";
          }

          recognition.onresult = (event: any) => {
            let currentInterim = "";

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const result = event.results[i];
              const piece = result[0]?.transcript || "";
              if (!piece) continue;

              if (result.isFinal) {
                const { merged, newChunk } = stitchTranscripts(
                  accumulatedFinalRef.current,
                  piece
                );
                if (newChunk) {
                  accumulatedFinalRef.current = merged;
                  setTranscript(merged);
                  interimTextRef.current = "";
                  setInterimText("");
                  if (onInterimResultRef.current) onInterimResultRef.current("");
                  if (onResultRef.current) onResultRef.current(newChunk, true, false);
                }
              } else {
                currentInterim += piece;
              }
            }

            if (currentInterim) {
              const cleanInterim = normalizeText(currentInterim);
              interimTextRef.current = cleanInterim;
              setInterimText(cleanInterim);
              if (onInterimResultRef.current) onInterimResultRef.current(cleanInterim);
            }
          };

          recognition.onerror = (event: any) => {
            console.warn("[useSpeechRecognition] WebSpeech error event:", event.error);
            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
              handleError("Microphone access is unavailable. Please allow microphone permissions.");
            }
            // Non-fatal errors like 'no-speech' or network hiccups don't break the session
          };

          recognition.onend = () => {
            // If still actively listening and user did not stop explicitly, restart recognition
            if (isListeningRef.current && !isExplicitStopRef.current) {
              try {
                recognition.start();
              } catch (e) {
                // Ignore InvalidStateError if already started
              }
            }
          };

          try {
            recognition.start();
            recognitionRef.current = recognition;
          } catch (startErr) {
            console.warn("[useSpeechRecognition] Recognition start warning:", startErr);
          }
        }
      } catch (err: any) {
        console.warn("[useSpeechRecognition] Streaming setup error:", err?.message || err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          handleError("Microphone access is unavailable. Please allow microphone permissions.");
        } else {
          handleError("Failed to start speech recognition.");
        }
        cleanupAll();
      }
    },
    [speechLanguage, handleError, cleanupAll]
  );

  const stopListening = useCallback(async (): Promise<string> => {
    isExplicitStopRef.current = true;
    isListeningRef.current = false;
    setIsListening(false);

    // If there is pending unfinalized interim speech, stitch it cleanly
    const pending = interimTextRef.current.trim();
    if (pending) {
      const { merged, newChunk } = stitchTranscripts(
        accumulatedFinalRef.current,
        pending
      );
      if (newChunk) {
        accumulatedFinalRef.current = merged;
        setTranscript(merged);
        if (onResultRef.current) onResultRef.current(newChunk, true, false);
      }
      interimTextRef.current = "";
      setInterimText("");
      if (onInterimResultRef.current) onInterimResultRef.current("");
    }

    // Stop Web Speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    // Stop MediaRecorder & process high-fidelity audio chunks
    let recordedBlob: Blob | null = null;
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
        if (audioChunksRef.current.length > 0) {
          const mime = mediaRecorderRef.current.mimeType || "audio/webm";
          recordedBlob = new Blob(audioChunksRef.current, { type: mime });
        }
      } catch (e) {}
      mediaRecorderRef.current = null;
    }

    // Perform high-accuracy Gemini AI Audio Transcription to ensure zero dropped words, exact multilingual detection, and fast-speech comprehension
    let finalText = accumulatedFinalRef.current.trim();
    if (recordedBlob && recordedBlob.size > 1200) {
      try {
        setIsTranscribing(true);
        const aiTranscribed = await transcribeAudioBlob(
          recordedBlob,
          targetLangRef.current || "auto"
        );
        if (aiTranscribed && aiTranscribed.trim()) {
          finalText = aiTranscribed.trim();
          accumulatedFinalRef.current = finalText;
          setTranscript(finalText);
          if (onResultRef.current) {
            onResultRef.current(finalText, true, true);
          }
        }
      } catch (transcribeErr) {
        console.warn("[useSpeechRecognition] AI transcribe notice:", transcribeErr);
      } finally {
        setIsTranscribing(false);
      }
    }

    cleanupAll();
    return finalText;
  }, [cleanupAll]);

  const abortListening = useCallback(() => {
    isExplicitStopRef.current = true;
    cleanupAll();
    setInterimText("");
    interimTextRef.current = "";
    if (onInterimResultRef.current) onInterimResultRef.current("");
  }, [cleanupAll]);

  const resetTranscript = useCallback(() => {
    accumulatedFinalRef.current = "";
    interimTextRef.current = "";
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
    mediaStream,
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
