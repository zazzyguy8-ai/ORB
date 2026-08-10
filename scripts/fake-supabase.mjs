import { createServer } from 'node:http';

/**
 * A stand-in for PostgREST, for reviewing server-rendered pages offline.
 *
 * /track-record and /a/[id] read from the database on the server, so they
 * cannot be reviewed the way the client-rendered screens can (by stubbing the
 * API response in the browser). This serves the handful of shapes they read,
 * which is enough to render both pages fully populated:
 *
 *   node scripts/fake-supabase.mjs &
 *   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 \
 *     SUPABASE_SERVICE_ROLE_KEY=fake npm run build && npm start
 *
 * The URL must be set for the build, not just the run: Next inlines
 * NEXT_PUBLIC_* at build time, so a runtime override is silently ignored.
 *
 * It implements no filtering beyond id=eq., and every number in it is made up.
 * Development only — never point a deployment at this.
 */
const now = Date.now();
const iso = (msAgo) => new Date(now - msAgo).toISOString();

const CHECKPOINTS = ['m5', 'm15', 'h1', 'h6', 'h24'];

function outcomesFor(seed, resolved) {
  return CHECKPOINTS.map((checkpoint, i) => ({
    checkpoint,
    status: i < resolved ? 'recorded' : 'pending',
    return_pct: i < resolved ? Number((Math.sin(seed + i) * 22).toFixed(2)) : null,
    price_usd: i < resolved ? 0.0000415 * (1 + Math.sin(seed + i) / 5) : null,
    recorded_at: i < resolved ? iso(3600_000 * (5 - i)) : null,
  }));
}

const SYMBOLS = ['BONK', 'WIF', 'POPCAT', 'MEW', 'GOAT', 'FIX'];
const DECISIONS = ['BUY', 'WATCH', 'AVOID', 'BUY', 'WATCH', 'AVOID'];

const analyses = SYMBOLS.map((symbol, i) => ({
  id: `0000000${i}-0000-4000-8000-00000000000${i}`,
  address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  decision: DECISIONS[i],
  confidence: 58 + i * 3,
  score: 41 + i * 7,
  coverage: 0.9,
  reasons: [
    'LP is fully locked or burned, so the pool cannot simply be pulled.',
    'Top 10 holders control 9.0% of supply.',
  ],
  risk_notes: ['Name, symbol and image can still be changed by the update authority.'],
  created_at: iso(3600_000 * (i + 1)),
  price_usd: 0.0000415,
  market_cap_usd: 415_000,
  liquidity_usd: 62_000,
  tokens: { symbol, name: `${symbol} Coin` },
  risk_flags: [
    {
      code: 'metadata_mutable',
      severity: 'low',
      title: 'Token metadata is mutable',
      detail: 'Name, symbol and image can still be changed by the update authority.',
      veto: false,
    },
  ],
  analysis_outcomes: outcomesFor(i, 5 - (i % 3)),
}));

// Enough recorded outcomes to clear the publication threshold on the scoreboard.
const outcomeRows = [];
for (let i = 0; i < 140; i++) {
  outcomeRows.push({
    checkpoint: CHECKPOINTS[i % 5],
    return_pct: Number((Math.sin(i) * 30 + (i % 3 === 0 ? 6 : -4)).toFixed(2)),
    status: 'recorded',
    analyses: { decision: DECISIONS[i % 6] },
  });
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const single = (req.headers.accept ?? '').includes('vnd.pgrst.object');
  console.log(req.method, req.url, '| accept:', req.headers.accept);
  let body;

  if (url.pathname.endsWith('/analyses')) {
    const idFilter = url.searchParams.get('id');
    const rows = idFilter?.startsWith('eq.')
      ? analyses.filter((a) => a.id === idFilter.slice(3))
      : analyses;
    body = single ? (rows[0] ?? null) : rows;
  } else if (url.pathname.endsWith('/analysis_outcomes')) {
    body = outcomeRows;
  } else {
    body = [];
  }

  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}).listen(54321, () => console.log('fake supabase on :54321'));
