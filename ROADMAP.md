# GMAT Prep — Roadmap (updated)

## Where we are
- ✅ **Deployed**: https://gmat-prep-nine.vercel.app (Vercel + hosted Supabase, RLS, anonymous + magic-link auth).
- ✅ **Practice** (all GMAT Focus types), **Diagnostic → predicted score → goal → study plan**, **Learn** (basic), **Dashboard**.
- ✅ **Content**: **250 validated questions** (Quant 80 · Verbal 83 · Data Insights 87) across all 8 types, plus 13 RC/Multi-Source groups.
- ✅ **Content-quality gate** (`npm run validate`): Zod structure, answer re-derivation, duplicate detection, `$`-escaping lint — enforced before every seed.
- ✅ **Mock Exam**: config + timed runner + scored review implemented.
- ⏳ **Review** is still a stub.

---

## Next steps (priority order)

### 1. Review + adaptive plan · Priority **High** · Effort **M**
- Full Review (history, filters by section/type/difficulty/correctness, **redo missed**), **spaced repetition** for missed questions, a plan that **re-estimates** from recent practice + periodic check-ins, hours logged vs. planned, dashboard trends over time.

### 2. Learn build-out · Priority **Medium** · Effort **M**
- **Topic-level Practice filter** → exact "practice this topic" deep links; **surface the `distractorRationale`** we already store (show why each wrong answer is wrong after answering); more cards; search / filter / mark-as-read.

### 3. Polish & scale · Priority **Low / ongoing**
- Mobile + accessibility pass; more tests; **enable CI** (add `.github/workflows/ci.yml`, currently staged locally — push needs a token with `workflow` scope); custom domain; real email (SMTP) for magic links at volume; PWA (installable).

### 4. Optional — AI assist (needs your go-ahead; paid API)
- On-demand hints, "why was my answer wrong," and **AI-assisted question generation that runs through the content gate automatically** (generated questions are validated, never trusted).

---

## Recommended order
**#1 (Review + adaptive)** → **#2 (Learn build-out)**, then #3–#4.

> Note on growing the bank: prioritize the **thin areas** (more RC passages, harder items, more Multi-Source) and always run new content through the content gate (`npm run validate`).
