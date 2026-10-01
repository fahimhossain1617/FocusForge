"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

interface OtpSuccessTransitionProps {
  isSuccess: boolean;
  otp: string[];
  activeIdx: number;
  loading: boolean;
  inputRefs: React.RefObject<(HTMLInputElement | null)[]>;
  handleOtpChange: (index: number, val: string) => void;
  handleKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  handlePaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  setActiveIdx: (index: number) => void;
}

export function OtpSuccessTransition({
  isSuccess,
  otp,
  activeIdx,
  loading,
  inputRefs,
  handleOtpChange,
  handleKeyDown,
  handlePaste,
  setActiveIdx,
}: OtpSuccessTransitionProps) {
  return (
    <div
      className="auth-otp-wrap"
      style={{
        position: "relative",
        minHeight: "80px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "12px 0 16px",
      }}
    >
      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.div
            key="otp-six-boxes"
            className="flex items-center justify-center gap-2 w-full"
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              transition: { duration: 0.35, ease: "easeInOut" },
            }}
          >
            {otp.map((digit, i) => {
              const hasDigit = Boolean(digit);
              const isFocused = activeIdx === i;
              return (
                <motion.div
                  key={`otp-box-cell-${i}`}
                  className={`auth-otp-cell ${hasDigit ? "has-digit" : ""} ${isFocused ? "is-focused" : ""}`}
                  onClick={() => inputRefs.current[i]?.focus()}
                  exit={{
                    // Converge toward the center (center is index 2.5)
                    x: (2.5 - i) * -26,
                    scale: 0.75,
                    opacity: 0,
                    transition: {
                      type: "spring",
                      stiffness: 300,
                      damping: 24,
                    },
                  }}
                >
                  <div className="auth-otp-cell-inner">
                    <motion.div
                      className="w-full h-full flex items-center justify-center"
                      exit={{
                        y: -12,
                        opacity: 0,
                        transition: { duration: 0.2 },
                      }}
                    >
                      <input
                        ref={(el) => {
                          inputRefs.current[i] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        value={digit}
                        className="auth-otp-input"
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        onFocus={() => setActiveIdx(i)}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        onPaste={handlePaste}
                        aria-label={`Digit ${i + 1}`}
                        autoComplete="one-time-code"
                        disabled={loading || isSuccess}
                      />
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="otp-merged-success-card"
            className="auth-otp-success-card"
            initial={{
              scale: 0.75,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            transition={{
              type: "spring",
              stiffness: 360,
              damping: 18,
              bounce: 0.35,
              duration: 0.5,
            }}
          >
            <div className="auth-otp-success-inner">
              <motion.div
                className="auth-otp-success-circle"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.15,
                  type: "spring",
                  stiffness: 350,
                  damping: 18,
                }}
              >
                <motion.svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ color: "currentColor" }}
                >
                  <motion.path
                    d="M5 13l4.5 4.5L19 7"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      delay: 0.25,
                      type: "spring",
                      stiffness: 220,
                      damping: 20,
                      duration: 0.5,
                    }}
                  />
                </motion.svg>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
