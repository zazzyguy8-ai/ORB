-- ORB Signal — initial schema (spec §18)
--
-- Design goals:
--   1. Every analysis is reproducible after the fact: the metrics, the flags and
--      the scoring model version are all stored, not just the verdict.
--   2. Outcome tracking (spec §14) is a first-class table, not an afterthought,
--      so model quality can be measured per decision, per score band and per
--      individual signal.
--   3. It has to stay fast at millions of rows: narrow tables, explicit indexes,
--      and a partial index on exactly the query the cron worker runs.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
-- Mirrors auth.users. Supabase owns identity; this table owns plan and quota.
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  analyses_today integer not null default 0,
  quota_reset_at date not null default current_date,
  telegram_chat_id text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tokens
-- ---------------------------------------------------------------------------
create table if not exists public.tokens (
  id uuid primary key default gen_random_uuid(),
  chain text not null default 'solana',
  address text not null,
  name text,
  symbol text,
  pair_address text,
  dex text,
  pair_created_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create unique index if not exists tokens_chain_address_key on public.tokens (chain, address);
create index if not exists tokens_symbol_idx on public.tokens (symbol);

-- ---------------------------------------------------------------------------
-- analyses
-- ---------------------------------------------------------------------------
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.tokens (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  chain text not null default 'solana',
  address text not null,
  decision text not null check (decision in ('BUY', 'WATCH', 'AVOID')),
  confidence integer not null check (confidence between 0 and 100),
  score numeric(5, 2) not null,
  coverage numeric(4, 3) not null,
  scoring_version text not null,
  -- Denormalised copies so the history list is a single-table read.
  reasons jsonb not null default '[]'::jsonb,
  risk_notes jsonb not null default '[]'::jsonb,
  explanation_source text not null default 'deterministic',
  category_scores jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  availability jsonb not null default '{}'::jsonb,
  price_usd numeric,
  market_cap_usd numeric,
  liquidity_usd numeric,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists analyses_token_created_idx on public.analyses (token_id, created_at desc);
create index if not exists analyses_user_created_idx on public.analyses (user_id, created_at desc);
create index if not exists analyses_created_idx on public.analyses (created_at desc);
create index if not exists analyses_decision_score_idx on public.analyses (decision, score);
create index if not exists analyses_address_idx on public.analyses (chain, address, created_at desc);

-- ---------------------------------------------------------------------------
-- analysis_metrics
-- ---------------------------------------------------------------------------
-- Long and narrow, one row per metric. The jsonb blob on `analyses` answers
-- "show me this analysis"; this table answers "which signals actually predicted
-- anything" without a jsonb scan over the whole history.
create table if not exists public.analysis_metrics (
  id bigserial primary key,
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  metric_key text not null,
  metric_value numeric,
  -- Populated for scored signals; null for raw metrics that carry no sub-score.
  signal_score numeric(5, 2),
  category text
);

create index if not exists analysis_metrics_analysis_idx on public.analysis_metrics (analysis_id);
create index if not exists analysis_metrics_key_idx on public.analysis_metrics (metric_key, metric_value);

-- ---------------------------------------------------------------------------
-- risk_flags
-- ---------------------------------------------------------------------------
create table if not exists public.risk_flags (
  id bigserial primary key,
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  code text not null,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low')),
  title text not null,
  detail text not null,
  veto boolean not null default false,
  evidence jsonb
);

create index if not exists risk_flags_analysis_idx on public.risk_flags (analysis_id);
create index if not exists risk_flags_code_idx on public.risk_flags (code);

-- ---------------------------------------------------------------------------
-- wallet_events
-- ---------------------------------------------------------------------------
create table if not exists public.wallet_events (
  id bigserial primary key,
  analysis_id uuid references public.analyses (id) on delete cascade,
  token_id uuid not null references public.tokens (id) on delete cascade,
  wallet text not null,
  side text not null check (side in ('buy', 'sell')),
  amount_usd numeric,
  -- The measurable rule that made this wallet notable. Never a vibe.
  criterion text not null,
  tx_signature text,
  occurred_at timestamptz not null
);

create index if not exists wallet_events_analysis_idx on public.wallet_events (analysis_id);
create index if not exists wallet_events_token_time_idx on public.wallet_events (token_id, occurred_at desc);
create unique index if not exists wallet_events_tx_wallet_key
  on public.wallet_events (tx_signature, wallet, side)
  where tx_signature is not null;

-- ---------------------------------------------------------------------------
-- price_snapshots
-- ---------------------------------------------------------------------------
create table if not exists public.price_snapshots (
  id bigserial primary key,
  token_id uuid not null references public.tokens (id) on delete cascade,
  analysis_id uuid references public.analyses (id) on delete cascade,
  -- 't0' plus the checkpoints from spec §14.
  checkpoint text not null check (checkpoint in ('t0', 'm5', 'm15', 'h1', 'h6', 'h24')),
  price_usd numeric,
  liquidity_usd numeric,
  market_cap_usd numeric,
  volume_h1_usd numeric,
  captured_at timestamptz not null default now()
);

create index if not exists price_snapshots_token_time_idx on public.price_snapshots (token_id, captured_at desc);
create unique index if not exists price_snapshots_analysis_checkpoint_key
  on public.price_snapshots (analysis_id, checkpoint)
  where analysis_id is not null;

-- ---------------------------------------------------------------------------
-- analysis_outcomes
-- ---------------------------------------------------------------------------
-- One pending row per checkpoint is written at analysis time. The cron worker
-- claims due rows, fetches a price and fills in the return.
create table if not exists public.analysis_outcomes (
  id bigserial primary key,
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  token_id uuid not null references public.tokens (id) on delete cascade,
  checkpoint text not null check (checkpoint in ('m5', 'm15', 'h1', 'h6', 'h24')),
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'recorded', 'failed')),
  baseline_price_usd numeric,
  price_usd numeric,
  -- Signed percentage change from baseline. The only column the evaluation
  -- queries actually aggregate.
  return_pct numeric,
  attempts integer not null default 0,
  recorded_at timestamptz
);

create unique index if not exists analysis_outcomes_analysis_checkpoint_key
  on public.analysis_outcomes (analysis_id, checkpoint);
-- The cron hot path: "what is due right now". Partial so it stays small
-- regardless of how much recorded history accumulates.
create index if not exists analysis_outcomes_due_idx
  on public.analysis_outcomes (due_at)
  where status = 'pending';
create index if not exists analysis_outcomes_checkpoint_idx on public.analysis_outcomes (checkpoint, status);

-- ---------------------------------------------------------------------------
-- Evaluation helper (spec §14/§26)
-- ---------------------------------------------------------------------------
-- Deliberately a view, not a materialised table: at MVP volume it is cheap, and
-- it must never drift from the underlying rows.
create or replace view public.decision_performance as
select
  a.decision,
  o.checkpoint,
  width_bucket(a.score, 0, 100, 10) as score_bucket,
  count(*) as samples,
  avg(o.return_pct) as avg_return_pct,
  percentile_cont(0.5) within group (order by o.return_pct) as median_return_pct,
  sum(case when o.return_pct > 0 then 1 else 0 end)::numeric / nullif(count(*), 0) as positive_rate
from public.analyses a
join public.analysis_outcomes o on o.analysis_id = a.id
where o.status = 'recorded'
group by a.decision, o.checkpoint, score_bucket;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
-- All writes go through the service role from server code. Users may read their
-- own rows only; nothing here is writable from the browser.
alter table public.users enable row level security;
alter table public.analyses enable row level security;
alter table public.analysis_metrics enable row level security;
alter table public.risk_flags enable row level security;
alter table public.wallet_events enable row level security;
alter table public.price_snapshots enable row level security;
alter table public.analysis_outcomes enable row level security;
alter table public.tokens enable row level security;

drop policy if exists users_self_read on public.users;
create policy users_self_read on public.users for select using (auth.uid() = id);

drop policy if exists analyses_self_read on public.analyses;
create policy analyses_self_read on public.analyses for select using (auth.uid() = user_id);

drop policy if exists tokens_public_read on public.tokens;
create policy tokens_public_read on public.tokens for select using (true);

-- Keep a users row in step with auth.users so the quota counter always exists.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
