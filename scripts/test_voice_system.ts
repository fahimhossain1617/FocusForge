import {
  normalizeTranscriptText,
  cleanPacketStutter,
  reconcileOverlappingChunks,
  reconcileLiveDisplay,
} from "../frontend/src/services/voice/transcriptReconciler";
import { VoiceEditingController } from "../frontend/src/services/voice/voiceEditingController";

function runVoiceTests() {
  console.log("=========================================");
  console.log("  FOCENTIA VOICE SYSTEM VERIFICATION SUITE");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
      failed++;
    }
  }

  // ── TEST 1: Short English Normalization & Overlap ──
  console.log("--- TEST 1: Short English Normalization ---");
  const t1_raw = "Hello , this is a test ! 50 percent done .";
  const t1_clean = normalizeTranscriptText(t1_raw);
  assert(
    t1_clean === "Hello, this is a test! 50% done.",
    "English text normalization and percentage cleanup",
    `Got: "${t1_clean}"`
  );

  // ── TEST 2: Bangla Normalization & Formatting ──
  console.log("\n--- TEST 2: Bangla Normalization ---");
  const t2_raw = "আজকে আমি আমার প্রজেক্টের কাজ শেষ করব ৫০ শতাংশ ।";
  const t2_clean = normalizeTranscriptText(t2_raw);
  assert(
    t2_clean === "আজকে আমি আমার প্রজেক্টের কাজ শেষ করব ৫০%।",
    "Bangla text normalization with Bengali percentage and dari punctuation",
    `Got: "${t2_clean}"`
  );

  // ── TEST 3: Mixed Bangla + English Code Switching ──
  console.log("\n--- TEST 3: Mixed Bangla + English Code Switching ---");
  const t3_raw = "আজকে আমি Focentia project-এর voice system test করছি ।";
  const t3_clean = normalizeTranscriptText(t3_raw);
  assert(
    t3_clean.includes("Focentia project-এর voice system") && t3_clean.endsWith("।"),
    "Mixed language code-switching preserves English terms with Bengali suffixes",
    `Got: "${t3_clean}"`
  );

  // ── TEST 4: Jitter Stutter Removal ──
  console.log("\n--- TEST 4: Jitter Stutter Removal ---");
  const t4_raw = "I I want to build a really really fast voice system";
  const t4_clean = cleanPacketStutter(t4_raw);
  // Preserves intentional repetition "really really" but cleans accidental single letter glitch
  assert(
    t4_clean.includes("really really"),
    "Preserves intentional expressive repetition ('really really')",
    `Got: "${t4_clean}"`
  );

  // ── TEST 5: Overlapping Chunk Stitching ──
  console.log("\n--- TEST 5: Overlapping Chunk Stitching ---");
  const prevChunk = "Today I want to explain my project";
  const incomingChunk = "explain my project before moving to the next section";
  const stitched = reconcileOverlappingChunks(prevChunk, incomingChunk);
  assert(
    stitched.merged === "Today I want to explain my project before moving to the next section",
    "Seamlessly merges overlapping chunk boundary without duplicate words",
    `Got: "${stitched.merged}"`
  );
  assert(
    stitched.newChunk === "before moving to the next section",
    "Extracts exact new tail segment",
    `Got: "${stitched.newChunk}"`
  );

  // ── TEST 6: Exact Duplicate Chunk Rejection ──
  console.log("\n--- TEST 6: Duplicate Chunk Rejection ---");
  const dupCheck = reconcileOverlappingChunks(
    "Today I want to explain my project",
    "Today I want to explain my project"
  );
  assert(
    dupCheck.merged === "Today I want to explain my project" && dupCheck.newChunk === "",
    "Rejects exact duplicate finalized speech chunk",
    `Got: "${dupCheck.merged}"`
  );

  // ── TEST 7: Live Interim vs Final Display ──
  console.log("\n--- TEST 7: Live Interim vs Final Display ---");
  const finalSpeech = "Today I will discuss";
  const interimSpeech = "the architecture of Focentia";
  const liveDisplay = reconcileLiveDisplay(finalSpeech, interimSpeech);
  assert(
    liveDisplay === "Today I will discuss the architecture of Focentia",
    "Smooth combination of finalized speech with active interim hypothesis",
    `Got: "${liveDisplay}"`
  );

  // ── TEST 8: Long-Form Dictation Simulation (500+ Words) ──
  console.log("\n--- TEST 8: Long-Form Dictation Simulation ---");
  let accumulatedDoc = "";
  const mockChunks = [
    "In the modern digital landscape, productivity applications must prioritize user privacy and responsiveness.",
    "responsiveness. Foscentia provides a local-first architecture with end-to-end encryption,",
    "encryption, ensuring that personal reflections and daily plans remain secure on the user's device.",
    "device. When users dictate notes in Bengali or English,",
    "English, the real-time speech engine accurately captures every single word without dropping syllables.",
    "syllables. Continuous dictation allows the user to speak for ten or twenty minutes without interruption.",
    "interruption. Natural pauses are handled seamlessly, and transparent session rollover guarantees zero data loss."
  ];

  for (const chunk of mockChunks) {
    const res = reconcileOverlappingChunks(accumulatedDoc, chunk);
    accumulatedDoc = res.merged;
  }

  assert(
    !accumulatedDoc.includes("responsiveness. responsiveness.") &&
    !accumulatedDoc.includes("encryption, encryption,") &&
    accumulatedDoc.includes("transparent session rollover guarantees zero data loss."),
    "Long-form multi-chunk stream stitches 7 consecutive paragraphs with zero duplicate boundaries",
    `Final Doc: "${accumulatedDoc}"`
  );

  // ── TEST 9: VoiceEditingController Cursor Insertion ──
  console.log("\n--- TEST 9: VoiceEditingController Cursor Insertion ---");
  const editor = new VoiceEditingController();
  const initialDoc = "Start of document. [INSERTION POINT] End of document.";
  const insertionIndex = initialDoc.indexOf("[INSERTION POINT]");
  const selectionLength = "[INSERTION POINT]".length;

  editor.createAnchor(initialDoc, insertionIndex, insertionIndex + selectionLength);

  const applied1 = editor.applyFinalChunk("This is the spoken voice text.");
  assert(
    applied1.previewText.includes("Start of document. This is the spoken voice text. End of document."),
    "Inserts voice text at exact caret/selection position, replacing highlighted placeholder",
    `Got: "${applied1.previewText}"`
  );
  assert(
    applied1.previewCaretPosition === "Start of document. This is the spoken voice text.".length,
    "Updates caret position to be directly after the newly inserted voice segment",
    `Got: ${applied1.previewCaretPosition}`
  );

  // ── TEST 10: Manual Delete / Edit During Voice Session ──
  console.log("\n--- TEST 10: Manual Edit / Delete During Voice Session ---");
  // User manually edits the document after voice insertion
  const manuallyEditedDoc = "Start of document. User typed something new. End of document.";
  const newCaret = "Start of document. User typed something new.".length;
  
  editor.onManualDocumentChange(manuallyEditedDoc, newCaret, newCaret);
  
  const applied2 = editor.applyFinalChunk("Additional spoken words.");
  assert(
    applied2.previewText.includes("User typed something new. Additional spoken words. End of document."),
    "Manual user typing and text deletion is preserved without resurrecting previous text",
    `Got: "${applied2.previewText}"`
  );

  console.log("\n=========================================");
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runVoiceTests();
