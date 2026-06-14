// Idempotent seed: validate /content against the Zod schemas, then upsert into
// Postgres via the service-role client (bypasses RLS). Fails loudly on malformed
// content or unknown group references. Run: npm run seed
import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // also pick up .env, without overriding values already set above

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { ZodError } from 'zod';
import {
  questionsFileSchema,
  questionGroupsFileSchema,
  learnArticlesFileSchema,
  type ValidatedQuestion,
  type ValidatedQuestionGroup,
} from '../src/lib/domain/schema';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    '✖ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      '  Copy .env.example to .env.local, and make sure the local stack is up (`npx supabase start`).',
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CONTENT = join(process.cwd(), 'content');
const loadJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

function fail(file: string, error: ZodError): never {
  console.error(`\n✖ Validation failed in ${file}:`);
  for (const issue of error.issues) {
    const path = issue.path.map(String).join('.') || '(root)';
    console.error(`   • [${path}] ${issue.message}`);
  }
  process.exit(1);
}

// ---- Load + validate ----
// All files matching content/question_groups*.json (so passages/sources can be
// split across files, like questions).
const groups: ValidatedQuestionGroup[] = [];
for (const file of readdirSync(CONTENT)
  .filter((f) => /^question_groups.*\.json$/.test(f))
  .sort()) {
  const parsed = questionGroupsFileSchema.safeParse(loadJson(join(CONTENT, file)));
  if (!parsed.success) fail(file, parsed.error);
  groups.push(...parsed.data);
}

const qDir = join(CONTENT, 'questions');
const questions: ValidatedQuestion[] = [];
for (const file of readdirSync(qDir).filter((f) => f.endsWith('.json')).sort()) {
  const parsed = questionsFileSchema.safeParse(loadJson(join(qDir, file)));
  if (!parsed.success) fail(`questions/${file}`, parsed.error);
  questions.push(...parsed.data);
}

const learnParsed = learnArticlesFileSchema.safeParse(loadJson(join(CONTENT, 'learn.json')));
if (!learnParsed.success) fail('learn.json', learnParsed.error);
const learn = learnParsed.data;

// ---- Referential + uniqueness checks ----
const groupIds = new Set(groups.map((g) => g.id));
const seenIds = new Set<string>();
for (const q of questions) {
  if (seenIds.has(q.id)) {
    console.error(`✖ Duplicate question id: ${q.id}`);
    process.exit(1);
  }
  seenIds.add(q.id);
  if (q.groupId && !groupIds.has(q.groupId)) {
    console.error(`✖ Question ${q.id} references unknown group "${q.groupId}"`);
    process.exit(1);
  }
}

// ---- Map camelCase -> snake_case columns ----
const groupRows = groups.map((g) => ({
  id: g.id,
  section: g.section,
  title: g.title ?? null,
  passage: g.passage ?? null,
  sources: g.sources ?? null,
  assets: g.assets ?? null,
}));

const questionRows = questions.map((q) => ({
  id: q.id,
  group_id: q.groupId ?? null,
  section: q.section,
  type: q.type,
  difficulty: q.difficulty,
  topic: q.topic,
  stem: q.stem,
  passage_or_stimulus: q.passageOrStimulus ?? null,
  assets: q.assets ?? null,
  choices: q.choices ?? null,
  correct_answer: q.correctAnswer,
  explanation: q.explanation,
  source_note: q.sourceNote ?? null,
  estimated_time_seconds: q.estimatedTimeSeconds,
  order_index: q.orderIndex,
}));

const learnRows = learn.map((a) => ({
  id: a.id,
  section: a.section,
  topic: a.topic,
  title: a.title,
  body: a.body,
  order_index: a.orderIndex,
}));

async function upsert(table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error(`✖ Upsert into ${table} failed: ${error.message}`);
    process.exit(1);
  }
  console.log(`   ✓ ${table.padEnd(16)} ${rows.length} rows`);
}

async function main() {
  console.log(`Seeding content from ${CONTENT} ...`);
  // Order matters: groups before questions (FK), learn is independent.
  await upsert('question_groups', groupRows);
  await upsert('questions', questionRows);
  await upsert('learn_articles', learnRows);
  console.log(
    `\n✓ Seed complete — ${groupRows.length} groups, ${questionRows.length} questions, ${learnRows.length} learn articles.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('✖ Seed failed:', err);
  process.exit(1);
});
