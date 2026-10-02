import { useState, useEffect, useRef, useCallback } from "react";

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
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const accumulatedFinalRef = useRef("");
  const interimTextRef = useRef("");

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
      setIsSupported(hasMedia);
    }
    return () => {
      cleanupAll();
    };
  }, []);

  const cleanupAll = useCallback(() => {
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

    if (socketRef.current) {
      try {
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.close();
        }
      } catch (e) {}
      socketRef.current = null;
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

      setErrorState(null);

      if (options?.reset !== false) {
        accumulatedFinalRef.current = "";
        interimTextRef.current = "";
        setTranscript("");
        setInterimText("");
        if (onInterimResultRef.current) onInterimResultRef.current("");
      }

      try {
        if (!streamRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
              sampleRate: 16000,
            },
          });
          streamRef.current = stream;
          setMediaStream(stream);
        }

        // Verify audio tracks are alive and active
        const audioTracks = streamRef.current.getAudioTracks();
        if (!audioTracks || audioTracks.length === 0 || !audioTracks[0].enabled) {
          throw new Error("Microphone track is not available or disabled.");
        }

        let backendUrl = "http://localhost:5000";
        try {
          if (
            process.env.NEXT_PUBLIC_BACKEND_URL &&
            !process.env.NEXT_PUBLIC_BACKEND_URL.includes("5000")
          ) {
            backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
          } else if (process.env.NEXT_PUBLIC_API_URL) {
            backendUrl = process.env.NEXT_PUBLIC_API_URL;
          } else if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
            backendUrl = `${window.location.protocol}//${window.location.host}`;
          }
        } catch {}

        const parsedBackend = new URL(backendUrl);
        const wsUrl = `${
          parsedBackend.protocol === "https:" ? "wss:" : "ws:"
        }//${parsedBackend.host}/api/ai/transcribe-stream?language=${targetLang}`;

        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          setIsListening(true);
          let mime = "audio/webm";
          if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
            mime = "audio/webm;codecs=opus";
          }
          const recorder = new MediaRecorder(streamRef.current!, { mimeType: mime });

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
              socket.send(e.data);
            }
          };

          // 180ms slice interval provides instantaneous typing responsiveness without packet fragmentation
          recorder.start(180);
          mediaRecorderRef.current = recorder;
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "error") {
              handleError(data.message || "Streaming ASR error");
              return;
            }
            if (data.type === "ready") {
              setIsTranscribing(false);
              return;
            }
            if (data.type === "transcript") {
              const rawText = (data.text || "").trim();
              if (!rawText) return;

              if (data.is_final) {
                // Intelligent overlap stitching: ensures zero duplicate words and correct percent/number formatting
                const { merged, newChunk } = stitchTranscripts(
                  accumulatedFinalRef.current,
                  rawText
                );

                if (newChunk) {
                  accumulatedFinalRef.current = merged;
                  setTranscript(merged);
                  interimTextRef.current = "";
                  setInterimText("");

                  if (onInterimResultRef.current) onInterimResultRef.current("");
                  if (onResultRef.current) onResultRef.current(newChunk, true, false);
                } else {
                  // Duplicate or already covered tail
                  interimTextRef.current = "";
                  setInterimText("");
                  if (onInterimResultRef.current) onInterimResultRef.current("");
                }
              } else {
                const cleanInterim = normalizeText(rawText);
                interimTextRef.current = cleanInterim;
                setInterimText(cleanInterim);
                if (onInterimResultRef.current) onInterimResultRef.current(cleanInterim);
              }
            }
          } catch (err) {
            console.warn("WebSocket message parse error", err);
          }
        };

        socket.onerror = () => {
          handleError("WebSocket connection error. Make sure ASR provider is configured.");
        };

        socket.onclose = () => {
          cleanupAll();
        };
      } catch (err: any) {
        console.warn("[Voice] Streaming setup error:", err?.message || err);
        if (err.name === "NotAllowedError") {
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
    // If there is pending unfinalized interim speech, stitch it cleanly before shutting down
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

    const clientFinalText = accumulatedFinalRef.current.trim();
    cleanupAll();
    return clientFinalText;
  }, [cleanupAll]);

  const abortListening = useCallback(() => {
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

