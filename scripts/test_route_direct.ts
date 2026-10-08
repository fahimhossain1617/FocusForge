/**
 * DIRECT INVOCATION TEST OF NEXT.JS API CATCH-ALL ROUTE
 */

import { NextRequest } from 'next/server';
import { GET } from '../frontend/src/app/api/[...path]/route';

async function testApiDirectly() {
  console.log("--- Testing /api/ai/tokens Direct Invocation ---");
  try {
    const req = new NextRequest('http://localhost:3000/api/ai/tokens?lang=bn', {
      headers: {
        'x-app-lang': 'bn',
      }
    });
    const context = {
      params: Promise.resolve({ path: ['ai', 'tokens'] })
    };
    const res = await GET(req, context);
    console.log("HTTP Status:", res.status);
    const data = await res.json();
    console.log("Response Body:", data);
  } catch (err) {
    console.error("Direct API invocation error:", err);
  }

  console.log("\n--- Testing /api/user/check-username Direct Invocation ---");
  try {
    const req = new NextRequest('http://localhost:3000/api/user/check-username?username=testuser', {
      headers: {
        'x-forwarded-for': '127.0.0.1',
      }
    });
    const context = {
      params: Promise.resolve({ path: ['user', 'check-username'] })
    };
    const res = await GET(req, context);
    console.log("HTTP Status:", res.status);
    const data = await res.json();
    console.log("Response Body:", data);
  } catch (err) {
    console.error("Direct API invocation error:", err);
  }
}

testApiDirectly().catch(console.error);
