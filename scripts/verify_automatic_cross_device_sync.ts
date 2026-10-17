/**
 * Automated Verification Script: Seamless Cross-Device Sync Without Passphrase/PIN
 * Verifies that:
 * 1. deriveAccountKey deterministically creates matching keys on Device A & Device B for the same account.
 * 2. Device A encrypts sensitive productivity data (tasks, notes, routines, diary, mind items).
 * 3. Device B receives the ciphertext and decrypts it with 100% precision with zero user prompts.
 * 4. Distinct user accounts derive distinct keys and cannot decrypt each other's data (multi-tenant safety).
 * 5. cryptoSession provides instant unlock state (isUnlocked === true) for authenticated users.
 * 6. Guest mode remains strictly offline.
 */

import {
  deriveAccountKey,
  encryptPayload,
  decryptPayload,
  cryptoSession,
} from "../frontend/src/lib/crypto";

// Ensure Web Crypto API is available in Node.js runtime
if (!globalThis.window) {
  (globalThis as any).window = { crypto: globalThis.crypto };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runAutomaticSyncVerification() {
  console.log("\n=======================================================================");
  console.log("🔄 AUTOMATIC SEAMLESS CROSS-DEVICE SYNC VERIFICATION");
  console.log("=======================================================================\n");

  const userId = "usr_focentia_user_9921_abc";
  const userBId = "usr_focentia_other_user_4432_xyz";

  // Test 1: Device A derives account key
  console.log("--- 1. SEAMLESS ACCOUNT KEY DERIVATION (DEVICE A) ---");
  const deviceAKey = await deriveAccountKey(userId);
  assert(deviceAKey.type === "secret" && deviceAKey.algorithm.name === "AES-GCM", "Device A derives 256-bit AES-GCM account key deterministically");

  // Test 2: Device B (logged into same account) derives exact same key
  console.log("\n--- 2. MATCHING KEY DERIVATION (DEVICE B) ---");
  const deviceBKey = await deriveAccountKey(userId);
  assert(deviceBKey.type === "secret" && deviceBKey.algorithm.name === "AES-GCM", "Device B derives 256-bit AES-GCM account key for same user");

  // Test 3: Export raw keys to prove mathematical identity
  const rawKeyA = await window.crypto.subtle.exportKey("raw", deviceAKey);
  const rawKeyB = await window.crypto.subtle.exportKey("raw", deviceBKey);
  const isIdentical = Buffer.from(rawKeyA).equals(Buffer.from(rawKeyB));
  assert(isIdentical, "Device A and Device B keys are 100% mathematically identical with zero user passphrase input");

  // Test 4: Device A encrypts multi-domain payload (Tasks, Notes, Diary, Routine, Mind)
  console.log("\n--- 3. CROSS-DEVICE DATA ENCRYPTION & DECRYPTION ROUND-TRIP ---");
  const originalData = {
    tasks: [
      { id: "task-1", title: "Complete Physics Chapter 4", priority: "now", completed: false },
      { id: "task-2", title: "Review Chemistry Formulae", priority: "next", completed: true }
    ],
    notes: [
      { id: "note-1", title: "Quantum Mechanics Summary", content: [{ type: "p", text: "Schrodinger equation derivation..." }] }
    ],
    diary: [
      { id: "diary-1", title: "Thoughts on Focus & Growth", topic: "Reflections", entry: "Productive study session today." }
    ],
    routines: [
      { id: "routine-1", title: "Morning Deep Work", time: "07:30" }
    ],
    mindItems: [
      { id: "mind-1", text: "Build automated sync without PIN prompts" }
    ]
  };

  const encryptedEnvelope = await encryptPayload(originalData, deviceAKey);
  assert(Boolean(encryptedEnvelope.iv && encryptedEnvelope.ciphertext), "Device A encrypted multi-domain data into AES-256-GCM envelope");
  assert(!JSON.stringify(encryptedEnvelope).includes("Quantum Mechanics"), "Plaintext is completely absent from encrypted payload (Zero-Knowledge Cloud)");

  // Test 5: Device B decrypts the envelope seamlessly
  const decryptedData = await decryptPayload(encryptedEnvelope, deviceBKey);
  assert(decryptedData.tasks.length === 2 && decryptedData.tasks[0].title === "Complete Physics Chapter 4", "Device B decrypted tasks flawlessly");
  assert(decryptedData.notes[0].title === "Quantum Mechanics Summary", "Device B decrypted notes flawlessly");
  assert(decryptedData.diary[0].title === "Thoughts on Focus & Growth", "Device B decrypted diary flawlessly");
  assert(decryptedData.routines[0].title === "Morning Deep Work", "Device B decrypted routines flawlessly");
  assert(decryptedData.mindItems[0].text === "Build automated sync without PIN prompts", "Device B decrypted mind items flawlessly");

  // Test 6: Multi-Tenant Key Isolation (User B cannot decrypt User A's data)
  console.log("\n--- 4. MULTI-TENANT ACCOUNT ISOLATION ---");
  const deviceOtherUserKey = await deriveAccountKey(userBId);
  const rawKeyOther = await window.crypto.subtle.exportKey("raw", deviceOtherUserKey);
  assert(!Buffer.from(rawKeyA).equals(Buffer.from(rawKeyOther)), "User B key is completely distinct from User A key");

  let crossUserDecryptFailed = false;
  try {
    await decryptPayload(encryptedEnvelope, deviceOtherUserKey);
  } catch (err) {
    crossUserDecryptFailed = true;
  }
  assert(crossUserDecryptFailed, "User B key is strictly rejected when attempting to decrypt User A data");

  // Test 7: CryptoSession Instant Unlock Verification
  console.log("\n--- 5. CRYPTO SESSION ZERO-PROMPT VERIFICATION ---");
  const isUnlockedBefore = cryptoSession.isUnlocked(userId);
  assert(isUnlockedBefore === true, "cryptoSession.isUnlocked(userId) is true immediately without entering any PIN");

  const sessionKey = await cryptoSession.getOrDeriveMasterKey(userId);
  assert(sessionKey !== null && sessionKey.type === "secret", "cryptoSession.getOrDeriveMasterKey derives active key silently in memory");

  // Test 8: Guest Mode Isolation
  console.log("\n--- 6. GUEST MODE ISOLATION ---");
  const isGuestUnlocked = cryptoSession.isUnlocked("guest");
  assert(isGuestUnlocked === false, "cryptoSession.isUnlocked('guest') remains false (Guest is strictly offline-only)");

  console.log("\n=======================================================================");
  console.log(`FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAutomaticSyncVerification().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
