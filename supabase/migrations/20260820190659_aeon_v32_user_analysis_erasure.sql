create or replace function public.aeon_delete_my_analysis_data()
returns integer
language plpgsql
security definer
set search_path='public'
as $function$
declare
  uid uuid := (select auth.uid());
  n integer;
begin
  if uid is null then raise exception 'authentication required'; end if;
  delete from public.analysis_runs where user_id=uid;
  get diagnostics n=row_count;
  update public.decks set latest_analysis_at=null where user_id=uid;
  return n;
end
$function$;
revoke all on function public.aeon_delete_my_analysis_data() from public, anon;
grant execute on function public.aeon_delete_my_analysis_data() to authenticated;
