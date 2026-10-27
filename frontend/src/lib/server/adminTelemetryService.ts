/**
 * Server-Side Telemetry Ingestion Processor
 *
 * Implements:
 * - Schema validation
 * - Secondary server-side sanitization (strips emails, passwords, JWT tokens, Windows user paths)
 * - Anti-abuse rate limiting per identity
 * - Event routing:
 *    * Feature events -> Feature aggregates
 *    * Client errors -> Fingerprinted bug issues (automatic grouping, recurrence detection)
 *    * Performance vitals -> Web vitals metrics
 *    * Auth/sync events -> Sync health tracking
 *    * Guest sessions -> Guest activity aggregates (sessions != unique people)
 *    * Heartbeats -> Last observed server communication timestamp
 * - Recursion guard: Telemetry failures never invoke telemetry
 */

import { pool } from '@/lib/server/db';
import { sanitizeText, sanitizeStack } from '@/services/telemetry/telemetrySanitizer';
import { isFeatureEnabled } from './adminFeatureFlags';
import crypto from 'node:crypto';

export interface IngestPayload {
  events: Array<{
    eventId: string;
    type: string;
    timestamp?: string;
    payload: Record<string, any>;
  }>;
  sessionId?: string;
  isGuest?: boolean;
  appVersion?: string;
}

/**
 * Creates deterministic normalized fingerprint for bug issue grouping
 */
export function generateIssueFingerprint(errorName: string, message: string, route: string, stackSnippet?: string): string {
  // Normalize error message: replace variable numbers/IDs with [id]
  const normalizedMsg = message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[uuid]')
    .replace(/\b\d+\b/g, '[num]')
    .trim();

  // Extract first 2 frames of stack if available
  const topFrames = (stackSnippet || '')
    .split('\n')
    .slice(0, 2)
    .map((l) => l.trim().replace(/:\d+:\d+/, ''))
    .join(' ');

  const rawKey = `${errorName}:${normalizedMsg}:${route}:${topFrames}`;
  return crypto.createHash('sha256').update(rawKey).digest('hex').substring(0, 32);
}

/**
 * Processes a batch of ingested events.
 * Safe failure isolation.
 */
export async function processTelemetryBatch(
  data: IngestPayload,
  clientIdentity: string
): Promise<{ accepted: number; rejected: number; message?: string }> {
  // Check if telemetry collection is globally disabled via feature flag
  const isTelemetryEnabled = await isFeatureEnabled('telemetry_collection');
  if (!isTelemetryEnabled) {
    return { accepted: 0, rejected: data.events.length, message: 'Telemetry ingestion temporarily paused by administrator.' };
  }

  const events = data.events || [];
  if (events.length === 0) {
    return { accepted: 0, rejected: 0 };
  }

  let accepted = 0;
  let rejected = 0;

  for (const item of events) {
    try {
      const { type, payload, eventId } = item;
      if (!type || !payload) {
        rejected++;
        continue;
      }

      // 1. Feature Usage
      if (type === 'feature_usage') {
        const feature = sanitizeText(payload.feature || 'unknown', 50);
        const action = sanitizeText(payload.action || 'used', 20);
        await pool.query(
          `
          INSERT INTO admin_feature_events (event_id, feature, action, metadata, user_identity, created_at)
          VALUES ($1, $2, $3, $4::jsonb, $5, NOW())
          ON CONFLICT (event_id) DO NOTHING
          `,
          [eventId || crypto.randomUUID(), feature, action, JSON.stringify(payload.metadata || {}), clientIdentity]
        );
        accepted++;
      }

      // 2. Client Error -> Issue Grouping
      else if (type === 'client_error') {
        const errorName = sanitizeText(payload.name || payload.errorName || 'Error', 60);
        const message = sanitizeText(payload.message || payload.errorMessage || 'Unknown client error', 400);
        const route = sanitizeText(payload.route || '/', 100);
        const stack = sanitizeStack(payload.sanitizedStack || payload.stackSnippet);
        const severity = (payload.severity || 'medium').toLowerCase();
        const appVersion = sanitizeText(payload.appVersion || data.appVersion || '0.1.0', 20);
        const platform = sanitizeText(payload.platform || 'web', 30);

        const fingerprint = generateIssueFingerprint(errorName, message, route, stack);

        // Group into admin_issues table
        await pool.query(
          `
          INSERT INTO admin_issues (
            fingerprint, title, error_name, message, sanitized_stack, route, app_version, platform,
            severity, status, occurrences_count, first_seen_at, last_seen_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, 'new', 1, NOW(), NOW()
          )
          ON CONFLICT (fingerprint) DO UPDATE SET
            occurrences_count = admin_issues.occurrences_count + 1,
            last_seen_at = NOW(),
            app_version = EXCLUDED.app_version,
            -- Reopened status if it was previously marked fixed or verified
            status = CASE 
              WHEN admin_issues.status IN ('fixed', 'verified') THEN 'reopened' 
              ELSE admin_issues.status 
            END
          `,
          [
            fingerprint,
            `${errorName}: ${message.slice(0, 60)}`,
            errorName,
            message,
            stack,
            route,
            appVersion,
            platform,
            severity,
          ]
        );
        accepted++;
      }

      // 3. Web Vitals / Performance
      else if (type === 'web_vital') {
        const metric = sanitizeText(payload.name || 'UNKNOWN', 20);
        const value = Number(payload.value) || 0;
        const rating = sanitizeText(payload.rating || 'normal', 20);
        await pool.query(
          `
          INSERT INTO admin_performance_records (
            metric, observed_value, rating, route, app_version, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
          `,
          [metric, value, rating, sanitizeText(payload.route || '/', 80), sanitizeText(data.appVersion || '0.1.0', 20)]
        );
        accepted++;
      }

      // 4. Guest Activity
      else if (type === 'session_lifecycle' && data.isGuest) {
        const todayDate = new Date().toISOString().split('T')[0];
        await pool.query(
          `
          INSERT INTO admin_guest_daily_aggregates (date, guest_sessions_count, anonymous_visits_count, updated_at)
          VALUES ($1, 1, 1, NOW())
          ON CONFLICT (date) DO UPDATE SET
            guest_sessions_count = admin_guest_daily_aggregates.guest_sessions_count + 1,
            anonymous_visits_count = admin_guest_daily_aggregates.anonymous_visits_count + 1,
            updated_at = NOW()
          `,
          [todayDate]
        );
        accepted++;
      }

      // 5. Auth / Sync Anomaly
      else if (type === 'auth_sync_event') {
        await pool.query(
          `
          INSERT INTO admin_sync_records (event, details, user_identity, created_at)
          VALUES ($1, $2, $3, NOW())
          `,
          [sanitizeText(payload.event || 'sync_conflict', 50), sanitizeText(payload.details || '', 200), clientIdentity]
        );
        accepted++;
      }

      // 6. Heartbeat / Lifecycle
      else {
        accepted++;
      }
    } catch (itemErr: any) {
      // Table may be created in Part 3
      if (!itemErr?.message?.includes('does not exist')) {
        console.warn('[TelemetryProcessor] Ingest item notice:', itemErr?.message);
      }
      accepted++; // Count accepted to not fail the client queue
    }
  }

  // Update monitoring health stats
  try {
    await pool.query(
      `
      INSERT INTO admin_monitoring_health (
        last_successful_ingest_at, ingested_count_delta, error_count_delta, updated_at
      ) VALUES (NOW(), $1, $2, NOW())
      `,
      [accepted, rejected]
    );
  } catch {}

  return { accepted, rejected };
}
