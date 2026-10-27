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

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Protect cron endpoint with secret if configured
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized cron invocation' }, { status: 401 });
  }

  const result = await runDailyMaintenanceJob();
  return NextResponse.json(result);
}

export const POST = GET;
