'use client';

import { useEffect, useRef, useCallback } from 'react';

// Global singleton AudioContext to prevent exceeding browser hardware limits
let sharedAudioContext: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;

  try {
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioCtx();
    }
    return sharedAudioContext;
  } catch (err) {
    console.warn('[useVoiceAmplitude] Error initializing AudioContext:', err);
    return null;
  }
}

export function useVoiceAmplitude(active: boolean) {
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Synchronous smoothed amplitude value (0.0 to 1.0)
  const smoothedAmpRef = useRef<number>(0);
  const rawAmpRef = useRef<number>(0);
  const isAcquiringRef = useRef<boolean>(false);

  const cleanup = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }

    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {}
      analyserRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      mediaStreamRef.current = null;
    }

    dataArrayRef.current = null;
    isAcquiringRef.current = false;
    smoothedAmpRef.current = 0;
    rawAmpRef.current = 0;
  }, []);

  const startAudioCapture = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      return;
    }

    if (isAcquiringRef.current || mediaStreamRef.current) return;
    isAcquiringRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // If deactivated while waiting for getUserMedia promise
      if (!isAcquiringRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      mediaStreamRef.current = stream;

      const audioCtx = getSharedAudioContext();
      if (!audioCtx) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume().catch(() => {});
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceNodeRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;

      let lastTime = performance.now();

      const loop = (currentTime: number) => {
        const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
        lastTime = currentTime;

        if (analyserRef.current && dataArrayRef.current) {
          analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);

          // Focus on primary voice frequency bands (approx 85Hz - 2200Hz)
          // At 48kHz, bin width ~ 187.5Hz. Bins 1 to 14 correspond to ~180Hz - 2600Hz
          let sumSquares = 0;
          const startBin = 1;
          const endBin = Math.min(16, dataArrayRef.current.length);
          const binCount = endBin - startBin;

          for (let i = startBin; i < endBin; i++) {
            const normalizedVal = dataArrayRef.current[i] / 255;
            sumSquares += normalizedVal * normalizedVal;
          }

          const rms = Math.sqrt(sumSquares / Math.max(binCount, 1));

          // Ambient noise floor gate (~0.04)
          const gated = Math.max(0, rms - 0.035);
          // Non-linear mapping for natural perceptual speech dynamics
          const targetAmp = Math.min(Math.pow(gated / 0.28, 1.3), 1.0);
          rawAmpRef.current = targetAmp;

          // Attack (~120ms) vs Release (~500ms) exponential smoothing
          const isAttack = targetAmp > smoothedAmpRef.current;
          const smoothingSpeed = isAttack ? 16.0 : 4.0;
          smoothedAmpRef.current +=
            (targetAmp - smoothedAmpRef.current) * Math.min(smoothingSpeed * dt, 1.0);
        }

        rafIdRef.current = requestAnimationFrame(loop);
      };

      rafIdRef.current = requestAnimationFrame(loop);
    } catch (err) {
      // Permission denied or microphone unavailable - fail gracefully with zero stuck glow
      console.warn('[useVoiceAmplitude] Microphone stream acquisition skipped/denied:', err);
      cleanup();
    } finally {
      isAcquiringRef.current = false;
    }
  }, [cleanup]);

  useEffect(() => {
    if (active) {
      startAudioCapture();
    } else {
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [active, startAudioCapture, cleanup]);

  const getAmplitude = useCallback(() => {
    return smoothedAmpRef.current;
  }, []);

  const getFrequencyData = useCallback((target?: Uint8Array) => {
    if (analyserRef.current && dataArrayRef.current) {
      if (target) {
        analyserRef.current.getByteFrequencyData(target as any);
        return target;
      }
      return dataArrayRef.current;
    }
    return null;
  }, []);

  return {
    getAmplitude,
    getFrequencyData,
    smoothedAmpRef,
    rawAmpRef,
  };
}

