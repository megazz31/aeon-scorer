-- 20260820182840_aeon_semantic_auditor_helpers.sql

create or replace function public.aeon_claim_audit_batch(batch_size integer default 20)
returns setof public.analysis_runs language plpgsql security definer set search_path to 'public' as $$
begin
  return query
  with picked as (
    select q.analysis_id
    from public.analysis_audit_queue q
    where q.status in ('pending','failed')
      and q.next_attempt_at <= now()
      and q.attempts < 5
    order by q.created_at
    for update skip locked
    limit greatest(1,least(batch_size,50))
  ), updated as (
    update public.analysis_audit_queue q
      set status='processing', attempts=q.attempts+1, locked_at=now(), updated_at=now(), last_error=null
    from picked p
    where q.analysis_id=p.analysis_id
    returning q.analysis_id
  )
  select a.* from public.analysis_runs a join updated u on u.analysis_id=a.id;
end;
$$;

create or replace function public.aeon_finish_audit_item(p_analysis_id uuid, p_ok boolean, p_error text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  update public.analysis_audit_queue
    set status=case when p_ok then 'done' else 'failed' end,
        next_attempt_at=case when p_ok then now() else now()+interval '1 hour' end,
        last_error=case when p_ok then null else left(coalesce(p_error,'unknown error'),2000) end,
        locked_at=null,
        updated_at=now()
  where analysis_id=p_analysis_id;
  if p_ok then update public.analysis_runs set audited_at=now() where id=p_analysis_id; end if;
end;
$$;

create or replace function public.aeon_reset_stale_audits()
returns integer language plpgsql security definer set search_path to 'public' as $$
declare n integer;
begin
  update public.analysis_audit_queue
  set status='failed', locked_at=null, next_attempt_at=now(), last_error='stale processing lock reset', updated_at=now()
  where status='processing' and locked_at < now()-interval '30 minutes';
  get diagnostics n=row_count;
  return n;
end;
$$;
