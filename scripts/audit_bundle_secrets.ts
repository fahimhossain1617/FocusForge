import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../frontend/.env.local') });
import fs from 'fs';

async function auditSecrets() {
  console.log('🛡️ Auditing Production Client Bundle and Repository for Leaked Secrets...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const cronSecret = process.env.CRON_SECRET || '';
  const adminLogSalt = process.env.ADMIN_LOG_SALT || '';
  const dbUrl = process.env.DATABASE_URL || '';

  // Extract database password from connection string
  let dbPassword = '';
  try {
    const urlMatch = dbUrl.match(/:([^@:]+)@/);
    if (urlMatch && urlMatch[1]) {
      dbPassword = urlMatch[1];
    }
  } catch {}

  // 1. Audit Client Bundle Directory (frontend/.next/static)
  const clientBundleDir = path.resolve(__dirname, '../frontend/.next/static');
  assert(fs.existsSync(clientBundleDir), 'Client bundle directory (.next/static) exists');

  function getAllFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getAllFiles(fullPath));
      } else if (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.txt')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const bundleFiles = getAllFiles(clientBundleDir);
  console.log(` - Scanning ${bundleFiles.length} client bundle files in .next/static...`);

  let leakedServiceRole = false;
  let leakedCronSecret = false;
  let leakedAdminSalt = false;
  let leakedDbPassword = false;

  for (const file of bundleFiles) {
    const content = fs.readFileSync(file, 'utf8');

    if (serviceRoleKey && serviceRoleKey.length > 20 && content.includes(serviceRoleKey)) {
      console.error(`🚨 LEAK DETECTED: Service Role Key found in ${file}`);
      leakedServiceRole = true;
    }
    if (cronSecret && cronSecret.length > 8 && content.includes(cronSecret)) {
      console.error(`🚨 LEAK DETECTED: CRON_SECRET found in ${file}`);
      leakedCronSecret = true;
    }
    if (adminLogSalt && adminLogSalt.length > 8 && content.includes(adminLogSalt)) {
      console.error(`🚨 LEAK DETECTED: ADMIN_LOG_SALT found in ${file}`);
      leakedAdminSalt = true;
    }
    if (dbPassword && dbPassword.length > 6 && content.includes(dbPassword)) {
      console.error(`🚨 LEAK DETECTED: Database Password found in ${file}`);
      leakedDbPassword = true;
    }
  }

  assert(!leakedServiceRole, 'SUPABASE_SERVICE_ROLE_KEY is NOT leaked in client bundle');
  assert(!leakedCronSecret, 'CRON_SECRET is NOT leaked in client bundle');
  assert(!leakedAdminSalt, 'ADMIN_LOG_SALT is NOT leaked in client bundle');
  assert(!leakedDbPassword, 'DATABASE_URL / Database Password is NOT leaked in client bundle');

  // 2. Audit NEXT_PUBLIC_ variables in frontend/.env.local
  const envLocalPath = path.resolve(__dirname, '../frontend/.env.local');
  if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, 'utf8');
    const lines = envContent.split('\n');
    const publicVars: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('NEXT_PUBLIC_')) {
        const key = trimmed.split('=')[0].trim();
        publicVars.push(key);
      }
    }

    console.log(`\n - Verifying NEXT_PUBLIC_ variables (${publicVars.length} found):`, publicVars);
    const forbiddenPublicKeys = ['SERVICE_ROLE', 'SECRET', 'PASSWORD', 'PRIVATE', 'CIPHER', 'SALT'];
    let improperPublicVar = false;

    for (const pv of publicVars) {
      for (const forbidden of forbiddenPublicKeys) {
        if (pv.toUpperCase().includes(forbidden)) {
          console.error(`🚨 IMPROPER NEXT_PUBLIC VARIABLE: ${pv}`);
          improperPublicVar = true;
        }
      }
    }

    assert(!improperPublicVar, 'No sensitive/secret variables are exposed with NEXT_PUBLIC_ prefix');
  }

  console.log(`\n==================================================`);
  console.log(`SECRET AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==================================================\n`);

  if (failed > 0) process.exit(1);
}

auditSecrets();
