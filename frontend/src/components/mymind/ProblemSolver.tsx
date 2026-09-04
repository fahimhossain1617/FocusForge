"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import VoiceInput from "./VoiceInput";

interface ProblemSolverProps {
  navigate: (view: string) => void;
}

export default function ProblemSolver({ navigate }: ProblemSolverProps) {
  const { addMindItem, showToast } = useAppContext();
  const { t } = useTranslation();
  
  const [step, setStep] = useState(1);
  const [happened, setHappened] = useState("");
  const [bothering, setBothering] = useState("");
  const [options, setOptions] = useState("");
  const [nextStep, setNextStep] = useState("");
  
  const [interim, setInterim] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [step]);

  const handleResult = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      const setter = step === 1 ? setHappened : step === 2 ? setBothering : step === 3 ? setOptions : setNextStep;
      setter((prev) => {
        const needsSpace = prev.length > 0 && !prev.endsWith(" ") && !prev.endsWith("\n");
        return prev + (needsSpace ? " " : "") + text;
      });
      setInterim("");
    }
  }, [step]);

  const generateReflectionText = () => {
    let text = `${t.myMind.problemSolverReflection}\n\n`;
    if (happened.trim()) text += `${t.myMind.whatHappened}\n${happened}\n\n`;
    if (bothering.trim()) text += `${t.myMind.whyBothering}\n${bothering}\n\n`;
    if (options.trim()) text += `${t.myMind.whatOptions}\n${options}\n\n`;
    if (nextStep.trim()) text += `${t.myMind.smallestNextStep}\n${nextStep}`;
    return text.trim();
  };

  const handleSaveReflection = () => {
    addMindItem(generateReflectionText(), 'problem_solver');
    showToast(t.myMind.toastReflectionSaved, "success");
    navigate('home');
  };

  const currentVal = step === 1 ? happened : step === 2 ? bothering : step === 3 ? options : nextStep;
  const setCurrentVal = step === 1 ? setHappened : step === 2 ? setBothering : step === 3 ? setOptions : setNextStep;
  
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
          {t.myMind.stepStr} {step} {t.myMind.of4}
        </span>
        <div className="w-14"></div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="slide-up">
          <h2 className="text-2xl font-medium mb-6 text-center" style={{ color: "var(--color-text-primary)" }}>
            {step === 1 && t.myMind.whatHappened}
            {step === 2 && t.myMind.whyBothering}
            {step === 3 && t.myMind.whatOptions}
            {step === 4 && t.myMind.whatSmallestNextStep}
          </h2>
          
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
            
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{ 
                  background: currentVal.trim() ? "var(--color-purple-primary)" : "var(--color-bg-secondary)",
                  color: currentVal.trim() ? "white" : "var(--color-text-muted)"
                }}
              >
                {t.myMind.nextRight}
              </button>
            ) : (
              <button
                onClick={handleSaveReflection}
                className="px-6 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{ 
                  background: "var(--color-purple-primary)",
                  color: "white"
                }}
              >
                {t.myMind.saveReflection}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
