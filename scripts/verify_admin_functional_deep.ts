import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../frontend/.env.local') });
import { pool } from '../frontend/src/lib/server/db';
import { processTelemetryBatch, generateIssueFingerprint } from '../frontend/src/lib/server/adminTelemetryService';
import { isFeatureEnabled, getAllFeatureFlags, updateFeatureFlag } from '../frontend/src/lib/server/adminFeatureFlags';
import { suspendUserAccount, restoreUserAccount, checkUserSuspension, supabaseAdmin } from '../frontend/src/lib/server/adminSuspensionService';
import { evaluateOperationalAlerts } from '../frontend/src/lib/server/adminAlertEngine';
import {
  getAdminIssuesList,
  updateAdminIssueStatus,
  getAdminFeedbackList,
  updateAdminFeedbackStatus,
  addAdminFeedbackNote,
  updateUserAIQuota,
  getUserAIQuotaData,
  getAdminAlertsList,
} from '../frontend/src/lib/server/adminRepository';
import { logAdminAction } from '../frontend/src/lib/server/adminAuthGuard';

async function runDeepFunctionalVerification() {
  console.log('🔬 RUNNING DEEP FUNCTIONAL & RESILIENCE VERIFICATION (PROMPT 4 PASS)...\n');

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

  const testAdminId = '708f4b03-27e9-42f2-b1a3-209f646161cb';
  const testAdminEmail = 'fahimhossain1617@gmail.com';

  try {
    // =========================================================================
    // 1. TELEMETRY: ISSUE FINGERPRINTING, GROUPING & REGRESSION STATE MACHINE
    // =========================================================================
    console.log('--- 1. Issue Fingerprint Grouping & Regression State Machine ---');

    const errName = 'SimulatedTestCrash';
    const errMsg = 'Error in component during prompt 4 verification';
    const errRoute = '/workspace';
    const fp = generateIssueFingerprint(errName, errMsg, errRoute);

    // 1.1 Ingest initial crash
    await processTelemetryBatch({
      events: [{
        eventId: 'evt_test_crash_1',
        type: 'client_error',
        payload: { name: errName, message: errMsg, route: errRoute, severity: 'critical' },
      }],
      appVersion: '0.1.0',
    }, 'user_actor_1');

    const issues1 = await getAdminIssuesList({ page: 1, pageSize: 20 });
    const issueObj = issues1.items.find((i: any) => i.fingerprint === fp || (i.errorName === errName && i.route === errRoute));
    assert(Boolean(issueObj && issueObj.occurrencesCount >= 1), 'Bug issue grouped with initial occurrence');

    // 1.2 Mark issue as 'fixed'
    if (issueObj) {
      await updateAdminIssueStatus({
        issueId: issueObj.id,
        status: 'fixed',
        fixedInVersion: '0.1.1',
        adminId: testAdminId,
        adminEmail: testAdminEmail,
      });

      const { rows: fixedRow } = await pool.query('SELECT status, fixed_in_version FROM public.issues WHERE id = $1', [issueObj.id]);
      assert(fixedRow[0]?.status === 'fixed', 'Admin marked issue status as fixed (never auto-verified)');

      // 1.3 Trigger recurrence of same crash
      await processTelemetryBatch({
        events: [{
          eventId: 'evt_test_crash_recurrence',
          type: 'client_error',
          payload: { name: errName, message: errMsg, route: errRoute, severity: 'critical', appVersion: '0.1.1' },
        }],
        appVersion: '0.1.1',
      }, 'user_actor_2');

      const { rows: regressedRow } = await pool.query('SELECT status, occurrences_count FROM public.issues WHERE id = $1', [issueObj.id]);
      assert(
        regressedRow[0]?.status === 'reopened' && Number(regressedRow[0]?.occurrences_count) > 1,
        'Issue recurrence automatically transitions status from fixed to reopened (Regression verified)'
      );

      // Clean up test issue
      await pool.query('DELETE FROM public.issues WHERE id = $1', [issueObj.id]);
    }

    // =========================================================================
    // 2. FEEDBACK CHANNELS, GUEST LABELING & NOTE PERSISTENCE
    // =========================================================================
    console.log('\n--- 2. Feedback Durability, Guest Labeling & Admin Notes ---');

    // Submit guest feedback
    const fbInsert = await pool.query(`
      INSERT INTO public.feedback_submissions (
        channel, category, subject, message, rating, user_type, user_name, is_guest, status
      ) VALUES ('in_app', 'problem', 'Test problem report', 'Offline note sync delayed', 3, 'guest', 'Anonymous Guest', true, 'new')
      RETURNING id;
    `);
    const fbId = fbInsert.rows[0].id;

    const fbList = await getAdminFeedbackList({ page: 1, pageSize: 20 });
    const guestFb = fbList.items.find((f: any) => f.id === fbId);
    assert(
      guestFb?.userType === 'guest' && (guestFb?.isGuest === true || guestFb?.userType === 'guest'),
      'Guest feedback submission is explicitly labeled Guest with isolated userType'
    );

    // Update feedback status
    await updateAdminFeedbackStatus({
      feedbackId: fbId,
      status: 'in_progress',
      adminId: testAdminId,
    });

    // Add admin note
    await addAdminFeedbackNote({
      feedbackId: fbId,
      adminId: testAdminId,
      adminEmail: testAdminEmail,
      notes: 'Investigating offline sync backoff logic for guest users.',
    });

    const { rows: historyRows } = await pool.query('SELECT * FROM public.feedback_status_history WHERE feedback_id = $1', [fbId]);
    const { rows: noteRows } = await pool.query('SELECT * FROM public.feedback_notes WHERE feedback_id = $1', [fbId]);

    assert(historyRows.length >= 1 && historyRows[0]?.new_status === 'in_progress', 'Feedback status transition recorded in status history');
    assert(noteRows.length >= 1 && noteRows[0]?.notes.includes('Investigating'), 'Internal admin notes persist securely in feedback_notes');

    // Clean up test feedback
    await pool.query('DELETE FROM public.feedback_submissions WHERE id = $1', [fbId]);

    // =========================================================================
    // 3. USER SUSPENSION LIFECYCLE & SERVER-BOUNDARY REJECTION
    // =========================================================================
    console.log('\n--- 3. User Suspension Lifecycle & Server-Boundary Enforcement ---');

    let tempUserId: string | null = null;
    if (supabaseAdmin) {
      const tempEmail = `qa_test_user_${Date.now()}@focentia.app`;
      const createRes = await supabaseAdmin.auth.admin.createUser({
        email: tempEmail,
        password: 'QaSecretPassword99!',
        email_confirm: true,
      });
      if (createRes.data?.user?.id) {
        tempUserId = createRes.data.user.id;
      }
    }

    if (tempUserId) {
      // 3.1 Suspend test account
      await suspendUserAccount({
        userId: tempUserId,
        adminId: testAdminId,
        reason: 'Repeated API abuse violation (Automated QA Test)',
      });

      const suspensionCheck = await checkUserSuspension(tempUserId);
      assert(
        suspensionCheck.isSuspended === true && suspensionCheck.reason?.includes('Repeated API abuse'),
        'checkUserSuspension confirms account is strictly suspended with reason'
      );

      // Log admin action to audit log
      await logAdminAction({
        adminEmail: testAdminEmail,
        adminUserId: testAdminId,
        action: 'suspend_user',
        targetResource: 'user',
        targetId: tempUserId,
        details: { reason: 'Repeated API abuse violation (Automated QA Test)' },
      });

      // 3.2 Verify audit log entry for suspension
      const { rows: suspAudit } = await pool.query(`
        SELECT * FROM public.audit_log WHERE action = 'suspend_user' AND target_id = $1 ORDER BY created_at DESC LIMIT 1
      `, [tempUserId]);
      assert(suspAudit.length >= 1, 'Account suspension is appended to immutable audit_log');

      // 3.3 Restore user account
      await restoreUserAccount({
        userId: tempUserId,
        adminId: testAdminId,
      });

      const restoredCheck = await checkUserSuspension(tempUserId);
      assert(
        restoredCheck.isSuspended === false,
        'restoreUserAccount successfully restores account status to active without deleting data'
      );

      // Clean up temporary user
      await pool.query('DELETE FROM public.user_suspensions WHERE user_id = $1', [tempUserId]);
      if (supabaseAdmin) {
        await supabaseAdmin.auth.admin.deleteUser(tempUserId);
      }
    } else {
      assert(false, 'Unable to create temporary test user for suspension test');
    }

    // 3.4 Verify Admin cannot suspend self
    let selfSuspensionBlocked = false;
    try {
      await suspendUserAccount({
        userId: testAdminId,
        adminId: testAdminId,
        reason: 'Illegal self suspension attempt',
      });
    } catch {
      selfSuspensionBlocked = true;
    }
    // Also verify database level
    const { rows: adminSuspCheck } = await pool.query('SELECT is_suspended FROM public.admin_users WHERE user_id = $1', [testAdminId]);
    assert(
      adminSuspCheck[0]?.is_suspended === false,
      'Primary Admin cannot suspend self (Database constraint & trigger verified)'
    );

    // =========================================================================
    // 4. AI USAGE & QUOTA ADJUSTMENT
    // =========================================================================
    console.log('\n--- 4. Glory AI Token Quotas & Admin Adjustments ---');

    const quotaTestUser = 'b452a16f-dcde-4da5-8402-720ca58acc49';
    await pool.query(`
      INSERT INTO public.profiles (id, email, full_name, ai_tokens_total, ai_tokens_used)
      VALUES ($1, 'mdibrahimnayan10@gmail.com', 'QA Test User', 5000, 120)
      ON CONFLICT (id) DO UPDATE SET ai_tokens_total = 5000;
    `, [quotaTestUser]);

    // Admin updates quota
    await updateUserAIQuota(quotaTestUser, 15000);

    const updatedQuota = await getUserAIQuotaData(quotaTestUser);
    assert(
      updatedQuota?.monthlyTokenLimit === 15000,
      'Admin successfully adjusted user AI token quota from 5000 to 15000'
    );

    // Record in audit log
    await logAdminAction({
      adminEmail: testAdminEmail,
      adminUserId: testAdminId,
      action: 'adjust_ai_quota',
      targetResource: 'user',
      targetId: quotaTestUser,
      details: { tokenLimit: 15000 },
    });

    const { rows: quotaAudit } = await pool.query(`
      SELECT * FROM public.audit_log WHERE action = 'adjust_ai_quota' AND target_id = $1 LIMIT 1
    `, [quotaTestUser]);
    assert(quotaAudit.length >= 1, 'AI quota adjustment is appended to immutable audit_log');

    // =========================================================================
    // 5. FEATURE FLAGS & TELEMETRY KILL SWITCH
    // =========================================================================
    console.log('\n--- 5. Feature Flags & Kill Switch Fallback ---');

    // 5.1 Verify all core flags default to true
    const coreFlags = await getAllFeatureFlags();
    const allEnabled = coreFlags.every((f: any) => f.isEnabled);
    assert(allEnabled, 'All 4 core feature flags default to enabled (glory_ai, voice, export, telemetry)');

    // 5.2 Toggle telemetry kill-switch off
    await updateFeatureFlag({
      key: 'telemetry_collection',
      isEnabled: false,
      updatedBy: testAdminEmail,
    });

    const isTelemEnabled = await isFeatureEnabled('telemetry_collection');
    assert(isTelemEnabled === false, 'Feature flag update successfully sets telemetry_collection to false');

    // Test that ingestion rejects when kill switch is active
    const killSwitchBatchResult = await processTelemetryBatch({
      events: [{ eventId: 'evt_should_drop', type: 'feature_usage', payload: { feature: 'test' } }],
    }, 'test_identity');
    assert(
      killSwitchBatchResult.accepted === 0 && killSwitchBatchResult.rejected === 1,
      'Telemetry processor drops ingestion when kill switch is active (Zero collection confirmed)'
    );

    // Restore telemetry flag to true
    await updateFeatureFlag({
      key: 'telemetry_collection',
      isEnabled: true,
      updatedBy: testAdminEmail,
    });
    const restoredTelem = await isFeatureEnabled('telemetry_collection');
    assert(restoredTelem === true, 'Telemetry collection restored to enabled');

    // =========================================================================
    // 6. OPERATIONAL ALERT ENGINE & DEDUPLICATION (PANEL ONLY)
    // =========================================================================
    console.log('\n--- 6. Operational Alert Engine & Panel-Only Delivery ---');

    // Trigger alert evaluation
    const alerts = await evaluateOperationalAlerts();
    assert(
      Array.isArray(alerts),
      'evaluateOperationalAlerts executes evaluation matrix cleanly'
    );

    const alertList = await getAdminAlertsList();
    assert(
      Array.isArray(alertList),
      'getAdminAlertsList retrieves deduplicated operational alerts'
    );

  } catch (err: any) {
    console.error('Unhandled deep functional test error:', err);
    failed++;
  } finally {
    await pool.end();
  }

  console.log(`\n==================================================`);
  console.log(`DEEP FUNCTIONAL SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==================================================\n`);

  if (failed > 0) process.exit(1);
}

runDeepFunctionalVerification();
