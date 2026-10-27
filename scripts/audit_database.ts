import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../frontend/.env.local') });

import { Pool } from 'pg';

const connectionString = (process.env.DATABASE_URL || '').replace(/^["']|["']$/g, '').trim();

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function audit() {
  console.log('🔍 Auditing Supabase Database...');

  try {
    const timeRes = await pool.query('SELECT NOW() as now, current_database() as db, version()');
    console.log('✅ Connected successfully to:', timeRes.rows[0].db, 'at', timeRes.rows[0].now);

    // 1. List existing tables in public schema
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('\n📋 Existing tables in public schema (' + tablesRes.rows.length + ' tables):');
    for (const r of tablesRes.rows) {
      console.log(' - ' + r.table_name);
    }

    // 2. Check for extensions (like pg_cron)
    const extRes = await pool.query(`
      SELECT extname, extversion FROM pg_extension ORDER BY extname;
    `);
    console.log('\n🧩 Installed PostgreSQL extensions:');
    for (const r of extRes.rows) {
      console.log(` - ${r.extname} (v${r.extversion})`);
    }

    // 3. Check for admin user in auth.users
    const userRes = await pool.query(`
      SELECT id, email, email_confirmed_at, created_at, role 
      FROM auth.users 
      WHERE email = 'fahimhossain1617@gmail.com';
    `);
    if (userRes.rows.length > 0) {
      const u = userRes.rows[0];
      console.log('\n👤 Admin User Found in auth.users:');
      console.log(' - ID:', u.id);
      console.log(' - Email:', u.email);
      console.log(' - Email Confirmed At:', u.email_confirmed_at || 'UNVERIFIED');
    } else {
      console.log('\n⚠️ Admin User fahimhossain1617@gmail.com NOT FOUND in auth.users yet.');
    }

    // 4. Check database size and limits
    const sizeRes = await pool.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as db_size;
    `);
    console.log('\n💾 Current Database Size:', sizeRes.rows[0].db_size);

  } catch (err: any) {
    console.error('❌ Database audit error:', err.message);
  } finally {
    await pool.end();
  }
}

audit();
