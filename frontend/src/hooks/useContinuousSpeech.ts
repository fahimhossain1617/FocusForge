'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseContinuousSpeechOptions {
  initialLang?: 'bn-BD' | 'en-US';
  onTranscriptChange?: (text: string) => void;
  onError?: (error: string) => void;
}

export function useContinuousSpeech({
  initialLang = 'bn-BD',
  onTranscriptChange,
  onError,
}: UseContinuousSpeechOptions = {}) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [lang, setLang] = useState<'bn-BD' | 'en-US'>(initialLang);

  // Persistent transcript memory
  const allFinalTextRef = useRef(''); // Permanent text from previous sessions & manual edits
  const sessionFinalRef = useRef(''); // Finalized words in current live session
  const isListeningRef = useRef(false);
  const langRef = useRef(lang);
  const recognitionRef = useRef<any>(null);
  const restartTimerRef = useRef<any>(null);
  const onTranscriptChangeRef = useRef(onTranscriptChange);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  langRef.current = lang;

  const emitChange = useCallback((newText: string) => {
    setText(newText);
    onTranscriptChangeRef.current?.(newText);
  }, []);

  const cleanupCurrentSession = () => {
    if (sessionFinalRef.current.trim()) {
      const base = allFinalTextRef.current.trim();
      const sFinal = sessionFinalRef.current.trim();
      allFinalTextRef.current = base ? `${base} ${sFinal}` : sFinal;
      sessionFinalRef.current = '';
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  const startRecognitionSession = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onErrorRef.current?.('SpeechRecognition not supported in this browser.');
      return;
    }

    cleanupCurrentSession();

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = langRef.current;

    sessionFinalRef.current = '';

    recognition.onresult = (event: any) => {
      let currentFinal = '';
      let currentInterim = '';

      for (let i = 0; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          currentFinal += item[0].transcript + ' ';
        } else {
          currentInterim += item[0].transcript;
        }
      }

      sessionFinalRef.current = currentFinal;

      const base = allFinalTextRef.current.trim();
      const sFinal = currentFinal.trim();
      const sInterim = currentInterim.trim();

      let combined = base;
      if (sFinal) combined += (combined ? ' ' : '') + sFinal;
      if (sInterim) combined += (combined ? ' ' : '') + sInterim;

      emitChange(combined);
    };

    recognition.onerror = (event: any) => {
      // Normal browser events during pauses:
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }

      // Socket/Network drop: give 400ms breathing room before reconnecting
      if (event.error === 'network' || event.error === 'audio-capture') {
        clearTimeout(restartTimerRef.current);
        if (isListeningRef.current) {
          restartTimerRef.current = setTimeout(() => {
            if (isListeningRef.current) startRecognitionSession();
          }, 400);
        }
        return;
      }

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        isListeningRef.current = false;
        setIsListening(false);
        onErrorRef.current?.(event.error);
      }
    };

    recognition.onend = () => {
      // Lock all completed sentences into permanent memory
      if (sessionFinalRef.current.trim()) {
        const base = allFinalTextRef.current.trim();
        const sFinal = sessionFinalRef.current.trim();
        allFinalTextRef.current = base ? `${base} ${sFinal}` : sFinal;
        sessionFinalRef.current = '';
      }

      // CRITICAL: Chrome needs at least 250ms to completely release the microphone stream
      // Do NOT restart at 50ms, as it triggers audio-capture failure
      if (isListeningRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (isListeningRef.current) {
            startRecognitionSession();
          }
        }, 250);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      if (isListeningRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (isListeningRef.current) startRecognitionSession();
        }, 350);
      }
    }
  }, [emitChange]);

  const toggleListening = useCallback((currentManualText?: string) => {
    if (isListeningRef.current) {
      // Stop
      isListeningRef.current = false;
      setIsListening(false);
      clearTimeout(restartTimerRef.current);
      cleanupCurrentSession();

      if (sessionFinalRef.current.trim()) {
        const base = allFinalTextRef.current.trim();
        const sFinal = sessionFinalRef.current.trim();
        allFinalTextRef.current = base ? `${base} ${sFinal}` : sFinal;
        sessionFinalRef.current = '';
      }
    } else {
      // Start
      const initialText = currentManualText !== undefined ? currentManualText : allFinalTextRef.current;
      allFinalTextRef.current = initialText;
      sessionFinalRef.current = '';
      isListeningRef.current = true;
      setIsListening(true);
      startRecognitionSession();
    }
  }, [startRecognitionSession]);

  const toggleLanguage = useCallback(() => {
    const nextLang = langRef.current === 'bn-BD' ? 'en-US' : 'bn-BD';
    langRef.current = nextLang;
    setLang(nextLang);

    if (sessionFinalRef.current.trim()) {
      const base = allFinalTextRef.current.trim();
      const sFinal = sessionFinalRef.current.trim();
      allFinalTextRef.current = base ? `${base} ${sFinal}` : sFinal;
      sessionFinalRef.current = '';
    }

    if (isListeningRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        if (isListeningRef.current) startRecognitionSession();
      }, 200);
    }
  }, [startRecognitionSession]);

  const setManualText = useCallback((newText: string) => {
    allFinalTextRef.current = newText;
    sessionFinalRef.current = '';
    setText(newText);
  }, []);

  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      clearTimeout(restartTimerRef.current);
      cleanupCurrentSession();
    };
  }, []);

  const isSupported = typeof window !== 'undefined' && Boolean(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );

  const startListening = useCallback((currentManualText?: string) => {
    if (!isListeningRef.current) {
      toggleListening(currentManualText);
    }
  }, [toggleListening]);

  const stopListening = useCallback(() => {
    if (isListeningRef.current) {
      toggleListening();
    }
  }, [toggleListening]);

  return {
    text,
    setText,
    isListening,
    lang,
    setLang,
    isSupported,
    toggleListening,
    startListening,
    stopListening,
    toggleLanguage,
    setManualText,
  };
}
