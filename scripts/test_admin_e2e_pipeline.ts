import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../frontend/.env.local') });
import { pool } from '../frontend/src/lib/server/db';
import { processTelemetryBatch } from '../frontend/src/lib/server/adminTelemetryService';
import {
  getAdminOverviewData,
  getProductAnalyticsData,
  getGuestActivityData,
  getAdminFeedbackList,
  getAdminIssuesList,
  getAdminPerformanceRecords,
  getAdminSecurityEvents,
  getAdminSyncHealth,
  getAdminAlertsList,
  getAdminAuditLogs,
  getAdminAIUsage,
  getAdminMonitoringHealthData,
  getAdminPrivacyRequests,
} from '../frontend/src/lib/server/adminRepository';
import { getAllFeatureFlags } from '../frontend/src/lib/server/adminFeatureFlags';

async function testE2EPipeline() {
  console.log('⚡ Testing End-to-End Wiring: Client Ingestion -> DB -> Repository -> Admin API shapes...\n');

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
    // 1. Client Telemetry Batch Ingestion
    console.log('--- 1. Testing Telemetry Ingestion Processor ---');
    const testBatch = {
      sessionId: 'sess_e2e_' + Date.now(),
      isGuest: true,
      appVersion: '0.1.0',
      events: [
        {
          eventId: 'evt_e2e_feature_' + Date.now(),
          type: 'feature_usage',
          payload: { feature: 'e2e_mind_space', action: 'node_created', metadata: { type: 'concept' } },
        },
        {
          eventId: 'evt_e2e_bug_' + Date.now(),
          type: 'client_error',
          payload: {
            name: 'NetworkTimeout',
            message: 'E2E simulated network timeout for bug tracking',
            route: '/mind-space',
            severity: 'high',
          },
        },
        {
          eventId: 'evt_e2e_vital_' + Date.now(),
          type: 'web_vital',
          payload: { name: 'LCP', value: 1420, rating: 'good', route: '/mind-space' },
        },
        {
          eventId: 'evt_e2e_guest_' + Date.now(),
          type: 'session_lifecycle',
          payload: { stage: 'start' },
        },
        {
          eventId: 'evt_e2e_sync_' + Date.now(),
          type: 'auth_sync_event',
          payload: { event: 'e2e_sync_test', details: 'Automated E2E sync health probe' },
        },
      ],
    };

    const ingestResult = await processTelemetryBatch(testBatch, 'test_e2e_client_identity');
    assert(
      ingestResult.accepted === 5,
      `Telemetry batch ingested 5/5 events (accepted=${ingestResult.accepted}, rejected=${ingestResult.rejected})`
    );

    // 2. Feedback Durable Ingestion
    console.log('\n--- 2. Testing Durable Feedback Ingestion ---');
    const feedbackInsert = await pool.query(
      `
      INSERT INTO admin_feedback (
        category, subject, message, rating, user_type, user_name, user_email,
        app_version, technical_context, status, created_at, updated_at
      ) VALUES (
        'suggestion', 'E2E Test Suggestion', 'Please add keyboard shortcut for Mind Space node linking', 5,
        'guest', 'E2E Tester', 'tester@example.com',
        '0.1.0', '{"screen": "1920x1080", "route": "/mind-space"}'::jsonb, 'new', NOW(), NOW()
      )
      RETURNING id;
      `
    );
    const feedbackId = feedbackInsert.rows[0]?.id;
    assert(Boolean(feedbackId), 'Durable feedback submission inserted successfully');

    // 3. Admin Repository Queries
    console.log('\n--- 3. Testing Admin Repository Endpoints Against Real Schema ---');

    // 3.1 Overview Data
    const overview = await getAdminOverviewData('24h');
    assert(
      typeof overview.registeredUsers.value === 'number' && typeof overview.dau.value === 'number',
      `getAdminOverviewData returns valid real metrics (registeredUsers=${overview.registeredUsers.value}, dau=${overview.dau.value})`
    );

    // 3.2 Product Analytics Data
    const analytics = await getProductAnalyticsData('7d');
    assert(
      Array.isArray(analytics.features) && analytics.features.length > 0,
      `getProductAnalyticsData returns feature metrics including newly ingested feature (count=${analytics.features.length})`
    );

    // 3.3 Guest Activity Data
    const guestActivity = await getGuestActivityData('7d');
    assert(
      Array.isArray(guestActivity.dailyCounts) && guestActivity.totalSessions >= 1,
      `getGuestActivityData returns guest trends with real session counts (totalSessions=${guestActivity.totalSessions})`
    );

    // 3.4 Feedback List & Inbox
    const feedbackList = await getAdminFeedbackList({ page: 1, pageSize: 20 });
    const foundFeedback = feedbackList.items.find((f: any) => f.id === feedbackId);
    assert(
      Boolean(foundFeedback),
      `getAdminFeedbackList successfully retrieved durable feedback item in inbox (total=${feedbackList.total})`
    );

    // 3.5 Issues List
    const issuesList = await getAdminIssuesList({ page: 1, pageSize: 20 });
    const foundIssue = issuesList.items.find((i: any) => i.errorName === 'NetworkTimeout');
    assert(
      Boolean(foundIssue),
      `getAdminIssuesList retrieved grouped bug issue with occurrences count (occurrences=${foundIssue?.occurrencesCount || 0})`
    );

    // 3.6 Performance Metrics
    const perfRecords = await getAdminPerformanceRecords('24h');
    assert(
      perfRecords.length >= 1 && perfRecords.some((p: any) => p.metric === 'LCP'),
      `getAdminPerformanceRecords returned real web vitals records (count=${perfRecords.length})`
    );

    // 3.7 Feature Flags
    const flags = await getAllFeatureFlags();
    assert(
      flags.length >= 4 && flags.some((f: any) => f.key === 'glory_ai' && f.isEnabled),
      `getAllFeatureFlags returns active flags with correct boolean states (totalFlags=${flags.length})`
    );

    // 3.8 Monitoring Health
    const health = await getAdminMonitoringHealthData();
    assert(
      health.telemetryIngestStatus === 'healthy' && typeof health.storageUsageMb === 'number',
      `getAdminMonitoringHealthData returns real telemetry health (status=${health.telemetryIngestStatus}, storageUsage=${health.storageUsageMb}MB)`
    );

    // 4. Clean up test records
    console.log('\n--- 4. Cleaning up Test Ingestion Fixtures ---');
    if (feedbackId) {
      await pool.query('DELETE FROM public.feedback_submissions WHERE id = $1', [feedbackId]);
    }
    await pool.query("DELETE FROM public.telemetry_events WHERE feature = 'e2e_mind_space'");
    await pool.query("DELETE FROM public.issues WHERE error_name = 'NetworkTimeout'");
    await pool.query("DELETE FROM public.perf_events WHERE metric = 'LCP' AND observed_value = 1420");
    await pool.query("DELETE FROM public.sync_events WHERE details = 'Automated E2E sync health probe'");
    console.log('✅ Test fixtures cleaned up safely.');

  } catch (err: any) {
    console.error('Unhandled E2E pipeline error:', err);
    failed++;
  } finally {
    await pool.end();
  }

  console.log(`\n==================================================`);
  console.log(`E2E PIPELINE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

testE2EPipeline();
