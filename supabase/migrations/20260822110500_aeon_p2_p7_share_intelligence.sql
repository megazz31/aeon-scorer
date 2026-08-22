-- P2-P7: share only sanitized product intelligence needed for pod matching.
-- Never expose decklists, Oracle text or evidence-card lists through public shares.

alter table public.analysis_shares
  add column if not exists product_intelligence jsonb not null default '{}'::jsonb;

create or replace function public.aeon_safe_metric_map(p jsonb)
returns jsonb language sql immutable set search_path = public, pg_temp as $$
  select coalesce(jsonb_object_agg(key,jsonb_strip_nulls(jsonb_build_object(
    'score',value->'score','level',value->'level','method',value->'method'
  ))),'{}'::jsonb)
  from jsonb_each(case when jsonb_typeof(p)='object' then p else '{}'::jsonb end)
$$;

create or replace function public.aeon_safe_horizon_curves(p jsonb)
returns jsonb language sql immutable set search_path = public, pg_temp as $$
  select coalesce(jsonb_object_agg(key,jsonb_strip_nulls(jsonb_build_object(
    'semantics',value->'semantics',
    'points',coalesce((select jsonb_agg(jsonb_build_object('turn',x->'turn','value',x->'value')) from jsonb_array_elements(case when jsonb_typeof(value->'points')='array' then value->'points' else '[]'::jsonb end) x),'[]'::jsonb)
  ))),'{}'::jsonb)
  from jsonb_each(case when jsonb_typeof(p)='object' then p else '{}'::jsonb end)
$$;

create or replace function public.aeon_safe_combo_access(p jsonb)
returns jsonb language sql immutable set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'modelVersion',p->'modelVersion',
    'lines',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('name',x->'name','score',x->'score','level',x->'level','commanderPieces',x->'commanderPieces','method',x->'method'))) from jsonb_array_elements(case when jsonb_typeof(p->'lines')='array' then p->'lines' else '[]'::jsonb end) x),'[]'::jsonb)
  )
$$;

drop function if exists public.aeon_create_analysis_share(uuid,text[],jsonb,jsonb);
create function public.aeon_create_analysis_share(
  p_analysis_id uuid,
  p_game_changers text[] default '{}',
  p_bracket_signals jsonb default '{}'::jsonb,
  p_combo_summary jsonb default null,
  p_product_intelligence jsonb default '{}'::jsonb
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
  safe_product jsonb;
begin
  select * into r from public.analysis_runs where id=p_analysis_id;
  if not found then raise exception 'analysis_not_found'; end if;
  if r.user_id is not null and auth.uid() is distinct from r.user_id then raise exception 'analysis_not_owned'; end if;
  if r.user_id is null and r.created_at < now() - interval '2 hours' then raise exception 'anonymous_share_window_expired'; end if;

  cmd_names := case when jsonb_typeof(r.result->'commanderNames')='array' then array(select jsonb_array_elements_text(r.result->'commanderNames')) else array[r.commander_name] end;
  select coalesce(jsonb_agg(jsonb_build_object('id',x->>'id','name',x->>'name','strength',x->'strength','cohesion',x->'cohesion')),'[]'::jsonb)
    into safe_packages from jsonb_array_elements(coalesce(r.result->'packages','[]'::jsonb)) x;
  safe_combos := coalesce(p_combo_summary,r.result->'combos','[]'::jsonb);
  safe_product := jsonb_build_object(
    'modelVersion',p_product_intelligence->'modelVersion',
    'experience',jsonb_build_object('modelVersion',p_product_intelligence#>'{experience,modelVersion}','dimensions',public.aeon_safe_metric_map(p_product_intelligence#>'{experience,dimensions}'),'confidence',p_product_intelligence#>'{experience,confidence}'),
    'friction',jsonb_build_object('modelVersion',p_product_intelligence#>'{friction,modelVersion}','signals',public.aeon_safe_metric_map(p_product_intelligence#>'{friction,signals}')),
    'horizon',jsonb_build_object('modelVersion',p_product_intelligence#>'{horizon,modelVersion}','curves',public.aeon_safe_horizon_curves(p_product_intelligence#>'{horizon,curves}')),
    'spof',jsonb_build_object('modelVersion',p_product_intelligence#>'{spof,modelVersion}','dependencies',public.aeon_safe_metric_map(p_product_intelligence#>'{spof,dependencies}')),
    'comboAccessibility',public.aeon_safe_combo_access(p_product_intelligence->'comboAccessibility'),
    'vulnerability',jsonb_build_object('modelVersion',p_product_intelligence#>'{vulnerability,modelVersion}','classes',public.aeon_safe_metric_map(p_product_intelligence#>'{vulnerability,classes}')),
    'confidence',jsonb_build_object('productCalibration','experimental'),
    'privacy',jsonb_build_object('decklist',false,'oracle',false,'evidenceCards',false)
  );

  loop code := substr(replace(gen_random_uuid()::text,'-',''),1,12); exit when not exists(select 1 from public.analysis_shares where share_code=code); end loop;
  insert into public.analysis_shares(
    share_code,analysis_id,user_id,deck_name,commander_names,engine_version,semantic_version,iterations,
    median,p20,p80,peak,coverage,dimensions,packages,combo_summary,game_changers,bracket_signals,product_intelligence
  ) values (
    code,r.id,r.user_id,coalesce(r.deck_name,r.commander_name),cmd_names,r.engine_version,r.semantic_version,r.iterations,
    r.median,r.p20,r.p80,r.peak,r.coverage,coalesce(r.result->'dimensions','{}'::jsonb),safe_packages,safe_combos,
    coalesce(p_game_changers,'{}'),coalesce(p_bracket_signals,'{}'::jsonb),safe_product
  );
  return code;
end $$;

revoke all on function public.aeon_safe_metric_map(jsonb) from public, anon, authenticated;
revoke all on function public.aeon_safe_horizon_curves(jsonb) from public, anon, authenticated;
revoke all on function public.aeon_safe_combo_access(jsonb) from public, anon, authenticated;
grant execute on function public.aeon_create_analysis_share(uuid,text[],jsonb,jsonb,jsonb) to anon, authenticated;
