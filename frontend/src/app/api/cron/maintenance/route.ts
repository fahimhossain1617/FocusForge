/**
 * Vercel / Platform Cron Maintenance Route Handler
 * Route: /api/cron/maintenance
 *
 * Protected by CRON_SECRET authorization header.
 * Invoked periodically to execute:
 * 1. Operational alert evaluation
 * 2. Pruning of raw telemetry events older than retention window (30 days)
 * 3. Daily aggregation rollups
 */

import { NextRequest, NextResponse } from 'next/server';
import { runDailyMaintenanceJob } from '@/lib/server/adminAlertEngine';
import { runNotificationSchedulerCycle } from '@/lib/server/schedulerService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Protect cron endpoint with secret or vercel header if configured
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    if (!isVercelCron) {
      return NextResponse.json({ error: 'Unauthorized cron invocation' }, { status: 401 });
    }
  }

  const [maintenanceResult, schedulerResult] = await Promise.allSettled([
    runDailyMaintenanceJob(),
    runNotificationSchedulerCycle(),
  ]);

  return NextResponse.json({
    maintenance: maintenanceResult.status === 'fulfilled' ? maintenanceResult.value : null,
    scheduler: schedulerResult.status === 'fulfilled' ? schedulerResult.value : null,
  });
}

export const POST = GET;
