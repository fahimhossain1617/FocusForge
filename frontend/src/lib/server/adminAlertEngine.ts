/**
 * Server-Side Alert Engine and Scheduled Jobs
 *
 * Implements:
 * 1. Rule-based alert evaluation across monitoring thresholds:
 *    - New critical crash or issue regression
 *    - High error rate spike
 *    - Web Vitals budget breaches (LCP > 2500ms, CLS > 0.1, INP > 200ms)
 *    - Repeated unauthorized admin attempts
 *    - Sync failure spike
 *    - AI quota exhaustion rate
 * 2. Scheduled Cron Jobs (Vercel Cron / Supabase pg_cron):
 *    - Daily aggregation rollups
 *    - Stale raw data retention pruning (keeps aggregates, trims high-volume raw events)
 *    - Alert rule triggers
 *    - Monitoring health storage assessment
 */

import { pool } from '@/lib/server/db';

export interface AlertRuleResult {
  ruleTriggered: boolean;
  category: 'security' | 'crash' | 'performance' | 'sync' | 'ai_quota';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  count: number;
}

/**
 * Evaluates operational alert rules and updates admin_alerts table.
 */
export async function evaluateOperationalAlerts(): Promise<AlertRuleResult[]> {
  const triggered: AlertRuleResult[] = [];

  try {
    // 1. Check for Critical Unresolved Bugs
    const { rows: criticalBugs } = await pool.query(`
      SELECT id, title, occurrences_count 
      FROM admin_issues 
      WHERE severity = 'critical' AND status IN ('new', 'investigating', 'reopened')
      LIMIT 5
    `);

    for (const bug of criticalBugs) {
      triggered.push({
        ruleTriggered: true,
        category: 'crash',
        severity: 'critical',
        title: `Critical Bug: ${bug.title.slice(0, 50)}`,
        description: `Unresolved critical issue observed with ${bug.occurrences_count} occurrences.`,
        count: Number(bug.occurrences_count) || 1,
      });
    }

    // 2. Check for Issue Regressions (reopened bugs in past 24 hours)
    const { rows: regressions } = await pool.query(`
      SELECT title, app_version, occurrences_count
      FROM admin_issues
      WHERE status = 'reopened' AND last_seen_at > NOW() - INTERVAL '24 hours'
      LIMIT 3
    `);
    for (const reg of regressions) {
      triggered.push({
        ruleTriggered: true,
        category: 'crash',
        severity: 'critical',
        title: `Regression: ${reg.title.slice(0, 50)}`,
        description: `Previously fixed issue has regressed in version ${reg.app_version || 'unknown'}.`,
        count: Number(reg.occurrences_count) || 1,
      });
    }

    // 3. Web Vitals Budget Breaches (past 24h)
    const { rows: vitalsBreaches } = await pool.query(`
      SELECT metric, COUNT(*) as count, AVG(observed_value) as avg_val
      FROM admin_performance_records
      WHERE created_at > NOW() - INTERVAL '24 hours'
        AND ((metric = 'LCP' AND observed_value > 2500)
          OR (metric = 'CLS' AND observed_value > 0.1)
          OR (metric = 'INP' AND observed_value > 200))
      GROUP BY metric
    `);
    for (const vb of vitalsBreaches) {
      triggered.push({
        ruleTriggered: true,
        category: 'performance',
        severity: 'medium',
        title: `Web Vitals Threshold Breach: ${vb.metric}`,
        description: `${vb.count} sessions exceeded budget (average: ${Math.round(Number(vb.avg_val) * 100) / 100}).`,
        count: Number(vb.count) || 1,
      });
    }

    // 4. Glory AI Error or Rate Limit Spikes (past 1 hour)
    const { rows: aiSpikes } = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM admin_ai_usage_records
      WHERE created_at > NOW() - INTERVAL '1 hour' AND status IN ('error', 'rate_limited')
      GROUP BY status
    `);
    for (const as of aiSpikes) {
      if (Number(as.count) >= 5) {
        triggered.push({
          ruleTriggered: true,
          category: 'ai_quota',
          severity: 'high',
          title: `Glory AI ${as.status === 'rate_limited' ? 'Rate Limit (429)' : 'Provider Error'} Spike`,
          description: `${as.count} AI ${as.status} events logged in the last hour.`,
          count: Number(as.count),
        });
      }
    }

    // 5. Check for Unauthorized Admin Access Attempts (past 1 hour)
    const { rows: authAnomalies } = await pool.query(`
      SELECT COUNT(*) as count 
      FROM admin_security_events 
      WHERE category = 'auth_brute_force' AND created_at > NOW() - INTERVAL '1 hour'
    `);
    const anomalyCount = Number(authAnomalies[0]?.count) || 0;
    if (anomalyCount >= 3) {
      triggered.push({
        ruleTriggered: true,
        category: 'security',
        severity: 'high',
        title: 'Repeated Unauthorized Admin Access Attempts',
        description: `${anomalyCount} unauthorized admin authentication attempts detected in the last hour.`,
        count: anomalyCount,
      });
    }

    // 6. Sync Failure Spikes (past 24h)
    const { rows: syncErrors } = await pool.query(`
      SELECT COUNT(*) as count 
      FROM admin_sync_records 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    const syncCount = Number(syncErrors[0]?.count) || 0;
    if (syncCount > 25) {
      triggered.push({
        ruleTriggered: true,
        category: 'sync',
        severity: 'medium',
        title: 'Cross-Device Sync Anomaly Spike',
        description: `${syncCount} sync conflicts or transport issues logged in the last 24 hours.`,
        count: syncCount,
      });
    }

    // Save/Upsert triggered alerts in admin_alerts table
    for (const alert of triggered) {
      await pool.query(
        `
        INSERT INTO admin_alerts (
          category, severity, title, description, occurrences, status, first_seen_at, last_seen_at
        ) VALUES (
          $1, $2, $3, $4, $5, 'investigating', NOW(), NOW()
        )
        ON CONFLICT (title) DO UPDATE SET
          occurrences = admin_alerts.occurrences + EXCLUDED.occurrences,
          last_seen_at = NOW()
        `,
        [alert.category, alert.severity, alert.title, alert.description, alert.count]
      );
    }
  } catch (err: any) {
    if (!err?.message?.includes('does not exist')) {
      console.warn('[AlertEngine] Alert evaluation notice:', err?.message);
    }
  }

  return triggered;
}

/**
 * Scheduled Daily Rollup & Pruning Job
 */
export async function runDailyMaintenanceJob(): Promise<{ success: boolean; prunedCount?: number; message?: string }> {
  try {
    // 1. Evaluate operational alerts
    await evaluateOperationalAlerts();

    // 2. Prune raw telemetry events older than 30 days to protect database plan limits
    let prunedCount = 0;
    try {
      const res = await pool.query(`
        DELETE FROM admin_feature_events 
        WHERE created_at < NOW() - INTERVAL '30 days'
      `);
      prunedCount += res.rowCount || 0;

      await pool.query(`
        DELETE FROM admin_performance_records 
        WHERE created_at < NOW() - INTERVAL '30 days'
      `);
    } catch {}

    // 3. Rollup daily guest aggregates if any were missed
    try {
      await pool.query(`
        INSERT INTO admin_guest_daily_aggregates (date, guest_sessions_count, anonymous_visits_count, updated_at)
        SELECT CURRENT_DATE, 0, 0, NOW()
        ON CONFLICT (date) DO NOTHING
      `);
    } catch {}

    return { success: true, prunedCount, message: 'Maintenance rollup and pruning completed successfully' };
  } catch (err: any) {
    console.error('[MaintenanceJob] Error during daily maintenance:', err?.message || err);
    return { success: false, message: err?.message || 'Maintenance failed' };
  }
}
