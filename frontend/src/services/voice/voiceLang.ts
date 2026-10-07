export type SupportedSpeechLang = "bn-BD" | "en-US" | "auto" | "bn" | "en";

/**
 * BCP-47 language for the Web Speech engine.
 *
 * Default is 'bn-BD' for Bangladeshi context: Chrome's Bengali model handles
 * mixed English technical terms (e.g., Focentia, Test, Architecture) natively
 * in Bengali sentences while preserving Bengali script accurately.
 */
export function resolveSpeechRecognitionLang(lang: SupportedSpeechLang | string | undefined): string {
  if (lang === "en" || lang === "en-US") {
    return "en-US";
  }
  return "bn-BD";
}

