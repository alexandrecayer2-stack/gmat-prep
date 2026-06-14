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
