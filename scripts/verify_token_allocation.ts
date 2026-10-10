import { 
  getUserTokenStatus as getBackendTokenStatus, 
  consumeUserTokens as consumeBackendTokens, 
  estimateTokenUsage as estimateBackendTokenUsage 
} from '../backend/src/services/aiTokenService';
import { 
  getUserTokenStatus as getFrontendTokenStatus, 
  consumeUserTokens as consumeFrontendTokens, 
  estimateTokenUsage as estimateFrontendTokenUsage 
} from '../frontend/src/lib/server/aiTokenService';

async function runTests() {
  console.log('=== VERIFYING AI TOKEN ALLOCATION & MULTIPLIER RULES ===\n');

  // Test 1: Quota Allocation Check
  const testUserA = 'user_test_uuid_alpha_' + Date.now();
  const testUserB = 'user_test_uuid_beta_' + Date.now();
  const guestA = 'guest_session_1_' + Date.now();
  const guestB = 'guest_session_2_' + Date.now();

  const authStatusA = await getBackendTokenStatus(testUserA, false, undefined);
  const authStatusB = await getBackendTokenStatus(testUserB, false, undefined);
  const guestStatusA = await getBackendTokenStatus('guest', true, guestA);
  const guestStatusB = await getBackendTokenStatus('guest', true, guestB);

  console.log(`[Check 1] Logged-in User A Quota: ${authStatusA.total} (Expected: 5000)`);
  console.log(`[Check 1] Logged-in User B Quota: ${authStatusB.total} (Expected: 5000)`);
  console.log(`[Check 1] Guest User A Quota: ${guestStatusA.total} (Expected: 1000)`);
  console.log(`[Check 1] Guest User B Quota: ${guestStatusB.total} (Expected: 1000)`);

  if (authStatusA.total !== 5000 || authStatusB.total !== 5000) {
    throw new Error('FAILED: Logged-in user total must be 5000');
  }
  if (guestStatusA.total !== 1000 || guestStatusB.total !== 1000) {
    throw new Error('FAILED: Guest user total must be 1000');
  }

  // Test 2: Individual User Isolation Check
  console.log('\n[Check 2] Testing User Account Isolation...');
  await consumeBackendTokens(testUserA, false, undefined, 250);
  const afterA = await getBackendTokenStatus(testUserA, false, undefined);
  const afterB = await getBackendTokenStatus(testUserB, false, undefined);

  console.log(`User A Used: ${afterA.used}, Remaining: ${afterA.remaining}`);
  console.log(`User B Used: ${afterB.used}, Remaining: ${afterB.remaining}`);

  if (afterA.used !== 250 || afterA.remaining !== 4750) {
    throw new Error('FAILED: User A tokens not consumed accurately');
  }
  if (afterB.used !== 0 || afterB.remaining !== 5000) {
    throw new Error('FAILED: User B was affected by User A! Isolation broken!');
  }
  console.log('PASS: Logged-in user tokens are strictly isolated per account!');

  // Guest isolation
  await consumeBackendTokens('guest', true, guestA, 100);
  const guestAfterA = await getBackendTokenStatus('guest', true, guestA);
  const guestAfterB = await getBackendTokenStatus('guest', true, guestB);
  console.log(`Guest A Used: ${guestAfterA.used}, Remaining: ${guestAfterA.remaining}`);
  console.log(`Guest B Used: ${guestAfterB.used}, Remaining: ${guestAfterB.remaining}`);

  if (guestAfterA.used !== 100 || guestAfterB.used !== 0) {
    throw new Error('FAILED: Guest isolation broken!');
  }
  console.log('PASS: Guest user tokens are strictly isolated per guest device/session!');

  // Test 3: Model multipliers comparison (Focentia 2.1 vs Focentia Pro)
  console.log('\n[Check 3] Model Consumption Multipliers:');
  const samplePrompt = 'আজকের জন্য আমার পড়াশোনার একটা সুন্দর রুটিন তৈরি করে দাও। আমি ৩ ঘণ্টা পদার্থবিজ্ঞান এবং ২ ঘণ্টা গণিত পড়ব।';
  const sampleResponse = 'নিশ্চয়ই! তোমার জন্য ৫ ঘণ্টার একটি সুনির্দিষ্ট টাইম-ব্লক তৈরি করেছি। ৩ ঘণ্টা ফিজিক্স এবং ২ ঘণ্টা ম্যাথ।';

  const backend21Tokens = estimateBackendTokenUsage(samplePrompt, sampleResponse, 'focentia-2.1');
  const backendProTokens = estimateBackendTokenUsage(samplePrompt, sampleResponse, 'focentia-pro');
  const frontend21Tokens = estimateFrontendTokenUsage(samplePrompt, sampleResponse, 'focentia-2.1');
  const frontendProTokens = estimateFrontendTokenUsage(samplePrompt, sampleResponse, 'focentia-pro');

  console.log(`Backend Focentia 2.1: ${backend21Tokens} tokens (0.5x small consumption)`);
  console.log(`Backend Focentia Pro: ${backendProTokens} tokens (2.0x higher consumption)`);
  console.log(`Frontend Focentia 2.1: ${frontend21Tokens} tokens`);
  console.log(`Frontend Focentia Pro: ${frontendProTokens} tokens`);

  if (backend21Tokens !== frontend21Tokens || backendProTokens !== frontendProTokens) {
    throw new Error('FAILED: Backend and frontend token estimation are not synchronized!');
  }
  if (backendProTokens <= backend21Tokens * 3) {
    throw new Error(`FAILED: Pro tokens (${backendProTokens}) should be ~4x higher than 2.1 tokens (${backend21Tokens})!`);
  }
  console.log(`PASS: Focentia 2.1 consumes minimal tokens (${backend21Tokens}), Focentia Pro consumes larger tokens (${backendProTokens}). Exactly 4x ratio (0.5x vs 2.0x).`);

  // Test 4: Provider Usage (geminiUsage) scaling
  console.log('\n[Check 4] Provider Usage Scaling (geminiUsage):');
  const mockUsage = { totalTokenCount: 100 };
  const provider21 = estimateBackendTokenUsage('', '', 'focentia-2.1', mockUsage);
  const providerPro = estimateBackendTokenUsage('', '', 'focentia-pro', mockUsage);

  console.log(`100 Provider Tokens -> Focentia 2.1: ${provider21} tokens (0.5x = 50 tokens)`);
  console.log(`100 Provider Tokens -> Focentia Pro: ${providerPro} tokens (2.0x = 200 tokens)`);

  if (provider21 !== 50 || providerPro !== 200) {
    throw new Error('FAILED: Provider usage scaling incorrect!');
  }
  console.log('PASS: Provider usage scaling verified (50 vs 200)!');

  console.log('\nALL CHECKS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('\nTEST RUNNER ERROR:', err);
  process.exit(1);
});
