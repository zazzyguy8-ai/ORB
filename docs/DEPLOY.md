# Deployment runbook

Order matters: database → environment → deploy → verify. The verify step is not
optional — the data providers have never been exercised against their live APIs
(see [ARCHITECTURE.md](ARCHITECTURE.md) §11), so the first probe after deploy is
what turns "should work" into "does work".

---

## 1. Database

Supabase → **SQL Editor** → paste the whole of `supabase/migrations/0001_init.sql`
→ Run.

**Clear the editor between migrations — Cmd/Ctrl+A, delete — before pasting the
next one.** The editor runs the whole tab, and pasting appends at the cursor. If
the cursor sits at the end of a comment line, everything you paste after it is
swallowed by that `--` and Postgres reports a syntax error at a line that looks
fine. The migration files put their statements first and their notes last for
this reason, but a leftover tab will still bite.

It creates eight tables, their indexes, RLS policies, the `decision_performance`
evaluation view, and a trigger that keeps `public.users` in step with
`auth.users`. It is idempotent (`if not exists` throughout), so re-running it is
safe if you are unsure whether it completed.

Then run `0002_outcome_staleness.sql`, `0003_discoveries.sql` and
`0004_waitlist.sql` the same way, in that order. 0003 adds the scanner's
shortlist table; without it the scanner still runs and still posts to Telegram,
but `/discover` stays empty because there is nowhere to record what it found.

About 0002: It adds
the `stale` outcome status and a `late_by_seconds` column, which is what stops a
late worker from writing a four-hour price into a row labelled "+5 min". Also
idempotent. Until it is applied, late checkpoints are still priced and recorded
under their original label, which quietly overstates what the short horizons
measured — so do not skip it.

## 2. Environment variables

Set these on the host — Render → Environment, or Vercel → Settings → Environment Variables.

**Required for full function:**

| Variable | Where it comes from | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com | Without it explanations render deterministically |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Safe in the browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page — the *publishable* key | Safe in the browser by design |
| `SUPABASE_SERVICE_ROLE_KEY` | same page — the *secret* key | **Server only.** Bypasses RLS — never expose it |
| `CRON_SECRET` | generate: `openssl rand -hex 24` | Guards the cron and diagnostics endpoints |

**Recommended:**

| Variable | Why |
|---|---|
| `SOLANA_RPC_URL` | The public node is heavily throttled; holder concentration depends on it, so a dedicated RPC is the single biggest data-quality win |
| `HELIUS_API_KEY` | Enables the large-wallet flow category. Without it that category reports *unavailable* and its weight is redistributed |

**Optional:** `ANTHROPIC_MODEL` (defaults to `claude-opus-5`; `claude-haiku-4-5`
trades phrasing quality for roughly 1.5 s lower latency), `GOPLUS_APP_KEY` /
`GOPLUS_APP_SECRET` (raises GoPlus rate limits), `TELEGRAM_BOT_TOKEN`, and the
tuning and pricing values listed in `.env.example`.

Everything unset degrades honestly rather than breaking — see the table in the
README.

## 3. Deploy

`render.yaml` (Render) and `vercel.json` (Vercel) are both committed. Each host
reads only its own file and ignores the other.

### Render

Use the Blueprint if possible — **New → Blueprint**, point it at the repo, and
Render prompts for each secret. Otherwise fill the web-service form with:

| Field | Value |
|---|---|
| Language | `Node` |
| Branch | `main` |
| Root Directory | *(leave empty)* |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

`.node-version` pins Node 22, so the build does not depend on whatever the host
defaults to that month.

> ⚠️ **The free instance sleeps.** Render spins a free web service down after
> ~15 minutes of no traffic; the next request pays a cold start of roughly a
> minute. For a product whose entire pitch is "an answer in seconds", the first
> analysis after an idle period is the one that makes it look broken. Fine for
> testing, not for anyone else's first impression — either move to a paid
> instance or keep it warm by pinging `/api/health` every 10 minutes.

### Vercel

Import the repository; the framework is detected automatically. `vercel.json`
registers the cron entry.

### Outcome-tracking cron

The first checkpoint is at +5 minutes, so the worker needs minute-level
scheduling. **Neither host gives that away on a free plan** — Render's Cron Jobs
are a separate paid service, and Vercel's lower tiers coarsen scheduled jobs to
roughly daily. Both would leave the +5m, +15m and +1h checkpoints permanently
unrecorded while the later ones land late.

**This repository ships one.** `.github/workflows/cron.yml` runs both workers
from GitHub Actions and needs two repository settings — Settings → Secrets and
variables → Actions:

| | Name | Value |
|---|---|---|
| Variable | `ORB_BASE_URL` | the deployment's URL, no trailing slash |
| Secret | `CRON_SECRET` | the same value as the deployment's `CRON_SECRET` |

Both workers can then be triggered by hand from the Actions tab (Run workflow →
pick snapshots or scan), which is the fastest way to confirm they work. A
non-2xx response fails the run and prints the body, so a broken deploy shows up
in the Actions tab rather than silently doing nothing every five minutes.

Two limits of Actions specifically: its cron has a **five-minute floor and is
often late** under load, so some +5m checkpoints will be priced too late and
recorded as stale rather than backdated — that is the designed behaviour, but if
the m5 column stays empty this is why. And scheduled workflows are disabled
after 60 days without a commit.

If the +5m horizon matters, replace it with an external scheduler that ticks
every minute (cron-job.org is free), pointed at:

```
POST https://<host>/api/cron/snapshots
Authorization: Bearer <CRON_SECRET>
```

The endpoint is idempotent — it claims only checkpoints that are actually due,
so an extra invocation costs one cheap query and nothing else.

**Without any scheduler it still works, in proportion to traffic.** Every
analysis request nudges the same worker in the background (throttled to once a
minute per instance), so an actively used deployment records most of its own
checkpoints. What it cannot do is cover a quiet stretch: checkpoints that come
due while nobody is using the site are marked `stale` rather than backdated, and
they are excluded from the track record. A real scheduler is what converts that
loss into data.

### Scanner

```
POST https://<host>/api/cron/scan
Authorization: Bearer <CRON_SECRET>
```

Walks the public token listings, runs the full pipeline over up to thirty
candidates, and keeps only the ones that clear the shortlist bar. Every few
hours is the right cadence — it re-reads the same feeds otherwise, and tokens
analysed in the last three hours are skipped anyway. One run costs roughly
120 upstream calls in the worst case, so do not schedule it by the minute.

### Telegram bot

Two independent halves; either can be used without the other.

**Outbound** (the scanner posts its shortlist to a channel): set
`TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. With no chat id set it publishes
nowhere, which is the default — adding a bot token for the DM bot must not
silently start broadcasting.

**Inbound** (people send the bot an address and get the verdict): set
`TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` to a long random string, then
register the webhook once:

```bash
curl -sX POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H 'content-type: application/json' \
  -d "{\"url\":\"https://<host>/api/telegram/webhook\",\"secret_token\":\"$TELEGRAM_WEBHOOK_SECRET\"}"
```

The endpoint refuses every request unless the secret is set *and* matches the
header Telegram echoes back. Unset means the bot is off, not open — it runs
analyses on demand, so an unauthenticated version of it would be a free
compute faucet. Each chat is rate limited on the same daily counter as an
anonymous web visitor.

## 4. Verify

```bash
curl -sH "authorization: Bearer $CRON_SECRET" \
  "https://<host>/api/diagnostics" | jq '{verdict, rows: .database.tables, outcomes}'
```

`outcomes` counts every checkpoint by status. It is the only place the health of
outcome tracking is visible at all — the tracker is background work nobody waits
on, so it can stop dead and the only symptom is a track record that stays empty,
which looks exactly like "not enough calls yet". Two verdict lines come from it,
and they have different fixes: **due and unpriced** means the worker is not
running (add a scheduler), **stale** means it runs but arrives after the
checkpoint stopped meaning what it says (schedule it more often).

**`verdict: []` means everything is healthy.** Otherwise each line names one
problem in plain language. The cases worth recognising:

| Verdict line | What it means |
|---|---|
| `database: reachable but NO tables exist` | Step 1 did not run |
| `database: N table(s) missing` | Step 1 ran partially — re-run it |
| `database: no table is readable — no response…` | Wrong URL, wrong key, or blocked egress |
| `<provider>: unreachable` | Egress or DNS from the deployment |
| `<provider>: answered HTTP 429` | Rate limited — add provider credentials |
| **`<provider>: reachable but EVERY field is null`** | **The upstream response shape changed.** The analysis would still return a decision, built on nothing. Compare a raw response against the mapper in `lib/providers/`. |

Then run one real analysis through the UI and confirm the row lands:

```bash
curl -sH "authorization: Bearer $CRON_SECRET" \
  "https://<host>/api/diagnostics" | jq '.database.tables[] | select(.table=="analyses")'
```

`rows: 1` means the full write path works — analysis, metrics, flags, the t0
price snapshot, and five pending outcome checkpoints.

## 5. After 24 hours

The first complete set of outcome checkpoints exists. From then on the model can
be measured rather than trusted:

```sql
select * from decision_performance order by checkpoint, score_bucket;
```

That view answers whether BUY actually outperformed WATCH, and at which score
ranges. `analysis_metrics` answers which individual signals carried the
difference. Both are inputs to re-fitting `lib/scoring/weights.ts` — bump
`SCORING_VERSION` when you do, so historical rows stay interpretable.

Keep the tuning and evaluation sets separate: `scripts/validate.ts` assigns each
address to `tune` or `holdout` by a stable hash, so a re-fit can only ever see
the tune split.
