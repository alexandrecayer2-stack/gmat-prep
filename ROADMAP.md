# GMAT Prep — Roadmap (updated)

## Where we are
- ✅ **Deployed**: https://gmat-prep-nine.vercel.app (Vercel + hosted Supabase, RLS, anonymous + magic-link auth).
- ✅ **Practice** (all GMAT Focus types), **Diagnostic → predicted score → goal → study plan**, **Learn** (basic), **Dashboard**.
- ✅ **Content**: 150 validated questions (Quant 40 · Verbal 53 · Data Insights 57) across all 8 types, plus 10 RC/Multi-Source groups.
- ⏳ **Mock Exam** and **Review** are still stubs.

---

## Next steps (priority order)

### 1. Content-quality gate · Priority **High** · Effort **S–M**
Directly motivated by the ChatGPT batch (wrong answers + duplicates + invalid JSON). Build a pre-seed gate so bad content can never reach the live app:
- `npm run validate`: Zod schema + **answer re-derivation** checks for computable types (PS / DS / Graphics / Table / Two-Part / MSR) + **duplicate detection** (normalized stem, within a batch and vs. the existing bank) + `$`-escaping lint.
- The seed refuses anything that doesn't pass; run it in CI on every push.

### 2. Mock Exam · Priority **High** · Effort **M** (reuses `scoring.ts`)
- Config builder (sections, difficulty mix, order, timed/untimed), 45-min/section timer, review & edit within a section, end-of-exam scaled scores (60–90 per section, 205–805 total), full per-question review, persist `mock_sessions`.

### 3. Review + adaptive plan · Priority **High** · Effort **M**
- Full Review (history, filters by section/type/difficulty/correctness, **redo missed**), **spaced repetition** for missed questions, a plan that **re-estimates** from recent practice + periodic check-ins, hours logged vs. planned, dashboard trends over time.

### 4. Learn build-out · Priority **Medium** · Effort **M**
- **Topic-level Practice filter** → exact "practice this topic" deep links; **surface the `distractorRationale`** we already store (show why each wrong answer is wrong after answering); more cards; search / filter / mark-as-read.

### 5. Polish & scale · Priority **Low / ongoing**
- Mobile + accessibility pass; more tests + CI; custom domain; real email (SMTP) for magic links at volume; PWA (installable).

### 6. Optional — AI assist (needs your go-ahead; paid API)
- On-demand hints, "why was my answer wrong," and **AI-assisted question generation that runs through the step-1 gate automatically** (generated questions are validated, never trusted).

---

## Recommended order
**#1 (content gate)** → **#2 (Mock Exam)** → **#3 (Review + adaptive)**, then #4–#6.

> Note on growing the bank: prioritize the **thin areas** (more RC passages, more DI visual types: Graphics / Table / Two-Part / Multi-Source, harder items) rather than more PS/CR/DS, and always run new content through the step-1 gate.
