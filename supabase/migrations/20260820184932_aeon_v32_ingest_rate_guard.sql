create table if not exists public.analysis_ingest_budget (
  bucket_key text primary key,
  window_start timestamptz not null default date_trunc('hour',now()),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);
alter table public.analysis_ingest_budget enable row level security;
revoke all on public.analysis_ingest_budget from public, anon, authenticated;
grant all on public.analysis_ingest_budget to service_role;

create or replace function public.aeon_consume_ingest_budget(p_key text, p_limit integer)
returns boolean language plpgsql security definer set search_path='public'
as $function$
declare
  bucket timestamptz := date_trunc('hour',now());
  n integer;
begin
  if coalesce(trim(p_key),'')='' then return false; end if;
  p_limit := greatest(1,least(coalesce(p_limit,30),500));
  delete from public.analysis_ingest_budget where updated_at < now() - interval '48 hours';
  insert into public.analysis_ingest_budget(bucket_key,window_start,request_count,updated_at)
  values (p_key,bucket,1,now())
  on conflict (bucket_key) do update set
    window_start=case when public.analysis_ingest_budget.window_start=bucket then public.analysis_ingest_budget.window_start else bucket end,
    request_count=case when public.analysis_ingest_budget.window_start=bucket then public.analysis_ingest_budget.request_count+1 else 1 end,
    updated_at=now()
  returning request_count into n;
  return n <= p_limit;
end
$function$;
revoke all on function public.aeon_consume_ingest_budget(text,integer) from public, anon, authenticated;
grant execute on function public.aeon_consume_ingest_budget(text,integer) to service_role;
