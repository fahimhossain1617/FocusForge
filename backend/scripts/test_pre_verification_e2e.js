const path = require('path');
const backendDir = 'c:\\Users\\fahim\\OneDrive\\Desktop\\My all learning project files\\my app\\backend';
require(path.join(backendDir, 'node_modules', 'dotenv')).config({ path: path.join(backendDir, '.env') });
const { Client } = require(path.join(backendDir, 'node_modules', 'pg'));

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('✅ Connected to database.');

  const testEmail = `test_preverify_${Date.now()}@example.com`;
  const testName = 'PreVerify Tester';
  const testPassword = 'Password123!';

  console.log(`\n1. Simulating Pre-Signup for: ${testEmail}`);
  // Check auth.users before
  const beforeAuth = await client.query('SELECT id FROM auth.users WHERE LOWER(email) = LOWER($1)', [testEmail]);
  console.log('auth.users count before:', beforeAuth.rows.length);

  // Insert into pending_signups (simulating /api/auth/pre-signup)
  const otpCode = '654321';
  await client.query(
    `INSERT INTO public.pending_signups (email, full_name, password_hash, otp_code, created_at, expires_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '15 minutes')`,
    [testEmail, testName, 'encrypted_test_pwd', otpCode]
  );

  const pendingRow = await client.query('SELECT * FROM public.pending_signups WHERE email = $1', [testEmail]);
  console.log('✅ pending_signups has record:', pendingRow.rows[0].email, 'OTP:', pendingRow.rows[0].otp_code);

  // Verify auth.users still has ZERO records for this user
  const duringAuth = await client.query('SELECT id FROM auth.users WHERE LOWER(email) = LOWER($1)', [testEmail]);
  console.log('✅ auth.users count during pre-verification (MUST BE 0):', duringAuth.rows.length);

  const duringProfiles = await client.query('SELECT id FROM public.profiles WHERE LOWER(email) = LOWER($1)', [testEmail]);
  console.log('✅ public.profiles count during pre-verification (MUST BE 0):', duringProfiles.rows.length);

  // Clean up test pending record
  await client.query('DELETE FROM public.pending_signups WHERE email = $1', [testEmail]);
  console.log('✅ Cleaned up test pending_signups record.');

  await client.end();
}

run().catch(console.error);
