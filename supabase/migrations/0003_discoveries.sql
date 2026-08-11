-- ---------------------------------------------------------------------------
-- discoveries
-- ---------------------------------------------------------------------------
-- The scanner's shortlist. One row per token that cleared the bar on a scan,
-- pointing at the analysis that justified it.
--
-- Separate from `analyses` rather than a flag on it, for one reason: a scan
-- reads thirty tokens and keeps two, and the two that survive are a different
-- kind of object from "an analysis someone asked for". Keeping them apart means
-- the discovery feed can be queried without filtering the entire history, and
-- the history stays what a person actually looked at.
--
-- Safe to re-run.
create table if not exists public.discoveries (
  id bigserial primary key,
  analysis_id uuid references public.analyses (id) on delete set null,
  chain text not null default 'solana',
  address text not null,
  symbol text,
  name text,
  decision text not null,
  score numeric not null,
  confidence numeric,
  liquidity_usd numeric,
  market_cap_usd numeric,
  age_minutes numeric,
  reasons jsonb not null default '[]'::jsonb,
  -- Which listing feed offered the token. Worth keeping: if one source produces
  -- everything that later fails, that is a finding about the source.
  source text not null,
  found_at timestamptz not null default now()
);

-- One row per token per day; a token that keeps qualifying on every scan should
-- not fill the feed with copies of itself.
--
-- The day is a stored generated column rather than an expression index, because
-- PostgREST can only name plain columns as an upsert conflict target. The UTC
-- cast is what makes the expression immutable enough for Postgres to store.
alter table public.discoveries
  add column if not exists found_day date
  generated always as (((found_at at time zone 'UTC')::date)) stored;

create unique index if not exists discoveries_address_day_key
  on public.discoveries (address, found_day);

create index if not exists discoveries_found_idx on public.discoveries (found_at desc);

alter table public.discoveries enable row level security;

-- No browser policy: the feed is served through the server-side key like the
-- rest of the read paths, and nothing here is user-owned.
