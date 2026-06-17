-- GMAT Prep - combined schema for FIRST-TIME HOSTED setup.
-- Auto-combined from supabase/migrations/*.sql.
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- (Proper/tracked alternative: npx supabase db push)

-- GMAT Prep — initial schema (GMAT Focus Edition model)
-- 3 sections, full question-type taxonomy, attempts, mock sessions, learn articles.
-- Content is public/read-only; attempts & mock sessions are per-user via RLS (auth.uid()).

-- ============================================================
-- Enums (mirror the GMAT Focus taxonomy; easy to extend later)
-- ============================================================
create type section as enum ('quant', 'verbal', 'data_insights');

create type question_type as enum (
  'problem_solving',          -- quant
  'critical_reasoning',       -- verbal
  'reading_comprehension',    -- verbal
  'data_sufficiency',         -- data insights
  'graphics_interpretation',  -- data insights
  'table_analysis',           -- data insights
  'two_part_analysis',        -- data insights
  'multi_source_reasoning'    -- data insights
);

create type difficulty as enum ('easy', 'medium', 'hard'); -- ~500 / ~600 / ~700+ level

create type attempt_context as enum ('practice', 'mock');

-- ============================================================
-- Content: shared passages / sources (RC, Multi-Source Reasoning)
-- ============================================================
create table question_groups (
  id          text primary key,            -- stable slug for idempotent seeding
  section     section not null,
  title       text,
  passage     text,                        -- markdown passage (Reading Comprehension)
  sources     jsonb,                       -- [{ title, content }] for Multi-Source Reasoning
  assets      jsonb,                       -- shared charts/tables, if any
  created_at  timestamptz not null default now()
);

-- ============================================================
-- Content: questions
-- ============================================================
create table questions (
  id                     text primary key,                       -- stable slug for idempotent seeding
  group_id               text references question_groups(id) on delete set null,
  section                section not null,
  type                   question_type not null,
  difficulty             difficulty not null,
  topic                  text not null,                          -- e.g. "ratios", "weaken", "rates"
  stem                   text not null,                          -- markdown
  passage_or_stimulus    text,                                   -- markdown (per-question stimulus, e.g. CR argument)
  assets                 jsonb,                                  -- charts / tables / dropdown defs (DI)
  choices                jsonb,                                  -- [{ key, text }] (MC) or structured option set
  correct_answer         jsonb not null,                         -- { format, value } — supports single + multi-part
  explanation            text not null,                          -- markdown
  source_note            text,
  estimated_time_seconds int not null default 120,
  order_index            int not null default 0,                 -- ordering within a group
  created_at             timestamptz not null default now()
);

create index questions_section_idx    on questions (section);
create index questions_type_idx       on questions (type);
create index questions_difficulty_idx on questions (difficulty);
create index questions_filter_idx     on questions (section, type, difficulty);
create index questions_group_idx      on questions (group_id);
create index questions_topic_idx      on questions (topic);

-- ============================================================
-- Mock sessions (configurable exams)
-- ============================================================
create table mock_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  config       jsonb not null,             -- { sections, difficultyMix, counts, timed, order }
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  scores       jsonb,                      -- { perSection: {...}, total }
  created_at   timestamptz not null default now()
);

create index mock_sessions_user_idx on mock_sessions (user_id, started_at desc);

-- ============================================================
-- Attempts (practice + mock)
-- ============================================================
create table attempts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  question_id        text not null references questions(id) on delete cascade,
  mock_session_id    uuid references mock_sessions(id) on delete set null,
  selected_answer    jsonb not null,
  is_correct         boolean not null,
  time_spent_seconds int not null default 0,
  context            attempt_context not null default 'practice',
  created_at         timestamptz not null default now()
);

create index attempts_user_created_idx  on attempts (user_id, created_at desc);
create index attempts_user_question_idx on attempts (user_id, question_id);
create index attempts_question_idx      on attempts (question_id);
create index attempts_mock_idx          on attempts (mock_session_id);

-- ============================================================
-- Learn articles (rule cards)
-- ============================================================
create table learn_articles (
  id          text primary key,            -- stable slug
  section     section not null,
  topic       text not null,
  title       text not null,
  body        text not null,               -- markdown
  order_index int not null default 0,
  created_at  timestamptz not null default now()
);

create index learn_articles_section_idx on learn_articles (section, order_index);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table question_groups enable row level security;
alter table questions       enable row level security;
alter table learn_articles  enable row level security;
alter table attempts        enable row level security;
alter table mock_sessions   enable row level security;

-- Content is world-readable (anon + authenticated). Seeding uses the service-role
-- key, which bypasses RLS, so no write policies are needed for content tables.
create policy "content_groups_readable"    on question_groups for select using (true);
create policy "content_questions_readable" on questions       for select using (true);
create policy "content_learn_readable"     on learn_articles  for select using (true);

-- Attempts: each user (incl. anonymous auth users) sees and writes only their own.
-- (select auth.uid()) is the recommended form — it is evaluated once per query.
create policy "attempts_select_own" on attempts for select using ((select auth.uid()) = user_id);
create policy "attempts_insert_own" on attempts for insert with check ((select auth.uid()) = user_id);
create policy "attempts_update_own" on attempts for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "attempts_delete_own" on attempts for delete using ((select auth.uid()) = user_id);

-- Mock sessions: same ownership model.
create policy "mock_select_own" on mock_sessions for select using ((select auth.uid()) = user_id);
create policy "mock_insert_own" on mock_sessions for insert with check ((select auth.uid()) = user_id);
create policy "mock_update_own" on mock_sessions for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "mock_delete_own" on mock_sessions for delete using ((select auth.uid()) = user_id);

-- ============================================================
-- Grants (explicit; complements Supabase default privileges)
-- ============================================================
grant select on question_groups, questions, learn_articles to anon, authenticated;
grant select, insert, update, delete on attempts, mock_sessions to authenticated;
-- service_role (seed script) needs full write access; bypassing RLS does not grant table privileges.
grant all privileges on question_groups, questions, learn_articles, attempts, mock_sessions to service_role;


-- Diagnostic assessments + personalized study plans.

-- 1) Distinguish diagnostic attempts from practice/mock attempts.
alter type attempt_context add value if not exists 'diagnostic';

-- 2) Personalized study plans. One active plan per user; history is retained.
create table study_plans (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  diagnostic_session_id uuid references mock_sessions(id) on delete set null,
  predicted_total       int not null,             -- 205-805 estimate
  predicted_low         int not null,
  predicted_high        int not null,
  predicted_sections    jsonb not null,           -- { quant: {scaled,...}, ... }
  target_total          int not null,             -- 205-805 goal
  target_date           date,                     -- optional deadline
  weekly_hours          int not null,
  weeks_to_goal         int,
  plan                  jsonb not null,           -- full generated StudyPlan
  is_active             boolean not null default true,
  created_at            timestamptz not null default now()
);

create index study_plans_user_idx on study_plans (user_id, created_at desc);
create index study_plans_active_idx on study_plans (user_id, is_active);

alter table study_plans enable row level security;

create policy "plans_select_own" on study_plans for select using ((select auth.uid()) = user_id);
create policy "plans_insert_own" on study_plans for insert with check ((select auth.uid()) = user_id);
create policy "plans_update_own" on study_plans for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "plans_delete_own" on study_plans for delete using ((select auth.uid()) = user_id);

grant select, insert, update, delete on study_plans to authenticated;
grant all privileges on study_plans to service_role;
-- Learn chapters, lessons, and per-user progress tracking.
-- Chapters group lessons by topic. Each lesson carries a list of exercise IDs
-- that point to existing questions. Progress is tracked per (user, lesson).

-- ============================================================
-- Content tables (world-readable, seeded via service role)
-- ============================================================
create table learn_chapters (
  id          text primary key,
  section     section not null,
  title       text not null,
  description text,
  order_index int not null default 0,
  created_at  timestamptz not null default now()
);

create index learn_chapters_section_idx on learn_chapters (section, order_index);

create table learn_lessons (
  id           text primary key,
  chapter_id   text not null references learn_chapters(id) on delete cascade,
  title        text not null,
  body         text not null,
  order_index  int not null default 0,
  exercise_ids text[] not null default '{}',
  created_at   timestamptz not null default now()
);

create index learn_lessons_chapter_idx on learn_lessons (chapter_id, order_index);

-- ============================================================
-- User progress
-- ============================================================
create table user_lesson_progress (
  user_id             uuid not null references auth.users(id) on delete cascade,
  lesson_id           text not null references learn_lessons(id) on delete cascade,
  passed_exercise_ids text[] not null default '{}',
  updated_at          timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index lesson_progress_user_idx on user_lesson_progress (user_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table learn_chapters         enable row level security;
alter table learn_lessons          enable row level security;
alter table user_lesson_progress   enable row level security;

create policy "learn_chapters_readable" on learn_chapters for select using (true);
create policy "learn_lessons_readable"  on learn_lessons  for select using (true);

create policy "lesson_progress_select" on user_lesson_progress
  for select using ((select auth.uid()) = user_id);
create policy "lesson_progress_insert" on user_lesson_progress
  for insert with check ((select auth.uid()) = user_id);
create policy "lesson_progress_update" on user_lesson_progress
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
