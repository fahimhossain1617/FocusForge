'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { broadcastSpeechActivity } from '@/hooks/useVoiceAmplitude';

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
  const isStartingRef = useRef(false);
  const consecutiveErrorsRef = useRef(0);
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

  const cleanupCurrentSession = useCallback(() => {
    broadcastSpeechActivity(false);
    if (sessionFinalRef.current.trim()) {
      const base = allFinalTextRef.current.trim();
      const sFinal = sessionFinalRef.current.trim();
      allFinalTextRef.current = base ? `${base} ${sFinal}` : sFinal;
      sessionFinalRef.current = '';
    }
    if (recognitionRef.current) {
      try {
        const rec = recognitionRef.current;
        recognitionRef.current = null;
        rec.onresult = null;
        rec.onend = null;
        rec.onerror = null;
        rec.onspeechstart = null;
        rec.onspeechend = null;
        rec.onsoundstart = null;
        rec.onsoundend = null;
        rec.abort();
      } catch (e) {}
    }
    isStartingRef.current = false;
  }, []);

  const startRecognitionSession = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onErrorRef.current?.('SpeechRecognition is not supported in this browser.');
      return;
    }

    if (isStartingRef.current) return;
    isStartingRef.current = true;

    cleanupCurrentSession();

    let recognition: any;
    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = langRef.current;
    } catch (initErr) {
      isStartingRef.current = false;
      return;
    }

    sessionFinalRef.current = '';

    recognition.onstart = () => {
      isStartingRef.current = false;
      consecutiveErrorsRef.current = 0;
    };

    recognition.onspeechstart = () => {
      broadcastSpeechActivity(true);
    };

    recognition.onsoundstart = () => {
      broadcastSpeechActivity(true);
    };

    recognition.onspeechend = () => {
      broadcastSpeechActivity(false);
    };

    recognition.onsoundend = () => {
      broadcastSpeechActivity(false);
    };

    recognition.onresult = (event: any) => {
      broadcastSpeechActivity(true);
      consecutiveErrorsRef.current = 0;

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
      const err = event?.error;

      // Normal browser events during speech pauses:
      if (err === 'no-speech' || err === 'aborted') {
        broadcastSpeechActivity(false);
        return;
      }

      broadcastSpeechActivity(false);
      consecutiveErrorsRef.current += 1;

      // Microphone permission denied or blocked
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        isListeningRef.current = false;
        setIsListening(false);
        clearTimeout(restartTimerRef.current);
        cleanupCurrentSession();
        onErrorRef.current?.(
          langRef.current === 'bn-BD'
            ? 'মাইক্রোফোনের অনুমতি দেওয়া হয়নি। অনুগ্রহ করে ব্রাউজার সেটিংসে মাইক্রোফোন অ্যালাউ করুন।'
            : 'Microphone permission denied. Please allow microphone access in browser settings.'
        );
        return;
      }

      // Hardware lock or audio capture conflict
      if (err === 'audio-capture') {
        clearTimeout(restartTimerRef.current);
        if (consecutiveErrorsRef.current >= 2) {
          isListeningRef.current = false;
          setIsListening(false);
          cleanupCurrentSession();
          onErrorRef.current?.(
            langRef.current === 'bn-BD'
              ? 'মাইক্রোফোন পাওয়া যাচ্ছে না বা অন্য কোনো অ্যাপ ব্যবহার করছে।'
              : 'Microphone is unavailable or busy by another application.'
          );
          return;
        }

        // Single retry with 500ms cooloff
        if (isListeningRef.current) {
          restartTimerRef.current = setTimeout(() => {
            if (isListeningRef.current) startRecognitionSession();
          }, 500);
        }
        return;
      }

      // Network hiccups
      if (err === 'network') {
        clearTimeout(restartTimerRef.current);
        if (consecutiveErrorsRef.current >= 3) {
          isListeningRef.current = false;
          setIsListening(false);
          cleanupCurrentSession();
          onErrorRef.current?.(
            langRef.current === 'bn-BD'
              ? 'ভয়েস সার্ভারের সাথে সংযোগ বিচ্ছিন্ন হয়েছে। ইন্টারনেট কানেকশন চেক করুন।'
              : 'Voice recognition network connection error.'
          );
          return;
        }

        if (isListeningRef.current) {
          restartTimerRef.current = setTimeout(() => {
            if (isListeningRef.current) startRecognitionSession();
          }, 800);
        }
        return;
      }
    };

    recognition.onend = () => {
      broadcastSpeechActivity(false);
      isStartingRef.current = false;

      // Commit all completed sentences into permanent memory
      if (sessionFinalRef.current.trim()) {
        const base = allFinalTextRef.current.trim();
        const sFinal = sessionFinalRef.current.trim();
        allFinalTextRef.current = base ? `${base} ${sFinal}` : sFinal;
        sessionFinalRef.current = '';
      }

      // Only restart if the user STILL intends to listen and error threshold is not breached
      if (isListeningRef.current && consecutiveErrorsRef.current < 3) {
        clearTimeout(restartTimerRef.current);
        // 300ms pause allows browser audio buffers to flush cleanly
        restartTimerRef.current = setTimeout(() => {
          if (isListeningRef.current) {
            startRecognitionSession();
          }
        }, 300);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      isStartingRef.current = false;
      if (isListeningRef.current && consecutiveErrorsRef.current < 2) {
        consecutiveErrorsRef.current += 1;
        restartTimerRef.current = setTimeout(() => {
          if (isListeningRef.current) startRecognitionSession();
        }, 400);
      }
    }
  }, [cleanupCurrentSession, emitChange]);

  const toggleListening = useCallback((currentManualText?: string) => {
    if (isListeningRef.current) {
      // STOP
      isListeningRef.current = false;
      setIsListening(false);
      clearTimeout(restartTimerRef.current);
      consecutiveErrorsRef.current = 0;
      cleanupCurrentSession();

      // Ensure full finalized transcript is permanently preserved and emitted
      emitChange(allFinalTextRef.current);
    } else {
      // START
      const initialText = currentManualText !== undefined ? currentManualText : allFinalTextRef.current;
      allFinalTextRef.current = initialText;
      sessionFinalRef.current = '';
      isListeningRef.current = true;
      setIsListening(true);
      consecutiveErrorsRef.current = 0;
      startRecognitionSession();
    }
  }, [cleanupCurrentSession, emitChange, startRecognitionSession]);

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
      }, 250);
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
  }, [cleanupCurrentSession]);

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
