'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  VoiceSessionManager,
  type VoiceState,
  type SupportedSpeechLang,
} from '@/services/voice/voiceSessionManager';

export interface UseContinuousSpeechOptions {
  initialLang?: 'bn-BD' | 'en-US';
  /** Fired EXACTLY ONCE when a recording session is finalized (Pause / Stop) */
  onTranscriptChange?: (text: string) => void;
  /** Explicit callback for finalized text commit */
  onTranscriptFinalized?: (finalText: string, newChunk: string) => void;
  /** User-facing error callback */
  onError?: (error: string) => void;
  /** State machine transition callback */
  onStateChange?: (state: VoiceState) => void;
}

export function useContinuousSpeech({
  initialLang = 'bn-BD',
  onTranscriptChange,
  onTranscriptFinalized,
  onError,
  onStateChange,
}: UseContinuousSpeechOptions = {}) {
  const [text, setText] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [lang, setLangState] = useState<'bn-BD' | 'en-US'>(initialLang);

  const managerRef = useRef<VoiceSessionManager | null>(null);
  const onTranscriptChangeRef = useRef(onTranscriptChange);
  const onTranscriptFinalizedRef = useRef(onTranscriptFinalized);
  const onErrorRef = useRef(onError);
  const onStateChangeRef = useRef(onStateChange);

  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  useEffect(() => {
    onTranscriptFinalizedRef.current = onTranscriptFinalized;
  }, [onTranscriptFinalized]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  // Construct the authoritative session manager once
  useEffect(() => {
    const manager = new VoiceSessionManager({
      onFinalCommit: (fullCommittedText, newChunk) => {
        setText(fullCommittedText);
        onTranscriptChangeRef.current?.(fullCommittedText);
        onTranscriptFinalizedRef.current?.(fullCommittedText, newChunk);
      },
      onStateChange: (newState) => {
        setVoiceState(newState);
        onStateChangeRef.current?.(newState);
      },
      onError: (errMsg) => {
        onErrorRef.current?.(errMsg);
      },
    });

    managerRef.current = manager;

    return () => {
      manager.destroy();
      managerRef.current = null;
    };
  }, []);

  const isSupported = typeof window !== 'undefined' && Boolean(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );

  const isListening = voiceState === 'RECORDING' || voiceState === 'STOPPING' || voiceState === 'FINALIZING';
  const isPaused = voiceState === 'PAUSED';
  const isFinalizing = voiceState === 'STOPPING' || voiceState === 'FINALIZING';

  const startListening = useCallback((currentManualText?: string) => {
    const base = currentManualText !== undefined ? currentManualText : text;
    void managerRef.current?.start({
      language: lang,
      baseText: base,
    });
  }, [lang, text]);

  const pauseListening = useCallback(async (): Promise<string> => {
    if (managerRef.current) {
      return await managerRef.current.pause();
    }
    return text;
  }, [text]);

  const resumeListening = useCallback(async (currentManualText?: string) => {
    const base = currentManualText !== undefined ? currentManualText : text;
    await managerRef.current?.resume(base);
  }, [text]);

  const stopListening = useCallback(async (): Promise<string> => {
    if (managerRef.current) {
      return await managerRef.current.stop();
    }
    return text;
  }, [text]);

  const abortListening = useCallback(() => {
    managerRef.current?.abort();
  }, []);

  const toggleListening = useCallback((currentManualText?: string) => {
    if (isListening) {
      void stopListening();
    } else if (isPaused) {
      void resumeListening(currentManualText);
    } else {
      startListening(currentManualText);
    }
  }, [isListening, isPaused, stopListening, resumeListening, startListening]);

  const toggleLanguage = useCallback(() => {
    const nextLang: 'bn-BD' | 'en-US' = lang === 'bn-BD' ? 'en-US' : 'bn-BD';
    setLangState(nextLang);
    managerRef.current?.setLanguage(nextLang);
  }, [lang]);

  const setManualText = useCallback((newText: string) => {
    setText(newText);
    managerRef.current?.setManualBaseText(newText);
  }, []);

  return {
    text,
    setText,
    isListening,
    isPaused,
    isFinalizing,
    voiceState,
    lang,
    setLang: (newLang: 'bn-BD' | 'en-US') => {
      setLangState(newLang);
      managerRef.current?.setLanguage(newLang);
    },
    isSupported,
    toggleListening,
    startListening,
    pauseListening,
    resumeListening,
    stopListening,
    abortListening,
    toggleLanguage,
    setManualText,
  };
}

