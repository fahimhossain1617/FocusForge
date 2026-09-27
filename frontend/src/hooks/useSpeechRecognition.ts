import { useState, useEffect, useRef, useCallback } from "react";

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

  const startListening = useCallback(async (language?: SpeechLanguage, options?: { reset?: boolean }) => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      handleError("You are currently offline. Voice recognition requires an active internet connection.");
      return;
    }

    const targetLang = language || speechLanguage || "auto";
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
         if (process.env.NEXT_PUBLIC_BACKEND_URL && !process.env.NEXT_PUBLIC_BACKEND_URL.includes("5000")) {
           backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
         } else if (process.env.NEXT_PUBLIC_API_URL) {
           backendUrl = process.env.NEXT_PUBLIC_API_URL;
         } else if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
           backendUrl = `${window.location.protocol}//${window.location.host}`;
         }
      } catch {}
      
      const parsedBackend = new URL(backendUrl);
      const wsUrl = `${parsedBackend.protocol === 'https:' ? 'wss:' : 'ws:'}//${parsedBackend.host}/api/ai/transcribe-stream?language=${targetLang}`;
      
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
        
        recorder.start(250);
        mediaRecorderRef.current = recorder;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'error') {
            handleError(data.message || 'Streaming ASR error');
            return;
          }
          if (data.type === 'ready') {
            setIsTranscribing(false);
            return;
          }
          if (data.type === 'transcript') {
            const text = data.text.trim();
            if (!text) return;

            if (data.is_final) {
               const prevWords = accumulatedFinalRef.current.trim();
               if (!prevWords.endsWith(text)) {
                 accumulatedFinalRef.current = [prevWords, text]
                    .filter(Boolean)
                    .join(" ")
                    .trim();
               }
               
               setTranscript(accumulatedFinalRef.current);
               interimTextRef.current = "";
               setInterimText("");

               if (onInterimResultRef.current) onInterimResultRef.current("");
               if (onResultRef.current) onResultRef.current(text, true);
            } else {
               interimTextRef.current = text;
               setInterimText(text);
               if (onInterimResultRef.current) onInterimResultRef.current(text);
            }
          }
        } catch (err) {
          console.warn('WebSocket message parse error', err);
        }
      };

      socket.onerror = () => {
        handleError('WebSocket connection error. Make sure ASR provider is configured.');
      };

      socket.onclose = () => {
        cleanupAll();
      };

    } catch (err: any) {
      console.warn("[Voice] Streaming setup error:", err?.message || err);
      if (err.name === 'NotAllowedError') {
        handleError("Microphone access is unavailable. Please allow microphone permissions.");
      } else {
        handleError("Failed to start speech recognition.");
      }
      cleanupAll();
    }
  }, [speechLanguage, handleError, cleanupAll]);

  const stopListening = useCallback(async (): Promise<string> => {
    const pending = interimTextRef.current.trim();
    if (pending) {
      accumulatedFinalRef.current = [accumulatedFinalRef.current, pending]
        .filter(Boolean)
        .join(" ")
        .trim();
      setTranscript(accumulatedFinalRef.current);
      interimTextRef.current = "";
      setInterimText("");
      if (onInterimResultRef.current) onInterimResultRef.current("");
      if (onResultRef.current) onResultRef.current(pending, true);
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
