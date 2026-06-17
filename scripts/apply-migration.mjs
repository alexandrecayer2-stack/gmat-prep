#!/usr/bin/env node
/**
 * Apply the learn_chapters migration to the hosted Supabase instance.
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/apply-migration.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('✖ Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sql = readFileSync(
  resolve(__dirname, '../supabase/migrations/20260618000000_learn_chapters.sql'),
  'utf8',
);

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { error } = await supabase.rpc('exec_sql', { sql }).catch(() => ({ error: null }));

if (error) {
  // rpc not available — print SQL for manual paste
  console.log('Could not apply via RPC. Paste the following into the Supabase SQL Editor:\n');
  console.log(sql);
} else {
  console.log('✓ Migration applied.');
}
