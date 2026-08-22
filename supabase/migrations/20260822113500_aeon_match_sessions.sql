-- P5 Aeon Match sessions: authenticated organizer, anonymous fast join.
-- Sessions store only public Rule 0 share codes, never private deck payloads.

create table if not exists public.match_sessions (
  code text primary key check (code ~ '^[a-f0-9]{10}$'),
  created_by uuid not null references auth.users(id) on delete cascade,
  organizer_token_hash text not null check (organizer_token_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'open' check (status in ('open','locked','closed')),
  max_players integer not null default 64 check (max_players between 4 and 64),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '6 hours'
);
create table if not exists public.match_session_entries (
  session_code text not null references public.match_sessions(code) on delete cascade,
  share_code text not null references public.analysis_shares(share_code) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(session_code,share_code)
);
create index if not exists match_sessions_expiry_idx on public.match_sessions(expires_at);
create index if not exists match_entries_joined_idx on public.match_session_entries(session_code,joined_at);

alter table public.match_sessions enable row level security;
alter table public.match_session_entries enable row level security;
revoke all on public.match_sessions from public,anon,authenticated;
revoke all on public.match_session_entries from public,anon,authenticated;
grant all on public.match_sessions,public.match_session_entries to service_role;

create or replace function public.aeon_create_match_session(p_max_players integer default 64)
returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$
declare c text; token text; uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'authentication_required'; end if;
  p_max_players:=greatest(4,least(coalesce(p_max_players,64),64));
  delete from public.match_sessions where expires_at<now();
  if (select count(*) from public.match_sessions where created_by=uid and expires_at>now() and status<>'closed')>=5 then raise exception 'too_many_active_sessions'; end if;
  token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  loop c:=substr(replace(gen_random_uuid()::text,'-',''),1,10);exit when not exists(select 1 from public.match_sessions where code=c);end loop;
  insert into public.match_sessions(code,created_by,organizer_token_hash,max_players) values(c,uid,encode(digest(token,'sha256'),'hex'),p_max_players);
  return jsonb_build_object('code',c,'organizerToken',token,'status','open','maxPlayers',p_max_players,'expiresAt',(select expires_at from public.match_sessions where code=c));
end $$;

create or replace function public.aeon_join_match_session(p_code text,p_share_code text)
returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$
declare s public.match_sessions%rowtype; n integer;
begin
  p_code:=lower(trim(coalesce(p_code,'')));p_share_code:=lower(trim(coalesce(p_share_code,'')));
  select * into s from public.match_sessions where code=p_code;
  if not found or s.expires_at<now() then raise exception 'session_not_found'; end if;
  if s.status<>'open' then raise exception 'session_not_open'; end if;
  if not exists(select 1 from public.analysis_shares where share_code=p_share_code and revoked_at is null) then raise exception 'share_not_found'; end if;
  select count(*) into n from public.match_session_entries where session_code=p_code;
  if n>=s.max_players then raise exception 'session_full'; end if;
  insert into public.match_session_entries(session_code,share_code) values(p_code,p_share_code) on conflict do nothing;
  return jsonb_build_object('ok',true,'code',p_code,'shareCode',p_share_code);
end $$;

create or replace function public.aeon_read_match_session(p_code text)
returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$
declare s public.match_sessions%rowtype; entries jsonb;
begin
  p_code:=lower(trim(coalesce(p_code,'')));
  select * into s from public.match_sessions where code=p_code;
  if not found or s.expires_at<now() then raise exception 'session_not_found'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('shareCode',e.share_code,'joinedAt',e.joined_at) order by e.joined_at,e.share_code),'[]'::jsonb) into entries from public.match_session_entries e where e.session_code=p_code;
  return jsonb_build_object('code',s.code,'status',s.status,'maxPlayers',s.max_players,'createdAt',s.created_at,'expiresAt',s.expires_at,'entries',entries);
end $$;

create or replace function public.aeon_set_match_session_status(p_code text,p_organizer_token text,p_status text)
returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$
declare s public.match_sessions%rowtype;
begin
  p_code:=lower(trim(coalesce(p_code,'')));p_status:=lower(trim(coalesce(p_status,'')));
  if p_status not in ('open','locked','closed') then raise exception 'invalid_status'; end if;
  select * into s from public.match_sessions where code=p_code;
  if not found or s.expires_at<now() then raise exception 'session_not_found'; end if;
  if encode(digest(coalesce(p_organizer_token,''),'sha256'),'hex')<>s.organizer_token_hash then raise exception 'invalid_organizer_token'; end if;
  update public.match_sessions set status=p_status where code=p_code;
  return jsonb_build_object('code',p_code,'status',p_status);
end $$;

revoke all on function public.aeon_create_match_session(integer) from public;
revoke all on function public.aeon_join_match_session(text,text) from public;
revoke all on function public.aeon_read_match_session(text) from public;
revoke all on function public.aeon_set_match_session_status(text,text,text) from public;
grant execute on function public.aeon_create_match_session(integer) to authenticated;
grant execute on function public.aeon_join_match_session(text,text) to anon,authenticated;
grant execute on function public.aeon_read_match_session(text) to anon,authenticated;
grant execute on function public.aeon_set_match_session_status(text,text,text) to anon,authenticated;
