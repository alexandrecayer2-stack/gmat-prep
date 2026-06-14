# GMAT Prep — Roadmap

A prioritized plan for what's next. Effort: **S** ≈ hours, **M** ≈ 1–3 days, **L** ≈ a week+ / ongoing.

---

## ✅ Where we are today

- **Practice** mode end-to-end for every GMAT Focus question type (PS, CR, RC, DS, Graphics Interpretation, Table Analysis, Two-Part, Multi-Source) with timer, instant feedback, explanations, KaTeX, charts, sortable tables, on-screen calculator.
- **Diagnostic → predicted score → goal → personalized study plan** (hours/week, sections to focus, weak topics, phased milestones), persisted per user.
- **Dashboard** (accuracy by section, weakest topic) and a basic **Learn** library.
- Local **Supabase/Postgres** with RLS, **anonymous-auth** guest mode, dark mode, unit tests, content validation scripts.
- **Mock Exam** and **Review** are placeholders.

---

## Phase A — Ship it: shareable URL + accounts · Priority: **High** · Effort: **M**

> Your goal: "un véritable site avec un lien partageable et cliquable."

- Create a hosted **Supabase** project; apply schema with `supabase db push`; seed once against it.
- Enable **anonymous sign-ins** + **magic-link** in the hosted auth settings (mirrors local `config.toml`).
- Build the **magic-link sign-in UI** so a guest can upgrade their anonymous account to an email account **without losing progress** (plan + attempts follow them across devices).
- Deploy to **Vercel**, set env vars (use hosted values; service-role key stays server-only). Optional **custom domain**.
- Add lightweight **error monitoring** (e.g. Sentry free tier) and a short privacy note.

**Done when:** you can open `https://<your-app>` on phone or desktop, sign in by email, and your plan/history are there.

---

## Phase B — Grow the question bank · Priority: **High** · Effort: **L (ongoing)**

> Your goal: "enrichissement de la base de données." Biggest lever for quality — and it directly tightens the diagnostic's prediction.

- Reach **8–10 questions per section per difficulty** (~80–120 total), then keep growing.
- Add more **RC passages** and **Multi-Source** source sets; cover every topic and every CR subtype (strengthen/weaken/assumption/evaluate/inference/paradox/boldface).
- Keep authoring as editable JSON in [`/content`](content); quality stays guarded by `npm run seed` (Zod), `npm run check:answers` (re-derives every numeric answer), and `node scripts/lint-markdown.mjs`.
- **Difficulty calibration**: once there's real attempt data, re-label questions using observed accuracy so `easy/medium/hard` stay honest.
- Optional: **import/export** of question sets; a short authoring checklist for contributors.

**Done when:** every section/type/difficulty has ≥8 vetted items and the diagnostic rarely repeats a question.

---

## Phase C — Learn library: rules & key principles · Priority: **High** · Effort: **M**

> Your goal: "une section apprentissage avec des règles et principes clés."

- Expand the card set into a real reference: **Quant** formulas & shortcuts (percents, ratios, exponents, rates/work, number properties, averages, probability/combinatorics), **Verbal** logic (CR subtype strategies, common flaws, RC reading strategy), **DI** tactics (DS decision framework, reading tables/graphs, Two-Part & Multi-Source approach).
- Each card: **the rule · why it matters on the GMAT · a worked mini-example · common traps**.
- **Learn UX**: search, filter by section/topic, categories, and "mark as read" progress.
- **Topic-level deep links**: add a topic filter to Practice (today it's section-level) so "Practice this topic" and the plan's weak-topic chips jump straight to the right drill — and link each weak topic to its matching Learn card.

**Done when:** every weak topic the plan surfaces has a matching card and a one-click path to targeted practice.

---

## Phase D — Mock Exam · Priority: **Medium** · Effort: **M**

> Reuses the scoring engine already built ([`src/lib/domain/scoring.ts`](src/lib/domain/scoring.ts)).

- Config builder: choose sections, difficulty mix (fixed vs. adaptive-like), section order, timed/untimed.
- Timed runner (**45 min/section**), review & edit within a section (like the real exam).
- End-of-exam **scaled scores** (60–90 per section, 205–805 total) + full per-question review.
- Persist to `mock_sessions`; surface results in Review.

**Done when:** a configurable mock runs start→finish with a score report.

---

## Phase E — Review, progress tracking & an adaptive plan · Priority: **Medium** · Effort: **M**

- Full **Review** page: history of attempts + mocks, filters (section/type/difficulty/correctness), **redo missed**.
- **Spaced repetition** for missed questions.
- **Adaptive plan**: re-estimate the score from recent practice ("you're now ~545"), periodic **check-ins / re-diagnose**, and track **hours logged vs. plan**.
- Richer dashboard: trends over time, streaks, time-per-question analytics.

**Done when:** the plan reflects ongoing progress and you can re-drill weak spots on a schedule.

---

## Phase F — Polish & scale · Priority: **Low / ongoing**

- Accessibility & mobile passes; full keyboard support.
- More tests (mock config builder, filtering) + CI on push.
- Content caching / performance; **PWA** (installable on phone).
- Privacy-friendly analytics.

---

## Optional — AI assist (needs your go-ahead) · Effort: **M**

> Would add a paid LLM API, so I'd confirm with you first (per the project's "ask before adding external APIs" rule). Could use Claude.

- On-demand **hints** and follow-up "explain why my answer was wrong."
- **AI-assisted question generation** to accelerate Phase B (always human-reviewed before seeding).
- A study **chat tutor** scoped to the current question/topic.

---

## Suggested sequence

1. **Phase A** — deploy + accounts. Makes the app usable and shareable right away.
2. **Phase B** in parallel — content is the biggest quality lever and lifts diagnostic accuracy.
3. **Phase C** — pairs naturally with B (topics ↔ Learn cards), and the small topic-filter change unlocks precise deep links.
4. **Phase D** (Mock), then **E** (Review/adaptive), then **F** (polish). AI assist whenever you want it.

### Dependencies worth noting
- A bigger bank (B) improves diagnostic precision and unlocks an **adaptive diagnostic** later.
- **Topic-level Practice filtering** (C) is a small change that the Learn deep-links and the plan both build on.
- The **Mock Exam** (D) reuses the scoring engine that already exists.
