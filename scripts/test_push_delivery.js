/**
 * FocusForge / Focentia Web Push Diagnostic & Delivery Test Tool
 *
 * Runs an isolated check:
 * 1. Verifies DATABASE_URL connection and queries `push_subscriptions` table.
 * 2. Verifies VAPID keys.
 * 3. Attempts real web-push dispatch to all registered endpoints with raw status/error logging.
 */

const path = require('path');
const rootDir = path.join(__dirname, '..');
const dotenv = require(path.join(rootDir, 'backend', 'node_modules', 'dotenv'));
dotenv.config({ path: path.join(rootDir, 'frontend', '.env.local') });
dotenv.config({ path: path.join(rootDir, 'backend', '.env') });

const { Pool } = require(path.join(rootDir, 'backend', 'node_modules', 'pg'));
const webpush = require(path.join(rootDir, 'backend', 'node_modules', 'web-push'));

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BKiTIGiwQ4QM67m8BPFRtckuTY3jxOwNRM6m5sltJurz-ygl6jMf0mKLoQOIqPArqMEo2sVaU5TaQxvqyNy8irU';

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'DuHT8XxURd3NTsnVZC5UvEXgZfdt25Wh11aTxO5CBaM';

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT ||
  'mailto:focentia13@gmail.com';

async function runPushDiagnostics() {
  console.log('====================================================');
  console.log('🔍 FOCUSFORGE WEB PUSH DIAGNOSTIC SUITE');
  console.log('====================================================\n');

  console.log('--- 1. VAPID Configuration ---');
  console.log(`  Subject:     ${VAPID_SUBJECT}`);
  console.log(`  Public Key:  ${VAPID_PUBLIC_KEY ? `${VAPID_PUBLIC_KEY.slice(0, 15)}... (Length: ${VAPID_PUBLIC_KEY.length})` : 'MISSING ❌'}`);
  console.log(`  Private Key: ${VAPID_PRIVATE_KEY ? `${VAPID_PRIVATE_KEY.slice(0, 8)}... (Length: ${VAPID_PRIVATE_KEY.length})` : 'MISSING ❌'}`);

  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    console.log('  ✅ VAPID configuration successfully validated.');
  } catch (vapidErr) {
    console.error('  ❌ VAPID configuration error:', vapidErr.message);
    process.exit(1);
  }

  console.log('\n--- 2. Database Connection & Subscription Table ---');
  const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!dbUrl) {
    console.error('  ❌ Missing DATABASE_URL in environment.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl });

  let rows = [];
  try {
    const res = await pool.query('SELECT id, user_id, endpoint, p256dh, auth, user_agent, created_at, updated_at FROM push_subscriptions ORDER BY created_at DESC LIMIT 10;');
    rows = res.rows;
    console.log(`  ✅ Successfully connected to database. Found ${rows.length} push subscription(s).`);
  } catch (dbErr) {
    console.error('  ❌ Database query failed:', dbErr.message);
    await pool.end();
    process.exit(1);
  }

  if (rows.length === 0) {
    console.log('\n  ⚠️ No devices currently registered in `push_subscriptions`.');
    console.log('  👉 Action: Open the app on Android / Web, log in, grant notification permission, and click "Register / Sync Web Push".');
    await pool.end();
    return;
  }

  console.log('\n--- 3. Testing Real Push Delivery to Stored Subscriptions ---');
  for (let i = 0; i < rows.length; i++) {
    const sub = rows[i];
    console.log(`\n[Subscription #${i + 1}] ID: ${sub.id} | User: ${sub.user_id}`);
    console.log(`  Endpoint:   ${sub.endpoint.slice(0, 60)}...`);
    console.log(`  User-Agent: ${sub.user_agent || 'Not provided'}`);
    console.log(`  Created:    ${sub.created_at}`);

    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    const payload = JSON.stringify({
      title: 'Focentia Live Test Push',
      body: `Testing background delivery at ${new Date().toLocaleTimeString()}`,
      id: `cli_test_${Date.now()}`,
      category: 'system',
      actionRoute: 'today',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-large.png?v=max_zoom_1',
      tag: 'focentia-cli-test',
      timestamp: Date.now(),
    });

    try {
      const sendRes = await webpush.sendNotification(pushSubscription, payload, {
        TTL: 86400,
        urgency: 'high',
      });
      console.log(`  ✅ Delivery Status: ${sendRes.statusCode} SUCCESS! Notification routed to push service.`);
    } catch (pushErr) {
      console.error(`  ❌ Delivery Failed: Status ${pushErr.statusCode || 'N/A'}`);
      console.error(`     Error: ${pushErr.message}`);
      if (pushErr.body) console.error(`     Response Body: ${pushErr.body}`);
      if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
        console.log(`     ⚠️ Subscription is expired or unsubscribed (410/404). Clean up recommended.`);
      }
    }
  }

  await pool.end();
  console.log('\n====================================================');
  console.log('🏁 DIAGNOSTIC COMPLETE');
  console.log('====================================================\n');
}

runPushDiagnostics();
