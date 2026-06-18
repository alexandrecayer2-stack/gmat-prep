import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sql = readFileSync(resolve(__dirname, '../supabase/migrations/20260618000000_learn_chapters.sql'), 'utf8');

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

// Use the PostgREST /rpc or direct SQL via management API isn't available in JS client.
// Instead use the pg connection string approach via fetch to the REST endpoint.
// Actually we'll use the SQL HTTP endpoint.
const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ sql }),
});

if (!res.ok) {
  const body = await res.text();
  if (body.includes('exec_sql')) {
    console.log('exec_sql RPC not available. Trying direct pg approach...');
    // Fall back: use supabase management API
    // GET the DB URL and connect directly
    console.log('Cannot apply migration via JS SDK without exec_sql RPC.');
    console.log('The SQL to run is in: supabase/migrations/20260618000000_learn_chapters.sql');
    process.exit(1);
  }
  console.error('Error:', body);
  process.exit(1);
}

console.log('✓ Migration applied successfully.');
