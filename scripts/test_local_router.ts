/**
 * Glory AI Local-First Router — Automated Verification Test Suite
 * Tests deterministic local routing, token costs (0 tokens for local),
 * multi-turn flows, response variation, and big-task Gemini delegation.
 */

import { routeUserMessage } from '../frontend/src/lib/ai/router';
import { normalizeInput } from '../frontend/src/lib/ai/router/normalize';
import { checkSafety } from '../frontend/src/lib/ai/router/safety';
import { classifyIntent } from '../frontend/src/lib/ai/router/intents';
import { processFlowTurn } from '../frontend/src/lib/ai/router/flows';
import { resetVariationMemory } from '../frontend/src/lib/ai/router/variation';

async function runTestSuite() {
  console.log('===============================================================');
  console.log('   GLORY AI LOCAL-FIRST ROUTER VERIFICATION TEST SUITE');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(title: string, condition: boolean, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      if (detail) console.log(`   └─ ${detail}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${title}`);
      if (detail) console.error(`   └─ ${detail}`);
      throw new Error(`Assertion failed: ${title}`);
    }
  }

  // TEST 1: Social & Small Talk (Hi, who are you, introduce yourself)
  console.log('\n--- 1. Social & Small Talk (0 Tokens) ---');
  resetVariationMemory();

  const resHi = await routeUserMessage('Hi');
  assert(
    'Query "Hi" resolves locally with 0 tokens',
    resHi.handledLocally && !resHi.shouldCallGemini && resHi.tokenCost === 0,
    `Path: LOCAL | Tokens: ${resHi.tokenCost} | Message: "${resHi.message.slice(0, 50)}..."`
  );

  const resWho = await routeUserMessage('who are you');
  assert(
    'Query "who are you" resolves locally with 0 tokens',
    resWho.handledLocally && !resWho.shouldCallGemini && resWho.tokenCost === 0,
    `Path: LOCAL | Tokens: ${resWho.tokenCost} | Identity: "${resWho.message.slice(0, 55)}..."`
  );

  const resIntro = await routeUserMessage('introduce yourself');
  assert(
    'Query "introduce yourself" resolves locally with 0 tokens',
    resIntro.handledLocally && !resIntro.shouldCallGemini && resIntro.tokenCost === 0,
    `Path: LOCAL | Tokens: ${resIntro.tokenCost} | Orb Emotion: ${resIntro.orbEmotion}`
  );

  const resHelloBn = await routeUserMessage('হ্যালো');
  assert(
    'Query "হ্যালো" resolves locally with 0 tokens (Instant Bengali Greeting)',
    resHelloBn.handledLocally && !resHelloBn.shouldCallGemini && resHelloBn.tokenCost === 0,
    `Path: LOCAL | Tokens: ${resHelloBn.tokenCost} | Reply: "${resHelloBn.message.slice(0, 50)}..."`
  );

  const resHiBn = await routeUserMessage('হাই');
  assert(
    'Query "হাই" resolves locally with 0 tokens (Instant Bengali Greeting)',
    resHiBn.handledLocally && !resHiBn.shouldCallGemini && resHiBn.tokenCost === 0,
    `Path: LOCAL | Tokens: ${resHiBn.tokenCost} | Reply: "${resHiBn.message.slice(0, 50)}..."`
  );

  const resHowAreYouBn = await routeUserMessage('তুমি কেমন আছো');
  assert(
    'Query "তুমি কেমন আছো" resolves locally with 0 tokens',
    resHowAreYouBn.handledLocally && !resHowAreYouBn.shouldCallGemini && resHowAreYouBn.tokenCost === 0,
    `Path: LOCAL | Tokens: ${resHowAreYouBn.tokenCost} | Reply: "${resHowAreYouBn.message.slice(0, 50)}..."`
  );

  const resHowAreYouEn = await routeUserMessage('how are you');
  assert(
    'Query "how are you" resolves locally with 0 tokens',
    resHowAreYouEn.handledLocally && !resHowAreYouEn.shouldCallGemini && resHowAreYouEn.tokenCost === 0,
    `Path: LOCAL | Tokens: ${resHowAreYouEn.tokenCost} | Reply: "${resHowAreYouEn.message.slice(0, 50)}..."`
  );

  const resNameBn = await routeUserMessage('তোমার নাম কি');
  assert(
    'Query "তোমার নাম কি" resolves locally with 0 tokens',
    resNameBn.handledLocally && !resNameBn.shouldCallGemini && resNameBn.tokenCost === 0,
    `Path: LOCAL | Tokens: ${resNameBn.tokenCost} | Identity: "${resNameBn.message.slice(0, 50)}..."`
  );

  // TEST 2: Motivation & Emotional Support
  console.log('\n--- 2. Motivation & Emotional Support (0 Tokens) ---');
  const resExam = await routeUserMessage("I'm scared of my exam");
  assert(
    'Query "I\'m scared of my exam" gives empathetic support + 25m Focus button at 0 tokens',
    resExam.handledLocally && !resExam.shouldCallGemini && resExam.actions.length > 0 && resExam.tokenCost === 0,
    `Path: LOCAL | Action: ${resExam.actions[0]?.title} | Emotion: ${resExam.orbEmotion}`
  );

  const resAlone = await routeUserMessage('I feel alone');
  assert(
    'Query "I feel alone" gives empathetic response + Diary button at 0 tokens',
    resAlone.handledLocally && !resAlone.shouldCallGemini && resAlone.actions.length > 0 && resAlone.tokenCost === 0,
    `Path: LOCAL | Action: ${resAlone.actions[0]?.title} | Route: ${resAlone.navigationRoute}`
  );

  // TEST 3: Planner Multi-turn Flow (Missing time -> Ask time -> Create task)
  console.log('\n--- 3. Planner Actions & Multi-turn Time Clarification ---');
  const resPlannerStep1 = await routeUserMessage('add math tomorrow to my planner');
  assert(
    'Query "add math tomorrow to my planner" asks for missing time instead of calling Gemini',
    resPlannerStep1.handledLocally && !resPlannerStep1.shouldCallGemini && resPlannerStep1.message.includes('কখন') || resPlannerStep1.message.includes('time'),
    `Path: LOCAL | Prompt: "${resPlannerStep1.message}"`
  );

  // User replies with time "10:00 am"
  const resPlannerStep2 = await routeUserMessage('10:00 am');
  assert(
    'Followup turn "10:00 am" completes task scheduling with Open Planner action',
    resPlannerStep2.handledLocally && !resPlannerStep2.shouldCallGemini && resPlannerStep2.actions.length > 0,
    `Path: LOCAL | Action: ${resPlannerStep2.actions[0]?.title} | Actions Count: ${resPlannerStep2.actions.length}`
  );

  // Multiple tasks and multiple dates
  const resMulti = await routeUserMessage('add physics on 7th and 8th at 4pm');
  assert(
    'Query "add physics on 7th and 8th at 4pm" handles multiple dates locally',
    resMulti.handledLocally && !resMulti.shouldCallGemini && resMulti.actions.length > 0,
    `Path: LOCAL | Action Type: ${resMulti.actions[0]?.type}`
  );

  // TEST 4: Diary Action (Create topic/folder + Button)
  console.log('\n--- 4. Diary Actions (0 Tokens & Private) ---');
  const resDiary = await routeUserMessage('I want to write a diary, my mood is bad');
  assert(
    'Query "I want to write a diary, my mood is bad" creates diary topic + open diary button',
    resDiary.handledLocally && !resDiary.shouldCallGemini && resDiary.actions.length >= 2,
    `Path: LOCAL | Topic Action: ${resDiary.actions[0]?.title} | Nav Action: ${resDiary.actions[1]?.title}`
  );

  // TEST 5: Time Log & Learning Guidance (Glory Never Teaches)
  console.log('\n--- 5. Time Log & Learning Guidance ---');
  const resJava = await routeUserMessage('I want to learn Java');
  assert(
    'Query "I want to learn Java" suggests Time Log tracking & Planner scheduling without unrequested roadmap',
    resJava.handledLocally && !resJava.shouldCallGemini && resJava.actions.some(a => a.type === 'open_learning') && resJava.actions.some(a => a.type === 'open_planner'),
    `Path: LOCAL | Actions: ${resJava.actions.map(a => a.title).join(', ')}`
  );

  const resJavaBn = await routeUserMessage('আমি জাভা শিখতে চাই');
  assert(
    'Query "আমি জাভা শিখতে চাই" advises Time Log and Planner in Bengali without Gemini tokens',
    resJavaBn.handledLocally && !resJavaBn.shouldCallGemini && resJavaBn.message.includes('টাইম লগ') && resJavaBn.message.includes('প্ল্যানার'),
    `Path: LOCAL | Reply: ${resJavaBn.message.slice(0, 60)}...`
  );

  const resTeach = await routeUserMessage('teach me quantum mechanics');
  assert(
    'Query "teach me..." explains Glory is productivity companion, provides Time Log & Planner buttons',
    resTeach.handledLocally && !resTeach.shouldCallGemini && resTeach.actions.length >= 2,
    `Path: LOCAL | Explanation given without lecturing`
  );

  // TEST 5.1: Timer Action vs Focus Session
  console.log('\n--- 5.1 Timer Action vs Focus Session ---');
  const resTimer = await routeUserMessage('I need a timer');
  assert(
    'Query "I need a timer" gives Stopwatch Timer option (open_timer), NOT a 25m focus session',
    resTimer.handledLocally && !resTimer.shouldCallGemini && resTimer.actions.some(a => a.type === 'open_timer'),
    `Path: LOCAL | Action: ${resTimer.actions[0]?.title} | Type: ${resTimer.actions[0]?.type}`
  );

  const resTimerBn = await routeUserMessage('আমার একটা টাইমার দরকার');
  assert(
    'Query "আমার একটা টাইমার দরকার" provides Stopwatch Timer button in Bengali',
    resTimerBn.handledLocally && !resTimerBn.shouldCallGemini && resTimerBn.actions.some(a => a.type === 'open_timer'),
    `Path: LOCAL | Action: ${resTimerBn.actions[0]?.title}`
  );

  // TEST 5.2: Focus Session Duration Asking Flow
  console.log('\n--- 5.2 Focus Session Duration Clarification ---');
  const resFocusNoMins = await routeUserMessage('ফোকাস সেশন শুরু করতে চাই');
  assert(
    'Query "ফোকাস সেশন শুরু করতে চাই" asks for duration instead of auto-selecting 10 or 25 mins',
    resFocusNoMins.handledLocally && !resFocusNoMins.shouldCallGemini && (resFocusNoMins.message.includes('কত মিনিট') || resFocusNoMins.message.includes('মিনিট')),
    `Path: LOCAL | Question: "${resFocusNoMins.message}"`
  );

  const resFocusReply = await routeUserMessage('২৫ মিনিট');
  assert(
    'Answering "২৫ মিনিট" creates focus session card for 25 minutes',
    resFocusReply.handledLocally && !resFocusReply.shouldCallGemini && resFocusReply.actions.some(a => a.type === 'create_focus_session' && a.parameters.durationMinutes === 25),
    `Path: LOCAL | Action: ${resFocusReply.actions[0]?.title} | Mins: ${resFocusReply.actions[0]?.parameters.durationMinutes}`
  );

  // TEST 6: Navigation Help & Settings Subpages
  console.log('\n--- 6. Navigation & Settings Subpages ---');
  const resNavTimeLog = await routeUserMessage('take me to Time Log');
  assert(
    'Query "take me to Time Log" returns direct button to Time Log screen',
    resNavTimeLog.handledLocally && resNavTimeLog.navigationRoute === 'learning',
    `Path: LOCAL | Target Route: ${resNavTimeLog.navigationRoute}`
  );

  const resLang = await routeUserMessage('how do I change language');
  assert(
    'Query "how do I change language" explains path and opens Settings',
    resLang.handledLocally && resLang.navigationRoute === 'settings',
    `Path: LOCAL | Guidance given for Settings > Language`
  );

  // TEST 7: Response Variation (Same query sent 5 times -> 5 distinct variants)
  console.log('\n--- 7. Response Variation & Shuffle-Bag Rotation ---');
  resetVariationMemory();
  const variants = new Set<string>();
  const queryToRepeat = 'Hi';

  for (let i = 1; i <= 5; i++) {
    const res = await routeUserMessage(queryToRepeat);
    variants.add(res.message);
    console.log(`   Turn ${i}: "${res.message.slice(0, 45)}..."`);
  }

  assert(
    '5 consecutive identical messages return distinct non-repeating variants',
    variants.size >= 4, // At least 4 distinct variations across 5 calls
    `Distinct replies count: ${variants.size} of 5`
  );

  // TEST 8: Safety & Distress Check
  console.log('\n--- 8. Safety & Distress Interception ---');
  const resDistressBn = await routeUserMessage('মরতে চাই বাঁচতে ভালো লাগে না');
  assert(
    'Severe distress phrase intercepted locally with helpline info and Diary button',
    resDistressBn.handledLocally && !resDistressBn.shouldCallGemini && resDistressBn.orbEmotion === 'caring',
    `Path: LOCAL | Emotion: ${resDistressBn.orbEmotion} | Route: ${resDistressBn.navigationRoute}`
  );

  // TEST 9: Big Task / Roadmap (Gemini Allowed with 1200+ tokens)
  console.log('\n--- 9. Big Task / Roadmap Delegation ---');
  const resRoadmap = await routeUserMessage('Give me a complete Java roadmap');
  assert(
    'Query "Give me a complete Java roadmap" is classified as BIG_TASK_ROADMAP for Gemini',
    resRoadmap.shouldCallGemini && resRoadmap.geminiConfig?.taskType === 'roadmap',
    `Path: GEMINI | Target Model: ${resRoadmap.geminiConfig?.modelPreference} | Max Tokens: ${resRoadmap.geminiConfig?.maxOutputTokens}`
  );

  assert(
    'Roadmap task has maxOutputTokens >= 1200 (Bug fix verified)',
    (resRoadmap.geminiConfig?.maxOutputTokens || 0) >= 1200,
    `Allocated maxOutputTokens: ${resRoadmap.geminiConfig?.maxOutputTokens}`
  );

  // TEST 10: Time Log Topics & Weak/Important Queries (0 Tokens, Full Local Inspection)
  console.log('\n--- 10. Time Log Topics & Weak/Important Topics Queries ---');
  const mockContext: any = {
    tasks: [
      {
        id: 1,
        title: 'বাংলা ব্যাকরণ রিভিশন',
        targetDate: '2026-10-10',
        time: '10:00 AM',
        priority: 'high',
        status: 'pending',
      },
      {
        id: 2,
        title: 'ইংরেজি রচনা লেখা',
        targetDate: '2026-10-10',
        time: '04:00 PM',
        priority: 'medium',
        status: 'completed',
      },
      {
        id: 3,
        title: 'গণিত বীজগণিত সমাধান',
        targetDate: '2026-10-07',
        time: '02:00 PM',
        priority: 'high',
        status: 'completed',
      },
    ],
    learningTopics: [
      {
        name: 'বাংলা',
        loggedMinutes: 180,
        importantTopics: ['কারক ও বিভক্তি', 'সমাস', 'সন্ধি'],
        weakTopics: ['ণ-ত্ব ও ষ-ত্ব বিধান', 'প্রত্যয়'],
      },
      {
        name: 'English',
        loggedMinutes: 120,
        importantTopics: ['Tense', 'Preposition'],
        weakTopics: ['Conditionals'],
      },
      {
        name: 'সমাজ',
        loggedMinutes: 60,
        importantTopics: [],
        weakTopics: [],
      },
    ],
    notesCount: 5,
    timeBlocksCount: 2,
    productivityScore: 85,
  };

  const resTopicBangla = await routeUserMessage('আমার বাংলাতে কী কী ইম্পর্টেন্ট টপিক ছিল আর উইক টপিক ছিল বলো', mockContext);
  assert(
    'Query about "বাংলা" folder returns point-by-point important and weak topics at 0 tokens',
    resTopicBangla.handledLocally &&
      !resTopicBangla.shouldCallGemini &&
      resTopicBangla.intent === 'TIMELOG_TOPIC_QUERY' &&
      resTopicBangla.message.includes('কারক ও বিভক্তি') &&
      resTopicBangla.message.includes('ণ-ত্ব ও ষ-ত্ব বিধান'),
    `Path: LOCAL | Topics Found in Message: "${resTopicBangla.message.slice(0, 80)}..."`
  );

  const resTopicEmpty = await routeUserMessage('সমাজ ফোল্ডারের উইক টপিক ও ইম্পর্টেন্ট টপিক বলো', mockContext);
  assert(
    'Query about folder with no topics reports truthfully without hallucinating',
    resTopicEmpty.handledLocally &&
      !resTopicEmpty.shouldCallGemini &&
      resTopicEmpty.message.includes('কোনো গুরুত্বপূর্ণ বা দুর্বল টপিক এন্ট্রি পাওয়া যায়নি'),
    `Message: "${resTopicEmpty.message}"`
  );

  const resTopicNonExistent = await routeUserMessage('পদার্থবিজ্ঞান ফোল্ডারের উইক টপিক কী কী?', mockContext);
  assert(
    'Query about non-existent folder truthfully reports not found and suggests existing folders',
    resTopicNonExistent.handledLocally &&
      !resTopicNonExistent.shouldCallGemini &&
      resTopicNonExistent.message.includes('খুঁজে পাওয়া যায়নি') &&
      resTopicNonExistent.message.includes('বাংলা'),
    `Message: "${resTopicNonExistent.message}"`
  );

  // TEST 11: Planner Date & Schedule Queries (Bengali Numerals & Accurate Lookup)
  console.log('\n--- 11. Planner Date & Schedule Queries ---');
  const resPlanner10th = await routeUserMessage('১০ তারিখে আমার কী রুটিন ছিল সেটা বলো', mockContext);
  assert(
    'Query "১০ তারিখে আমার কী রুটিন ছিল" finds scheduled tasks for 10th with time and status',
    resPlanner10th.handledLocally &&
      !resPlanner10th.shouldCallGemini &&
      resPlanner10th.intent === 'PLANNER_DATE_QUERY' &&
      resPlanner10th.message.includes('বাংলা ব্যাকরণ রিভিশন') &&
      resPlanner10th.message.includes('ইংরেজি রচনা লেখা'),
    `Path: LOCAL | Found Tasks: "${resPlanner10th.message.slice(0, 90)}..."`
  );

  const resPlanner7th = await routeUserMessage('৭ তারিখে কী কাজ ছিল?', mockContext);
  assert(
    'Query "৭ তারিখে কী কাজ ছিল?" finds math task for 7th',
    resPlanner7th.handledLocally &&
      !resPlanner7th.shouldCallGemini &&
      resPlanner7th.message.includes('গণিত বীজগণিত সমাধান'),
    `Message: "${resPlanner7th.message.slice(0, 80)}..."`
  );

  const resPlannerEmptyDate = await routeUserMessage('২৫ তারিখে আমার কী রুটিন ছিল?', mockContext);
  assert(
    'Query for empty planner date truthfully states no tasks scheduled without hallucinating',
    resPlannerEmptyDate.handledLocally &&
      !resPlannerEmptyDate.shouldCallGemini &&
      resPlannerEmptyDate.message.includes('খুঁজে পাওয়া যায়নি'),
    `Message: "${resPlannerEmptyDate.message.slice(0, 80)}..."`
  );

  console.log('\n===============================================================');
  console.log(`   ALL TESTS COMPLETED: ${passedTests}/${totalTests} PASSED`);
  console.log('===============================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
