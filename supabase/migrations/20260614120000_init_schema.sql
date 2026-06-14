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
