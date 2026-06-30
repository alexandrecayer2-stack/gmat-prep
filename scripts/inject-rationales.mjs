// Inject distractorRationale maps from scripts/.backfill/<file> sidecars into the
// matching content/questions/<file>, preserving formatting (raw-text insertion).
// Idempotent: skips questions that already have a rationale. Validates each
// rationale (balanced $, no stray \$, keys are valid wrong-choice keys) and skips
// (with a report) anything that fails rather than corrupting the file.
// Run: node scripts/inject-rationales.mjs
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const QDIR = 'content/questions';
const BDIR = 'scripts/.backfill';
const DS_KEYS = ['A', 'B', 'C', 'D', 'E'];

const balancedDollars = (s) => ((s.replace(/\\\$/g, '').match(/\$/g) || []).length % 2 === 0);

let totalQ = 0, totalR = 0, skipped = [];

const sidecars = existsSync(BDIR) ? readdirSync(BDIR).filter((f) => f.endsWith('.json')) : [];
for (const file of sidecars) {
  const contentPath = join(QDIR, file);
  if (!existsSync(contentPath)) { skipped.push(`${file}: no matching content file`); continue; }

  const map = JSON.parse(readFileSync(join(BDIR, file), 'utf8'));
  const questions = JSON.parse(readFileSync(contentPath, 'utf8'));
  const byId = new Map(questions.map((q) => [q.id, q]));

  // Sanitize each sidecar entry against the real question.
  const clean = {};
  for (const [id, rawMap] of Object.entries(map)) {
    const q = byId.get(id);
    if (!q) { skipped.push(`${file}#${id}: id not found`); continue; }
    if (q.correctAnswer?.format !== 'single') { skipped.push(`${file}#${id}: not single-format`); continue; }
    const already = q.distractorRationale || (q.choices || []).some((c) => c.distractorRationale);
    if (already) { skipped.push(`${file}#${id}: already has rationale`); continue; }
    const validKeys = q.type === 'data_sufficiency'
      ? new Set(DS_KEYS)
      : new Set((q.choices || []).map((c) => c.key));
    const correct = q.correctAnswer.value;
    const entry = {};
    for (const [k, v] of Object.entries(rawMap)) {
      if (k === correct) continue;                 // never explain the correct answer
      if (!validKeys.has(k)) { skipped.push(`${file}#${id}: bad key ${k}`); continue; }
      if (typeof v !== 'string' || !v.trim()) { skipped.push(`${file}#${id}.${k}: empty`); continue; }
      if (!balancedDollars(v)) { skipped.push(`${file}#${id}.${k}: unbalanced $`); continue; }
      entry[k] = v.trim();
    }
    if (Object.keys(entry).length) clean[id] = entry;
  }

  // Raw-text insert: before each target question's "explanation" line.
  const lines = readFileSync(contentPath, 'utf8').split('\n');
  const out = [];
  let curId = null;
  for (const line of lines) {
    const idm = line.match(/"id":\s*"([^"]+)"/);
    if (idm) curId = idm[1];
    if (/^\s*"explanation":/.test(line) && curId && clean[curId]) {
      const indent = line.match(/^(\s*)/)[1];
      const entries = Object.entries(clean[curId])
        .map(([k, v]) => `${indent}  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
        .join(',\n');
      out.push(`${indent}"distractorRationale": {\n${entries}\n${indent}},`);
      totalR += Object.keys(clean[curId]).length;
      totalQ += 1;
      delete clean[curId]; // guard against a second explanation line
    }
    out.push(line);
  }
  writeFileSync(contentPath, out.join('\n'));
  // Verify the file still parses.
  try { JSON.parse(readFileSync(contentPath, 'utf8')); }
  catch (e) { console.error(`✖ ${file} no longer parses: ${e.message}`); process.exit(1); }
}

console.log(`Injected ${totalR} rationales across ${totalQ} questions.`);
if (skipped.length) {
  console.log(`Skipped ${skipped.length} entries:`);
  for (const s of skipped.slice(0, 40)) console.log('  - ' + s);
  if (skipped.length > 40) console.log(`  ... and ${skipped.length - 40} more`);
}
