"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, ChevronDown } from "lucide-react";
import { useSpeechRecognition, SpeechLanguage } from "../../hooks/useSpeechRecognition";
import { useTranslation } from "../../hooks/useTranslation";

interface DiaryVoiceInputProps {
  onInsertText: (text: string) => void;
  onError?: (err: string) => void;
}

export default function DiaryVoiceInput({ onInsertText, onError }: DiaryVoiceInputProps) {
  const { t } = useTranslation();
  const [language, setLanguage] = useState<SpeechLanguage>("bn-BD");
  const waveRef = useRef<HTMLDivElement>(null);

  const onInsertTextRef = useRef(onInsertText);
  useEffect(() => {
    onInsertTextRef.current = onInsertText;
  }, [onInsertText]);

  const handleResult = useCallback((text: string, isFinal: boolean) => {
    if (isFinal && text.trim()) {
      if (onInsertTextRef.current) {
        onInsertTextRef.current(text);
      }
    }
  }, []);

  const {
    isSupported,
    isListening,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onResult: handleResult,
    onError,
  });

  // Audio waveform visualizer
  useEffect(() => {
    if (!isListening) return;

    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let rafId: number;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const update = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const vol = Math.min(avg / 75, 1.6);

          if (waveRef.current) {
            waveRef.current.style.setProperty("--voice-vol", vol.toString());
          }
          rafId = requestAnimationFrame(update);
        };
        update();
      })
      .catch((err) => console.error("Audio visualizer error:", err));

    return () => {
      cancelAnimationFrame(rafId);
      if (audioContext) {
        audioContext.close().catch(() => {});
      }
    };
  }, [isListening]);

  if (!isSupported) return null;

  return (
    <div className={`voice-input flex items-center gap-2 ${isListening ? "is-listening" : ""}`}>
      <button
        type="button"
        onClick={() => (isListening ? stopListening() : startListening(language))}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
          isListening
            ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse shadow-sm shadow-red-500/20"
            : "bg-blue-500/10 text-blue-400 border border-blue-500/25 hover:bg-blue-500/20 hover:text-blue-300"
        }`}
        title={isListening ? t.myMind.stopListening : t.myMind.speakThought}
        aria-label={isListening ? t.myMind.stopListening : t.myMind.startVoiceInput}
      >
        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
      </button>

      {isListening ? (
        <div className="voice-wave" role="status" aria-label="Listening" ref={waveRef}>
          <svg viewBox="0 0 240 48" aria-hidden="true" focusable="false">
            <path
              className="voice-wave__line voice-wave__line--back"
              d="M-16 25 C4 10 21 10 41 25 S78 40 98 25 S135 10 155 25 S192 40 212 25 S239 10 258 25"
            />
            <path
              className="voice-wave__line voice-wave__line--mid"
              d="M-16 25 C4 40 21 40 41 25 S78 10 98 25 S135 40 155 25 S192 10 212 25 S239 40 258 25"
            />
            <path
              className="voice-wave__line voice-wave__line--front"
              d="M-16 25 C4 17 21 17 41 25 S78 33 98 25 S135 17 155 25 S192 33 212 25 S239 17 258 25"
            />
          </svg>
        </div>
      ) : (
        <div className="relative inline-flex items-center">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as SpeechLanguage)}
            className="text-xs py-1.5 pl-2.5 pr-6 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-zinc-700 dark:text-zinc-300 appearance-none focus:outline-none cursor-pointer"
            aria-label="Speech recognition language"
          >
            <option value="bn-BD" className="bg-[#0F1729] text-white">
              {t.myMind.bangla}
            </option>
            <option value="en-US" className="bg-[#0F1729] text-white">
              {t.myMind.english}
            </option>
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-1.5 text-zinc-400" />
        </div>
      )}
    </div>
  );
}
