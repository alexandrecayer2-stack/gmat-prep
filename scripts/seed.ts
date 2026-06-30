// Idempotent seed: run the content-quality gate, then upsert into Postgres via
// the service-role client (bypasses RLS). The gate is the same one `npm run
// validate` runs, so malformed content, wrong answers, or duplicates can never
// reach the database. Run: npm run seed
import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // also pick up .env, without overriding values already set above

import { createClient } from '@supabase/supabase-js';
import { runGate } from './lib/content-gate';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    '✖ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      '  Copy .env.example to .env.local, and make sure the local stack is up (`npx supabase start`).',
  );
  process.exit(1);
}

// ---- Gate: validate before touching the database ----
const gate = runGate();
for (const w of gate.warnings) console.warn(`⚠ ${w}`);
if (!gate.ok) {
  console.error(`\n✖ Content gate failed — refusing to seed. ${gate.errors.length} error(s):`);
  for (const e of gate.errors) console.error(`   • ${e}`);
  console.error('\n  Run `npm run validate` to reproduce and fix these before seeding.');
  process.exit(1);
}
console.log(
  `✓ Content gate passed (${gate.stats.questions} questions, ${gate.stats.groups} groups, ${gate.stats.learn} learn, ${gate.stats.chapters} chapters, ${gate.stats.lessons} lessons).`,
);

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---- Map camelCase -> snake_case columns ----
// Note: `answerCheck` is authoring-only metadata and is deliberately not mapped
// to a column — it never reaches the database.
const groupRows = gate.groups.map((g) => ({
  id: g.id,
  section: g.section,
  title: g.title ?? null,
  passage: g.passage ?? null,
  sources: g.sources ?? null,
  assets: g.assets ?? null,
}));

const questionRows = gate.questions.map((q) => ({
  id: q.id,
  group_id: q.groupId ?? null,
  section: q.section,
  type: q.type,
  difficulty: q.difficulty,
  topic: q.topic,
  stem: q.stem,
  passage_or_stimulus: q.passageOrStimulus ?? null,
  assets: q.assets ?? null,
  // Fold the question-level distractorRationale map into each choice (the shape
  // the app reads). A per-choice value, if present, wins over the map.
  choices: q.choices
    ? q.choices.map((c) => {
        const dr = c.distractorRationale ?? q.distractorRationale?.[c.key];
        return dr ? { ...c, distractorRationale: dr } : c;
      })
    : null,
  correct_answer: q.correctAnswer,
  explanation: q.explanation,
  source_note: q.sourceNote ?? null,
  estimated_time_seconds: q.estimatedTimeSeconds,
  order_index: q.orderIndex,
}));

const learnRows = gate.learn.map((a) => ({
  id: a.id,
  section: a.section,
  topic: a.topic,
  title: a.title,
  body: a.body,
  order_index: a.orderIndex,
}));

const chapterRows = gate.chapters.map((c) => ({
  id: c.id,
  section: c.section,
  title: c.title,
  description: c.description ?? null,
  order_index: c.orderIndex,
}));

const lessonRows = gate.lessons.map((l) => ({
  id: l.id,
  chapter_id: l.chapterId,
  title: l.title,
  body: l.body,
  order_index: l.orderIndex,
  exercise_ids: l.exerciseIds,
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
  console.log('Seeding content ...');
  // Order matters: groups before questions (FK); chapters before lessons (FK); learn is independent.
  await upsert('question_groups', groupRows);
  await upsert('questions', questionRows);
  await upsert('learn_articles', learnRows);
  await upsert('learn_chapters', chapterRows);
  await upsert('learn_lessons', lessonRows);
  console.log(
    `\n✓ Seed complete — ${groupRows.length} groups, ${questionRows.length} questions, ${learnRows.length} learn articles, ${chapterRows.length} chapters, ${lessonRows.length} lessons.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('✖ Seed failed:', err);
  process.exit(1);
});
