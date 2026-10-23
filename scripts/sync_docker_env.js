const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const backendEnvPath = path.join(rootDir, 'backend', '.env');
const frontendEnvPath = path.join(rootDir, 'frontend', '.env.local');
const rootEnvPath = path.join(rootDir, '.env');

const envMap = new Map();

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim();
      if (!envMap.has(key)) {
        envMap.set(key, val);
      }
    }
  }
}

// Read existing root .env first
parseEnvFile(rootEnvPath);
// Read backend .env
parseEnvFile(backendEnvPath);
// Read frontend .env.local
parseEnvFile(frontendEnvPath);

// Synchronize aliases
if (envMap.has('NEXT_PUBLIC_SUPABASE_URL') && !envMap.has('SUPABASE_URL')) {
  envMap.set('SUPABASE_URL', envMap.get('NEXT_PUBLIC_SUPABASE_URL'));
}
if (envMap.has('SUPABASE_URL') && !envMap.has('NEXT_PUBLIC_SUPABASE_URL')) {
  envMap.set('NEXT_PUBLIC_SUPABASE_URL', envMap.get('SUPABASE_URL'));
}
if (envMap.has('NEXT_PUBLIC_SUPABASE_ANON_KEY') && !envMap.has('SUPABASE_ANON_KEY')) {
  envMap.set('SUPABASE_ANON_KEY', envMap.get('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
}
if (envMap.has('SUPABASE_ANON_KEY') && !envMap.has('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
  envMap.set('NEXT_PUBLIC_SUPABASE_ANON_KEY', envMap.get('SUPABASE_ANON_KEY'));
}
if (!envMap.has('NEXT_PUBLIC_APP_URL')) {
  envMap.set('NEXT_PUBLIC_APP_URL', '"http://localhost:3000"');
}
if (!envMap.has('NEXT_PUBLIC_BACKEND_URL')) {
  envMap.set('NEXT_PUBLIC_BACKEND_URL', '"http://localhost:5000"');
}

const lines = [
  '# ==============================================================================',
  '# Focentia Production Docker Environment (.env)',
  '# =============================================================================='
];

for (const [key, val] of envMap.entries()) {
  lines.push(`${key}=${val}`);
}

fs.writeFileSync(rootEnvPath, lines.join('\n') + '\n', 'utf8');
console.log(`[sync_docker_env] Successfully wrote ${envMap.size} variables to .env`);
