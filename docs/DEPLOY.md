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

Set these on the host (Vercel → Project → Settings → Environment Variables).

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

Connect the repository and deploy the branch. `vercel.json` registers the cron
entry; nothing else is needed at build time.

> ⚠️ **Check your plan's cron frequency before trusting outcome tracking.**
> `vercel.json` asks for `* * * * *` (every minute) because the first checkpoint
> is at +5 minutes. Lower-tier plans restrict scheduled jobs to a much coarser
> interval — often once per day — which would silently make the +5m, +15m and
> +1h checkpoints useless while the +6h and +24h ones still land late. If your
> plan restricts it, point an external scheduler at the endpoint instead:
>
> ```
> POST https://<host>/api/cron/snapshots
> Authorization: Bearer <CRON_SECRET>
> ```
>
> Any minute-level scheduler works. The endpoint is idempotent — it claims only
> checkpoints that are actually due, so an extra invocation costs one cheap
> query and nothing else.

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
