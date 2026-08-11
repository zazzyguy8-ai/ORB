create table if not exists public.waitlist (
  id bigserial primary key,
  email text not null,
  source text not null default 'pricing',
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_email_key
  on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

-- ---------------------------------------------------------------------------
-- Notes, at the bottom so a paste that lands after a comment line fails loudly
-- ---------------------------------------------------------------------------
-- Who to tell when the paid plan exists. Deliberately the smallest table that
-- can answer one question — is anybody willing to pay — and nothing more. No
-- name, no marketing consent field, no tracking columns: this list has exactly
-- one use, and collecting anything beyond the address needed for that use would
-- be collecting it because it was easy.
--
-- The unique index is on lower(email) so signing up twice is a no-op rather
-- than a duplicate, and RLS is on with no policy: it is written through the
-- server-side key and never read by a browser.
