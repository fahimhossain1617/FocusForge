"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
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
  
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
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

  return (
    <div className="motion-page max-w-2xl mx-auto py-10 min-h-[70vh] flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <button 
          type="button"
          onClick={() => navigate('home')}
          className="inline-flex items-center justify-center w-9 h-9 -ml-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-colors cursor-pointer"
          aria-label={t.myMind.backToMyMind || "Back to Capture"}
          title={t.myMind.backToMyMind || "Back to Capture"}
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2} />
        </button>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          {t.myMind.stepStr} {step} {t.myMind.of4}
        </span>
        <div className="w-14"></div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="slide-up">
          <h2 className="text-lg md:text-xl font-semibold mb-6 text-center text-foreground">
            {step === 1 && t.myMind.whatHappened}
            {step === 2 && t.myMind.whyBothering}
            {step === 3 && t.myMind.whatOptions}
            {step === 4 && t.myMind.whatSmallestNextStep}
          </h2>
          
          <div
            className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111827] relative pb-16 shadow-none"
          >
            <textarea
              ref={textareaRef}
              value={currentVal}
              onChange={(e) => {
                setCurrentVal(e.target.value);
                const el = textareaRef.current;
                if (el) {
                  el.style.height = "auto";
                  const scrollH = el.scrollHeight;
                  if (scrollH > 240) {
                    el.style.height = "240px";
                    el.style.overflowY = "auto";
                  } else {
                    el.style.height = `${Math.max(scrollH, 100)}px`;
                    el.style.overflowY = "hidden";
                  }
                  el.scrollTop = el.scrollHeight;
                }
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={t.myMind.problemSolverPlaceholder || "What problem are you trying to break down?"}
              className="w-full px-6 py-6 text-lg border-0 resize-none no-focus-ring bg-transparent my-mind-textarea"
              style={{ 
                background: "transparent", 
                border: "none",
                outline: "none", 
                minHeight: "100px",
                maxHeight: "240px",
                height: "auto",
                overflowY: "hidden",
                color: "var(--color-text-primary)" 
              }}
            />
            
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-2 max-w-[calc(100%-40px)]">
                <VoiceInput 
                  editorRef={textareaRef}
                  currentValue={currentVal}
                  onValueChange={(val) => setCurrentVal(val)}
                />
              </div>
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
