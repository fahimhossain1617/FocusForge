"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface AudioAnalyzerState {
  isInitialized: boolean;
  hasPermission: boolean;
  error: string | null;
  /** Smoothed volume/amplitude between 0.0 and 1.0 */
  amplitude: number;
}

export function useAudioAnalyzer(isActive: boolean = false) {
  const [state, setState] = useState<AudioAnalyzerState>({
    isInitialized: false,
    hasPermission: false,
    error: null,
    amplitude: 0,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Smoothed amplitude reference (available synchronously for 60fps canvas loop)
  const smoothedAmplitudeRef = useRef<number>(0);
  const rawAmplitudeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    dataArrayRef.current = null;
    smoothedAmplitudeRef.current = 0;
    rawAmplitudeRef.current = 0;
  }, []);

  const startAnalyzer = useCallback(async () => {
    cleanup();

    try {
      if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
        throw new Error("MediaDevices API is not available.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;

      setState({
        isInitialized: true,
        hasPermission: true,
        error: null,
        amplitude: 0,
      });

      // Continuous 60fps analysis loop with smooth attack/decay damping
      let lastTime = performance.now();

      const tick = (time: number) => {
        const delta = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;

        if (analyserRef.current && dataArrayRef.current) {
          analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);

          let sum = 0;
          // Focus primarily on voice frequency ranges (approx 80Hz - 2000Hz)
          const rangeCount = Math.floor(dataArrayRef.current.length * 0.7);
          for (let i = 0; i < rangeCount; i++) {
            sum += dataArrayRef.current[i];
          }
          const rawAvg = sum / rangeCount;
          // Normalize to 0 - 1 with non-linear boost for normal speaking volume
          const normalized = Math.min(Math.pow(rawAvg / 120, 1.4), 1.0);
          rawAmplitudeRef.current = normalized;

          // Attack (quick response when user speaks) vs Decay (gentle fade when user stops)
          const attackRate = 18.0;
          const decayRate = 5.0;
          const rate = normalized > smoothedAmplitudeRef.current ? attackRate : decayRate;

          smoothedAmplitudeRef.current +=
            (normalized - smoothedAmplitudeRef.current) * Math.min(rate * delta, 1.0);

          // Periodically update state (clamped to avoid high frequency React renders)
          if (Math.random() < 0.15) {
            setState((prev) => ({
              ...prev,
              amplitude: smoothedAmplitudeRef.current,
            }));
          }
        }

        rafIdRef.current = requestAnimationFrame(tick);
      };

      rafIdRef.current = requestAnimationFrame(tick);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Microphone permission denied or unavailable.";
      setState({
        isInitialized: false,
        hasPermission: false,
        error: errorMsg,
        amplitude: 0,
      });
      cleanup();
    }
  }, [cleanup]);

  useEffect(() => {
    if (isActive) {
      startAnalyzer();
    } else {
      cleanup();
      setState((prev) => ({ ...prev, amplitude: 0 }));
    }

    return () => {
      cleanup();
    };
  }, [isActive, startAnalyzer, cleanup]);

  return {
    ...state,
    smoothedAmplitudeRef,
    rawAmplitudeRef,
    retry: startAnalyzer,
  };
}
