import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../frontend/.env.local') });
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';

const connectionString = (process.env.DATABASE_URL || '').replace(/^["']|["']$/g, '').trim();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const anonClient = createClient(supabaseUrl, anonKey);
const serviceClient = createClient(supabaseUrl, serviceKey);

async function runSecurityTests() {
  console.log('🔒 Running Comprehensive Database Security, RLS & Constraint Tests...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // =========================================================================
    // 1. ANONYMOUS RLS ACCESS TESTS
    // =========================================================================
    console.log('--- 1. Anonymous Access Boundary ---');

    // 1.1 Anon cannot read audit_log
    const { data: anonAudit, error: anonAuditErr } = await anonClient.from('audit_log').select('*');
    assert(
      anonAuditErr !== null || (anonAudit && anonAudit.length === 0),
      'Anon cannot read audit_log (Deny by default)'
    );

    // 1.2 Anon cannot read admin_users
    const { data: anonAdminUsers, error: anonAdminUsersErr } = await anonClient.from('admin_users').select('*');
    assert(
      anonAdminUsersErr !== null || (anonAdminUsers && anonAdminUsers.length === 0),
      'Anon cannot read admin_users'
    );

    // 1.3 Anon cannot read security_events
    const { data: anonSec, error: anonSecErr } = await anonClient.from('security_events').select('*');
    assert(
      anonSecErr !== null || (anonSec && anonSec.length === 0),
      'Anon cannot read security_events'
    );

    // 1.4 Anon cannot read user_suspensions
    const { data: anonSusp, error: anonSuspErr } = await anonClient.from('user_suspensions').select('*');
    assert(
      anonSuspErr !== null || (anonSusp && anonSusp.length === 0),
      'Anon cannot read user_suspensions'
    );

    // 1.5 Anon CAN read public feature flags
    const { data: anonFlags, error: anonFlagsErr } = await anonClient.from('feature_flags').select('key, is_enabled');
    assert(
      anonFlagsErr === null && Array.isArray(anonFlags) && anonFlags.length > 0,
      'Anon CAN read public feature flags'
    );

    // 1.6 Anon CAN read releases metadata
    const { data: anonReleases, error: anonReleasesErr } = await anonClient.from('releases').select('*');
    assert(
      anonReleasesErr === null,
      'Anon CAN read releases metadata'
    );

    // =========================================================================
    // 2. AUDIT LOG APPEND-ONLY IMMUTABILITY TEST
    // =========================================================================
    console.log('\n--- 2. Audit Log Append-Only Immutability ---');

    // Insert a test audit record via direct SQL
    const testAdminId = '708f4b03-27e9-42f2-b1a3-209f646161cb';
    const auditInsert = await pool.query(`
      INSERT INTO public.audit_log (admin_id, admin_email, action, target_resource, outcome, details)
      VALUES ($1, 'fahimhossain1617@gmail.com', 'test_security_audit', 'security_test', 'success', '{"test": true}'::jsonb)
      RETURNING id;
    `, [testAdminId]);
    const testAuditId = auditInsert.rows[0].id;
    assert(Boolean(testAuditId), 'Audit log successfully appended test record');

    // Attempt to UPDATE audit_log (MUST FAIL via trigger)
    let updateFailed = false;
    try {
      await pool.query(`
        UPDATE public.audit_log 
        SET outcome = 'tampered' 
        WHERE id = $1;
      `, [testAuditId]);
    } catch (err: any) {
      updateFailed = err.message.includes('Audit log is strictly append-only');
    }
    assert(updateFailed, 'Trigger BLOCKS UPDATE on audit_log (Tamper-proofing verified)');

    // Attempt to DELETE from audit_log (MUST FAIL via trigger)
    let deleteFailed = false;
    try {
      await pool.query(`
        DELETE FROM public.audit_log 
        WHERE id = $1;
      `, [testAuditId]);
    } catch (err: any) {
      deleteFailed = err.message.includes('Audit log is strictly append-only');
    }
    assert(deleteFailed, 'Trigger BLOCKS DELETE on audit_log (Append-only enforcement verified)');

    // =========================================================================
    // 3. ANTI-SUSPENSION TRIGGER TESTS
    // =========================================================================
    console.log('\n--- 3. Primary Admin Anti-Suspension Defense ---');

    // Ensure admin user exists in admin_users for testing constraint
    await pool.query(`
      INSERT INTO public.admin_users (user_id, email, role, permissions, is_suspended)
      VALUES ($1, 'fahimhossain1617@gmail.com', 'owner', ARRAY['*']::text[], false)
      ON CONFLICT (user_id) DO UPDATE SET is_suspended = false;
    `, [testAdminId]);

    // Test 3.1: Attempt to set is_suspended = true on admin_users owner
    let ownerSuspensionBlocked = false;
    try {
      await pool.query(`
        UPDATE public.admin_users 
        SET is_suspended = true 
        WHERE email = 'fahimhossain1617@gmail.com';
      `);
    } catch (err: any) {
      ownerSuspensionBlocked = err.message.includes('Primary owner account cannot be suspended');
    }
    assert(ownerSuspensionBlocked, 'Trigger BLOCKS setting is_suspended = true on admin_users owner');

    // Test 3.2: Attempt to insert admin into user_suspensions table
    let adminUserSuspensionBlocked = false;
    try {
      await pool.query(`
        INSERT INTO public.user_suspensions (user_id, reason, status)
        VALUES ($1, 'unauthorized attempt', 'suspended');
      `, [testAdminId]);
    } catch (err: any) {
      adminUserSuspensionBlocked = err.message.includes('Cannot suspend primary admin account');
    }
    assert(adminUserSuspensionBlocked, 'Trigger BLOCKS inserting primary admin into user_suspensions');

    // =========================================================================
    // 4. DEDUPLICATION & GROUPING CONSTRAINTS
    // =========================================================================
    console.log('\n--- 4. Deduplication & Grouping Constraints ---');

    // 4.1 Fingerprint grouping on issues table
    const testFp = 'fp_test_' + Date.now();
    await pool.query(`
      INSERT INTO public.issues (
        fingerprint, title, error_name, message, occurrences_count, first_seen_at, last_seen_at
      ) VALUES ($1, 'Test Bug', 'TypeError', 'Cannot read properties of null', 1, NOW(), NOW())
      ON CONFLICT (fingerprint) DO UPDATE SET
        occurrences_count = public.issues.occurrences_count + 1,
        last_seen_at = NOW();
    `, [testFp]);

    // Re-insert same fingerprint
    await pool.query(`
      INSERT INTO public.issues (
        fingerprint, title, error_name, message, occurrences_count, first_seen_at, last_seen_at
      ) VALUES ($1, 'Test Bug', 'TypeError', 'Cannot read properties of null', 1, NOW(), NOW())
      ON CONFLICT (fingerprint) DO UPDATE SET
        occurrences_count = public.issues.occurrences_count + 1,
        last_seen_at = NOW();
    `, [testFp]);

    const { rows: fpRows } = await pool.query(`
      SELECT occurrences_count, occurrence_count FROM public.issues WHERE fingerprint = $1;
    `, [testFp]);
    assert(
      fpRows[0]?.occurrences_count === 2 && fpRows[0]?.occurrence_count === 2,
      'Issue fingerprint groups deduplicated occurrences into single row (count = 2)'
    );

    // 4.2 Alerts title and dedupe_key uniqueness
    const testAlertDedupe = 'dedupe_test_' + Date.now();
    await pool.query(`
      INSERT INTO public.alerts (dedupe_key, title, description, category, severity, occurrences)
      VALUES ($1, 'Test Alert', 'Alert description', 'security', 'medium', 1)
      ON CONFLICT (title) DO UPDATE SET occurrences = public.alerts.occurrences + 1;
    `, [testAlertDedupe]);

    await pool.query(`
      INSERT INTO public.alerts (dedupe_key, title, description, category, severity, occurrences)
      VALUES ($1, 'Test Alert', 'Alert description', 'security', 'medium', 1)
      ON CONFLICT (title) DO UPDATE SET occurrences = public.alerts.occurrences + 1;
    `, [testAlertDedupe]);

    const { rows: alertRows } = await pool.query(`
      SELECT occurrences, count FROM public.alerts WHERE title = 'Test Alert';
    `, []);
    assert(
      alertRows[0]?.occurrences === 2 && alertRows[0]?.count === 2,
      'Alerts table respects title deduplication and generated count column'
    );

    // =========================================================================
    // 5. DATA RETENTION & CLEANUP PROCEDURE TEST
    // =========================================================================
    console.log('\n--- 5. Automated Data Retention & Pruning ---');

    // Insert old dummy telemetry event (> 30 days old)
    await pool.query(`
      INSERT INTO public.telemetry_events (event_id, feature, action, user_identity, created_at)
      VALUES ('evt_old_test', 'planner', 'test_old', 'test_user', NOW() - INTERVAL '35 days')
      ON CONFLICT (event_id) DO NOTHING;
    `);

    // Insert recent dummy telemetry event (1 day old)
    await pool.query(`
      INSERT INTO public.telemetry_events (event_id, feature, action, user_identity, created_at)
      VALUES ('evt_recent_test', 'planner', 'test_recent', 'test_user', NOW() - INTERVAL '1 day')
      ON CONFLICT (event_id) DO NOTHING;
    `);

    // Execute retention cleanup function
    const cleanupRes = await pool.query('SELECT public.run_maintenance_retention_cleanup() as result;');
    const cleanupResult = cleanupRes.rows[0].result;
    console.log(' - Retention Cleanup execution result:', JSON.stringify(cleanupResult));

    // Verify old event was deleted, recent event was kept
    const { rows: oldEvt } = await pool.query("SELECT * FROM public.telemetry_events WHERE event_id = 'evt_old_test';");
    const { rows: recentEvt } = await pool.query("SELECT * FROM public.telemetry_events WHERE event_id = 'evt_recent_test';");

    assert(oldEvt.length === 0, 'Retention job PRUNED telemetry event older than 30 days');
    assert(recentEvt.length === 1, 'Retention job PRESERVED recent telemetry event (< 30 days)');

    // =========================================================================
    // 6. CLEAN UP TEST FIXTURES
    // =========================================================================
    await pool.query("DELETE FROM public.issues WHERE fingerprint = $1;", [testFp]);
    await pool.query("DELETE FROM public.alerts WHERE title = 'Test Alert';");
    await pool.query("DELETE FROM public.telemetry_events WHERE event_id = 'evt_recent_test';");

  } catch (err: any) {
    console.error('Unhandled security test error:', err);
    failed++;
  } finally {
    await pool.end();
  }

  console.log(`\n==================================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests();
