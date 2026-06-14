// Guard: in Markdown-rendered fields, every '$' must either be an escaped '\$'
// (literal currency) or part of a balanced $...$ math pair. An odd count of
// unescaped '$' means a literal dollar is leaking into KaTeX math mode.
import { readFileSync, readdirSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
let bad = 0;

function scan(label, text) {
  if (!text) return;
  const unescaped = text.replace(/\\\$/g, ''); // drop escaped \$
  const count = (unescaped.match(/\$/g) || []).length;
  if (count % 2 !== 0) {
    bad++;
    console.log(`ODD $ (${count}) in ${label}: ${JSON.stringify(text.slice(0, 90))}`);
  }
}

for (const f of readdirSync('content/questions').filter((f) => f.endsWith('.json'))) {
  for (const q of read(`content/questions/${f}`)) {
    scan(`${q.id}.stem`, q.stem);
    scan(`${q.id}.explanation`, q.explanation);
    scan(`${q.id}.stimulus`, q.passageOrStimulus);
  }
}
for (const g of read('content/question_groups.json')) {
  scan(`${g.id}.passage`, g.passage);
  (g.sources ?? []).forEach((s, i) => scan(`${g.id}.source[${i}]`, s.content));
}
for (const a of read('content/learn.json')) scan(`${a.id}.body`, a.body);

console.log(bad === 0 ? 'OK — all Markdown $ balanced' : `\n${bad} field(s) with unbalanced $`);
process.exit(bad === 0 ? 0 : 1);
