// Content-quality gate CLI. Refuses to pass unless every check holds, so it can
// guard the bank in CI on every push. Run: npm run validate
//
// Two stages:
//   1. The shared gate (scripts/lib/content-gate.ts): structure, references,
//      escaping, embedded answerChecks, duplicates.
//   2. Standalone re-derivation scripts (scripts/check-*.mjs): the hand-written,
//      per-batch answer recomputations. Running them here makes them part of the
//      enforced gate rather than something a human has to remember to run.
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { runGate } from './lib/content-gate';

const SCRIPTS = join(process.cwd(), 'scripts');

function header(title: string) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

const gate = runGate();

header('Content gate');
console.log(
  `  ${gate.stats.questions} questions · ${gate.stats.groups} groups · ${gate.stats.learn} learn · ` +
    `${gate.stats.answerChecks} answerCheck(s)`,
);

for (const w of gate.warnings) console.log(`  \x1b[33m⚠ ${w}\x1b[0m`);
for (const e of gate.errors) console.log(`  \x1b[31m✖ ${e}\x1b[0m`);
console.log(gate.ok ? '  \x1b[32m✓ gate passed\x1b[0m' : `  \x1b[31m✖ ${gate.errors.length} error(s)\x1b[0m`);

// ---- Stage 2: standalone re-derivation scripts ----
header('Answer re-derivation scripts');
const checkScripts = readdirSync(SCRIPTS)
  .filter((f) => /^check-.*\.mjs$/.test(f))
  .sort();

let scriptsOk = true;
for (const file of checkScripts) {
  try {
    execFileSync('node', [join(SCRIPTS, file)], { stdio: 'pipe' });
    console.log(`  \x1b[32m✓ ${file}\x1b[0m`);
  } catch (err) {
    scriptsOk = false;
    const e = err as { stdout?: Buffer; stderr?: Buffer };
    console.log(`  \x1b[31m✖ ${file}\x1b[0m`);
    const out = (e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? '');
    for (const line of out.split('\n').filter((l) => /FAIL|Error|✖/.test(l))) {
      console.log(`      ${line}`);
    }
  }
}
if (checkScripts.length === 0) console.log('  (none)');

const ok = gate.ok && scriptsOk;
console.log(ok ? '\n\x1b[32m✓ All content checks passed.\x1b[0m' : '\n\x1b[31m✖ Content validation failed.\x1b[0m');
process.exit(ok ? 0 : 1);
