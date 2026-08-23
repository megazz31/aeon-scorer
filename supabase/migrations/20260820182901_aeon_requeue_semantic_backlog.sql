-- 20260820182901_aeon_requeue_semantic_backlog.sql

create or replace function public.aeon_requeue_audit_item(p_analysis_id uuid, p_reason text default 'semantic backlog')
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  update public.analysis_audit_queue
    set status='pending', attempts=greatest(0,attempts-1), next_attempt_at=now()+interval '1 hour', locked_at=null,
        last_error=left(coalesce(p_reason,'semantic backlog'),2000), updated_at=now()
  where analysis_id=p_analysis_id;
end;
$$;
