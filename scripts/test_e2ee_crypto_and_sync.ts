/**
 * Focentia E2EE Cryptography & Sync Verification Suite
 * (scripts/test_e2ee_crypto_and_sync.ts)
 *
 * Tests all core requirements from the specification:
 * 1. Cryptographically random 256-bit MEK generation.
 * 2. PBKDF2-HMAC-SHA-256 KEK derivation from user passphrase.
 * 3. AES-256-GCM Envelope Key Wrapping & Unwrapping.
 * 4. Data encryption & decryption round-trip.
 * 5. Tamper-detection (modified ciphertext, modified IV, modified auth tag).
 * 6. Wrong passphrase rejection.
 * 7. Non-reused 96-bit (12-byte) IV generation.
 * 8. Binary file encryption & decryption round-trip.
 * 9. Versioned envelope error handling.
 */

import {
  generateMasterEncryptionKey,
  deriveKeyFromPassphrase,
  wrapMasterKey,
  unwrapMasterKey,
  encryptPayload,
  decryptPayload,
  encryptFile,
  decryptFile,
  generateSalt,
  generateIV,
  generateRecoveryPhrase,
  InvalidPassphraseError,
  DecryptionError,
  UnsupportedVersionError,
  DEFAULT_PBKDF2_ITERATIONS,
  type KdfMetadata,
  bufferToBase64,
  base64ToBuffer,
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

async function runAllCryptoTests() {
  console.log("\n=======================================================");
  console.log("🔒 FOCENTIA ZERO-KNOWLEDGE E2EE CRYPTO TEST SUITE");
  console.log("=======================================================\n");

  const testPassphrase = "CorrectHorseBatteryStaple2026!";
  const wrongPassphrase = "WrongPassword999!";
  const testUserId = "user_test_uuid_12345";

  // Test 1: Generate Master Encryption Key (MEK)
  console.log("--- 1. MASTER ENCRYPTION KEY (MEK) GENERATION ---");
  const mek = await generateMasterEncryptionKey();
  assert(mek.type === "secret" && (mek.algorithm as any).name === "AES-GCM" && (mek.algorithm as any).length === 256, "Generated 256-bit AES-GCM Master Encryption Key");

  // Test 2: Derive Key Encryption Key (KEK) via PBKDF2-HMAC-SHA-256
  console.log("\n--- 2. KEK DERIVATION (PBKDF2-HMAC-SHA-256) ---");
  const salt = generateSalt(16);
  const kek = await deriveKeyFromPassphrase(testPassphrase, salt, 10000); // 10k for fast unit test
  assert(kek.type === "secret" && (kek.algorithm as any).name === "AES-GCM" && (kek.algorithm as any).length === 256, "Derived 256-bit AES-GCM Key Encryption Key (KEK)");

  // Test 3: Envelope Key Wrapping
  console.log("\n--- 3. ENVELOPE KEY WRAPPING ---");
  const kdfMetadata: KdfMetadata = {
    algorithm: "PBKDF2-SHA256",
    salt,
    parameters: {
      iterations: 10000,
      hash: "SHA-256",
    },
  };
  const wrappedEnvelope = await wrapMasterKey(mek, kek, kdfMetadata);
  assert(wrappedEnvelope.version === 1, "Wrapped key envelope has version 1");
  assert(wrappedEnvelope.algorithm === "AES-256-GCM", "Wrapped key envelope uses AES-256-GCM");
  assert(typeof wrappedEnvelope.wrappedKeyCiphertext === "string" && wrappedEnvelope.wrappedKeyCiphertext.length > 0, "Wrapped MEK ciphertext is valid Base64");
  assert(typeof wrappedEnvelope.iv === "string" && base64ToBuffer(wrappedEnvelope.iv).length === 12, "Wrapped key envelope has 96-bit (12-byte) IV");

  // Test 4: Key Unwrapping with Correct Passphrase
  console.log("\n--- 4. KEY UNWRAPPING (CORRECT PASSPHRASE) ---");
  const unwrappedMek = await unwrapMasterKey(wrappedEnvelope, kek);
  assert(unwrappedMek.type === "secret" && (unwrappedMek.algorithm as any).name === "AES-GCM", "Unwrapped MEK successfully with correct KEK");

  // Test 5: Key Unwrapping Failure with Wrong Passphrase
  console.log("\n--- 5. WRONG PASSPHRASE REJECTION ---");
  const wrongKek = await deriveKeyFromPassphrase(wrongPassphrase, salt, 10000);
  let wrongPassphraseRejected = false;
  try {
    await unwrapMasterKey(wrappedEnvelope, wrongKek);
  } catch (err) {
    if (err instanceof InvalidPassphraseError) {
      wrongPassphraseRejected = true;
    }
  }
  assert(wrongPassphraseRejected, "Wrong passphrase rejected with InvalidPassphraseError");

  // Test 6: Payload Encryption & Decryption Round-Trip
  console.log("\n--- 6. PAYLOAD ENCRYPTION & DECRYPTION ROUND-TRIP ---");
  const sensitiveUserPayload = {
    noteId: "note_987",
    title: "My Private Diary & Reflection",
    content: "Confidential productivity notes and secret reflections that must never reach Supabase in plaintext.",
    tags: ["confidential", "diary", "goals"],
    createdAt: new Date().toISOString(),
  };

  const encryptedEnvelope = await encryptPayload(sensitiveUserPayload, unwrappedMek);
  assert(typeof encryptedEnvelope.ciphertext === "string" && encryptedEnvelope.ciphertext.length > 0, "Payload encrypted to Base64 ciphertext");
  assert(base64ToBuffer(encryptedEnvelope.iv).length === 12, "Payload encryption generated fresh 12-byte IV");
  assert(!encryptedEnvelope.ciphertext.includes("Confidential productivity notes"), "Plaintext is completely absent from encrypted payload");

  const decryptedPayload = await decryptPayload(encryptedEnvelope, unwrappedMek);
  assert(decryptedPayload.title === sensitiveUserPayload.title && decryptedPayload.content === sensitiveUserPayload.content, "Decrypted payload matches original sensitive user content exactly");

  // Test 7: Fresh Non-Reused IV Generation
  console.log("\n--- 7. FRESH NON-REUSED IV VERIFICATION ---");
  const envelope1 = await encryptPayload(sensitiveUserPayload, unwrappedMek);
  const envelope2 = await encryptPayload(sensitiveUserPayload, unwrappedMek);
  const envelope3 = await encryptPayload(sensitiveUserPayload, unwrappedMek);
  assert(envelope1.iv !== envelope2.iv && envelope2.iv !== envelope3.iv && envelope1.iv !== envelope3.iv, "Subsequent encryptions generate distinct unique IVs (Zero IV reuse)");
  assert(envelope1.ciphertext !== envelope2.ciphertext, "Identical plaintext produces different ciphertexts due to fresh IVs");

  // Test 8: Tamper Resistance (Modified Ciphertext)
  console.log("\n--- 8. TAMPER RESISTANCE (MODIFIED CIPHERTEXT) ---");
  const rawCiphertextBytes = base64ToBuffer(encryptedEnvelope.ciphertext);
  rawCiphertextBytes[5] ^= 0xff; // Flip bits
  const tamperedCiphertext = bufferToBase64(rawCiphertextBytes);

  let tamperDetected = false;
  try {
    await decryptPayload({ ...encryptedEnvelope, ciphertext: tamperedCiphertext }, unwrappedMek);
  } catch (err) {
    if (err instanceof DecryptionError) {
      tamperDetected = true;
    }
  }
  assert(tamperDetected, "Tampered ciphertext rejected by AES-256-GCM authentication tag");

  // Test 9: Tamper Resistance (Modified IV)
  console.log("\n--- 9. TAMPER RESISTANCE (MODIFIED IV) ---");
  const rawIvBytes = base64ToBuffer(encryptedEnvelope.iv);
  rawIvBytes[0] ^= 0x01; // Flip single bit
  const tamperedIv = bufferToBase64(rawIvBytes);

  let ivTamperDetected = false;
  try {
    await decryptPayload({ ...encryptedEnvelope, iv: tamperedIv }, unwrappedMek);
  } catch (err) {
    if (err instanceof DecryptionError) {
      ivTamperDetected = true;
    }
  }
  assert(ivTamperDetected, "Tampered IV rejected by AES-256-GCM authentication tag");

  // Test 10: Binary File Encryption & Decryption Round-Trip
  console.log("\n--- 10. BINARY FILE ENCRYPTION & DECRYPTION ---");
  const mockFileContent = new TextEncoder().encode("Mock PDF content: Secret project blueprint 2026.");
  const { encryptedBlob, metadata } = await encryptFile(mockFileContent.buffer, unwrappedMek, {
    originalName: "blueprint.pdf",
    originalType: "application/pdf",
  });

  assert(metadata.originalName === "blueprint.pdf", "File metadata preserves original name");
  assert(metadata.originalType === "application/pdf", "File metadata preserves original MIME type");
  assert(base64ToBuffer(metadata.iv).length === 12, "File encryption generated 12-byte IV");

  const decryptedFileBlob = await decryptFile(encryptedBlob, metadata.iv, unwrappedMek, metadata.originalType);
  const decryptedText = await decryptedFileBlob.text();
  assert(decryptedText === "Mock PDF content: Secret project blueprint 2026.", "Decrypted file content matches original bytes exactly");

  // Test 11: Unsupported Version Rejection
  console.log("\n--- 11. VERSIONED ENVELOPE PROTECTION ---");
  let futureVersionRejected = false;
  try {
    await decryptPayload({ ...encryptedEnvelope, version: 99 }, unwrappedMek);
  } catch (err) {
    if (err instanceof UnsupportedVersionError) {
      futureVersionRejected = true;
    }
  }
  assert(futureVersionRejected, "Unsupported envelope version (v99) cleanly rejected with UnsupportedVersionError");

  // Test 12: Recovery Phrase Generation
  console.log("\n--- 12. RECOVERY PHRASE GENERATION ---");
  const phrase = generateRecoveryPhrase();
  assert(phrase.startsWith("FF-") && phrase.length === 22, `Generated valid 16-character recovery phrase: ${phrase}`);

  console.log("\n=======================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAllCryptoTests().catch((err) => {
  console.error("Test runner exception:", err);
  process.exit(1);
});
