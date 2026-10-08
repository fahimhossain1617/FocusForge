'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Mic, Square, Languages } from 'lucide-react';
import { useContinuousSpeech } from '@/hooks/useContinuousSpeech';
import VoiceWaveform from '@/components/voice/VoiceWaveform';

interface VoiceInputProps {
  value?: string;
  onChange?: (val: string) => void;
  onSave?: (val: string) => void;
  currentValue?: string;
  onValueChange?: (val: string) => void;
  editorRef?: React.RefObject<HTMLTextAreaElement | null>;
  onError?: (err: string) => void;
  onListeningChange?: (isListening: boolean) => void;
  showLangToggle?: boolean;
}

export default function VoiceInput({
  value: externalValue,
  onChange,
  onSave,
  currentValue,
  onValueChange,
  editorRef: externalTextareaRef,
  onError,
  onListeningChange,
  showLangToggle = true,
}: VoiceInputProps) {
  const incomingValue = externalValue !== undefined ? externalValue : (currentValue !== undefined ? currentValue : '');
  const localTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaRef = externalTextareaRef || localTextareaRef;

  const handleTextChange = onChange || onValueChange;

  // Auto-expand smoothly and auto-scroll to bottom
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const scrollH = el.scrollHeight;
    const maxHeight = 240;

    if (scrollH > maxHeight) {
      el.style.height = `${maxHeight}px`;
      el.style.overflowY = 'auto';
    } else {
      el.style.height = `${Math.max(scrollH, 64)}px`;
      el.style.overflowY = 'hidden';
    }
    el.scrollTop = el.scrollHeight;
  }, [textareaRef]);

  const {
    text,
    isListening,
    lang,
    toggleListening: baseToggleListening,
    toggleLanguage,
    setManualText,
  } = useContinuousSpeech({
    initialLang: 'bn-BD',
    onTranscriptChange: (newText) => {
      if (handleTextChange) {
        handleTextChange(newText);
      }
      requestAnimationFrame(() => {
        adjustHeight();
      });
    },
    onError: (err) => {
      onError?.(err);
    },
  });

  // Sync external incoming value changes when not listening
  useEffect(() => {
    if (incomingValue !== undefined && !isListening) {
      setManualText(incomingValue);
      requestAnimationFrame(() => {
        adjustHeight();
      });
    }
  }, [incomingValue, isListening, setManualText, adjustHeight]);

  // Adjust height on value changes
  useEffect(() => {
    adjustHeight();
  }, [text, incomingValue, adjustHeight]);

  useEffect(() => {
    onListeningChange?.(isListening);
  }, [isListening, onListeningChange]);

  const toggleListening = () => {
    const activeText = incomingValue !== undefined && incomingValue !== '' ? incomingValue : text;
    baseToggleListening(activeText);
    textareaRef.current?.focus();
  };

  const currentDisplayValue = incomingValue !== undefined && incomingValue !== '' ? incomingValue : text;
  const isBn = lang === 'bn-BD';

  return (
    <div className="w-full">
      {/* If used standalone without external textarea, render self-contained textarea with waveform when active */}
      {!externalTextareaRef && (
        <div className="relative w-full min-h-[64px] flex flex-col gap-1.5 mb-2">
          {isListening && (
            <div className="w-full py-1.5 flex items-center justify-center pointer-events-none">
              <VoiceWaveform active={isListening} isBengali={isBn} />
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={currentDisplayValue}
            onChange={(e) => {
              const nextVal = e.target.value;
              setManualText(nextVal);
              handleTextChange?.(nextVal);
              adjustHeight();
            }}
            placeholder={isListening ? (isBn ? "বলুন, কথা শোনা হচ্ছে..." : "Listening, speak now...") : "Write whatever comes to mind..."}
            className="w-full bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 text-base leading-relaxed resize-none outline-none"
            style={{ minHeight: '64px', maxHeight: '240px', height: 'auto', overflowY: 'hidden' }}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Mic / Stop Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`w-9 h-9 rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-xs active:scale-95 ${
              isListening
                ? 'bg-purple-600 dark:bg-purple-500 text-white shadow-purple-500/20'
                : 'bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
            }`}
            title={isListening ? (isBn ? 'ভয়েস থামান' : 'Stop Listening') : (isBn ? 'ভয়েস ইনপুট' : 'Start Listening')}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
          >
            {isListening ? <Square size={13} fill="currentColor" /> : <Mic size={16} strokeWidth={1.8} />}
          </button>

          {/* Language Toggle Button */}
          {showLangToggle && (
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition cursor-pointer shadow-xs active:scale-95 select-none"
              title={isBn ? 'Switch to English (ইংরেজি সিলেক্ট করুন)' : 'বাংলায় সুইচ করুন'}
              aria-label={isBn ? 'Switch voice recognition to English' : 'Switch voice recognition to Bangla'}
            >
              <Languages size={13} className="text-purple-600 dark:text-purple-400 shrink-0" />
              <span>{isBn ? 'বাং' : 'EN'}</span>
            </button>
          )}
        </div>

        {/* Optional Save Button if onSave provided */}
        {onSave && (
          <button
            type="button"
            onClick={() => onSave(currentDisplayValue)}
            className="px-4 py-1.5 text-sm font-medium rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition cursor-pointer"
          >
            Save
          </button>
        )}
      </div>
    </div>
  );
}

export { type VoiceInputProps };
