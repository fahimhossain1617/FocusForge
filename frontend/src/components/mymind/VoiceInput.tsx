'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Languages } from 'lucide-react';
import { useContinuousSpeech } from '@/hooks/useContinuousSpeech';

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

  return (
    <div className="w-full">
      {/* If used standalone without external textarea, render self-contained textarea */}
      {!externalTextareaRef && (
        <textarea
          ref={textareaRef}
          value={currentDisplayValue}
          onChange={(e) => {
            const nextVal = e.target.value;
            setManualText(nextVal);
            handleTextChange?.(nextVal);
            adjustHeight();
          }}
          placeholder="Write whatever comes to mind..."
          className="w-full bg-transparent text-neutral-100 placeholder-neutral-500 text-base leading-relaxed resize-none outline-none"
          style={{ minHeight: '64px', maxHeight: '240px', height: 'auto', overflowY: 'hidden' }}
        />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Mic Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2.5 rounded-full transition-all flex items-center justify-center cursor-pointer ${
              isListening
                ? 'bg-blue-600 text-white animate-pulse'
                : 'bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-700'
            }`}
            title={isListening ? 'Stop Listening' : 'Start Listening'}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
          >
            {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Language Toggle Button */}
          {showLangToggle && (
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 transition cursor-pointer"
              title={lang === 'bn-BD' ? 'Switch to English' : 'বাংলায় সুইচ করুন'}
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{lang === 'bn-BD' ? 'বাং' : 'Eng'}</span>
            </button>
          )}
        </div>

        {/* Optional Save Button if onSave provided */}
        {onSave && (
          <button
            type="button"
            onClick={() => onSave(currentDisplayValue)}
            className="px-4 py-1.5 text-sm font-medium rounded-lg bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white transition cursor-pointer"
          >
            Save
          </button>
        )}
      </div>
    </div>
  );
}

export { type VoiceInputProps };
