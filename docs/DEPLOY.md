# Deployment runbook

Order matters: database → environment → deploy → verify. The verify step is not
optional — the data providers have never been exercised against their live APIs
(see [ARCHITECTURE.md](ARCHITECTURE.md) §11), so the first probe after deploy is
what turns "should work" into "does work".

---

## 1. Database

Supabase → **SQL Editor** → paste the whole of `supabase/migrations/0001_init.sql`
→ Run.

It creates eight tables, their indexes, RLS policies, the `decision_performance`
evaluation view, and a trigger that keeps `public.users` in step with
`auth.users`. It is idempotent (`if not exists` throughout), so re-running it is
safe if you are unsure whether it completed.

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

The portable answer is an external scheduler (cron-job.org and GitHub Actions
both do minute-level on a free tier) pointed at:

```
POST https://<host>/api/cron/snapshots
Authorization: Bearer <CRON_SECRET>
```

The endpoint is idempotent — it claims only checkpoints that are actually due,
so an extra invocation costs one cheap query and nothing else.

## 4. Verify

```bash
curl -sH "authorization: Bearer $CRON_SECRET" \
  "https://<host>/api/diagnostics" | jq '{verdict, rows: .database.tables}'
```

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
