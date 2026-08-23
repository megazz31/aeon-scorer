-- Aeon public Commander precon library.
-- Public decklists are immutable reference inputs; Aeon analyses stay versioned evidence.

create table if not exists public.public_decks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  deck_hash text not null unique,
  name text not null,
  commander_name text not null,
  commander_oracle_id text,
  commander_image_url text,
  color_identity text[] not null default '{}',
  set_code text,
  product_name text,
  release_date date,
  original_decklist text not null,
  card_count integer not null check (card_count between 95 and 100),
  supported boolean not null default true,
  unsupported_reason text,
  source_name text not null default 'MTGJSON',
  source_url text,
  source_revision text,
  product_aliases jsonb not null default '[]'::jsonb,
  latest_analysis_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.public_deck_analyses (
  id uuid primary key default gen_random_uuid(),
  public_deck_id uuid not null references public.public_decks(id) on delete cascade,
  analysis_run_id uuid references public.analysis_runs(id) on delete set null,
  deck_hash text not null,
  engine_version text not null,
  semantic_version text not null,
  oracle_snapshot_hash text not null,
  scryfall_oracle_date date not null,
  iterations integer not null check (iterations between 100 and 20000),
  median numeric,
  p20 numeric,
  p80 numeric,
  peak numeric,
  coverage numeric,
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique(public_deck_id, engine_version, semantic_version, oracle_snapshot_hash, iterations)
);

create index if not exists public_decks_release_date_idx on public.public_decks(release_date desc);
create index if not exists public_decks_colors_idx on public.public_decks using gin(color_identity);
create index if not exists public_deck_analyses_latest_idx on public.public_deck_analyses(public_deck_id, created_at desc);
create index if not exists public_deck_analyses_engine_idx on public.public_deck_analyses(engine_version, semantic_version);

alter table public.public_decks enable row level security;
alter table public.public_deck_analyses enable row level security;

revoke all on table public.public_decks from anon, authenticated;
revoke all on table public.public_deck_analyses from anon, authenticated;
grant select on table public.public_decks to anon, authenticated;
grant select on table public.public_deck_analyses to anon, authenticated;

create policy "public decklists are readable"
on public.public_decks for select
to anon, authenticated
using (true);

create policy "public deck analyses are readable"
on public.public_deck_analyses for select
to anon, authenticated
using (true);

create or replace function public.aeon_touch_public_deck_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.aeon_touch_public_deck_updated_at() from public, anon, authenticated;

drop trigger if exists public_decks_touch_updated_at on public.public_decks;
create trigger public_decks_touch_updated_at
before update on public.public_decks
for each row execute function public.aeon_touch_public_deck_updated_at();

create or replace view public.public_deck_catalog
with (security_invoker = true)
as
select
  d.id,
  d.slug,
  d.deck_hash,
  d.name,
  d.commander_name,
  d.commander_oracle_id,
  d.commander_image_url,
  d.color_identity,
  d.set_code,
  d.product_name,
  d.release_date,
  d.card_count,
  d.supported,
  d.unsupported_reason,
  d.source_name,
  d.source_url,
  d.source_revision,
  d.latest_analysis_at,
  a.id as latest_analysis_id,
  a.engine_version,
  a.semantic_version,
  a.oracle_snapshot_hash,
  a.scryfall_oracle_date,
  a.iterations,
  a.median,
  a.p20,
  a.p80,
  a.peak,
  a.coverage,
  a.created_at as analysis_created_at
from public.public_decks d
left join lateral (
  select x.*
  from public.public_deck_analyses x
  where x.public_deck_id = d.id
  order by x.created_at desc
  limit 1
) a on true;

grant select on public.public_deck_catalog to anon, authenticated;

comment on table public.public_decks is 'Immutable public Commander precon decklists imported from a structured public source. Not user-owned decks.';
comment on table public.public_deck_analyses is 'Versioned Aeon analyses for public decks. Scores are model outputs/evidence, never ground-truth labels.';
