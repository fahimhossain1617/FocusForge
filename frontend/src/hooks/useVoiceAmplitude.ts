'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom event name for communicating speech recognition activity
 * between Web Speech API (SpeechRecognition) and the audio visualizer,
 * completely avoiding competing hardware getUserMedia stream locks.
 */
export const SPEECH_ACTIVITY_EVENT = 'foscentia:speech-activity';

export interface SpeechActivityDetail {
  speaking: boolean;
}

export function broadcastSpeechActivity(speaking: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent<SpeechActivityDetail>(SPEECH_ACTIVITY_EVENT, {
        detail: { speaking },
      })
    );
  } catch {}
}

/**
 * Production Voice Amplitude & Spectrum Hook:
 *
 * Prevents Chrome / Android Web Speech API 'audio-capture' hardware lockouts.
 * Instead of competing with Web Speech API for exclusive microphone hardware via getUserMedia
 * (which causes rapid audio-capture errors, infinite 400ms restart loops, and repeated beep sounds),
 * this hook generates an organic, speech-reactive harmonic energy wave synchronized directly
 * with Web Speech recognition activity events.
 */
export function useVoiceAmplitude(active: boolean) {
  const rafIdRef = useRef<number | null>(null);
  const smoothedAmpRef = useRef<number>(0);
  const rawAmpRef = useRef<number>(0);
  const isSpeakingRef = useRef<boolean>(false);
  const lastSpeechTimeRef = useRef<number>(0);
  const syntheticFreqDataRef = useRef<Uint8Array | null>(null);

  const cleanup = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    smoothedAmpRef.current = 0;
    rawAmpRef.current = 0;
    isSpeakingRef.current = false;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSpeechActivity = (e: Event) => {
      const customEvent = e as CustomEvent<SpeechActivityDetail>;
      const speaking = Boolean(customEvent.detail?.speaking);
      isSpeakingRef.current = speaking;
      if (speaking) {
        lastSpeechTimeRef.current = performance.now();
      }
    };

    window.addEventListener(SPEECH_ACTIVITY_EVENT, handleSpeechActivity as EventListener);
    return () => {
      window.removeEventListener(SPEECH_ACTIVITY_EVENT, handleSpeechActivity as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!active) {
      cleanup();
      return;
    }

    if (!syntheticFreqDataRef.current) {
      syntheticFreqDataRef.current = new Uint8Array(128);
    }

    let lastTime = performance.now();
    let phase = Math.random() * Math.PI * 2;

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Advance organic phase
      phase += dt * (isSpeakingRef.current ? 4.5 : 1.8);

      // Check if user recently spoke within the last 700ms
      const timeSinceSpeech = currentTime - lastSpeechTimeRef.current;
      const recentSpeech = timeSinceSpeech < 700;
      const activelyTalking = isSpeakingRef.current || recentSpeech;

      let targetAmp = 0;
      if (activelyTalking) {
        // Dynamic multi-frequency voice cadence (speech syllables & natural emphasis)
        const syllable1 = Math.sin(phase * 1.3) * 0.22;
        const syllable2 = Math.cos(phase * 2.7) * 0.16;
        const breathFlicker = Math.sin(phase * 4.9) * 0.08;
        const baseSpeechLevel = 0.52;
        targetAmp = Math.min(
          Math.max(baseSpeechLevel + syllable1 + syllable2 + breathFlicker, 0.28),
          0.88
        );
      } else {
        // Soft atmospheric resting breath while listening
        const slowBreath = (Math.sin(phase * 0.9) + 1) * 0.5; // 0.0 to 1.0
        targetAmp = 0.16 + slowBreath * 0.12; // 0.16 to 0.28
      }

      rawAmpRef.current = targetAmp;

      // Exponential smoothing (fast attack, natural musical release)
      const isAttack = targetAmp > smoothedAmpRef.current;
      const smoothingSpeed = isAttack ? 18.0 : 6.0;
      smoothedAmpRef.current +=
        (targetAmp - smoothedAmpRef.current) * Math.min(smoothingSpeed * dt, 1.0);

      // Synthesize realistic human voice frequency bin distribution in buffer
      if (syntheticFreqDataRef.current) {
        const arr = syntheticFreqDataRef.current;
        const amp = smoothedAmpRef.current;
        const len = arr.length;

        for (let i = 0; i < len; i++) {
          if (i === 0) {
            arr[0] = Math.floor(amp * 160);
            continue;
          }

          // Vocal fundamental / formant distribution peak around bins 2-7 (~150Hz - 900Hz)
          const peak = Math.exp(-Math.pow(i - 4.5, 2) / 10.0);
          const harmonics = Math.sin(i * 1.4 + phase) * 0.25 + 0.75;
          const noise = ((i * 37) % 17) / 80;
          const val = (peak * 0.75 + noise) * harmonics * amp * 255;
          arr[i] = Math.min(Math.floor(Math.max(val, 0)), 255);
        }
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      cleanup();
    };
  }, [active, cleanup]);

  const getAmplitude = useCallback(() => {
    return smoothedAmpRef.current;
  }, []);

  const getFrequencyData = useCallback((target?: Uint8Array) => {
    if (syntheticFreqDataRef.current) {
      if (target) {
        target.set(syntheticFreqDataRef.current.subarray(0, target.length));
        return target;
      }
      return syntheticFreqDataRef.current;
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
