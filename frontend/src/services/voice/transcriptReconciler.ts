/**
 * transcriptReconciler.ts — Foscentia Production Voice Transcript Reconciler
 * 
 * Pure, deterministic functions for:
 * 1. Safe text normalization (Bengali & English percentages, numbers, punctuation spacing)
 * 2. Stutter removal (cleaning audio packet jitter while preserving intentional word repetition)
 * 3. Overlap deduplication across streaming chunks and session boundaries
 * 4. Stable interim vs finalized transcript reconciliation
 */

/**
 * Normalizes numbers, percentages, and punctuation spacing safely.
 * e.g., "৫০ শতাংশ" -> "৫০%", "25 percent" -> "25%"
 */
export function normalizeTranscriptText(text: string): string {
  if (!text) return "";
  let clean = text;

  // Bengali percentages: ৫০ শতাংশ / ৫০ পার্সেন্ট / ৫০ পারসেন্ট -> ৫০%
  clean = clean.replace(/([\d\u09E6-\u09EF]+)\s*(?:শতাংশ|পার্সেন্ট|পারসেন্ট|ভাগ)/gu, "$1%");

  // English percentages: 25 percent / 25 % -> 25%
  clean = clean.replace(/(\d+)\s*(?:percent|%)\b/gi, "$1%");

  // Fix spacing before standard punctuation (, . ! ? ; : ।)
  clean = clean.replace(/\s+([,.\u0964!?;:])/g, "$1");

  // Ensure single space after punctuation if followed by a letter/digit
  clean = clean.replace(/([,.\u0964!?;:])([^\s,.\u0964!?;:\d])/gu, "$1 $2");

  // Collapse multiple whitespaces (preserve single linebreaks)
  clean = clean.replace(/[^\S\r\n]+/g, " ").trim();

  return clean;
}

/**
 * Cleans unintended stutter from audio packet jitter (e.g., "I I want" -> "I want").
 * CAUTION: Preserves intentional expressive Bengali/English repetitions (e.g. "অনেক অনেক", "really really").
 * Only strips immediate duplicate single-letter or short glitch fragments.
 */
export function cleanPacketStutter(text: string): string {
  if (!text) return "";
  const words = text.split(/\s+/);
  if (words.length <= 1) return text;

  const result: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const cur = words[i];
    const prev = result[result.length - 1];

    // Strip immediate duplicate only if it's very short (1-2 chars) or an exact case-insensitive match occurring 3+ times
    if (prev && cur.length === 1 && cur.toLowerCase() === prev.toLowerCase()) {
      continue;
    }
    // If exact duplicate word is repeated 3 or more times consecutively, clamp to 2
    if (result.length >= 2 && cur.toLowerCase() === prev.toLowerCase() && cur.toLowerCase() === result[result.length - 2].toLowerCase()) {
      continue;
    }

    result.push(cur);
  }

  return result.join(" ");
}

/**
 * Strips punctuation and case for word comparison
 */
function cleanWordForComparison(w: string): string {
  return w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

/**
 * Intelligently stitches an incoming finalized chunk onto the previously accumulated text.
 * Eliminates duplicate overlapping words caused by streaming recognition window boundaries.
 * 
 * Returns:
 * - merged: The full accumulated transcript
 * - newChunk: The newly added segment alone
 */
export function reconcileOverlappingChunks(
  previousText: string,
  incomingChunk: string
): { merged: string; newChunk: string } {
  const prev = (previousText || "").trim();
  const next = normalizeTranscriptText(cleanPacketStutter(incomingChunk || "")).trim();

  if (!prev) return { merged: next, newChunk: next };
  if (!next) return { merged: prev, newChunk: "" };

  // If next is strictly identical to prev, reject immediate exact duplicate
  if (prev === next) {
    return { merged: prev, newChunk: "" };
  }

  const prevWords = prev.split(/\s+/);
  const nextWords = next.split(/\s+/);

  // Check for word overlap of 1 to up to 16 words between the tail of prev and head of next
  const maxOverlap = Math.min(prevWords.length, nextWords.length, 16);
  let overlapCount = 0;

  for (let k = maxOverlap; k >= 1; k--) {
    const prevSlice = prevWords.slice(prevWords.length - k);
    const nextSlice = nextWords.slice(0, k);

    let match = true;
    for (let i = 0; i < k; i++) {
      if (cleanWordForComparison(prevSlice[i]) !== cleanWordForComparison(nextSlice[i])) {
        match = false;
        break;
      }
    }

    if (match) {
      overlapCount = k;
      break;
    }
  }

  const remainingWords = nextWords.slice(overlapCount);
  if (remainingWords.length === 0) {
    return { merged: prev, newChunk: "" };
  }

  const newChunk = remainingWords.join(" ");
  const needsSpace = prev.length > 0 && !prev.endsWith(" ") && !prev.endsWith("\n");
  const merged = `${prev}${needsSpace ? " " : ""}${newChunk}`.trim();

  return { merged, newChunk };
}

/**
 * Combines finalized transcript with live interim hypothesis for real-time display.
 * Never modifies the immutable finalized transcript.
 */
export function reconcileLiveDisplay(finalText: string, interimText: string): string {
  const cleanFinal = (finalText || "").trim();
  const cleanInterim = normalizeTranscriptText((interimText || "").trim());

  if (!cleanFinal) return cleanInterim;
  if (!cleanInterim) return cleanFinal;

  const needsSpace = !cleanFinal.endsWith(" ") && !cleanFinal.endsWith("\n");
  return `${cleanFinal}${needsSpace ? " " : ""}${cleanInterim}`;
}
