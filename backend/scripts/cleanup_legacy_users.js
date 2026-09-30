const path = require('path');
const backendDir = 'c:\\Users\\fahim\\OneDrive\\Desktop\\My all learning project files\\my app\\backend';
require(path.join(backendDir, 'node_modules', 'dotenv')).config({ path: path.join(backendDir, '.env') });
const { Client } = require(path.join(backendDir, 'node_modules', 'pg'));

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const PRESERVED_IDS = [
  '7dd3c91a-6155-42eb-8c5e-8ee69903b1d3', // N.N. Supto (mdsupto718@gmail.com)
  '6f977ef4-c341-4312-a897-ea22b9a80d5e'  // Mymona Amin (mymonaamin@gmail.com)
];

async function run() {
  await client.connect();
  console.log('✅ Connected to Postgres database.');

  // 1. List all current users in auth.users
  const { rows: currentUsers } = await client.query(`
    SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;
  `);

  console.log(`\n--- Current Users in auth.users (${currentUsers.length}) ---`);
  currentUsers.forEach(u => {
    const isPreserved = PRESERVED_IDS.includes(u.id);
    console.log(`- ${u.id} | ${u.email} [${isPreserved ? 'KEEP (Image 1)' : 'WILL DELETE'}]`);
  });

  const toDelete = currentUsers.filter(u => !PRESERVED_IDS.includes(u.id));
  console.log(`\nTotal users to delete: ${toDelete.length}`);
  console.log(`Total users to keep: ${currentUsers.length - toDelete.length}`);

  if (toDelete.length === 0) {
    console.log('No users to delete. Database is already clean.');
    await client.end();
    return;
  }

  // 2. Perform deletion on auth.users (CASCADE will delete related records across profiles, tasks, etc.)
  const deleteIds = toDelete.map(u => u.id);
  console.log('\nExecuting CASCADE deletion from auth.users...');

  try {
    const res = await client.query(`
      DELETE FROM auth.users
      WHERE id = ANY($1::uuid[])
      RETURNING id, email;
    `, [deleteIds]);

    console.log(`✅ Successfully deleted ${res.rowCount} users from auth.users!`);
  } catch (err) {
    console.error('❌ ERROR deleting users:', err);
    await client.end();
    process.exit(1);
  }

  // 3. Verify remaining users in auth.users
  const { rows: remainingAuth } = await client.query(`
    SELECT id, email, created_at FROM auth.users ORDER BY created_at ASC;
  `);
  console.log(`\n--- Remaining in auth.users (${remainingAuth.length}) ---`);
  remainingAuth.forEach(u => console.log(`✅ ${u.id} | ${u.email}`));

  // 4. Verify remaining profiles
  const { rows: remainingProfiles } = await client.query(`
    SELECT id, email, full_name FROM public.profiles ORDER BY created_at ASC;
  `);
  console.log(`\n--- Remaining in public.profiles (${remainingProfiles.length}) ---`);
  remainingProfiles.forEach(p => console.log(`✅ ${p.id} | ${p.email} | ${p.full_name}`));

  // 5. Verify related tables
  const tables = ['tasks', 'notes', 'user_cloud_state', 'mind_items', 'diary_topics', 'diary_entries', 'focus_sessions', 'routine_templates'];
  console.log('\n--- Related Tables Status ---');
  for (const tbl of tables) {
    const { rows } = await client.query(`SELECT count(*) as count FROM public.${tbl};`);
    console.log(`Table public.${tbl}: ${rows[0].count} rows remaining.`);
  }

  await client.end();
  console.log('\n🎉 User cleanup and CASCADE verification complete!');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
