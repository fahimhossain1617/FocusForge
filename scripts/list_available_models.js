const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require(path.resolve(__dirname, '../backend/node_modules/@google/genai'));

function loadEnvFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          value = value.trim().replace(/^['"]|['"]$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
  } catch (e) {}
}

loadEnvFile(path.resolve(__dirname, '../.env'));
loadEnvFile(path.resolve(__dirname, '../frontend/.env.local'));
loadEnvFile(path.resolve(__dirname, '../backend/.env'));

const apiKey = (process.env.GEMINI_API_KEY || '').replace(/^["']|["']$/g, '').trim();

async function listModels() {
  const ai = new GoogleGenAI({ apiKey });
  console.log('Testing models with GoogleGenAI...');
  
  const testList = [
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
    'gemini-3.5-pro',
    'gemini-3.6-pro',
    'gemini-3.8-pro',
    'gemini-3.0-flash',
    'gemini-3.0-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
  ];

  for (const m of testList) {
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents: 'Say hi in one word'
      });
      console.log(`✓ SUCCESS for model: "${m}" -> Reply: "${res.text?.trim()}"`);
    } catch (e) {
      console.log(`✗ FAILED for model: "${m}" -> Error: ${e.message?.slice(0, 100)}`);
    }
  }
}

listModels().catch(console.error);
