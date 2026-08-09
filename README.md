# ORB Signal

Paste a Solana memecoin contract address, get **BUY / WATCH / AVOID** with the evidence behind it — in seconds instead of five browser tabs.

Read-only by design: no wallet connection, no transactions, no seed phrases, ever.

---

## How it works

```
address → parallel data collection → deterministic metrics → scoring → risk rules
        → classification → AI phrasing (evidence-constrained) → result
```

The decision is **computed, not generated**. A deterministic scoring model produces the score, the risk flags and the BUY/WATCH/AVOID label; the LLM only picks two or three facts from a closed list and phrases them. Its output is validated against that list — including every numeral — before anyone sees it, and any violation falls back to text rendered straight from the evidence.

Full design rationale, provider contracts, latency budgets and open decisions: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Quick start

```bash
npm install
cp .env.example .env.local     # every key is optional; see below
npm run dev                    # http://localhost:3000
```

The app degrades honestly rather than failing:

| Missing | Effect |
|---|---|
| Nothing | Full experience |
| `ANTHROPIC_API_KEY` | Explanations render deterministically from the evidence list |
| Supabase vars | No history, no outcome tracking, no accounts — analysis still works |
| `HELIUS_API_KEY` | Wallet category reports *unavailable*; its weight is redistributed |
| `SOLANA_RPC_URL` | Falls back to the throttled public node (holder data may be missing) |

Nothing is ever substituted with fake data. A category we could not check is displayed as *not checked*, never as clean.

### Database

```bash
# Supabase SQL editor, or: supabase db push
psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
```

### First deploy — run the provider probe

The data providers are implemented against documented response contracts but
were never exercised against the live APIs during development (see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §11). Before trusting a single
analysis, check them:

```bash
curl -H "authorization: Bearer $CRON_SECRET" \
     "https://<your-host>/api/diagnostics" | jq .verdict
```

An empty `verdict` array means every provider is reachable and parsing cleanly.
Otherwise each line names the problem in words — an unreachable host, a rate
limit, or the one that matters most: a provider that answers fine but parses to
all-nulls, which is what a renamed upstream field looks like. The full response
also reports per-field coverage, so you can see exactly which fields arrived.

Add `?address=<mint>` to probe a specific token instead of the default.

### Outcome tracking

`vercel.json` schedules `/api/cron/snapshots` every minute. It records the price at +5m, +15m, +1h, +6h and +24h after each analysis, so the model can be measured rather than trusted. Set `CRON_SECRET`; the endpoint refuses to run without it.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm test` | Full suite (102 tests, no network required) |
| `npm run typecheck` | `tsc --noEmit` |
| `npx tsx scripts/validate.ts tokens.txt` | Run the pipeline over real tokens and report latency, coverage and label consistency (needs network) |

## Layout

```
app/                 pages + API routes
  api/analyze        the product endpoint
  api/cron/snapshots outcome-tracking worker
lib/
  providers/         swappable data layer (market · security · holders · wallets · social)
  metrics/derive.ts  every derived number, pure and deterministic
  scoring/weights.ts THE MODEL — all weights and breakpoints live here
  risk/rules.ts      risk rules, including the vetoes that force AVOID
  decision/          BUY / WATCH / AVOID + confidence
  ai/                evidence builder, prompt, output validator, fallback
  pipeline/          orchestration
supabase/migrations  schema
tests/               fixture-driven, offline
```

Want to change the model? Edit `lib/scoring/weights.ts` and bump `SCORING_VERSION`. Every stored analysis records the version it was scored under, so history stays interpretable across re-fits.

Want to swap a data provider? Implement the interface in `lib/providers/types.ts` and register it in `lib/providers/registry.ts`. Nothing else changes.

## Scope

Solana only. One chain buys materially better free data than trying to cover several.

Not built, deliberately: automated trading, copy trading, portfolio management, charts, multi-chain, launchpad, NFTs. Social signals and smart-money classification have interfaces but no implementation, because faking either would be worse than omitting them.

## Disclaimer

Research and decision support only. Not financial advice, not a price prediction, and not a claim about future performance. A BUY classification means the available signals scored well against this model right now. Memecoin trading is extremely risky and routinely goes to zero.
