/**
 * Pre-Cleanup Migration Backup Script
 * 
 * Safely exports all existing user data from PostgreSQL tables to local JSON files
 * BEFORE executing migration 021_e2ee_sync_and_personal_data_cleanup.sql.
 * 
 * Usage:
 *   node scripts/pre_cleanup_backup.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

const TABLES_TO_BACKUP = [
  'tasks',
  'routine_templates',
  'notes',
  'note_blocks',
  'note_attachments',
  'mind_items',
  'focus_sessions',
  'distraction_entries',
  'diary_topics',
  'diary_entries',
  'learning_folders',
  'learning_logs',
  'ai_chat_sessions',
  'ai_chat_messages',
  'user_cloud_state'
];

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups', `pre_cleanup_${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`Starting pre-cleanup backup to: ${backupDir}`);

  const client = await pool.connect();
  try {
    for (const table of TABLES_TO_BACKUP) {
      try {
        const res = await client.query(`SELECT * FROM public.${table}`);
        const filePath = path.join(backupDir, `${table}.json`);
        fs.writeFileSync(filePath, JSON.stringify(res.rows, null, 2), 'utf-8');
        console.log(`✓ Backed up ${table}: ${res.rows.length} rows`);
      } catch (err) {
        console.warn(`! Table ${table} not found or skipped: ${err.message}`);
      }
    }
    console.log(`\nAll available tables backed up successfully in ${backupDir}.`);
  } finally {
    client.release();
    await pool.end();
  }
}

runBackup().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
