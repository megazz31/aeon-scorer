create extension if not exists pgcrypto;

alter table public.analysis_runs
  add column if not exists oracle_snapshot_hash text,
  add column if not exists scryfall_oracle_date date not null default current_date;

update public.analysis_runs
set oracle_snapshot_hash = encode(digest(coalesce(cards::text,'[]') || '|' || coalesce(commander_name,'') || '|' || coalesce(deck_hash,''), 'sha256'), 'hex')
where oracle_snapshot_hash is null;

alter table public.analysis_runs alter column oracle_snapshot_hash set not null;

alter table public.analysis_runs drop constraint if exists analysis_runs_deck_id_fkey;
alter table public.analysis_runs
  add constraint analysis_runs_deck_id_fkey foreign key (deck_id) references public.decks(id) on delete cascade;

alter table public.card_semantics drop constraint if exists card_semantics_pkey;
alter table public.card_semantics
  add constraint card_semantics_pkey primary key (oracle_id, oracle_hash, semantic_version);
create index if not exists card_semantics_oracle_latest_idx
  on public.card_semantics(oracle_id, audited_at desc nulls last, last_seen_at desc);

create or replace function public.aeon_increment_card_occurrences(p_counts jsonb)
returns void language plpgsql security definer set search_path='public'
as $function$
declare item jsonb;
begin
  for item in select * from jsonb_array_elements(coalesce(p_counts,'[]'::jsonb)) loop
    if coalesce(item->>'oracle_id','') <> '' and coalesce(item->>'oracle_hash','') <> '' and coalesce(item->>'semantic_version','') <> '' then
      update public.card_semantics
      set occurrences=occurrences+greatest(1,coalesce((item->>'count')::int,1)), last_seen_at=now()
      where oracle_id=item->>'oracle_id'
        and oracle_hash=item->>'oracle_hash'
        and semantic_version=item->>'semantic_version';
    end if;
  end loop;
end
$function$;
revoke all on function public.aeon_increment_card_occurrences(jsonb) from public, anon, authenticated;
grant execute on function public.aeon_increment_card_occurrences(jsonb) to service_role;

create or replace function public.aeon_upsert_card_semantic(
  p_oracle_id text,p_oracle_hash text,p_card_name text,p_oracle_text text,p_type_line text,
  p_engine_tags text[],p_auditor_tags text[],p_confidence numeric,p_disagreement boolean,
  p_rationale text,p_semantic_version text,p_occurrence_increment integer default 1
) returns void language plpgsql security definer set search_path='public'
as $function$
begin
  if coalesce(trim(p_oracle_id),'')='' or coalesce(trim(p_oracle_hash),'')='' or coalesce(trim(p_semantic_version),'')='' then
    raise exception 'missing semantic identity';
  end if;
  insert into public.card_semantics(
    oracle_id,oracle_hash,card_name,oracle_text,type_line,engine_tags,auditor_tags,auditor_confidence,
    disagreement,rationale,semantic_version,occurrences,last_seen_at,audited_at
  ) values (
    lower(trim(p_oracle_id)),trim(p_oracle_hash),left(coalesce(p_card_name,''),240),left(coalesce(p_oracle_text,''),10000),
    left(coalesce(p_type_line,''),500),coalesce(p_engine_tags,'{}'::text[]),coalesce(p_auditor_tags,'{}'::text[]),
    greatest(0,least(1,coalesce(p_confidence,0))),coalesce(p_disagreement,false),left(coalesce(p_rationale,''),2000),
    trim(p_semantic_version),greatest(1,coalesce(p_occurrence_increment,1)),now(),now()
  )
  on conflict (oracle_id,oracle_hash,semantic_version) do update set
    card_name=excluded.card_name,oracle_text=excluded.oracle_text,type_line=excluded.type_line,
    engine_tags=excluded.engine_tags,auditor_tags=excluded.auditor_tags,auditor_confidence=excluded.auditor_confidence,
    disagreement=excluded.disagreement,rationale=excluded.rationale,
    occurrences=public.card_semantics.occurrences+greatest(1,coalesce(p_occurrence_increment,1)),
    last_seen_at=now(),audited_at=now();
end
$function$;
revoke all on function public.aeon_upsert_card_semantic(text,text,text,text,text,text[],text[],numeric,boolean,text,text,integer) from public, anon, authenticated;
grant execute on function public.aeon_upsert_card_semantic(text,text,text,text,text,text[],text[],numeric,boolean,text,text,integer) to service_role;

drop function if exists public.aeon_invoke_auditor();
drop function if exists public.aeon_internal_secret(text);
drop table if exists public.aeon_internal_settings;
