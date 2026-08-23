-- 20260820182749_aeon_learning_platform_v1.sql

-- Helper triggers
create or replace function public.update_updated_at()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create or replace function public.update_deck_last_modified()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  new.last_modified = now();
  return new;
end
$$;

create or replace function public.check_max_decks()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if (select count(*) from public.decks where user_id = new.user_id) >= 10 then
    raise exception 'Limite de 10 decks par utilisateur atteinte';
  end if;
  return new;
end
$$;

-- User preferences
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text,
  preferred_language text default 'fr',
  settings jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create trigger tr_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.update_updated_at();

-- Decks
create table if not exists public.decks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  original_decklist text not null,
  deck_data jsonb not null,
  last_modified timestamptz default now(),
  created_at timestamptz default now(),
  commander_name text,
  deck_hash text,
  source_url text,
  archived boolean not null default false,
  latest_analysis_at timestamptz,
  engine_version text
);

create trigger tr_decks_last_modified
  before update on public.decks
  for each row execute function public.update_deck_last_modified();

create trigger tr_decks_check_max
  before insert on public.decks
  for each row execute function public.check_max_decks();

-- Groups & Social
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text default '#8b5cf6',
  invite_code text default encode(gen_random_bytes(6), 'hex'),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'member',
  joined_at timestamptz default now(),
  unique (group_id, user_id)
);

create table if not exists public.group_markers (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  format text not null default 'commander',
  player_count integer not null default 2,
  game_mode text not null default 'online',
  room_id text,
  deck_name text not null,
  commander_names text[],
  start_time timestamptz not null default now(),
  end_time timestamptz,
  duration_seconds integer,
  turn_count integer default 0,
  result text,
  cause_of_end text,
  mulligan_count integer default 0,
  final_life integer,
  opponents jsonb default '[]'::jsonb,
  summary_stats jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  group_id uuid references public.groups(id) on delete set null,
  fun_rating integer,
  table_position integer,
  match_id uuid,
  game_number integer,
  custom_markers jsonb default '[]'::jsonb,
  game_options jsonb default '{}'::jsonb,
  deck_id uuid references public.decks(id) on delete set null
);

create table if not exists public.game_events (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  turn integer not null default 0,
  phase text,
  timestamp timestamptz not null default now(),
  event_type text not null,
  player_id integer,
  event_data jsonb not null default '{}'::jsonb
);

create table if not exists public.player_elo (
  user_id uuid primary key references auth.users(id) on delete cascade,
  elo integer not null default 1000,
  peak_elo integer not null default 1000,
  games_played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  draws integer not null default 0,
  last_game_at timestamptz,
  elo_history jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- Analysis Runs
create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  deck_id uuid references public.decks(id) on delete set null,
  deck_hash text not null,
  deck_name text,
  commander_name text not null,
  decklist text not null,
  cards jsonb not null default '[]'::jsonb,
  result jsonb not null default '{}'::jsonb,
  engine_version text not null,
  semantic_version text not null,
  source text not null default 'web',
  iterations integer,
  median numeric,
  p20 numeric,
  p80 numeric,
  peak numeric,
  coverage numeric,
  audited_at timestamptz,
  created_at timestamptz not null default now()
);

-- Analysis Audit Queue
create table if not exists public.analysis_audit_queue (
  analysis_id uuid primary key references public.analysis_runs(id) on delete cascade,
  status text not null default 'pending',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Audit Findings
create table if not exists public.audit_findings (
  id uuid primary key default gen_random_uuid(),
  fingerprint text unique not null,
  finding_type text not null,
  suspected_rule text,
  summary text not null,
  affected_cards jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  occurrence_count integer not null default 1,
  severity text not null default 'medium',
  confidence numeric not null default 0,
  status text not null default 'open',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- Audit Runs
create table if not exists public.audit_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running',
  analyses_processed integer not null default 0,
  cards_considered integer not null default 0,
  cards_audited integer not null default 0,
  findings_created integer not null default 0,
  model text,
  notes text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  analysis_ids uuid[] not null default '{}'::uuid[],
  candidate_count integer not null default 0
);

-- Card Semantics
create table if not exists public.card_semantics (
  oracle_id text not null,
  oracle_hash text not null,
  card_name text not null,
  oracle_text text not null default '',
  type_line text not null default '',
  engine_tags text[] not null default '{}'::text[],
  auditor_tags text[] not null default '{}'::text[],
  auditor_confidence numeric not null default 0,
  disagreement boolean not null default false,
  rationale text,
  semantic_version text not null,
  occurrences integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  audited_at timestamptz,
  primary key (oracle_id, oracle_hash)
);

-- Trigger functions & social helpers
create or replace function public.aeon_queue_analysis()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  insert into public.analysis_audit_queue(analysis_id) values (new.id) on conflict do nothing;
  if new.deck_id is not null then
    update public.decks set latest_analysis_at=new.created_at, engine_version=new.engine_version, last_modified=now() where id=new.deck_id;
  end if;
  return new;
end
$$;

create trigger tr_analysis_runs_queue
  after insert on public.analysis_runs
  for each row execute function public.aeon_queue_analysis();

create or replace function public.create_group_with_owner(p_name text, p_color text default '#8b5cf6')
returns json language plpgsql security definer set search_path to 'public' as $$
declare
  v_user_id uuid;
  v_group public.groups%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Non authentifié'; end if;
  insert into public.groups(name, color, created_by)
  values (trim(p_name), coalesce(nullif(trim(p_color), ''), '#8b5cf6'), v_user_id)
  returning * into v_group;
  insert into public.group_members(group_id, user_id, role)
  values (v_group.id, v_user_id, 'admin')
  on conflict (group_id, user_id) do nothing;
  return json_build_object(
    'id', v_group.id, 'name', v_group.name, 'color', v_group.color,
    'invite_code', v_group.invite_code, 'created_by', v_group.created_by, 'created_at', v_group.created_at
  );
end;
$$;

create or replace function public.join_group_by_invite(p_invite_code text)
returns json language plpgsql security definer set search_path to 'public' as $$
declare
  v_group_id uuid;
  v_group_name text;
  v_user_id uuid;
  v_existing uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Non authentifié'; end if;
  select id, name into v_group_id, v_group_name
  from public.groups where invite_code = lower(trim(p_invite_code));
  if v_group_id is null then raise exception 'Code d''invitation invalide'; end if;
  select id into v_existing from public.group_members
  where group_id = v_group_id and user_id = v_user_id;
  if v_existing is not null then raise exception 'Vous êtes déjà membre de ce groupe'; end if;
  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'member');
  return json_build_object('id', v_group_id, 'name', v_group_name);
end;
$$;

create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = p_user_id
  );
$$;

create or replace function public.ensure_player_elo(p_user_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if p_user_id is null or p_user_id = auth.uid() then return; end if;
  if not exists (
    select 1 from public.group_members g1
    join public.group_members g2 on g1.group_id = g2.group_id
    where g1.user_id = auth.uid() and g2.user_id = p_user_id
  ) then return; end if;
  insert into public.player_elo (user_id, elo, peak_elo, games_played, wins, losses, draws, elo_history)
  values (p_user_id, 1000, 1000, 0, 0, 0, 0, '[]'::jsonb)
  on conflict (user_id) do nothing;
end;
$$;

create or replace function public.aeon_upsert_finding(
  p_fingerprint text, p_finding_type text, p_suspected_rule text, p_summary text,
  p_affected_cards jsonb, p_evidence jsonb, p_severity text, p_confidence numeric
) returns uuid language plpgsql security definer set search_path to 'public' as $$
declare out_id uuid;
begin
  insert into public.audit_findings(fingerprint,finding_type,suspected_rule,summary,affected_cards,evidence,severity,confidence)
  values (p_fingerprint,p_finding_type,p_suspected_rule,p_summary,coalesce(p_affected_cards,'[]'::jsonb),coalesce(p_evidence,'{}'::jsonb),p_severity,greatest(0,least(1,p_confidence)))
  on conflict (fingerprint) do update set
    occurrence_count=public.audit_findings.occurrence_count+1,
    last_seen_at=now(),
    affected_cards=excluded.affected_cards,
    evidence=excluded.evidence,
    severity=excluded.severity,
    confidence=greatest(public.audit_findings.confidence,excluded.confidence),
    summary=excluded.summary,
    suspected_rule=excluded.suspected_rule
  returning id into out_id;
  return out_id;
end;
$$;
