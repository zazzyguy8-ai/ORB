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
  source text not null,
  found_at timestamptz not null default now(),
  found_day date generated always as (((found_at at time zone 'UTC')::date)) stored
);

create unique index if not exists discoveries_address_day_key
  on public.discoveries (address, found_day);

create index if not exists discoveries_found_idx
  on public.discoveries (found_at desc);

alter table public.discoveries enable row level security;

-- ---------------------------------------------------------------------------
-- Notes, deliberately at the bottom
-- ---------------------------------------------------------------------------
-- The comments live here rather than above the SQL for a practical reason: this
-- file gets pasted into the Supabase SQL editor by hand, and pasting into a tab
-- that already has content puts the cursor at the end of whatever was there. If
-- that last line is a comment, every statement pasted after it is swallowed by
-- the `--` and Postgres reports a syntax error somewhere confusing. Statements
-- first means a bad paste fails loudly at the first line instead.
--
-- discoveries: the scanner's shortlist. One row per token that cleared the bar,
-- pointing at the analysis that justified it. Separate from `analyses` rather
-- than a flag on it, because a scan reads thirty tokens and keeps two — mixing
-- the two would bury the history a person actually asked for.
--
-- found_day: a stored generated column, not an expression index, because
-- PostgREST can only name plain columns as an upsert conflict target. The UTC
-- cast is what makes the expression immutable enough for Postgres to store it.
-- Together with the unique index it means a token qualifying on every scan
-- produces one row a day rather than a feed full of copies of itself.
--
-- RLS on with no policy: the feed is served through the server-side key like
-- every other read path here, and nothing in this table is user-owned.
