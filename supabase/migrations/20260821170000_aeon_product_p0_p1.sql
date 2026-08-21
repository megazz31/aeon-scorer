-- Aeon product P0/P1: shareable Rule 0 cards, feedback, and source/deck version history.

alter table public.decks add column if not exists source_provider text;
alter table public.decks add column if not exists source_deck_id text;
alter table public.decks add column if not exists source_title text;
alter table public.decks add column if not exists source_fingerprint text;
alter table public.decks add column if not exists source_synced_at timestamptz;

create table if not exists public.deck_versions (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_hash text not null,
  commander_names text[] not null default '{}',
  decklist text not null,
  source_provider text,
  source_url text,
  source_fingerprint text,
  created_at timestamptz not null default now(),
  unique(deck_id, deck_hash)
);
create index if not exists deck_versions_deck_created_idx on public.deck_versions(deck_id, created_at desc);

create table if not exists public.analysis_shares (
  share_code text primary key,
  analysis_id uuid not null references public.analysis_runs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  deck_name text,
  commander_names text[] not null default '{}',
  engine_version text not null,
  semantic_version text not null,
  iterations integer,
  median numeric,
  p20 numeric,
  p80 numeric,
  peak numeric,
  coverage numeric,
  dimensions jsonb not null default '{}'::jsonb,
  packages jsonb not null default '[]'::jsonb,
  combo_summary jsonb not null default '[]'::jsonb,
  game_changers text[] not null default '{}',
  bracket_signals jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists analysis_shares_analysis_idx on public.analysis_shares(analysis_id);

create table if not exists public.analysis_feedback (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analysis_runs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  category text not null check (category in ('card_semantics','package','combo','mana','score_surprise','other')),
  message text,
  status text not null default 'open' check (status in ('open','reviewed','dismissed','resolved')),
  created_at timestamptz not null default now()
);
create index if not exists analysis_feedback_analysis_idx on public.analysis_feedback(analysis_id, created_at desc);

alter table public.deck_versions enable row level security;
alter table public.analysis_shares enable row level security;
alter table public.analysis_feedback enable row level security;

-- Owners can read their saved deck versions. Writes go through normal authenticated REST.
drop policy if exists deck_versions_owner_read on public.deck_versions;
create policy deck_versions_owner_read on public.deck_versions for select using (auth.uid() = user_id);
drop policy if exists deck_versions_owner_insert on public.deck_versions;
create policy deck_versions_owner_insert on public.deck_versions for insert with check (auth.uid() = user_id and exists(select 1 from public.decks d where d.id=deck_id and d.user_id=auth.uid()));

-- Public Rule 0 share cards contain only a sanitized analysis summary; no decklist or card evidence.
drop policy if exists analysis_shares_public_read on public.analysis_shares;
create policy analysis_shares_public_read on public.analysis_shares for select using (revoked_at is null);

-- Feedback is write-only for regular clients; auditors/admins use service role / SQL.
drop policy if exists analysis_feedback_owner_read on public.analysis_feedback;
create policy analysis_feedback_owner_read on public.analysis_feedback for select using (auth.uid() is not null and auth.uid() = user_id);

create or replace function public.aeon_create_analysis_share(
  p_analysis_id uuid,
  p_game_changers text[] default '{}',
  p_bracket_signals jsonb default '{}'::jsonb,
  p_combo_summary jsonb default null
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r public.analysis_runs%rowtype;
  code text;
  cmd_names text[];
  safe_packages jsonb;
  safe_combos jsonb;
begin
  select * into r from public.analysis_runs where id=p_analysis_id;
  if not found then raise exception 'analysis_not_found'; end if;
  if r.user_id is not null and auth.uid() is distinct from r.user_id then raise exception 'analysis_not_owned'; end if;
  if r.user_id is null and r.created_at < now() - interval '2 hours' then raise exception 'anonymous_share_window_expired'; end if;

  cmd_names := case
    when jsonb_typeof(r.result->'commanderNames')='array' then array(select jsonb_array_elements_text(r.result->'commanderNames'))
    else array[r.commander_name]
  end;
  select coalesce(jsonb_agg(jsonb_build_object('id',x->>'id','name',x->>'name','strength',x->'strength','cohesion',x->'cohesion')),'[]'::jsonb)
    into safe_packages from jsonb_array_elements(coalesce(r.result->'packages','[]'::jsonb)) x;
  safe_combos := coalesce(p_combo_summary, r.result->'combos', '[]'::jsonb);

  loop
    code := substr(replace(gen_random_uuid()::text,'-',''),1,12);
    exit when not exists(select 1 from public.analysis_shares where share_code=code);
  end loop;

  insert into public.analysis_shares(
    share_code,analysis_id,user_id,deck_name,commander_names,engine_version,semantic_version,iterations,
    median,p20,p80,peak,coverage,dimensions,packages,combo_summary,game_changers,bracket_signals
  ) values (
    code,r.id,r.user_id,coalesce(r.deck_name,r.commander_name),cmd_names,r.engine_version,r.semantic_version,r.iterations,
    r.median,r.p20,r.p80,r.peak,r.coverage,coalesce(r.result->'dimensions','{}'::jsonb),safe_packages,safe_combos,
    coalesce(p_game_changers,'{}'),coalesce(p_bracket_signals,'{}'::jsonb)
  );
  return code;
end $$;

create or replace function public.aeon_submit_analysis_feedback(
  p_analysis_id uuid,
  p_category text,
  p_message text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  out_id uuid;
begin
  if p_category not in ('card_semantics','package','combo','mana','score_surprise','other') then raise exception 'invalid_category'; end if;
  if not exists(select 1 from public.analysis_runs where id=p_analysis_id) then raise exception 'analysis_not_found'; end if;
  if length(coalesce(p_message,'')) > 1500 then raise exception 'message_too_long'; end if;
  insert into public.analysis_feedback(analysis_id,user_id,category,message)
    values(p_analysis_id,auth.uid(),p_category,nullif(trim(coalesce(p_message,'')),'')) returning id into out_id;
  insert into public.analysis_audit_queue(analysis_id,status,next_attempt_at,updated_at)
    values(p_analysis_id,'pending',now(),now())
    on conflict (analysis_id) do update set
      status=case when public.analysis_audit_queue.status='processing' then public.analysis_audit_queue.status else 'pending' end,
      next_attempt_at=case when public.analysis_audit_queue.status='processing' then public.analysis_audit_queue.next_attempt_at else now() end,
      updated_at=now();
  return out_id;
end $$;

grant execute on function public.aeon_create_analysis_share(uuid,text[],jsonb,jsonb) to anon, authenticated;
grant execute on function public.aeon_submit_analysis_feedback(uuid,text,text) to anon, authenticated;
grant select on public.analysis_shares to anon, authenticated;
grant select, insert on public.deck_versions to authenticated;
revoke all on public.analysis_feedback from anon, authenticated;
