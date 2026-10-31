import { routeUserMessage } from '../frontend/src/lib/ai/router/index';

async function testRouter() {
  console.log('--- TESTING LOCAL ROUTER FOR GLORY AI ---');

  // Test A: Guest Mode diary check
  console.log('\n[Test A] Guest mode asking to check diary:');
  const guestRes = await routeUserMessage('চেক করে দেখো তো আমার ডায়েরিতে এই মুহূর্তে কোনো ফাইল বা ডায়েরি বানানো আছে নাকি', {
    tasks: [],
    notesCount: 0,
    timeBlocksCount: 0,
    productivityScore: 0,
    isGuest: true
  }, [], false);
  console.log('Message:', guestRes.message);
  console.log('Actions:', guestRes.actions?.map(a => a.type));

  // Test B: Authenticated folder query
  console.log('\n[Test B] Authenticated asking for all folders:');
  const folderRes = await routeUserMessage('আমার কয়টা ফোল্ডার আছে দেখাও তো', {
    tasks: [],
    notesCount: 2,
    timeBlocksCount: 0,
    productivityScore: 0,
    learningTopics: [
      { name: 'Java Programming', loggedMinutes: 120, importantTopics: ['Polymorphism', 'Interfaces'], weakTopics: ['Generics'] }
    ],
    notesSummary: [{ title: 'Physics Formulas', category: 'Science' }],
    diarySummary: [{ title: 'Daily Reflections', entryCount: 4 }],
    isGuest: false
  }, [], true, 'Fahim');
  console.log('Message:\n', folderRes.message);

  // Test C: Local focus session with 10 mins in Bengali
  console.log('\n[Test C] Bengali 10 minute focus session:');
  const focusBnRes = await routeUserMessage('১০ মিনিটের ফোকাস সেশন শুরু করো', {}, [], true, 'Fahim');
  console.log('Message:', focusBnRes.message);
  console.log('Actions:', focusBnRes.actions?.map(a => `${a.type} -> ${JSON.stringify(a.parameters)}`));

  console.log('\n--- ROUTER TESTS PASSED ---');
}

testRouter().catch(e => {
  console.error('ROUTER TEST FAILED:', e);
  process.exit(1);
});

