const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '../../frontend/.env.local') });
}
const { Client } = require('pg');
const fs = require('fs');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL environment variable is missing.');
  console.error('Please configure DATABASE_URL in your .env file or environment.');
  process.exit(1);
}


async function runMigrations() {
  console.log('Connecting to Supabase PostgreSQL at:', connectionString.replace(/:[^:]*@/, ':****@'));
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully to Supabase PostgreSQL database.');

    const migrationsDir = path.join(__dirname, '../supabase/migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    console.log(`Found ${files.length} migration files to apply.`);

    for (const file of files) {
      console.log(`\nApplying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query(sql);
        console.log(`✅ Applied ${file} successfully.`);
      } catch (sqlErr) {
        console.warn(`⚠️ Notice/Warning in ${file}:`, sqlErr.message);
      }
    }

    console.log('\n🎉 All migrations processed on Supabase PostgreSQL database.');
  } catch (err) {
    console.error('❌ Connection or migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigrations();
