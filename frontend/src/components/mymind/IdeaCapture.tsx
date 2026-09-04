"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import VoiceInput from "./VoiceInput";

interface IdeaCaptureProps {
  navigate: (view: string) => void;
}

export default function IdeaCapture({ navigate }: IdeaCaptureProps) {
  const { addMindItem, showToast } = useAppContext();
  const { t } = useTranslation();
  
  const [step, setStep] = useState(1);
  const [idea, setIdea] = useState("");
  const [interesting, setInteresting] = useState("");
  const [whoFor, setWhoFor] = useState("");
  const [problem, setProblem] = useState("");
  const [nextStep, setNextStep] = useState("");
  
  const [interim, setInterim] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [step]);

  const handleResult = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      const setter = step === 1 ? setIdea : step === 2 ? setInteresting : step === 3 ? setWhoFor : step === 4 ? setProblem : setNextStep;
      setter((prev) => {
        const needsSpace = prev.length > 0 && !prev.endsWith(" ") && !prev.endsWith("\n");
        return prev + (needsSpace ? " " : "") + text;
      });
      setInterim("");
    }
  }, [step]);

  const generateIdeaText = () => {
    let text = `${t.myMind.ideaCaptureHeader}\n\n`;
    text += `${t.myMind.whatIsTheIdea}\n${idea}\n\n`;
    
    if (interesting.trim()) text += `${t.myMind.whyInteresting}\n${interesting}\n\n`;
    if (whoFor.trim()) text += `${t.myMind.whoIsItFor}\n${whoFor}\n\n`;
    if (problem.trim()) text += `${t.myMind.whatProblemSolve}\n${problem}\n\n`;
    if (nextStep.trim()) text += `${t.myMind.nextStepStr}\n${nextStep}`;
    
    return text.trim();
  };

  const handleSaveIdea = () => {
    addMindItem(generateIdeaText(), 'idea_capture');
    showToast(t.myMind.toastIdeaSaved, "success");
    navigate('home');
  };

  const currentVal = step === 1 ? idea : step === 2 ? interesting : step === 3 ? whoFor : step === 4 ? problem : nextStep;
  const setCurrentVal = step === 1 ? setIdea : step === 2 ? setInteresting : step === 3 ? setWhoFor : step === 4 ? setProblem : setNextStep;
  
  const displayValue = currentVal + (interim ? ((currentVal && !currentVal.endsWith(" ") && !currentVal.endsWith("\n")) ? " " : "") + interim : "");

  return (
    <div className="fade-in max-w-2xl mx-auto py-10 min-h-[70vh] flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate('home')}
          className="text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--color-text-muted)" }}
        >
          {t.myMind.cancelLeft}
        </button>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          {t.myMind.stepStr} {step} {t.myMind.of5}
        </span>
        <div className="w-14"></div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="slide-up">
          <h2 className="text-2xl font-medium mb-2 text-center" style={{ color: "var(--color-text-primary)" }}>
            {step === 1 && t.myMind.whatIsIdea}
            {step === 2 && t.myMind.whyInteresting}
            {step === 3 && t.myMind.whoIsItFor}
            {step === 4 && t.myMind.whatProblemSolve}
            {step === 5 && t.myMind.whatCouldBeNextStep}
          </h2>
          {step > 1 && (
            <p className="text-center text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
              {t.myMind.optionalStr}
            </p>
          )}
          {step === 1 && <div className="mb-6"></div>}
          
          <div
            className="rounded-2xl border transition-all duration-300 relative pb-16 overflow-hidden"
            style={{
              background: "var(--color-bg-card)",
              borderColor: (isFocused || currentVal.trim()) ? "var(--color-purple-primary)" : "var(--color-border-subtle)",
              boxShadow: (isFocused || currentVal.trim()) ? "0 0 12px rgba(59, 130, 246, 0.1)" : "none",
            }}
          >
            <textarea
              ref={textareaRef}
              value={displayValue}
              onChange={(e) => setCurrentVal(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={t.myMind.writeFreely}
              className="w-full px-6 py-6 text-lg border-0 resize-none no-focus-ring bg-transparent my-mind-textarea"
              style={{ 
                background: "transparent", 
                border: "none",
                outline: "none", 
                minHeight: "150px",
                color: "var(--color-text-primary)" 
              }}
            />
            
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <VoiceInput onResult={handleResult} onInterimResult={setInterim} />
            </div>
          </div>

          <div className="mt-8 flex justify-between items-center">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t.myMind.backLeft}
              </button>
            ) : (
              <div></div>
            )}
            
            {step < 5 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{ 
                  background: (step > 1 || currentVal.trim()) ? "var(--color-purple-primary)" : "var(--color-bg-secondary)",
                  color: (step > 1 || currentVal.trim()) ? "white" : "var(--color-text-muted)"
                }}
                disabled={step === 1 && !currentVal.trim()}
              >
                {t.myMind.nextRight}
              </button>
            ) : (
              <button
                onClick={handleSaveIdea}
                className="px-6 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{ 
                  background: "var(--color-purple-primary)",
                  color: "white"
                }}
              >
                {t.myMind.saveIdea}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
