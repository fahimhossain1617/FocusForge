"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, ChevronDown } from "lucide-react";
import { useSpeechRecognition, SpeechLanguage } from "../../hooks/useSpeechRecognition";
import { useTranslation } from "../../hooks/useTranslation";

interface VoiceInputProps {
  onResult: (text: string, isFinal: boolean) => void;
  onInterimResult?: (text: string) => void;
  onError?: (err: string) => void;
}

export default function VoiceInput({ onResult, onInterimResult, onError }: VoiceInputProps) {
  const { t } = useTranslation();
  const [language, setLanguage] = useState<SpeechLanguage>("bn-BD");
  
  const {
    isSupported,
    isListening,
    interimText,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onResult,
    onError
  });

  useEffect(() => {
    if (onInterimResult) {
      onInterimResult(interimText);
    }
  }, [interimText, onInterimResult]);

  const waveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isListening) return;
    
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let rafId: number;
    let mediaStream: MediaStream;
    
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      mediaStream = stream;
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const update = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) { sum += dataArray[i]; }
        const avg = sum / dataArray.length;
        
        // Enhance volume variation: 
        // We use Math.pow to make it more sensitive to quiet sounds, and cap it.
        const vol = Math.min((avg / 80), 1.5); 
        
        if (waveRef.current) {
          waveRef.current.style.setProperty('--voice-vol', vol.toString());
        }
        rafId = requestAnimationFrame(update);
      };
      update();
    }).catch(err => console.error("Error with audio visualizer:", err));
    
    return () => {
      cancelAnimationFrame(rafId);
      if (audioContext) {
        audioContext.close().catch(() => {});
      }
      // We do not stop the media stream tracks here because they might be shared with SpeechRecognition
    };
  }, [isListening]);

  if (!isSupported) return null;

  return (
    <div className={`voice-input flex items-center gap-2 ${isListening ? "is-listening" : ""}`}>
      <button
        type="button"
        onClick={() => isListening ? stopListening() : startListening(language)}
        className="voice-input__toggle w-10 h-10 flex items-center justify-center transition-all"
        title={isListening ? t.myMind.stopListening : t.myMind.speakThought}
        aria-label={isListening ? t.myMind.stopListening : t.myMind.startVoiceInput}
      >
        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
      </button>
      
      {isListening ? (
        <div className="voice-wave" role="status" aria-label="Listening" ref={waveRef}>
          <svg viewBox="0 0 240 48" aria-hidden="true" focusable="false">
            <path className="voice-wave__line voice-wave__line--back" d="M-16 25 C4 10 21 10 41 25 S78 40 98 25 S135 10 155 25 S192 40 212 25 S239 10 258 25" />
            <path className="voice-wave__line voice-wave__line--mid" d="M-16 25 C4 40 21 40 41 25 S78 10 98 25 S135 40 155 25 S192 10 212 25 S239 40 258 25" />
            <path className="voice-wave__line voice-wave__line--front" d="M-16 25 C4 17 21 17 41 25 S78 33 98 25 S135 17 155 25 S192 33 212 25 S239 17 258 25" />
          </svg>
        </div>
      ) : (
        <div className="relative inline-flex items-center">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as SpeechLanguage)}
            className="voice-lang-select"
            aria-label="Speech recognition language"
          >
            <option value="bn-BD" className="bg-[#0F1729] text-white">{t.myMind.bangla}</option>
            <option value="en-US" className="bg-[#0F1729] text-white">{t.myMind.english}</option>
          </select>
          <ChevronDown 
            size={12} 
            className="pointer-events-none absolute right-2 text-zinc-400" 
          />
        </div>
      )}
    </div>
  );
}
