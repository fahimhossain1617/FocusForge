require('dotenv').config();
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL environment variable is missing.');
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  await client.connect();
  const res = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
  );
  console.log('✅ Active tables in Supabase public schema:');
  res.rows.forEach(r => console.log('  •', r.table_name));

  const noteColumns = await client.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notes' ORDER BY ordinal_position;"
  );
  console.log('\n✅ Columns in `notes` table:');
  noteColumns.rows.forEach(c => console.log(`  • ${c.column_name} (${c.data_type})`));

  await client.end();
}

check();
