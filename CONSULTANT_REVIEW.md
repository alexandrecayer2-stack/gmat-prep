# GMAT Prep — Consultant Review (2026-07-01)

> **Audience: a Claude coding session.** Each item is self-contained: severity,
> evidence (`file:line`), root cause, the exact change, and an acceptance check.
> Work top-down — items are ordered by impact ÷ effort. Don't batch unrelated
> fixes into one commit; one item ≈ one commit.
>
> Method: live walkthrough of every route on `npm run dev`, source read of the
> domain/data layers, and a direct `count: 'exact'` query against the production
> Supabase (`tctcfgpgkcbowycyrdni`). Findings are evidence-backed, not guesses.

> **Status — ALL REVIEW ITEMS COMPLETE (on `main`, commits `ce3aa09`…`90b4bb3`):**
> - ✅ **P0-1/2/3, P2-1** — DI serves 447; finite practice sessions; per-section
>   chapter numbers; "Answer 15 questions" spaced. Verified live.
> - ✅ **P1-1** — `distractorRationale` was being **stripped by Zod** (0/1343 in
>   DB). Fixed schema + seed fold, then backfilled **1195 questions** via a
>   46-agent workflow: single-format coverage **3% → 100%**. Seeded to prod
>   (DB now 1416 Qs), render-verified.
> - ✅ **P1-2** — adaptive diagnostic: next item chosen by Fisher information at
>   the running ability estimate; groups stay atomic. Pure logic unit-tested
>   (`adaptive.ts`, 6 tests). Verified end-to-end (505 ± 40 over 18 questions).
> - ✅ **P1-3** — sampler re-checked post-fix: healthy 2:2:1 DI spread, no change
>   needed. (Note: DI bank is thin on *hard* items — 30 vs 291 medium — a
>   content-depth follow-up, not a bug.)
> - ✅ **P2-2** — hero count derived from live section counts ("1,400+").
> - ✅ **P2-3** — Review built: filterable attempt history + per-question and
>   bulk "redo missed"; nav un-gated. Verified live.
> - Tests green (50/50). **Code push still pending** (no git creds in this env —
>   run `git push origin main`). Prod DB content is already live via seed; the
>   code changes (P0 cap fix, Review, adaptive diagnostic, etc.) deploy on push.

---

## TL;DR — the one thing to fix first

**The app silently serves only 1000 of the 1343 questions in the database. 343
Data Insights questions are seeded but unreachable.** PostgREST caps an
unbounded `.select()` at 1000 rows; Data Insights sorts last, so it gets
truncated from 447 → 104. Fix is small and high-leverage (see **P0-1**).

| Section | In database | Served by app | Hidden |
|---|---|---|---|
| Quant | 447 | 447 | 0 |
| Verbal | 449 | 449 | 0 |
| **Data Insights** | **447** | **104** | **343** |
| **Total** | **1343** | **1000** | **343** |

Verified live: Practice shows "Data Insights · 104 questions"; DB `count:exact`
returns 447. 447 + 449 + 104 = exactly 1000 = the PostgREST default `max-rows`.

---

## P0 — Correctness / data-integrity (do first)

### P0-1 · 1000-row cap hides 343 Data Insights questions
- **Severity:** Critical · **Effort:** S
- **Where:** `src/lib/data/content.ts` — every `supabase.from('questions').select('*')`
  with no pagination: `getPracticeQuestions` (L76-81), `getDiagnosticQuestions`
  (L128), `getMockQuestions` (L177), `getSectionCounts` (L209).
- **Root cause:** PostgREST returns at most 1000 rows when no range is set. The
  table has 1343 rows. Whatever sorts into rows 1001-1343 (all Data Insights,
  because it's last) is dropped from the pool. This also poisons the diagnostic
  and mock samplers — they "pick 5 DI questions" from a pool that's missing 77%
  of DI — and makes `getSectionCounts` report DI = 104.
- **Change:** add a paginated fetch helper and use it for the full-table reads.
  ```ts
  // content.ts — fetch all rows past the 1000 cap
  async function fetchAllQuestions(
    supabase: SupabaseClient,
    apply?: (q: any) => any,
  ): Promise<QuestionRow[]> {
    const PAGE = 1000;
    const rows: QuestionRow[] = [];
    for (let from = 0; ; from += PAGE) {
      let q = supabase.from('questions').select('*').range(from, from + PAGE - 1);
      if (apply) q = apply(q);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      rows.push(...((data ?? []) as unknown as QuestionRow[]));
      if (!data || data.length < PAGE) break;
    }
    return rows;
  }
  ```
  Route `getPracticeQuestions` (keep its `.eq` filters via the `apply` callback),
  `getDiagnosticQuestions`, and `getMockQuestions` through it. For
  `getSectionCounts`, prefer a server-side count instead of pulling rows:
  ```ts
  const sections: Section[] = ['quant', 'verbal', 'data_insights'];
  const counts = { quant: 0, verbal: 0, data_insights: 0 } as Record<Section, number>;
  await Promise.all(sections.map(async (s) => {
    const { count } = await supabase.from('questions')
      .select('*', { count: 'exact', head: true }).eq('section', s);
    counts[s] = count ?? 0;
  }));
  ```
- **Acceptance:** Practice page shows "Data Insights · 447 questions"; a
  DI-only practice session reports "of 447"; diagnostic/mock can draw DI items
  that were previously in the hidden 343.

### P0-2 · A practice "session" is the entire bank — no length control
- **Severity:** High · **Effort:** S-M
- **Where:** `src/components/practice/practice-setup.tsx` (no count selector);
  `src/app/practice/session/page.tsx:25`; `getPracticeQuestions` returns the
  whole filtered set. Live: the runner shows "Question 1 **of 447**".
- **Why it matters:** a 447-question "session" has no finish line — it reads as
  broken, kills the sense of progress, and makes the end-of-session summary
  unreachable in practice. Every other prep tool ships fixed-length sets.
- **Change:** add a "4 · Number of questions" step to `practice-setup.tsx`
  (chips: 5 / 10 / 20 / 40), pass `&count=` through the URL, and in
  `getPracticeQuestions` slice the arranged units to `count` (default 10) while
  keeping RC/MSR groups whole. Cap the runner header at the chosen count.
- **Acceptance:** default session is 10 questions; header reads "Question 1 of
  10"; summary appears after the last one.

### P0-3 · Learn chapter numbers are global, shown per-section → duplicates
- **Severity:** Medium · **Effort:** S
- **Where:** Learn page renders each section's chapters but labels them with a
  global "Chapter N". Live: Quant shows Chapters 1-4; **Verbal then starts at
  "Chapter 4" and "Chapter 5"**, so two cards both say "Chapter 4".
  Source: `src/app/learn/page.tsx` + `src/components/learn/*` (the badge uses the
  chapter's stored number/order rather than its index within its section).
- **Change:** label by per-section index (`{i + 1}` within the section's chapter
  list) instead of the global chapter number, or drop the "Chapter N" prefix and
  keep only the title.
- **Acceptance:** within each section, chapter badges read 1..n with no
  cross-section duplicates.

---

## P1 — Content depth & the score engine

### P1-1 · `distractorRationale` is wired up but populated on ~10% of items
- **Severity:** High (this is a core differentiator) · **Effort:** L (content)
- **Where:** the UI **already** renders per-distractor "why this is wrong"
  (`src/components/practice/answer-inputs.tsx:75`), but only **5 of 50** question
  files contain a `distractorRationale` field (`grep -rl distractorRationale
  content/questions`). The ROADMAP lists this as "surface the rationale we store"
  — it's already surfaced; the gap is that the data mostly isn't there.
- **Why it matters:** "instant explanation of every wrong answer" is the headline
  promise on the home page. Today most wrong answers show only the global
  explanation.
- **Change:** backfill `distractorRationale` for each non-correct choice,
  prioritising Quant PS and CR (highest volume). Run generated/edited content
  through `npm run validate` before seeding (the gate already exists). Track
  coverage with a one-line script (`% of choices with a rationale`).
- **Acceptance:** ≥80% of single-answer questions have a rationale on every
  distractor; spot-check 10 in the runner.

### P1-2 · Diagnostic is fixed 15 questions and non-adaptive
- **Severity:** Medium · **Effort:** M
- **Where:** `getDiagnosticQuestions(perSection = 5)`; `diagnostic-flow.tsx`.
  The IRT engine in `src/lib/domain/scoring.ts` is genuinely good (MAP/Newton-
  Raphson, Fisher-information SE, type offsets) — but a flat 5/5/5 draw wastes
  it. SE only shrinks with on-level items; a fixed easy-to-hard spread leaves a
  wide confidence band.
- **Change (incremental):** after each answer, pick the next item whose
  difficulty is closest to the running ability estimate (maximise Fisher
  information). Even a greedy next-item rule tightens the predicted-score range
  noticeably without touching the math.
- **Acceptance:** reported `low–high` band on the result screen is narrower for
  the same question count vs. the current fixed draw.

### P1-3 · Diagnostic/mock sample from the (now un-truncated) pool — re-check balance after P0-1
- **Severity:** Medium · **Effort:** S
- **Where:** `pickSpread` (`content.ts:100`). Once P0-1 lands, DI suddenly has
  4× more items; confirm the spread logic still returns balanced
  easy/medium/hard sets and that grouped DI (Multi-Source) items stay contiguous.
- **Acceptance:** run 20 diagnostics; DI item difficulty distribution ≈ the
  bank's; no orphaned group members.

---

## P2 — Copy, polish, trust

### P2-1 · Missing space: "Answer 15questions"
- **Severity:** Low · **Effort:** XS
- **Where:** `src/components/diagnostic/diagnostic-flow.tsx:155` —
  `Answer {questions.length} questions ...` renders as "15questions". The
  count and the word are adjacent text nodes with no separating space in the
  rendered output.
- **Change:** ensure a literal space: `Answer {questions.length}&nbsp;questions`
  or `Answer {`${questions.length} questions`}`.
- **Acceptance:** reads "Answer 15 questions".

### P2-2 · Home claims "1,300+" but the app served 1000 (true until P0-1)
- **Severity:** Low (auto-resolved by P0-1) · **Effort:** XS
- **Where:** `src/app/page.tsx:48`. After P0-1 the real number (1,343) is
  reachable, so the claim becomes true. Consider deriving the stat from
  `getSectionCounts()` so it can never drift from reality again.
- **Acceptance:** the hero stat equals the sum of section counts.

### P2-3 · Review is still a stub (nav shows "SOON")
- **Severity:** Medium (roadmap item #1) · **Effort:** L
- **Where:** `src/app/review/page.tsx`. Already the top of `ROADMAP.md`. Highest-
  value version: history list + filters (section/type/difficulty/correctness) +
  "redo missed," backed by the `attempts` table that `recordAttempt` already
  writes. This is the biggest *feature* gap; P0 items are cheaper wins first.

---

## What's genuinely good (keep / don't regress)
- **Scoring model** (`scoring.ts`) — a real 1PL IRT estimator with a Bayesian
  prior, per-type difficulty offsets, recency-weighting, and an honest
  confidence interval. Above the bar for this category; protected by tests.
- **Content-quality gate** (`npm run validate`) — Zod + answer re-derivation +
  duplicate + `$`-escape lint before every seed. Keep routing all new content
  (including any AI-generated items) through it.
- **Per-choice answer feedback** — correct=green, your-wrong=red, others dimmed,
  with KaTeX explanations. Solid; just under-fed on `distractorRationale`.
- **Responsive + theming** — mobile drawer nav, light/dark, keyboard shortcuts
  (1-5 / Enter) all work.

---

## Suggested commit sequence
1. `fix(data): paginate question reads past PostgREST 1000-row cap` (P0-1)
2. `fix(content): server-side section counts` (part of P0-1)
3. `feat(practice): add session length selector` (P0-2)
4. `fix(learn): number chapters per-section` (P0-3)
5. `fix(diagnostic): space in question-count copy` (P2-1)
6. then content backfill (P1-1) and adaptive next-item (P1-2).

> After P0-1, redeploy reads no new content but **does** require nothing extra —
> the rows are already in prod Supabase. Verify on `gmat-prep-nine.vercel.app`
> that Data Insights shows 447.
