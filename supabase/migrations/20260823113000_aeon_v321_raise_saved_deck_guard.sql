-- Aeon Scorer v3.2.1
-- Keep an abuse ceiling without turning saved-deck count into a product limitation.
-- The previous 10-deck cap was too low for active Commander players and for
-- version/history workflows. 100 remains a safety guard, not a pricing tier.

create or replace function public.check_max_decks()
returns trigger
language plpgsql
set search_path='public'
as $function$
begin
  if (select count(*) from public.decks where user_id = new.user_id) >= 100 then
    raise exception 'Saved deck safety limit reached (100)';
  end if;
  return new;
end
$function$;
