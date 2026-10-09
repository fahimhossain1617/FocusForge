"use client";

import React, { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface RollingDigitProps {
  value: string | number;
  size?: "sm" | "md" | "lg" | "xl" | "fullscreen";
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const SIZE_CONFIGS = {
  sm: {
    box: "w-7 h-10 sm:w-8 sm:h-12 rounded-lg text-xl sm:text-2xl",
    digitH: "h-10 sm:h-12",
  },
  md: {
    box: "w-9 h-13 sm:w-11 sm:h-16 md:w-13 md:h-18 rounded-xl text-2xl sm:text-3xl md:text-4xl",
    digitH: "h-13 sm:h-16 md:h-18",
  },
  lg: {
    box: "w-11 h-16 sm:w-14 sm:h-20 md:w-18 md:h-26 lg:w-20 lg:h-28 rounded-xl sm:rounded-2xl text-3xl sm:text-5xl md:text-6xl lg:text-7xl",
    digitH: "h-16 sm:h-20 md:h-26 lg:h-28",
  },
  xl: {
    box: "w-12 h-18 sm:w-16 sm:h-24 md:w-20 md:h-30 lg:w-24 lg:h-36 rounded-2xl text-4xl sm:text-6xl md:text-7xl lg:text-8xl",
    digitH: "h-18 sm:h-24 md:h-30 lg:h-36",
  },
  fullscreen: {
    box: "w-14 h-20 sm:w-20 sm:h-30 md:w-28 md:h-40 lg:w-36 lg:h-52 rounded-2xl sm:rounded-3xl text-4xl sm:text-7xl md:text-8xl lg:text-9xl",
    digitH: "h-20 sm:h-30 md:h-40 lg:h-52",
  },
};

export const RollingDigit = memo(function RollingDigit({
  value,
  size = "lg",
}: RollingDigitProps) {
  const numericValue = typeof value === "number" ? value : parseInt(String(value), 10);
  const safeDigit = isNaN(numericValue) ? 0 : Math.max(0, Math.min(9, numericValue));
  const shouldReduceMotion = useReducedMotion();
  const config = SIZE_CONFIGS[size] || SIZE_CONFIGS.lg;

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden font-mono font-bold select-none tabular-nums border ${config.box} bg-[#F4F8FD] dark:bg-[#111827] border-[#DCE5F0] dark:border-white/10 text-[#111827] dark:text-white shadow-none transition-colors`}
      style={{
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <motion.div
        className="flex flex-col items-center absolute top-0 left-0 right-0 w-full"
        initial={false}
        animate={{
          y: `-${safeDigit * 10}%`,
        }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : {
                type: "spring",
                stiffness: 300,
                damping: 28,
                mass: 0.75,
              }
        }
        style={{
          height: "1000%",
        }}
      >
        {DIGITS.map((num) => (
          <div
            key={num}
            className={`w-full flex items-center justify-center shrink-0 ${config.digitH}`}
            style={{
              height: "10%",
            }}
          >
            {num}
          </div>
        ))}
      </motion.div>
    </div>
  );
});
export default RollingDigit;
