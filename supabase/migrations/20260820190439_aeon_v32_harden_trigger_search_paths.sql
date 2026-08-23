create or replace function public.check_max_decks()
returns trigger language plpgsql set search_path='public'
as $function$
begin
  if (select count(*) from public.decks where user_id = new.user_id) >= 10 then
    raise exception 'Limite de 10 decks par utilisateur atteinte';
  end if;
  return new;
end
$function$;

create or replace function public.update_deck_last_modified()
returns trigger language plpgsql set search_path='public'
as $function$
begin
  new.last_modified = now();
  return new;
end
$function$;

create or replace function public.update_updated_at()
returns trigger language plpgsql set search_path='public'
as $function$
begin
  new.updated_at = now();
  return new;
end
$function$;
