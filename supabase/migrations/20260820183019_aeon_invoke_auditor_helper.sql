-- 20260820183019_aeon_invoke_auditor_helper.sql

create table if not exists public.aeon_internal_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

create or replace function public.aeon_internal_secret(p_key text)
returns text language plpgsql security definer set search_path to 'public' as $$
declare v text;
begin
  select value into v from public.aeon_internal_settings where key = p_key;
  return v;
end;
$$;

create or replace function public.aeon_invoke_auditor()
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  -- Trigger auditor helper placeholder
  perform 1;
end;
$$;
