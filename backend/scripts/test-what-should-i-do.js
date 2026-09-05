const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { GoogleGenAI } = require('@google/genai');

async function testActions() {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = 'gemini-3.7-flash';

  console.log('Testing model with whatShouldIDo action...');
  const prompt = [
    'You are FocusForge, a productivity assistant.',
    'Perform only this action: whatShouldIDo.',
    'Return only valid JSON matching exactly this contract: {"selectedTaskId": number|null, "actionTitle": string, "category": string, "estimatedMinutes": number, "reason": string, "immediateNextStep": string, "momentumTip": string}',
    'Request data: ' + JSON.stringify({
      tasks: [
        { id: 1, title: 'Math practice', priority: 'high', estMinutes: 45 },
        { id: 2, title: 'Read English', priority: 'low', estMinutes: 20 }
      ]
    })
  ].join('\n\n');

  try {
    const res = await client.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0.3 }
    });
    console.log('Result:', res.text);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testActions();
