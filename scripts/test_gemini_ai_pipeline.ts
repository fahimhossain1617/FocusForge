/**
 * Automated Verification Test Suite for Gemini Primary Intelligence Pipeline
 * Phase 1 Implementation Verification
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from both root, frontend, and backend
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../frontend/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

import { executeAIAction } from '../backend/src/services/aiService';
import { validateProposedAction } from '../frontend/src/services/aiActionValidator';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName} - ${details || 'Assertion failed'}`);
  }
}

async function runGeminiPipelineTests() {
  console.log('================================================================');
  console.log('   FOCENTIA AI — PHASE 1 GEMINI PIPELINE VERIFICATION SUITE    ');
  console.log('================================================================\n');

  const apiKey = (process.env.GEMINI_API_KEY || '').replace(/^["']|["']$/g, '').trim();
  assert(Boolean(apiKey && apiKey.length > 10), 'API Key Discovery', `Key length: ${apiKey?.length || 0}`);

  // ------------------------------------------------------------------------
  // TEST 1: Identity & Persona (Bengali & English)
  // ------------------------------------------------------------------------
  console.log('\n--- TEST SUITE 1: Persona, Identity & Secrecy ---');
  try {
    const resBn = await executeAIAction('agentChat', {
      userQuery: 'তুমি কে? তোমার পরিচয় দাও। তোমাকে কীভাবে বানানো হয়েছে?',
      recentHistory: [],
      currentDate: '2026-10-10',
      model: 'smart',
    });

    assert(Boolean(resBn && resBn.message), 'Bengali Identity Response Generated', resBn?.message);
    const bnText = resBn.message;
    assert(bnText.includes('Focentia') || bnText.includes('সহকারী') || bnText.includes('স্টাডি') || bnText.includes('এআই'), 'Identifies as Focentia AI / Assistant', bnText);
    assert(!/gemini|google|llm|chatgpt|openai/i.test(bnText), 'Secrecy: No Gemini/Google/LLM mention in Bengali', bnText);
    assert(!/\b(আপনি|আপনার|আপনাকে|তুই|তোর|তোকে)\b/.test(bnText), 'Tone: Uses "তুমি"/"তোমার" in Bengali (no আপনি/তুই)', bnText);

    const resEn = await executeAIAction('agentChat', {
      userQuery: 'Who are you and what is your role?',
      recentHistory: [],
      currentDate: '2026-10-10',
      model: 'smart',
    });

    assert(Boolean(resEn && resEn.message), 'English Identity Response Generated', resEn?.message);
    const enText = resEn.message;
    assert(enText.includes('Focentia'), 'Identifies as Focentia AI in English', enText);
    assert(!/gemini|google|llm|chatgpt|openai/i.test(enText), 'Secrecy: No Gemini/Google/LLM mention in English', enText);
  } catch (err: any) {
    assert(false, 'Identity & Persona Suite', err?.message);
  }

  // ------------------------------------------------------------------------
  // TEST 2: Open-Ended Complex Reasoning & Educational Guidance (Screenshot Query)
  // ------------------------------------------------------------------------
  console.log('\n--- TEST SUITE 2: Open-Ended Reasoning (Java OOP Inheritance) ---');
  try {
    const javaQuery = `Inheritance Practice Set — Level 1:
Problem 1 — Single Inheritance: একটি Vehicle Parent Class তৈরি করো। এতে brand এবং startVehicle() থাকবে। Car Class যেন Vehicle-কে Inherit করে নিজের drive() Method যোগ করে। সম্পূর্ণ Program ও Output লিখবে।
Problem 4 — Constructor Chain: Parent ও Child Class-এ Parameterized Constructor লেখো। Child Object তৈরির সময় super(...) দিয়ে Parent Constructor-এ মান পাঠাও।`;

    const resJava = await executeAIAction('agentChat', {
      userQuery: javaQuery,
      recentHistory: [],
      currentDate: '2026-10-10',
      model: 'smart',
    });

    assert(Boolean(resJava && resJava.message), 'Java OOP Inheritance Solution Generated', resJava?.message);
    const msg = resJava.message;
    assert(msg.includes('class Vehicle') || msg.includes('Vehicle') || msg.includes('extends'), 'Contains Java Class / Inheritance Syntax', msg);
    assert(msg.includes('startVehicle') || msg.includes('drive'), 'Contains Required Methods', msg);
    assert(msg.includes('super'), 'Demonstrates super() Constructor Chaining', msg);
    assert(!msg.includes('প্রধান স্টাডি ও অনুশীলন সেশন'), 'Not a hardcoded canned task list', msg);
  } catch (err: any) {
    assert(false, 'Open-Ended Reasoning Suite', err?.message);
  }

  // ------------------------------------------------------------------------
  // TEST 3: Multi-Turn Planning & Clarification Pipeline
  // ------------------------------------------------------------------------
  console.log('\n--- TEST SUITE 3: Multi-Turn Task Clarification & Proposals ---');
  try {
    // Turn 1: Incomplete task instruction (missing date and time)
    const turn1Res = await executeAIAction('agentChat', {
      userQuery: 'আমার প্ল্যানারে বাংলা সমাজ বিজ্ঞান পড়ার কাজ যোগ করো',
      recentHistory: [],
      currentDate: '2026-10-10',
      model: 'smart',
    });

    assert(Boolean(turn1Res && turn1Res.message), 'Turn 1 Response Generated', turn1Res?.message);
    const isClarification = 
      turn1Res.type === 'clarification' || 
      (Array.isArray(turn1Res.missingFields) && turn1Res.missingFields.length > 0) ||
      turn1Res.clarifyingQuestion ||
      turn1Res.message.includes('তারিখ') ||
      turn1Res.message.includes('কবে') ||
      turn1Res.message.includes('কখন') ||
      turn1Res.message.includes('সময়');

    assert(Boolean(isClarification), 'Turn 1: Correctly identifies missing details or asks for date/time clarification', JSON.stringify(turn1Res));

    // Turn 2: Providing the date & time
    const historyTurn2 = [
      { role: 'user', content: 'আমার প্ল্যানারে বাংলা সমাজ বিজ্ঞান পড়ার কাজ যোগ করো' },
      { role: 'assistant', content: turn1Res.message }
    ];

    const turn2Res = await executeAIAction('agentChat', {
      userQuery: 'আগামীকাল সকাল ১০টায় ৩০ মিনিটের জন্য রাখো',
      recentHistory: historyTurn2,
      currentDate: '2026-10-10',
      model: 'smart',
    });

    assert(Boolean(turn2Res && turn2Res.message), 'Turn 2 Response Generated', turn2Res?.message);
    const hasTaskAction = 
      turn2Res.intent === 'PLANNER_CREATE' ||
      (Array.isArray(turn2Res.actions) && turn2Res.actions.some((a: any) => a.type.includes('task') || a.type.includes('planner'))) ||
      turn2Res.proposal !== null;

    assert(Boolean(hasTaskAction), 'Turn 2: Proposes structured task after date/time provided', JSON.stringify(turn2Res));

    // Turn 3: Changing date/time
    const historyTurn3 = [
      ...historyTurn2,
      { role: 'user', content: 'আগামীকাল সকাল ১০টায় ৩০ মিনিটের জন্য রাখো' },
      { role: 'assistant', content: turn2Res.message }
    ];

    const turn3Res = await executeAIAction('agentChat', {
      userQuery: 'না, সময় পরিবর্তন করে রাত ৮টায় দাও',
      recentHistory: historyTurn3,
      currentDate: '2026-10-10',
      model: 'smart',
    });

    assert(Boolean(turn3Res && turn3Res.message), 'Turn 3 Modification Handled Gracefully', turn3Res?.message);
  } catch (err: any) {
    assert(false, 'Multi-Turn Suite', err?.message);
  }

  // ------------------------------------------------------------------------
  // TEST 4: Security & Action Validation
  // ------------------------------------------------------------------------
  console.log('\n--- TEST SUITE 4: Action Security & Confirmation Policy ---');
  try {
    // Validate valid create_task
    const validTaskAction = {
      type: 'create_task',
      title: 'Bengali Social Studies',
      parameters: {
        title: 'Bengali Social Studies',
        targetDate: '2026-10-11',
        time: '10:00',
        estimatedMinutes: 30,
        priority: 'high',
      },
      confirmationRequired: true,
    };

    const taskValidation = validateProposedAction(validTaskAction);
    assert(taskValidation.valid, 'Valid Action Accepted', taskValidation.reason);
    assert(taskValidation.normalizedAction?.confirmationRequired === true, 'Confirmation is strictly required for data mutations');

    // Validate invalid / dangerous action
    const dangerousAction = {
      type: 'execute_raw_sql',
      title: 'DROP TABLE users',
      parameters: { query: 'DROP TABLE users;' },
    };

    const dangerousValidation = validateProposedAction(dangerousAction);
    assert(!dangerousValidation.valid, 'Dangerous / Unregistered Action Type Blocked', dangerousValidation.reason);

    // Validate script injection in parameters
    const xssAction = {
      type: 'create_task',
      title: 'Malicious Task',
      parameters: {
        title: '<script>alert("xss")</script>',
        targetDate: '2026-10-11',
      }
    };
    const xssValidation = validateProposedAction(xssAction);
    assert(!xssValidation.valid, 'Script Injection in Task Title Blocked', xssValidation.reason);
  } catch (err: any) {
    assert(false, 'Security Suite', err?.message);
  }

  // ------------------------------------------------------------------------
  // TEST 5: Bengali Unicode & Conjunct Integrity
  // ------------------------------------------------------------------------
  console.log('\n--- TEST SUITE 5: Bengali Unicode & Conjunct Integrity ---');
  try {
    const unicodeQuery = 'যুক্তবর্ণ ও বাংলা পরীক্ষার রুটিন কীভাবে সাজাব? কয়েকটি উদাহরণ দাও।';
    const resUnicode = await executeAIAction('agentChat', {
      userQuery: unicodeQuery,
      recentHistory: [],
      currentDate: '2026-10-10',
      model: 'smart',
    });

    assert(Boolean(resUnicode && resUnicode.message), 'Unicode Query Response Generated');
    const msg = resUnicode.message;
    // Check for standard Bengali conjuncts
    const hasConjuncts = /[\u0985-\u09E3\u09F0-\u09FD]/.test(msg);
    assert(hasConjuncts, 'Contains genuine Bengali UTF-8 characters', msg);
    assert(!msg.includes('\uFFFD'), 'No UTF-8 replacement character corruption (no )', msg);
  } catch (err: any) {
    assert(false, 'Unicode Integrity Suite', err?.message);
  }

  // ------------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runGeminiPipelineTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
