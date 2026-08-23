-- 20260820183258_aeon_github_auditor_state.sql

alter table public.audit_runs
  add column if not exists model text,
  add column if not exists notes text,
  add column if not exists analysis_ids uuid[] not null default '{}'::uuid[],
  add column if not exists candidate_count integer not null default 0;
