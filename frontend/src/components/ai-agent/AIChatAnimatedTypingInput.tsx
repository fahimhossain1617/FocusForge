"use client";

import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";

export interface AIChatAnimatedTypingInputProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  placeholder?: string;
}

interface CharToken {
  id: number;
  char: string;
  isNew: boolean;
}

let nextCharId = 1;

/**
 * AIChatAnimatedTypingInput
 *
 * Dedicated strictly to the FocusForge AI agent's chat composer.
 *
 * Features:
 * 1. Static single placeholder string ("Ask FocusForge anything...").
 * 2. Subtle character-by-character animated entrance (~100ms fade-in + 2px upward slide)
 *    only for live keystrokes.
 * 3. Instant deletion on backspace (zero animation).
 * 4. Instant paste (all pasted text renders immediately without per-char animation).
 * 5. Full IME/composition support (Bangla/non-Latin scripts).
 * 6. True native textarea backing with 100% native caret, selection, auto-growing height,
 *    and form submission.
 */
export const AIChatAnimatedTypingInput = forwardRef<
  HTMLTextAreaElement,
  AIChatAnimatedTypingInputProps
>(
  (
    {
      value = "",
      onChange,
      onKeyDown,
      onScroll,
      onCompositionStart,
      onCompositionEnd,
      placeholder = "Chat with Glory...",
      className = "",
      style,
      disabled,
      rows = 1,
      ...rest
    },
    ref
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mirrorRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

    const stringVal = typeof value === "string" ? value : String(value ?? "");

    // List of character tokens with persistent IDs
    const [tokens, setTokens] = useState<CharToken[]>(() =>
      stringVal.split("").map((c) => ({ id: nextCharId++, char: c, isNew: false }))
    );

    const prevValRef = useRef(stringVal);
    const isComposingRef = useRef(false);

    // Synchronize tokens on value changes
    useEffect(() => {
      const prev = prevValRef.current;
      const curr = stringVal;
      prevValRef.current = curr;

      if (prev === curr) return;

      if (curr === "") {
        setTokens([]);
        return;
      }

      // Check if it was a single character appended to the end (live keystroke)
      const isSingleAppended =
        !isComposingRef.current &&
        curr.length === prev.length + 1 &&
        curr.startsWith(prev);

      if (isSingleAppended) {
        const newChar = curr[curr.length - 1];
        setTokens((prevTokens) => [
          ...prevTokens,
          { id: nextCharId++, char: newChar, isNew: true },
        ]);
        return;
      }

      // Check if it was a single character inserted at some index
      const isSingleInserted =
        !isComposingRef.current && curr.length === prev.length + 1;

      if (isSingleInserted) {
        // Find the index of insertion
        let diffIdx = 0;
        while (diffIdx < prev.length && prev[diffIdx] === curr[diffIdx]) {
          diffIdx++;
        }
        setTokens((prevTokens) => {
          const updated = [...prevTokens];
          updated.splice(diffIdx, 0, {
            id: nextCharId++,
            char: curr[diffIdx],
            isNew: true,
          });
          return updated;
        });
        return;
      }

      // Pasted text, multi-char deletion, or IME composition: render instantly without animation
      setTokens(
        curr.split("").map((c) => ({ id: nextCharId++, char: c, isNew: false }))
      );
    }, [stringVal]);

    // Sync scrolling between real textarea and mirror layer
    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
      if (mirrorRef.current) {
        mirrorRef.current.scrollTop = e.currentTarget.scrollTop;
      }
      if (onScroll) onScroll(e);
    };

    const handleCompositionStart = (
      e: React.CompositionEvent<HTMLTextAreaElement>
    ) => {
      isComposingRef.current = true;
      if (onCompositionStart) onCompositionStart(e);
    };

    const handleCompositionEnd = (
      e: React.CompositionEvent<HTMLTextAreaElement>
    ) => {
      isComposingRef.current = false;
      if (onCompositionEnd) onCompositionEnd(e);
    };

    const isEmpty = stringVal.length === 0;

    return (
      <div className="relative flex-1 min-w-0 w-full flex items-center">
        {/* Visual Mirror & Animated Character Layer */}
        <div
          ref={mirrorRef}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none overflow-hidden select-none"
          style={{
            fontFamily: "inherit",
            fontSize: "inherit",
            lineHeight: "inherit",
            letterSpacing: "inherit",
            padding: 0,
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "var(--text, currentColor)",
          }}
        >
          {isEmpty ? (
            <span className="text-muted-foreground/50 dark:text-muted-foreground/40 pointer-events-none select-none">
              {placeholder}
            </span>
          ) : (
            tokens.map((tok) => (
              <span
                key={tok.id}
                className={tok.isNew ? "ai-char-entrance" : "inline"}
                style={{ display: "inline" }}
              >
                {tok.char}
              </span>
            ))
          )}
        </div>

        {/* Real Native Interactive Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onScroll={handleScroll}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          disabled={disabled}
          rows={rows}
          placeholder=""
          className={`relative z-10 w-full bg-transparent outline-none resize-none ${className}`}
          style={{
            ...style,
            color: "transparent",
            caretColor: "var(--color-accent, #3B82F6)",
            padding: 0,
            margin: 0,
          }}
          {...rest}
        />

        <style jsx>{`
          @keyframes aiCharEntrance {
            0% {
              opacity: 0;
              transform: translateY(2px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          :global(.ai-char-entrance) {
            display: inline;
            animation: aiCharEntrance 100ms cubic-bezier(0.2, 0.9, 0.4, 1) forwards;
          }
          @media (prefers-reduced-motion: reduce) {
            :global(.ai-char-entrance) {
              animation: none !important;
              opacity: 1 !important;
              transform: none !important;
            }
          }
        `}</style>
      </div>
    );
  }
);

AIChatAnimatedTypingInput.displayName = "AIChatAnimatedTypingInput";
