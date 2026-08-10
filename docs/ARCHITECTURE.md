# ORB Signal — Architecture & Implementation Plan

Pre-code design output required by spec §28. Everything below is the decision that was
actually implemented; deviations from the spec are called out explicitly with reasons.

---

## 0. Decisions made without asking (spec §28: "make it and document the decision")

| Decision | Choice | Reason |
|---|---|---|
| Chain | **Solana only** | Best free memecoin data density (DexScreener + GoPlus + public RPC all cover Solana with no key). Spec §24: "Start with ONE chain if that gives us significantly better data quality and speed." |
| App shape | **Single Next.js 14 app (App Router), API routes as backend** | No cross-service network hop in the hot path. A separate Node service would add latency and deployment surface for zero benefit at MVP size. |
| Existing repo content | **Replaced** | The branch `claude/memecoin-copilot-mvp-7cz9ep` is dedicated to this product. The previous "DIRE ORB" app remains reachable in git history (commit `e3f2272`) and on branch `claude/fervent-cori-HfuJh`. Nothing was lost. |
| "Smart money" | **Not shipped as a claim** | Spec §6 forbids calling every large wallet smart money. We ship *measurable large-wallet flow* (USD-thresholded net flow from parsed swaps) and label it exactly that. The smart-money interface exists; the scoring layer marks the category `unavailable` until a provider can supply verified historical wallet performance. |
| Social data | **Interface only, marked unavailable** | Spec §9 — do not fake social data. |
| AI's job | **Selects and phrases from a backend-generated evidence list; never computes and never free-writes numbers** | Spec §4/§10. Output is validated against the evidence set before it reaches the user; a deterministic fallback renders if the LLM is absent or non-compliant. |
| Persistence | **Optional** | Without Supabase credentials the analyzer still runs end-to-end and reports `persistence: "disabled"` rather than 500ing. |

---

## 1. Exact architecture

```
Browser (Next.js RSC + client island)
   │  POST /api/analyze { address }   (Authorization: Bearer <supabase jwt> | anonymous)
   ▼
Route handler  (node runtime)
   ├─ validate address (base58, 32–44 chars, decodes to 32 bytes)
   ├─ rate limit   (in-memory IP sliding window  +  DB daily quota per user/plan)
   ├─ cache lookup (per-provider TTL cache, in-process)
   │
   ├─ PARALLEL  Promise.allSettled, per-provider deadline
   │     ├── MarketDataProvider    → DexScreener
   │     ├── SecurityDataProvider  → GoPlus
   │     ├── HolderDataProvider    → Solana RPC (top-20) ⊕ GoPlus holder count
   │     ├── WalletDataProvider    → Helius (optional key) | Null
   │     └── SocialDataProvider    → Null (unavailable)
   │
   ├─ deriveMetrics()   pure, deterministic  (no I/O, no AI)
   ├─ scoreToken()      7 weighted categories, coverage-aware renormalisation
   ├─ evaluateRisk()    rule engine → typed flags with severity + evidence
   ├─ classify()        AVOID vetoes → score bands → BUY / WATCH / AVOID
   │
   ├─ explain()         LLM picks 2–3 reasons from the evidence list  (soft-deadline,
   │                    deterministic fallback on timeout/absence/violation)
   │
   └─ persist()  fire-and-forget: analyses, analysis_metrics, risk_flags,
                 wallet_events, price_snapshots(t0), analysis_outcomes(pending)
   ▼
{ decision, confidence, reasons[], riskFlags[], score, metrics, timings }
```

Only **one** LLM call and **one** round of network fan-out sit in the request path.
Persistence never blocks the response.

## 2. External APIs / providers required

| Provider | Key needed | Base URL | Documented limit | Status in this build |
|---|---|---|---|---|
| **DexScreener** | No | `api.dexscreener.com` | ~300 req/min (token/pair endpoints) | Implemented, primary market source |
| **GoPlus Security** | No (higher limits with App key) | `api.gopluslabs.io/api/v1/solana/token_security` | ~30 req/min unauthenticated | Implemented |
| **Solana JSON-RPC** | No for public node; `SOLANA_RPC_URL` recommended | configurable | Public node is heavily throttled — a paid RPC is strongly recommended | Implemented |
| **Helius** | `HELIUS_API_KEY` | `api.helius.xyz` / `mainnet.helius-rpc.com` | Plan-dependent (10 rps free) | Implemented, **disabled without key** |
| **Birdeye** | `BIRDEYE_API_KEY` | `public-api.birdeye.so` | Plan-dependent | Interface slot reserved, not implemented |
| **Anthropic** | `ANTHROPIC_API_KEY` | SDK default | Account-dependent | Implemented, **falls back deterministically without key** |
| **Supabase** | URL + anon + service-role | project URL | — | Implemented, optional |
| Social (X / Telegram) | — | — | — | **Not implemented.** Interface only, reports `unavailable`. |

## 3. What each provider supplies

- **DexScreener** → pair discovery, price USD, FDV/market cap, liquidity USD, volume m5/h1/h6/h24, txn counts and buys/sells per window, price change per window, `pairCreatedAt` (⇒ token age), dex/labels, base token name + symbol.
- **GoPlus** → mint authority, freeze authority, transfer-fee/hook, metadata mutability, top-10 holder percentages, LP holder distribution and locked/burned share, creator address + creator balance percent, holder count when present.
- **Solana RPC** → `getTokenSupply`, `getTokenLargestAccounts` (top 20 raw balances ⇒ top-10/top-20 concentration, largest holder share), `getAccountInfo` for mint authority cross-check.
- **Helius (optional)** → parsed swap history for the mint ⇒ large-wallet buy/sell events, unique buyer/seller counts, net USD flow, entry timing.
- **Anthropic** → *phrasing only*.

## 4. Expected latency bottlenecks

| Stage | Budget | Notes |
|---|---|---|
| DexScreener | 2500 ms deadline | Usually 150–400 ms. Cached 15 s. |
| GoPlus | 2500 ms deadline | Slowest of the free set (can exceed 1 s cold). Cached 300 s — it is near-static. |
| Solana RPC `getTokenLargestAccounts` | 2500 ms deadline | Public endpoint is the #1 risk; 429s are common. Cached 60 s. |
| Helius | 2500 ms deadline | Optional. |
| Derive + score + risk | < 5 ms | Pure CPU. |
| **LLM explanation** | **5000 ms soft deadline** | The dominant cost, and measured, not guessed: `claude-opus-5` and `claude-sonnet-5` both land at ~3.5 s on this prompt at `effort: low`, `claude-haiku-4-5` at ~2 s. The deadline sits above that with headroom; a deterministic fallback renders instantly if it is missed. |
| Persistence | 0 ms in path | Fire-and-forget after the response is built. |

Expected p50 with warm providers: **~4–5 s** — roughly 1 s of parallel data collection plus the ~3.5 s LLM call. Worst case is bounded at ~7.5 s by the deadlines; the pipeline never waits indefinitely on any provider. Setting `ANTHROPIC_MODEL=claude-haiku-4-5` takes p50 to roughly 3 s at some cost in phrasing quality.

## 5. Database schema

`supabase/migrations/0001_init.sql` — 8 tables per spec §18:
`users`, `tokens`, `analyses`, `analysis_metrics`, `risk_flags`, `wallet_events`, `price_snapshots`, `analysis_outcomes`.

Indexes: `tokens(chain, address)` unique; `analyses(token_id, created_at desc)`, `analyses(user_id, created_at desc)`, `analyses(created_at desc)`, `analyses(decision, score)`; `analysis_metrics(analysis_id)` + `(metric_key)`; `risk_flags(analysis_id)` + `(code)`; `wallet_events(analysis_id)`, `(token_id, occurred_at desc)`; `price_snapshots(token_id, captured_at desc)`, `(analysis_id, checkpoint)` unique; `analysis_outcomes(due_at)` partial index where `status='pending'` (the cron hot path), `(analysis_id, checkpoint)` unique.

`supabase/migrations/0002_outcome_staleness.sql` adds the `stale` outcome status and `analysis_outcomes.late_by_seconds`. See §12.

Metrics are stored **both** as a JSONB blob on `analyses` (fast read-back for history) **and** as a long, narrow `analysis_metrics` table (one row per metric) so signal-level performance can be queried later without schema churn (spec §14).

## 6. API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/analyze` | POST | The product. Body `{ address, chain? }`. Rate-limited. |
| `/api/history` | GET | Recent analyses (own, if authenticated; otherwise recent public). |
| `/api/analysis/[id]` | GET | Single stored analysis + outcomes. |
| `/api/cron/snapshots` | POST/GET | Records due price checkpoints. Protected by `CRON_SECRET`. |
| `/api/health` | GET | Provider availability + config diagnostics. No secrets echoed. |
| `/api/diagnostics` | GET | **Live** provider probe: host reachability + per-field parse coverage + schema, migration and outcome-tracking health, with a plain-language verdict. Protected by `CRON_SECRET`. Run this first after any deploy. |

Pages: `/` (landing), `/app` (the product), `/history`, `/track-record` (public scoreboard), `/a/[id]` (permalink for one stored call, with its own OG image), `/login`.

## 7. Scoring architecture

Seven categories (spec §10), each returning `{ score: 0..100, coverage: 0..1, contributions[] }`:
`momentum`, `liquidity`, `holders`, `wallets`, `developer`, `trading`, `security`.

- Every sub-signal is a **named, unit-documented function of one derived metric**, defined in `lib/scoring/weights.ts` — a single file holding all weights and all breakpoints, so the whole model can be re-fit from historical outcomes without touching logic (spec §10: "weights can later be adjusted from historical data").
- **Coverage-aware renormalisation**: a category with no data contributes nothing *and* removes its weight from the denominator, instead of silently scoring 0. Total coverage is reported to the user and caps confidence.
- Weights are versioned (`SCORING_VERSION`), and the version is stored on every analysis so historical rows stay interpretable after a re-fit.

## 8. AI prompt architecture

Three-part, all server-side (`lib/ai/`):

1. **System prompt** — role, the hard bans from spec §5 ("guaranteed", "100x", "risk-free"), the no-invention rule (§4), and the output contract (strict JSON).
2. **Evidence payload** — a machine-built list of `EvidenceItem { id, text, polarity, magnitude }` produced deterministically from the metrics. The model may only cite `id`s **from this list**.
3. **Validation** — the response is parsed as JSON, every cited `id` must exist, banned phrases are rejected, length is capped. Any violation ⇒ deterministic fallback (top-ranked evidence rendered verbatim). The model therefore *cannot* introduce a number that the backend did not compute.

Request shape: no sampling parameters (rejected on current models), `effort: low` (the task is selection, not reasoning), and thinking left at its default — `max_tokens` is sized for thinking plus text together. Models that reject `effort` are detected from the first 400 and retried without it, so a smaller model degrades to slightly slower rather than silently never explaining.

The decision, confidence and flags are **not** produced by the model — they arrive pre-computed and the model is told so.

## 9. Environment variables

See `.env.example`. Required for full function: `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SOLANA_RPC_URL`, `CRON_SECRET`. Optional: `HELIUS_API_KEY`, `GOPLUS_APP_KEY`/`GOPLUS_APP_SECRET`, `TELEGRAM_BOT_TOKEN`, plan/pricing overrides. No key is ever read from client components — `lib/config/env.ts` is `import 'server-only'`.

## 10. Completable without external credentials

Everything except live data and live phrasing: address validation, the entire provider abstraction, derived metrics, the scoring model, the risk engine, the classifier, the evidence builder, the AI prompt + response validator, the deterministic fallback explainer, the full UI, the SQL schema, rate limiting, plan configuration, outcome-tracking scheduling logic, and the test suite (fixture-driven, offline).

## 11. Must wait for credentials / network

- Live DexScreener / GoPlus / RPC responses — **this build environment's egress policy blocks those hosts** (`403` on CONNECT to `api.dexscreener.com` and `api.gopluslabs.io`), so providers are implemented against documented response contracts and covered by fixture tests, but have **not** been exercised against the live APIs from here. First run in an unrestricted environment is required to confirm field-level parsing.
- Anthropic phrasing quality (fallback path is exercised offline).
- Supabase migration application and RLS behaviour.
- Smart-money classification — blocked on a provider that can supply verified historical wallet PnL.
- Spec §26 historical validation — needs live data collection over time; the schema and the `analysis_outcomes` pipeline exist to produce it.

## 12. Added after the first deploy

Everything above describes the MVP as specified. These were added once it was
running, and each is here because it changes how the product can be trusted
rather than what it can do.

**Outcome staleness.** A checkpoint priced long after it came due is a
different measurement wearing the wrong label. `lib/outcomes/tracker.ts` drops
those as `stale` (a status distinct from `failed`, which means "no price was
available") using a per-horizon tolerance, and stale rows never reach the
scoreboard. Without this, a worker that falls behind quietly converts an outage
into a performance claim.

**Opportunistic tracking.** The host has no minute-level scheduler on its free
tier, so every analysis request also nudges the tracker (`lib/outcomes/kick.ts`,
throttled to once a minute per instance, never awaited). Traffic becomes the
clock. It does not replace a scheduler — quiet periods still produce stale
checkpoints — and `/api/diagnostics` reports the difference between "due and
unpriced" (nothing is running) and "stale" (it runs too late).

**The public scoreboard** (`/track-record`, `lib/outcomes/scoreboard.ts`). Three
rules are enforced in code: a cell is published only at 20+ outcomes, WATCH
never receives a hit rate because it claims no direction, and the median leads
rather than the average. Individual resolved calls are listed without the
sample-size gate — one call is a receipt, not a statistic.

**Permalinks** (`/a/[id]`). Serves the stored row rather than re-running the
analysis, so a shared link shows what was actually said. Only ownerless rows are
readable there; the lookup distinguishes `missing` from `error` because the page
caches its render, and caching a database hiccup as a 404 would break valid
links for everyone.

**Score levers** (`lib/scoring/levers.ts`). Re-runs the weighting with each
signal at its best and reports what the difference would be, so the score can be
acted on rather than only read. Recomputed rather than derived arithmetically —
renormalisation makes a signal's effective weight depend on which siblings had
data. Signals with no data are never listed: they are renormalised out, not
dragging the score down.

**Offline review tooling.** `scripts/preview-payload.ts` runs the real pipeline
over the fixtures and writes an `/api/analyze` payload, so the result screen can
be rendered in a browser with the response stubbed. `scripts/fake-supabase.mjs`
stands in for PostgREST so the server-rendered pages can be reviewed too. Both
exist because this environment cannot reach the hosts those screens depend on,
and both have already caught defects that the test suite could not see —
stretched chart markers, and the cached-404 above.
