# GMAT Prep — Roadmap (updated 2026-07-01)

## Where we are
- ✅ **Deployed**: https://gmat-prep-nine.vercel.app (Vercel + hosted Supabase, RLS, anonymous + magic-link auth).
- ✅ **Practice** (all GMAT Focus types, finite sessions), **Diagnostic** (now **adaptive** — next item by Fisher information) **→ predicted score → goal → study plan**, **Learn**, **Dashboard**.
- ✅ **Content**: **1,416 questions** across all 8 types (Quant · Verbal · Data Insights), plus RC/Multi-Source groups. Per-distractor **"why this is wrong"** rationales on **100%** of single-answer questions.
- ✅ **Content-quality gate** (`npm run validate`): Zod structure, answer re-derivation, duplicate detection, `$`-escaping lint — enforced before every seed.
- ✅ **Mock Exam**: config + timed runner + scored review.
- ✅ **Review**: searchable attempt history, filters (section/type/difficulty/correctness), **redo missed**, and **spaced-repetition** ("due for review" queue).
- ✅ **Offline / PWA**: installable, offline practice with corrections + attempt sync.

---

## Next steps (priority order)

### 1. Review + adaptive plan · **✅ DONE**
- ✅ Full Review (history, filters, redo missed) · ✅ spaced repetition for missed questions ·
  ✅ plan that **re-estimates** from recent practice (diagnostic → now → target, gap closed) ·
  ✅ hours logged vs. the plan's weekly budget · ✅ dashboard **score trend over time**.
- *Remaining polish (optional):* periodic check-in prompts; a full attempts-over-time chart on the dashboard beyond the score trend.

### 2. Learn build-out · Priority **Medium** · **✅ DONE**
- ✅ **Surface `distractorRationale`** (shown after answering; backfilled to 100%).
- ✅ **Search + section filter** on the Learn index (chapter/lesson search).
- ✅ **Topic-level "practice this topic" deep links** (lesson → topic-filtered session; `?topic=` on the practice route).
- ✅ **Mark-as-read** per lesson (toggle + chapter-list checkmark; stored as a sentinel in `passed_exercise_ids`, no schema change).
- ✅ **More lessons** — bank now **32 lessons** (added Circles/Sectors, Probability & Counting, RC Inference 2026-07-01).
- *Optional follow-ups:* still more content; offline honoring of `?topic=`.

### 3. Polish & scale · Priority **Low / ongoing**
- ✅ **PWA** (installable, offline).
- ✅ **CI** (`.github/workflows/ci.yml`: content gate + typecheck + unit tests on push/PR). *Pushing workflow files needs a token with `workflow` scope.*
- ✅ **More tests** — 67 total (added adaptive, spaced-repetition, and shared selection-logic suites).
- ⏳ Mobile + accessibility pass; custom domain; real email (SMTP) for magic links at volume.

### 4. Optional — AI assist (needs your go-ahead; paid API)
- On-demand hints, and **AI-assisted question generation that runs through the content gate automatically** (generated questions are validated, never trusted).

---

## Recommended order
Remaining: the **#3** infra items (accessibility pass, custom domain, SMTP), the small **#2** follow-ups (mark-as-read, offline `?topic=`, more content), then **#4** (AI assist — needs go-ahead + paid API).

> Note on growing the bank: the **Data Insights** bank is thin on **hard** items (~30 vs ~290 medium) — prioritize harder DI and more Multi-Source. Always run new content through the content gate (`npm run validate`), then `npm run seed`.
