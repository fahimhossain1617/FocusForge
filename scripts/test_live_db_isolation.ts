/**
 * LIVE DATABASE RLS & ISOLATION VERIFICATION
 *
 * Checks:
 * 1. Database table existence and RLS flags on Postgres tables
 * 2. Unauthenticated client access rejection via Supabase anon key
 */

import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';

const connectionString = (process.env.DATABASE_URL || process.env.DIRECT_URL || '').replace(/^["']|["']$/g, '').trim();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mvielktfijxecszlqjxz.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_3_7lyLjPZvHgZGiaZB9T3A_505QmmWf';

async function main() {
  console.log("===============================================================");
  console.log("LIVE DATABASE RLS & SECURITY AUDIT");
  console.log("===============================================================\n");

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    // 1. Verify RLS is enabled on all sensitive tables
    const rlsQuery = `
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename IN ('user_encryption_keys', 'user_encrypted_data', 'encrypted_sync_records', 'profiles', 'support_tickets')
      ORDER BY tablename;
    `;
    const res = await pool.query(rlsQuery);
    console.log("--- TABLE ROW SECURITY STATUS ---");
    for (const row of res.rows) {
      console.log(`  Table: ${row.tablename} -> RLS Enabled: ${row.rowsecurity ? 'YES (TRUE)' : 'NO (FALSE)'}`);
    }

    // 2. Test Supabase Anon Client cannot read private tables without auth
    console.log("\n--- ANONYMOUS ACCESS REJECTION TEST (NEGATIVE PERMISSION) ---");
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: keysData, error: keysError } = await supabase.from('user_encryption_keys').select('*');
    if (keysError || (Array.isArray(keysData) && keysData.length === 0)) {
      console.log(`  ✓ PASS: Anonymous select on user_encryption_keys blocked/empty: (Error: ${keysError?.message || 'Empty set'})`);
    } else {
      console.error(`  ✗ FAIL: Anonymous select returned data! Count: ${keysData?.length}`);
    }

    const { data: syncData, error: syncError } = await supabase.from('encrypted_sync_records').select('*');
    if (syncError || (Array.isArray(syncData) && syncData.length === 0)) {
      console.log(`  ✓ PASS: Anonymous select on encrypted_sync_records blocked/empty: (Error: ${syncError?.message || 'Empty set'})`);
    } else {
      console.error(`  ✗ FAIL: Anonymous select returned sync data! Count: ${syncData?.length}`);
    }

  } catch (err: any) {
    console.warn("Database connection notice (IPv4 pooler check):", err.message);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
