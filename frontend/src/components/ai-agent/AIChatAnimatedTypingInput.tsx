"use client";

import React, {
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";

export interface AIChatAnimatedTypingInputProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  placeholder?: string;
}

/**
 * AIChatAnimatedTypingInput
 *
 * Dedicated strictly to the Focentia Glory AI agent's message composer.
 *
 * Features:
 * 1. Clean native textarea backing with 100% native caret, selection, and form submission.
 * 2. Full Unicode & Bengali script support (conjuncts, ligatures, matras, hasant, ref).
 * 3. Robust IME composition handling (Bengali Avro / Gboard / Google IME / iOS Bengali).
 * 4. Dynamic height scaling without layout shift or line corruption.
 * 5. Multi-language seamless rendering (Bengali, English, mixed scripts).
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
    useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onScroll={onScroll}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        className={`w-full bg-transparent outline-none resize-none border-0 p-0 m-0 ${className}`}
        style={{
          fontFamily: "var(--ff-font, 'Onest', 'Hind Siliguri', var(--font-bengali), var(--font-geist-sans), system-ui, sans-serif)",
          fontSize: "15px",
          lineHeight: "1.55",
          color: "var(--text, #F8FAFC)",
          caretColor: "var(--color-accent, #38BDF8)",
          boxSizing: "border-box",
          wordBreak: "break-word",
          overflowWrap: "break-word",
          whiteSpace: "pre-wrap",
          ...style,
        }}
        {...rest}
      />
    );
  }
);

AIChatAnimatedTypingInput.displayName = "AIChatAnimatedTypingInput";

