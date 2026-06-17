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
