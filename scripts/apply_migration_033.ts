import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../frontend/.env.local') });
import fs from 'fs';
import { Pool } from 'pg';

const connectionString = (process.env.DATABASE_URL || '').replace(/^["']|["']$/g, '').trim();

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function applyMigration() {
  console.log('🚀 Applying Migration 033: Focentia Admin Control Center to Supabase...');
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/033_admin_control_center.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  const client = await pool.connect();
  try {
    console.log('📦 Executing SQL statements...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Migration 033 applied successfully!');

    // Verify created tables
    const { rows: tables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN (
          'admin_users', 'telemetry_events', 'feature_usage_daily', 'sessions', 
          'guest_daily', 'user_activity', 'feedback_submissions', 'feedback_status_history', 
          'feedback_notes', 'issues', 'issue_occurrences', 'perf_events', 'perf_daily', 
          'security_events', 'sync_events', 'sync_health_daily', 'alerts', 'alert_rules', 
          'audit_log', 'releases', 'admin_release_seen', 'user_suspensions', 'ai_usage_events', 
          'ai_usage_daily', 'user_quotas', 'ai_pricing_config', 'feature_flags', 
          'privacy_requests', 'telemetry_ingest_health', 'app_settings'
        )
      ORDER BY table_name;
    `);

    console.log(`\n📋 Verified ${tables.length} / 30 Admin Control Center tables in public schema:`);
    for (const t of tables) {
      console.log(` - ${t.table_name}`);
    }

    // Verify Views
    const { rows: views } = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' AND table_name LIKE 'admin_%'
      ORDER BY table_name;
    `);
    console.log(`\n👁️ Verified ${views.length} Interoperability Views:`);
    for (const v of views) {
      console.log(` - ${v.table_name}`);
    }

    // Verify Seeded Feature Flags
    const { rows: flags } = await client.query(`
      SELECT key, name, is_enabled, rollout_percentage FROM public.feature_flags ORDER BY key;
    `);
    console.log(`\n🚩 Seeded Feature Flags (${flags.length}):`);
    for (const f of flags) {
      console.log(` - ${f.key}: enabled=${f.is_enabled}, rollout=${f.rollout_percentage}% (${f.name})`);
    }

    // Verify App Settings
    const { rows: settings } = await client.query(`
      SELECT key, value FROM public.app_settings ORDER BY key;
    `);
    console.log(`\n⚙️ Seeded App Settings (${settings.length}):`);
    for (const s of settings) {
      console.log(` - ${s.key}: ${JSON.stringify(s.value)}`);
    }

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 033 failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration();
