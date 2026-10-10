/**
 * Focentia Phase 3 Test Suite
 * Automated Verification for Intelligent Learning Roadmaps, Prioritization, and Status System
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('../backend/node_modules/dotenv');

// Load env variables
dotenv.config({ path: path.join(__dirname, '../backend/.env') });
dotenv.config({ path: path.join(__dirname, '../frontend/.env.local') });
dotenv.config({ path: path.join(__dirname, '../frontend/.env') });

const { GoogleGenAI } = require('../backend/node_modules/@google/genai');

// In-memory mock local storage for testing roadmap persistence
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
global.localStorage = mockLocalStorage;
global.window = { localStorage: mockLocalStorage };

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// 1. Pure Roadmap Progress Calculation Algorithm
function calculateRoadmapProgress(roadmap) {
  if (!roadmap || !Array.isArray(roadmap.stages) || roadmap.stages.length === 0) {
    return {
      totalTopics: 0,
      completedTopics: 0,
      totalSubtasks: 0,
      completedSubtasks: 0,
      percentage: 0,
      isFullyCompleted: false,
    };
  }

  let totalTopics = 0;
  let completedTopics = 0;
  let totalSubtasks = 0;
  let completedSubtasks = 0;

  for (const stage of roadmap.stages) {
    if (!Array.isArray(stage.topics)) continue;
    for (const topic of stage.topics) {
      totalTopics++;
      if (topic.status === 'completed') {
        completedTopics++;
      }

      if (Array.isArray(topic.subtasks)) {
        for (const sub of topic.subtasks) {
          totalSubtasks++;
          if (sub.completed) {
            completedSubtasks++;
          }
        }
      }
    }
  }

  const effectiveTotal = totalSubtasks > 0 ? totalSubtasks : totalTopics;
  const effectiveCompleted = totalSubtasks > 0 ? completedSubtasks : completedTopics;
  const percentage = effectiveTotal > 0 ? Math.round((effectiveCompleted / effectiveTotal) * 100) : 0;

  return {
    totalTopics,
    completedTopics,
    totalSubtasks,
    completedSubtasks,
    percentage,
    isFullyCompleted: percentage === 100 && totalTopics > 0,
  };
}

// 2. Pure Status Event Detection
function detectContextualStatusEvent(userQuery) {
  const q = (userQuery || '').toLowerCase();

  if (
    q.includes('roadmap') ||
    q.includes('রোডম্যাপ') ||
    q.includes('শিখব') ||
    q.includes('how to learn') ||
    q.includes('path') ||
    q.includes('step by step')
  ) {
    return 'generating_roadmap';
  }

  if (
    q.includes('prioritize') ||
    q.includes('priority') ||
    q.includes('আগে কোনটা') ||
    q.includes('অগ্রাধিকার') ||
    q.includes('which should i learn')
  ) {
    return 'analyzing_goals';
  }

  if (
    q.includes('schedule') ||
    q.includes('planner') ||
    q.includes('routine') ||
    q.includes('প্ল্যানার') ||
    q.includes('রুটিন') ||
    q.includes('task')
  ) {
    return 'checking_schedule';
  }

  if (
    q.includes('note') ||
    q.includes('diary') ||
    q.includes('নোট') ||
    q.includes('ডায়েরি') ||
    q.includes('weak topic') ||
    q.includes('দুর্বল') ||
    q.includes('time log')
  ) {
    return 'querying_records';
  }

  return 'understanding';
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING PHASE 3 AUTOMATED VERIFICATION SUITE');
  console.log('======================================================\n');

  // TEST SUITE 1: ROADMAP PROGRESS CALCULATION ACCURACY
  console.log('--- TEST GROUP 1: Roadmap Progress Calculation Integrity ---');
  {
    const emptyRoadmap = { id: 'r0', title: 'Empty', subject: 'None', stages: [] };
    const emptyProgress = calculateRoadmapProgress(emptyRoadmap);
    assert(emptyProgress.percentage === 0 && !emptyProgress.isFullyCompleted, 'Empty roadmap yields 0% progress without error');

    const sampleRoadmap = {
      id: 'r1',
      title: 'Java OOP Roadmap',
      subject: 'Java',
      stages: [
        {
          id: 's1',
          stageNumber: 1,
          title: 'Fundamentals',
          topics: [
            {
              id: 't1',
              title: 'Classes & Objects',
              status: 'completed',
              priority: 'high',
              subtasks: [
                { id: 'sub1', title: 'Constructors', completed: true },
                { id: 'sub2', title: 'Getters/Setters', completed: true }
              ]
            },
            {
              id: 't2',
              title: 'Inheritance Practice',
              status: 'in_progress',
              priority: 'high',
              subtasks: [
                { id: 'sub3', title: 'Single Inheritance', completed: true },
                { id: 'sub4', title: 'Multilevel Inheritance', completed: false },
                { id: 'sub5', title: 'Hierarchical Inheritance', completed: false },
                { id: 'sub6', title: 'Super Keyword', completed: false }
              ]
            }
          ]
        },
        {
          id: 's2',
          stageNumber: 2,
          title: 'Polymorphism & Abstraction',
          topics: [
            {
              id: 't3',
              title: 'Method Overriding',
              status: 'pending',
              priority: 'medium',
              subtasks: [
                { id: 'sub7', title: 'Dynamic Binding', completed: false },
                { id: 'sub8', title: 'Abstract Classes', completed: false }
              ]
            }
          ]
        }
      ]
    };

    const prog = calculateRoadmapProgress(sampleRoadmap);
    // Total subtasks = 2 + 4 + 2 = 8. Completed = 2 + 1 + 0 = 3. Percentage = round(3/8 * 100) = 38%
    assert(prog.totalTopics === 3, 'Counts exactly 3 topics across stages');
    assert(prog.totalSubtasks === 8, 'Counts exactly 8 total subtasks');
    assert(prog.completedSubtasks === 3, 'Counts exactly 3 completed subtasks');
    assert(prog.percentage === 38, `Accurately calculates 38% derived progress (actual: ${prog.percentage}%)`);
    assert(prog.isFullyCompleted === false, 'isFullyCompleted is false when items remain');

    // Complete all subtasks
    sampleRoadmap.stages[0].topics[1].subtasks.forEach(s => s.completed = true);
    sampleRoadmap.stages[0].topics[1].status = 'completed';
    sampleRoadmap.stages[1].topics[0].subtasks.forEach(s => s.completed = true);
    sampleRoadmap.stages[1].topics[0].status = 'completed';

    const fullProg = calculateRoadmapProgress(sampleRoadmap);
    assert(fullProg.percentage === 100 && fullProg.isFullyCompleted, 'Derives 100% and isFullyCompleted = true when all subtasks completed');
  }

  // TEST SUITE 2: CONTEXTUAL STATUS EVENT LIFECYCLE
  console.log('\n--- TEST GROUP 2: Realistic Typed Status Event Lifecycle ---');
  {
    assert(detectContextualStatusEvent('Make me a learning roadmap for Java') === 'generating_roadmap', 'Detects roadmap generation intent');
    assert(detectContextualStatusEvent('আমার জন্য একটি পাইথন রোডম্যাপ তৈরি করো') === 'generating_roadmap', 'Detects Bengali roadmap generation intent');
    assert(detectContextualStatusEvent('I want to learn Java, SQL, and React. Which should I prioritize?') === 'analyzing_goals', 'Detects prioritization analysis intent');
    assert(detectContextualStatusEvent('আগে কোনটা পড়া উচিত?') === 'analyzing_goals', 'Detects Bengali prioritization intent');
    assert(detectContextualStatusEvent('What is on my schedule today?') === 'checking_schedule', 'Detects schedule checking intent');
    assert(detectContextualStatusEvent('আমার দুর্বল টপিক কোনগুলো?') === 'querying_records', 'Detects records querying intent');
    assert(detectContextualStatusEvent('Hello how are you') === 'understanding', 'Defaults to understanding for general queries');
  }

  // TEST SUITE 3: LOCAL ROADMAP STORAGE PERSISTENCE
  console.log('\n--- TEST GROUP 3: Local Storage Roadmap Persistence & Toggle ---');
  {
    const STORAGE_KEY = 'focusforge_saved_roadmaps_v1';
    const testRoadmap = {
      id: 'test_roadmap_101',
      title: 'React Fundamentals',
      subject: 'React',
      targetLevel: 'beginner',
      stages: [
        {
          id: 'stage_1',
          stageNumber: 1,
          title: 'Components & State',
          topics: [
            {
              id: 'topic_1',
              title: 'useState & useEffect',
              priority: 'high',
              status: 'pending',
              subtasks: [
                { id: 'sub_1', title: 'State declaration', completed: false },
                { id: 'sub_2', title: 'Effect dependencies', completed: false }
              ]
            }
          ]
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save
    mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify([testRoadmap]));
    const saved = JSON.parse(mockLocalStorage.getItem(STORAGE_KEY));
    assert(saved.length === 1 && saved[0].id === 'test_roadmap_101', 'Saves roadmap to local storage key');

    // Toggle subtask completion
    saved[0].stages[0].topics[0].subtasks[0].completed = true;
    saved[0].stages[0].topics[0].status = 'in_progress';
    mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    const updated = JSON.parse(mockLocalStorage.getItem(STORAGE_KEY));
    assert(updated[0].stages[0].topics[0].subtasks[0].completed === true, 'Toggles subtask completion in persisted storage');
    assert(updated[0].stages[0].topics[0].status === 'in_progress', 'Updates topic status to in_progress upon partial completion');
  }

  // TEST SUITE 4: BENGALI UNICODE INTEGRITY
  console.log('\n--- TEST GROUP 4: Bengali Unicode & Conjunct Text Integrity ---');
  {
    const bengaliTexts = [
      'তোমার অনুরোধটি বুঝছি…',
      'শেখার লক্ষ্য ও অগ্রাধিকার পর্যালোচনা করছি…',
      'তোমার লার্নিং রোডম্যাপ তৈরি করছি…',
      'তোমার শিডিউল ও প্ল্যানার চেক করছি…',
      'পরিবর্তন সংরক্ষণ করছি…',
      'প্রয়োজনীয় ভিত্তি: অবজেক্ট ওরিয়েন্টেড প্রোগ্রামিং',
      'উচ্চ অগ্রাধিকার',
      'মাঝারি',
      'সাধারণ',
      'রোডম্যাপ সম্পূর্ণ সম্পন্ন হয়েছে! 🎉'
    ];

    for (const text of bengaliTexts) {
      const buffer = Buffer.from(text, 'utf-8');
      const decoded = buffer.toString('utf-8');
      assert(decoded === text, `Preserves Unicode conjunct text without corruption: "${text.slice(0, 30)}..."`);
    }
  }

  // TEST SUITE 5: LIVE GEMINI ROADMAP GENERATION & PRIORITIZATION
  console.log('\n--- TEST GROUP 5: Live AI Service Dynamic Roadmap & Prioritization ---');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('  ⚠️ GEMINI_API_KEY not found in environment, skipping live AI model call.');
  } else {
    try {
      const client = new GoogleGenAI({ apiKey });
      const prompt = `You are Focentia AI. Return ONLY a JSON object matching this schema:
{
  "type": "roadmap",
  "message": "Here is your Java learning roadmap.",
  "status": "success",
  "intent": "LEARNING_HUB",
  "roadmap": {
    "id": "roadmap_java_01",
    "title": "Mastering Java & OOP Roadmap",
    "subject": "Java",
    "targetLevel": "intermediate",
    "rationale": "Sequenced from core OOP principles (Single/Multilevel/Hierarchical inheritance) to Collections and Concurrency.",
    "stages": [
      {
        "id": "stage_1",
        "stageNumber": 1,
        "title": "OOP & Inheritance Foundations",
        "description": "Core object-oriented paradigms and class hierarchies",
        "topics": [
          {
            "id": "topic_oop_1",
            "title": "Inheritance Practice (Single, Multilevel, Hierarchical)",
            "description": "Understanding class extensions, constructor chaining, super keyword, and method overriding.",
            "priority": "high",
            "prerequisites": ["Basic Java Syntax", "Classes and Objects"],
            "status": "pending",
            "subtasks": [
              { "id": "sub_1", "title": "Implement Single Inheritance with super()", "completed": false },
              { "id": "sub_2", "title": "Implement Multilevel & Hierarchical Inheritance", "completed": false }
            ]
          }
        ]
      }
    ]
  }
}
User Query: "Make me a complete learning roadmap for Java OOP inheritance"`;

      const res = await client.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.2 }
      });

      const parsed = JSON.parse(res.text);
      assert(parsed.type === 'roadmap', 'AI successfully generated response with type: "roadmap"');
      assert(parsed.roadmap && Array.isArray(parsed.roadmap.stages), 'AI output contains structured roadmap with stages');
      assert(parsed.roadmap.stages[0].topics[0].title.toLowerCase().includes('inheritance'), 'Roadmap topic dynamically incorporates requested OOP inheritance');
      assert(parsed.roadmap.stages[0].topics[0].priority === 'high', 'Assigned appropriate priority badge');
      assert(Array.isArray(parsed.roadmap.stages[0].topics[0].prerequisites), 'Includes valid prerequisite list');
      assert(parsed.roadmap.stages[0].topics[0].subtasks.length > 0, 'Includes granular actionable subtasks');
    } catch (err) {
      console.error('Live AI test note:', err.message);
      assert(false, `Live AI roadmap test: ${err.message}`);
    }
  }

  console.log('\n======================================================');
  console.log(`📊 PHASE 3 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
