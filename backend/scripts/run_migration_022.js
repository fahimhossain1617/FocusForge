const path = require('path');
const backendDir = 'c:\\Users\\fahim\\OneDrive\\Desktop\\My all learning project files\\my app\\backend';
require(path.join(backendDir, 'node_modules', 'dotenv')).config({ path: path.join(backendDir, '.env') });
const { Client } = require(path.join(backendDir, 'node_modules', 'pg'));
const fs = require('fs');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('✅ Connected to Postgres database.');

  const sqlPath = path.join(__dirname, '../supabase/migrations/022_cascade_deletes_and_pre_verification.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Applying migration 022...');
  await client.query(sql);
  console.log('✅ Migration 022 successfully applied!');

  // Verify that foreign keys now have CASCADE
  const res = await client.query(`
    SELECT
      c.conrelid::regclass AS table_from,
      c.conname,
      pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    WHERE c.contype = 'f' AND conrelid::regclass::text IN (
      'profiles', 'tasks', 'notes', 'user_cloud_state', 'mind_items', 
      'diary_topics', 'diary_entries', 'focus_sessions', 'routine_templates'
    )
    ORDER BY 1, 2;
  `);

  console.log('\n--- VERIFIED CONSTRAINTS ---');
  res.rows.forEach(r => {
    console.log(`${r.table_from} -> ${r.conname}: ${r.def}`);
  });

  // Verify pending_signups table
  const tRes = await client.query("SELECT to_regclass('public.pending_signups');");
  console.log('\npending_signups table exists:', tRes.rows[0]);

  await client.end();
}

run().catch(console.error);
