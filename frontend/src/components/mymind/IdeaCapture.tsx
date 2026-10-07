"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
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
  
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
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
          {t.myMind.stepStr} {step} {t.myMind.of5}
        </span>
        <div className="w-14"></div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="slide-up">
          <h2 className="text-lg md:text-xl font-semibold mb-2 text-center text-foreground">
            {step === 1 && t.myMind.whatIsIdea}
            {step === 2 && t.myMind.whyInteresting}
            {step === 3 && t.myMind.whoIsItFor}
            {step === 4 && t.myMind.whatProblemSolve}
            {step === 5 && t.myMind.whatCouldBeNextStep}
          </h2>
          {step > 1 && (
            <p className="text-center text-sm mb-6 text-muted-foreground">
              {t.myMind.optionalStr}
            </p>
          )}
          {step === 1 && <div className="mb-6"></div>}
          
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
              placeholder={t.myMind.ideaVaultPlaceholder || "What's the core idea or spark?"}
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
