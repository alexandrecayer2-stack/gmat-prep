# GMAT Prep — Focus Edition

A web app for practicing and learning for the **GMAT Focus Edition**. The whole UI and all content are in English, and the data model mirrors the real exam's three sections and question-type taxonomy.

> **Status:** vertical slice. **Practice** mode works end‑to‑end for every question type, with a **Learn** library, a **Dashboard**, progress tracking, dark mode, and a Docker‑based local Postgres. **Mock Exam** and **Review** are stubbed for later phases (see [Roadmap](#roadmap)).

---

## What the GMAT Focus model looks like here

Three sections, each scored 60–90 (total 205–805), section‑adaptive on the real test:

| Section | Question types implemented |
| --- | --- |
| **Quantitative Reasoning** | Problem Solving (arithmetic, number properties, ratios, percentages, averages, algebra, rates/work, probability) |
| **Verbal Reasoning** | Critical Reasoning (weaken / strengthen / assumption / inference) · Reading Comprehension (passage groups) |
| **Data Insights** | Data Sufficiency · Graphics Interpretation · Table Analysis · Two‑Part Analysis · Multi‑Source Reasoning |

Difficulty is labeled honestly: `easy ≈ 500`, `medium ≈ 600`, `hard ≈ 700+`.

## Features (this slice)

- **Practice**: pick a section → question type(s) → difficulty, then one question at a time with a per‑question timer, immediate feedback, and a full worked explanation.
- **All answer formats**: single multiple‑choice, the 5 canonical Data Sufficiency choices, multi‑dropdown (Two‑Part), per‑row Yes/No or True/False (Table Analysis), and chart‑driven dropdowns (Graphics Interpretation).
- **On‑screen calculator** on Data Insights questions; **KaTeX** math, **Recharts** charts, and sortable tables rendered from JSON assets.
- **Learn**: searchable rule cards grouped by section, each with a worked example and a deep link into filtered Practice.
- **Dashboard**: overall accuracy, accuracy by section, and weakest‑topic surfacing from your real attempts.
- **Accounts without friction**: a guest gets an anonymous Supabase identity automatically, so progress is saved immediately; a magic‑link sign‑in (later phase) upgrades the same account.
- Light/dark mode, keyboard shortcuts (1–5 to choose, Enter to submit/next), mobile‑responsive.

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth + RLS) · `@supabase/ssr` · KaTeX · Recharts · Zod · next‑themes · Vitest.

> **Next.js 16 note:** Middleware is renamed to **Proxy** (`src/proxy.ts`), and `cookies()` / `params` / `searchParams` are async. The Supabase SSR setup follows these conventions.

---

## Prerequisites

- **Node.js 20.9+** (built on Node 24)
- **Docker** running (for the local Supabase stack)
- No global installs needed — the Supabase CLI is a dev dependency (run via `npx supabase …` or the `db:*` scripts).

## Quick start (local)

```bash
# 1. Install dependencies
npm install

# 2. Start the local Supabase stack (Postgres + Auth + Studio) — needs Docker
npm run db:start          # = supabase start  (first run pulls images)

# 3. Configure env. The defaults in .env.example are the standard local keys,
#    so for local dev you can copy it as-is.
cp .env.example .env.local

# 4. Apply the schema (enums, tables, indexes, RLS) and seed content
npm run db:reset          # applies migrations to the local DB
npm run seed              # validates /content and upserts it (idempotent)

# 5. Run the app
npm run dev               # http://localhost:3000
```

Useful local URLs (from `npm run db:status`): API `http://127.0.0.1:54321`, Studio `http://127.0.0.1:54323`, Postgres `127.0.0.1:54322`.

---

## Project structure

```
content/                      Editable seed content (JSON)
  question_groups.json        Shared RC passages & Multi-Source sources
  questions/{quant,verbal,data_insights}.json
  learn.json                  Learn rule cards
scripts/
  seed.ts                     Idempotent seed (Zod-validated) -> Postgres
  check-answers.mjs           Re-derives every numeric answer independently
  lint-markdown.mjs           Guards $ escaping in Markdown fields
supabase/
  config.toml                 Local stack config (anonymous sign-ins enabled)
  migrations/                 SQL: enums, tables, indexes, RLS, grants
src/
  app/                        Routes: / · /practice · /practice/session · /learn · /mock · /review
  components/                 markdown, chart-view, table-view, calculator, nav, practice/*
  lib/
    domain/                   types, constants, Zod schema, grading (+ tests)
    data/                     content queries (server) + attempts (client)
    supabase/                 browser/server clients + proxy session refresh
    auth/                     anonymous-auth bootstrap provider
  proxy.ts                    Next 16 Proxy (Supabase session refresh)
```

## Data model

- `questions` — `section`, `type`, `difficulty`, `topic`, `stem`, `passage_or_stimulus`, `assets` (charts/tables/dropdowns), `choices`, `correct_answer` (`{ format, value }`), `explanation`, `estimated_time_seconds`, `order_index`, optional `group_id`.
- `question_groups` — shared `passage` (RC) or `sources` (Multi‑Source).
- `attempts` — per user: `selected_answer`, `is_correct`, `time_spent_seconds`, `context` (`practice`/`mock`).
- `mock_sessions` — config + scores (used by the upcoming Mock Exam).
- `learn_articles` — rule cards.

**RLS:** content tables are world‑readable; `attempts` and `mock_sessions` are restricted to `auth.uid() = user_id`. Guests get a real (anonymous) auth identity, so RLS works without a login and the seed script writes via the service‑role key.

### Answer formats

`correct_answer.format` drives both grading and rendering:

| format | used by | `value` shape | inputs / assets |
| --- | --- | --- | --- |
| `single` | PS, CR, RC, DS | `"B"` | radio choices (DS injects the 5 canonical choices) |
| `dropdowns` | Graphics Interpretation | `{ b1: "positive" }` | `assets.chart` + `assets.dropdowns` |
| `two_part` | Two‑Part Analysis | `{ partA: "r2", partB: "r6" }` | `assets.twoPart.columns` + shared `choices` |
| `dichotomous` | Table Analysis, MSR Yes/No | `{ s1: "False" }` | `choices` (statements) + `assets.dichotomous.labels`, optional `assets.table` |

---

## Adding or editing questions

1. Edit the JSON in `content/` (or add a new file under `content/questions/`). Use stable `id` slugs — seeding is an idempotent upsert keyed on `id`.
2. **Plain‑text fields** (`choices[].text`, table cells, dropdown options, column labels) render literally — write `$40` as‑is.
3. **Markdown fields** (`stem`, `passageOrStimulus`, `explanation`, group `passage`/`sources`, learn `body`) render Markdown + KaTeX. Use `$...$` for math; **escape literal currency** as `\$` (in JSON: `"\\$40"`) so it isn't parsed as math.
4. Validate and seed:
   ```bash
   npm run check:answers   # independent re-derivation of numeric answers
   node scripts/lint-markdown.mjs   # $ escaping guard
   npm run seed            # Zod-validates structure, then upserts
   ```
   The seed fails loudly with the exact path of any malformed item.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run seed` | Validate `/content` and upsert into Postgres |
| `npm run check:answers` | Independently re-derive every numeric/derivable answer |
| `npm run test` | Vitest (grading + taxonomy invariants) |
| `npm run db:start` / `db:stop` / `db:reset` / `db:status` | Local Supabase lifecycle |

## Testing

```bash
npm run test
```

Covers the grading/scoring core (`gradeAnswer`, `isAnswerComplete`, `emptySelection`) and the section/type taxonomy invariant. `check:answers` additionally guarantees the seed content's labeled answers are mathematically correct.

---

## Deploying (Vercel + hosted Supabase)

1. Create a Supabase project. From **Project Settings → API**, copy the URL, anon (publishable) key, and service‑role key.
2. Apply the schema to the hosted DB:
   ```bash
   npx supabase link --project-ref <your-ref>
   npx supabase db push          # applies supabase/migrations
   ```
3. In **Authentication → Providers**, enable **Anonymous sign‑ins** (matches local `config.toml`).
4. Seed the hosted DB once: set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the hosted values in `.env.local`, then `npm run seed`.
5. Deploy to Vercel and set the env vars from `.env.example` in the Vercel project (use the **hosted** values). The service‑role key is server‑only — never expose it to the client.

## Roadmap

- ✅ **Phase 0–2** — scaffold, schema + RLS, seed pipeline, Practice mode (all question types).
- ✅ **Phase 3 (partial)** — Learn library with deep links.
- ✅ **Phase 5 (partial)** — Dashboard accuracy + weakest‑topic surfacing.
- ⏳ **Phase 4** — Mock Exam: configurable, timed (45 min/section), review & edit within a section, % → scaled 60–90 per section and 205–805 total estimate.
- ⏳ **Phase 5** — full Review (history, filters, redo missed).
- ⏳ **Phase 6** — magic‑link auth UI, broader tests, accessibility pass.
- ⏳ **Phase 7** — scale the question bank, tags, spaced repetition, import/export.

Seed content is intentionally a small but complete slice (every section, type, and difficulty represented) so the app is usable immediately and the bank is easy to grow by editing JSON.
