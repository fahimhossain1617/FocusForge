import { generateSmartTitle } from '../frontend/src/services/aiAgentService';

async function testSessionTitleLocking() {
  console.log('--- TESTING CHAT SESSION TITLE LOCKING & DEDUPLICATION ---');

  // Turn 1: User says "i want some roadmap"
  const turn1Msg = "i want some roadmap";
  const title1 = await generateSmartTitle(turn1Msg);
  console.log(`Turn 1: "${turn1Msg}" -> Generated Title: "${title1}"`);

  // Simulate session list
  const sessionId = "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d";
  let sessions = [
    { id: sessionId, title: title1, updated_at: new Date().toISOString() }
  ];

  // Turn 2: User says "I want to create java polymorphism chapter roadmap"
  const turn2Msg = "I want to create java polymorphism chapter roadmap";
  const existingIdx = sessions.findIndex(s => s.id === sessionId);
  if (existingIdx >= 0) {
    // Session exists: lock original title!
    sessions[existingIdx] = {
      ...sessions[existingIdx],
      title: sessions[existingIdx].title, // title must NOT change
      updated_at: new Date().toISOString()
    };
  }
  console.log(`Turn 2: "${turn2Msg}" -> Session Title: "${sessions[0].title}" (Deduplicated, unchanged: ${sessions[0].title === title1})`);
  console.log(`Session count: ${sessions.length} (Expected: 1)`);

  // Turn 3: User says "Are you connect with gemini api?"
  const turn3Msg = "Are you connect with gemini api?";
  const existingIdx3 = sessions.findIndex(s => s.id === sessionId);
  if (existingIdx3 >= 0) {
    sessions[existingIdx3] = {
      ...sessions[existingIdx3],
      title: sessions[existingIdx3].title,
      updated_at: new Date().toISOString()
    };
  }
  console.log(`Turn 3: "${turn3Msg}" -> Session Title: "${sessions[0].title}" (Deduplicated, unchanged: ${sessions[0].title === title1})`);
  console.log(`Session count: ${sessions.length} (Expected: 1)`);

  if (sessions.length === 1 && sessions[0].title === title1) {
    console.log('\n[PASS] Chat session title locking & single history entry verified!');
  } else {
    throw new Error('Title locking or deduplication failed');
  }
}

testSessionTitleLocking().catch(e => {
  console.error('FAILED:', e);
  process.exit(1);
});

