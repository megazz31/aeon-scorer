-- P7 Aeon Reality: observational game-quality feedback plus the sanitized pre-game prediction.
-- This table stores no decklist, Oracle text, card list, email or IP address.

create table if not exists public.game_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  pod_fingerprint text not null check (pod_fingerprint ~ '^[a-f0-9]{64}$'),
  pod_model_version text not null check (length(pod_model_version) between 1 and 80),
  engine_versions text[] not null default '{}',
  semantic_versions text[] not null default '{}',
  predicted_risk_score smallint not null check (predicted_risk_score between 0 and 100),
  predicted_risk_level text not null check (predicted_risk_level in ('low','moderate','high')),
  predicted_pod_mismatch smallint not null check (predicted_pod_mismatch between 0 and 100),
  predicted_threat_gap smallint not null check (predicted_threat_gap between 0 and 100),
  turn_band text not null check (turn_band in ('1-4','5-7','8-10','11+')),
  win_type text not null check (win_type in ('combat','combo','drain','lock','concession','other')),
  balance text not null check (balance in ('very-unbalanced','unbalanced','mixed','balanced','very-balanced')),
  dominant_event text not null default 'none' check (dominant_event in ('runaway-start','unanswered-combo','lock','mana-issue','normal-game','other','none')),
  created_at timestamptz not null default now()
);
create index if not exists game_observations_created_idx on public.game_observations(created_at desc);
create index if not exists game_observations_pod_idx on public.game_observations(pod_fingerprint,created_at desc);
create index if not exists game_observations_model_idx on public.game_observations(pod_model_version,created_at desc);
alter table public.game_observations enable row level security;
revoke all on public.game_observations from public,anon,authenticated;
grant all on public.game_observations to service_role;

create or replace function public.aeon_submit_game_observation(
  p_pod_fingerprint text,
  p_pod_model_version text,
  p_engine_versions text[],
  p_semantic_versions text[],
  p_predicted_risk_score integer,
  p_predicted_risk_level text,
  p_predicted_pod_mismatch integer,
  p_predicted_threat_gap integer,
  p_turn_band text,
  p_win_type text,
  p_balance text,
  p_dominant_event text default 'none'
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare out_id uuid; recent_count integer;
begin
  p_pod_fingerprint := lower(trim(coalesce(p_pod_fingerprint,'')));
  p_predicted_risk_level := lower(trim(coalesce(p_predicted_risk_level,'')));
  if p_pod_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'invalid_pod_fingerprint'; end if;
  if length(trim(coalesce(p_pod_model_version,''))) not between 1 and 80 then raise exception 'invalid_model_version'; end if;
  if p_predicted_risk_score not between 0 and 100 or p_predicted_pod_mismatch not between 0 and 100 or p_predicted_threat_gap not between 0 and 100 then raise exception 'invalid_prediction'; end if;
  if p_predicted_risk_level not in ('low','moderate','high') then raise exception 'invalid_risk_level'; end if;
  if p_turn_band not in ('1-4','5-7','8-10','11+') then raise exception 'invalid_turn_band'; end if;
  if p_win_type not in ('combat','combo','drain','lock','concession','other') then raise exception 'invalid_win_type'; end if;
  if p_balance not in ('very-unbalanced','unbalanced','mixed','balanced','very-balanced') then raise exception 'invalid_balance'; end if;
  if coalesce(p_dominant_event,'none') not in ('runaway-start','unanswered-combo','lock','mana-issue','normal-game','other','none') then raise exception 'invalid_dominant_event'; end if;
  if cardinality(coalesce(p_engine_versions,'{}'))>8 or cardinality(coalesce(p_semantic_versions,'{}'))>8 then raise exception 'too_many_versions'; end if;
  select count(*) into recent_count from public.game_observations where pod_fingerprint=p_pod_fingerprint and created_at>now()-interval '1 hour';
  if recent_count>=8 then raise exception 'observation_rate_limited'; end if;
  insert into public.game_observations(
    user_id,pod_fingerprint,pod_model_version,engine_versions,semantic_versions,
    predicted_risk_score,predicted_risk_level,predicted_pod_mismatch,predicted_threat_gap,
    turn_band,win_type,balance,dominant_event
  ) values (
    auth.uid(),p_pod_fingerprint,trim(p_pod_model_version),coalesce(p_engine_versions,'{}'),coalesce(p_semantic_versions,'{}'),
    p_predicted_risk_score,p_predicted_risk_level,p_predicted_pod_mismatch,p_predicted_threat_gap,
    p_turn_band,p_win_type,p_balance,coalesce(p_dominant_event,'none')
  ) returning id into out_id;
  return out_id;
end $$;

revoke all on function public.aeon_submit_game_observation(text,text,text[],text[],integer,text,integer,integer,text,text,text,text) from public;
grant execute on function public.aeon_submit_game_observation(text,text,text[],text[],integer,text,integer,integer,text,text,text,text) to anon,authenticated;
