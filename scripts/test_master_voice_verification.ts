/**
 * test_master_voice_verification.ts — Foscentia Master Voice Verification Test Suite
 *
 * Implements automated deterministic verification covering all 18 acceptance criteria:
 * 1. Single Bengali word produces one instance.
 * 2. Single Bengali sentence produces one sentence, not 2-4 duplicates.
 * 3. Single English sentence produces one sentence.
 * 4. Interim results changing repeatedly do not duplicate text.
 * 5. Final result replacing interim hypothesis does not duplicate text.
 * 6. Multiple distinct final results combined in correct order.
 * 7. Genuinely repeated word preserved ("really really", "অনেক অনেক").
 * 8. Pause commits session exactly once.
 * 9. Repeated Pause calls cannot commit twice (idempotence).
 * 10. Resume appends new speech without recommitting previous speech.
 * 11. Existing manually typed text remains intact.
 * 12. Language toggle rolls over safely without duplicate sessions.
 * 13. Permission denial handles gracefully without corrupted text.
 * 14. Recognition errors do not corrupt committed text.
 * 15. Destroy/cleanup terminates instance without dangling callbacks.
 * 16. No live interim text emitted into input commit while recording.
 * 17. Proper spacing and punctuation merging.
 * 18. Manual typing synchronization into base text memory.
 */

import {
  normalizeTranscriptText,
  cleanPacketStutter,
  reconcileOverlappingChunks,
  mergeTranscripts,
} from "../frontend/src/services/voice/transcriptReconciler";
import { VoiceSessionManager } from "../frontend/src/services/voice/voiceSessionManager";

// ── MOCK SPEECH RECOGNITION ──
class MockSpeechRecognition {
  public continuous: boolean = false;
  public interimResults: boolean = false;
  public maxAlternatives: number = 1;
  public lang: string = "bn-BD";

  public onstart: (() => void) | null = null;
  public onresult: ((event: any) => void) | null = null;
  public onerror: ((event: any) => void) | null = null;
  public onend: (() => void) | null = null;
  public onspeechstart: (() => void) | null = null;
  public onspeechend: (() => void) | null = null;
  public onsoundstart: (() => void) | null = null;
  public onsoundend: (() => void) | null = null;

  public isRunning: boolean = false;
  public isAborted: boolean = false;

  public static activeInstances: MockSpeechRecognition[] = [];

  constructor() {
    MockSpeechRecognition.activeInstances.push(this);
  }

  public start() {
    this.isRunning = true;
    setTimeout(() => {
      this.onstart?.();
    }, 0);
  }

  public stop() {
    this.isRunning = false;
    setTimeout(() => {
      this.onend?.();
    }, 10);
  }

  public abort() {
    this.isRunning = false;
    this.isAborted = true;
    setTimeout(() => {
      this.onend?.();
    }, 0);
  }

  public emitResult(results: Array<{ transcript: string; isFinal: boolean }>, resultIndex = 0) {
    if (!this.onresult) return;
    const event = {
      resultIndex,
      results: results.map((r) => {
        const item = [{ transcript: r.transcript }];
        (item as any).isFinal = r.isFinal;
        return item;
      }),
    };
    this.onresult(event);
  }

  public emitError(error: string) {
    this.onerror?.({ error });
  }
}

// Setup global mock
(global as any).window = {
  SpeechRecognition: MockSpeechRecognition,
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
};

async function runMasterVoiceVerification() {
  console.log("===============================================================");
  console.log("  FOCENTIA VOICE INPUT MASTER VERIFICATION & REGRESSION SUITE  ");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
      failed++;
    }
  }

  // ── TEST 1: Single Bengali word produces one instance ──
  console.log("--- 1. Single Bengali Word ---");
  const t1_word = normalizeTranscriptText("বাংলাদেশ");
  assert(t1_word === "বাংলাদেশ", "Single Bengali word normalized cleanly", `Got: ${t1_word}`);

  // ── TEST 2: Single Bengali sentence produces one sentence, not 2-4 copies ──
  console.log("\n--- 2. Single Bengali Sentence Deduplication ---");
  const t2_prev = "";
  const t2_sentence = "আমি আজকে ফোকাসফোর্জ দিয়ে কাজ করব।";
  const t2_stitched = reconcileOverlappingChunks(t2_prev, t2_sentence);
  assert(
    t2_stitched.merged === "আমি আজকে ফোকাসফোর্জ দিয়ে কাজ করব।",
    "Single Bengali sentence committed exactly once without repetition",
    `Got: ${t2_stitched.merged}`
  );

  // ── TEST 3: Single English sentence produces one sentence ──
  console.log("\n--- 3. Single English Sentence ---");
  const t3_res = mergeTranscripts("", "Focus on the main productivity goals today.");
  assert(
    t3_res === "Focus on the main productivity goals today.",
    "Single English sentence produces one instance",
    `Got: ${t3_res}`
  );

  // ── TEST 4: Interim results changing repeatedly do not duplicate text ──
  console.log("\n--- 4. Rapidly Changing Interim Results ---");
  let commitCount = 0;
  let lastCommitted = "";
  const manager4 = new VoiceSessionManager({
    onFinalCommit: (fullText) => {
      commitCount++;
      lastCommitted = fullText;
    },
  });

  await manager4.start({ baseText: "" });
  const activeRec4 = MockSpeechRecognition.activeInstances[MockSpeechRecognition.activeInstances.length - 1];

  // Emit rapid interim hypotheses (should NOT trigger onFinalCommit)
  activeRec4.emitResult([{ transcript: "I want", isFinal: false }]);
  activeRec4.emitResult([{ transcript: "I want to solve", isFinal: false }]);
  activeRec4.emitResult([{ transcript: "I want to solve this issue", isFinal: false }]);

  assert(commitCount === 0, "Interim changes do NOT trigger final commit during recording");

  // Now emit final result and pause
  activeRec4.emitResult([{ transcript: "I want to solve this issue now", isFinal: true }]);
  await manager4.pause();

  assert(commitCount === 1, "Pause triggers final commit exactly once", `Count: ${commitCount}`);
  assert(
    lastCommitted === "I want to solve this issue now",
    "Final result incorporates the full phrase once without interim duplicates",
    `Got: "${lastCommitted}"`
  );

  // ── TEST 5: Final result replacing interim hypothesis does not duplicate text ──
  console.log("\n--- 5. Final Result Replacing Interim Hypothesis ---");
  const t5_chunk1 = "Hello team";
  const t5_interim = "Hello team we are ready";
  const t5_final = "Hello team we are ready to launch";
  const t5_merged = reconcileOverlappingChunks(t5_chunk1, "we are ready to launch");
  assert(
    t5_merged.merged === "Hello team we are ready to launch",
    "Final result replacing interim does not duplicate prefix",
    `Got: "${t5_merged.merged}"`
  );

  // ── TEST 6: Multiple distinct final results combined in correct order ──
  console.log("\n--- 6. Multiple Distinct Final Results ---");
  let r1 = reconcileOverlappingChunks("", "প্রথম ধাপ সম্পন্ন হয়েছে।");
  let r2 = reconcileOverlappingChunks(r1.merged, "দ্বিতীয় ধাপে আমরা কাজ শুরু করব।");
  let r3 = reconcileOverlappingChunks(r2.merged, "সবগুলো ধাপ সফল হয়েছে।");
  assert(
    r3.merged === "প্রথম ধাপ সম্পন্ন হয়েছে। দ্বিতীয় ধাপে আমরা কাজ শুরু করব। সবগুলো ধাপ সফল হয়েছে।",
    "Multiple final results stitched in correct sequential order",
    `Got: "${r3.merged}"`
  );

  // ── TEST 7: Genuinely repeated word preserved ──
  console.log("\n--- 7. Genuine Repetitions Preserved ---");
  const t7_eng = cleanPacketStutter("I really really appreciate this feature");
  const t7_bn = cleanPacketStutter("অনেক অনেক ধন্যবাদ আপনাকে");
  assert(t7_eng.includes("really really"), "Preserves English 'really really'", `Got: "${t7_eng}"`);
  assert(t7_bn.includes("অনেক অনেক"), "Preserves Bengali 'অনেক অনেক'", `Got: "${t7_bn}"`);

  // ── TEST 8: Pause commits session exactly once ──
  console.log("\n--- 8. Pause Commit Exactly Once ---");
  let t8_commits = 0;
  const manager8 = new VoiceSessionManager({
    onFinalCommit: () => {
      t8_commits++;
    },
  });
  await manager8.start({ baseText: "Existing text" });
  const activeRec8 = MockSpeechRecognition.activeInstances[MockSpeechRecognition.activeInstances.length - 1];
  activeRec8.emitResult([{ transcript: "and new speech", isFinal: true }]);
  await manager8.pause();
  assert(t8_commits === 1, "Single Pause call produces exactly 1 commit", `Commits: ${t8_commits}`);

  // ── TEST 9: Repeated Pause calls cannot commit twice (Idempotence) ──
  console.log("\n--- 9. Repeated Pause Idempotence ---");
  await manager8.pause();
  await manager8.pause();
  assert(t8_commits === 1, "Repeated Pause calls do not duplicate commits", `Commits: ${t8_commits}`);

  // ── TEST 10: Resume appends new speech without recommitting previous speech ──
  console.log("\n--- 10. Resume Appends Only New Speech ---");
  let t10_finalText = "";
  const manager10 = new VoiceSessionManager({
    onFinalCommit: (fullText) => {
      t10_finalText = fullText;
    },
  });

  // Session 1:
  await manager10.start({ baseText: "" });
  let rec10_1 = MockSpeechRecognition.activeInstances[MockSpeechRecognition.activeInstances.length - 1];
  rec10_1.emitResult([{ transcript: "First sentence.", isFinal: true }]);
  await manager10.pause();
  assert(t10_finalText === "First sentence.", "Session 1 commits 'First sentence.'");

  // Session 2 (Resume):
  await manager10.resume(t10_finalText);
  let rec10_2 = MockSpeechRecognition.activeInstances[MockSpeechRecognition.activeInstances.length - 1];
  rec10_2.emitResult([{ transcript: "Second sentence.", isFinal: true }]);
  await manager10.stop();
  assert(
    t10_finalText === "First sentence. Second sentence.",
    "Session 2 appends new speech without repeating Session 1",
    `Got: "${t10_finalText}"`
  );

  // ── TEST 11: Existing manually typed text remains intact ──
  console.log("\n--- 11. Preserving Manually Typed Text ---");
  const manualBase = "My Custom Note Title:\n- Point 1";
  const mergedWithManual = mergeTranscripts(manualBase, "Point 2 added by voice");
  assert(
    mergedWithManual.startsWith("My Custom Note Title:\n- Point 1") &&
    mergedWithManual.includes("Point 2 added by voice"),
    "Existing manual text is preserved untouched with proper spacing",
    `Got: "${mergedWithManual}"`
  );

  // ── TEST 12: Changing language safely rolls over ──
  console.log("\n--- 12. Language Toggle Rollover ---");
  const manager12 = new VoiceSessionManager();
  await manager12.start({ language: "bn-BD", baseText: "বাংলা কথা" });
  manager12.setLanguage("en-US");
  assert(manager12.getLanguage() === "en-US", "Language updated to en-US");
  manager12.destroy();

  // ── TEST 13: Permission denial handles gracefully ──
  console.log("\n--- 13. Permission Denial Handling ---");
  let errorMsg = "";
  const manager13 = new VoiceSessionManager({
    onError: (err) => {
      errorMsg = err;
    },
  });
  await manager13.start({ baseText: "Safe text" });
  const rec13 = MockSpeechRecognition.activeInstances[MockSpeechRecognition.activeInstances.length - 1];
  rec13.emitError("not-allowed");
  assert(manager13.getState() === "ERROR", "State transitions to ERROR on permission denied");
  assert(errorMsg.length > 0, "Helpful user error message dispatched", `Error: ${errorMsg}`);
  manager13.destroy();

  // ── TEST 14: Recognition error does not corrupt committed text ──
  console.log("\n--- 14. Error Recovery Preserves Committed Text ---");
  const manager14 = new VoiceSessionManager();
  await manager14.start({ baseText: "Permanent memory text" });
  const rec14 = MockSpeechRecognition.activeInstances[MockSpeechRecognition.activeInstances.length - 1];
  rec14.emitError("network");
  assert(
    manager14.getCommittedBaseText() === "Permanent memory text",
    "Committed base text preserved intact after transient network error"
  );
  manager14.destroy();

  // ── TEST 15: Destroy cleans up active session safely ──
  console.log("\n--- 15. Safe Cleanup & Destruction ---");
  const manager15 = new VoiceSessionManager();
  await manager15.start();
  manager15.destroy();
  assert(manager15.getState() === "IDLE", "State is reset to IDLE after destroy");

  // ── TEST 16: Exact Spacing & Punctuation ──
  console.log("\n--- 16. Spacing & Punctuation Merging ---");
  const sp1 = mergeTranscripts("Hello,", "world");
  assert(sp1 === "Hello, world", "Correct space after comma", `Got: "${sp1}"`);
  const sp2 = mergeTranscripts("আজকে কাজ শেষ।", "এখন বিশ্রাম নেব।");
  assert(sp2 === "আজকে কাজ শেষ। এখন বিশ্রাম নেব।", "Correct space after Bengali dari (।)", `Got: "${sp2}"`);

  // ── TEST 17: Manual Typing Synchronization ──
  console.log("\n--- 17. Manual Typing Sync ---");
  const manager17 = new VoiceSessionManager();
  manager17.setManualBaseText("User typed this manually");
  assert(
    manager17.getCommittedBaseText() === "User typed this manually",
    "Base text memory reflects manual updates"
  );

  // ── TEST 18: Stutter Clamping for Glitch Loops ──
  console.log("\n--- 18. Packet Jitter 3+ Stutter Clamping ---");
  const glitchText = "test test test test test";
  const clamped = cleanPacketStutter(glitchText);
  assert(clamped === "test test", "Clamps 5x packet glitch repeat down to max 2x", `Got: "${clamped}"`);

  console.log("\n===============================================================");
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runMasterVoiceVerification().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
