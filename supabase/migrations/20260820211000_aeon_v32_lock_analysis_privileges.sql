revoke all on table public.analysis_runs from anon, authenticated;
grant select on table public.analysis_runs to authenticated;

revoke all on table public.analysis_audit_queue from anon, authenticated;
revoke all on table public.audit_findings from anon, authenticated;
revoke all on table public.audit_runs from anon, authenticated;
revoke all on table public.card_semantics from anon, authenticated;
revoke all on table public.analysis_ingest_budget from anon, authenticated;
