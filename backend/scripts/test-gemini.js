const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { GoogleGenAI } = require('@google/genai');

async function test() {
  console.log('API Key length:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 'MISSING');
  console.log('Configured Model:', process.env.GEMINI_MODEL);

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const modelsToTest = [
    process.env.GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ];

  for (const model of modelsToTest) {
    if (!model) continue;
    try {
      console.log(`\nTesting model: ${model}...`);
      const response = await client.models.generateContent({
        model,
        contents: 'Say hello in one short sentence.',
      });
      console.log(`✅ Model ${model} SUCCESS:`, response.text);
      return;
    } catch (err) {
      console.error(`❌ Model ${model} FAILED:`, err.message || err);
    }
  }
}

test();
