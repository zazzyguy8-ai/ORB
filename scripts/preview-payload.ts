import { writeFileSync } from 'node:fs';
import dexscreener from '../tests/fixtures/dexscreener.json';
import goplus from '../tests/fixtures/goplus.json';
import { setLlmProvider } from '@/lib/ai/anthropic';
import { buildDelta } from '@/lib/decision/delta';
import { runAnalysis } from '@/lib/pipeline/analyze';
import { setProviders } from '@/lib/providers/registry';

/**
 * Produces a realistic /api/analyze payload without touching the network.
 *
 * The result UI is the most-looked-at surface in the product and it only exists
 * after a successful analysis, which needs three third-party hosts. That makes
 * it exactly the screen that never gets reviewed from an environment with no
 * egress. This runs the real pipeline against the test fixtures and writes the
 * payload, so a browser can be pointed at the real components with the response
 * stubbed:
 *
 *   npx tsx scripts/preview-payload.ts > /dev/null   # writes preview.json
 *
 * It is a development tool. Nothing in the app imports it, and the numbers it
 * produces are fixture numbers — never publish them as results.
 */

const MINT = 'Fixture1111111111111111111111111111111111111';
const ADDRESS = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const TOTAL_SUPPLY = 1_000_000_000_000_000;

function fixtures() {
  const ds = JSON.parse(JSON.stringify(dexscreener));
  for (const pair of ds.pairs) {
    if (pair.baseToken?.address === MINT) pair.baseToken.address = ADDRESS;
  }
  const gp = JSON.parse(JSON.stringify(goplus));
  gp.result[ADDRESS] = gp.result[MINT];
  delete gp.result[MINT];
  return { ds, gp };
}

function rpc(body: any[]) {
  const owners: Record<string, string> = {
    PoolVault: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
    AcctA: 'OwnerA',
    AcctB: 'OwnerB',
    AcctC: 'OwnerC',
  };

  return body.map((call, id) => {
    if (call.method === 'getTokenSupply') {
      return { id, result: { value: { amount: String(TOTAL_SUPPLY), decimals: 6 } } };
    }
    if (call.method === 'getTokenLargestAccounts') {
      return {
        id,
        result: {
          value: [
            { address: 'PoolVault', amount: String(TOTAL_SUPPLY * 0.4), decimals: 6 },
            { address: 'AcctA', amount: String(TOTAL_SUPPLY * 0.04), decimals: 6 },
            { address: 'AcctB', amount: String(TOTAL_SUPPLY * 0.03), decimals: 6 },
            { address: 'AcctC', amount: String(TOTAL_SUPPLY * 0.02), decimals: 6 },
          ],
        },
      };
    }
    if (call.method === 'getMultipleAccounts') {
      return {
        id,
        result: {
          value: (call.params[0] as string[]).map((account) => ({
            data: { parsed: { info: { owner: owners[account] ?? 'Unknown' } } },
          })),
        },
      };
    }
    return { id, result: null };
  });
}

async function main() {
  const { ds, gp } = fixtures();

  globalThis.fetch = (async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('dexscreener')) return new Response(JSON.stringify(ds), { status: 200 });
    if (url.includes('gopluslabs')) return new Response(JSON.stringify(gp), { status: 200 });
    if (url.includes('rpc') || url.includes('solana')) {
      return new Response(JSON.stringify(rpc(JSON.parse(init.body))), { status: 200 });
    }
    return new Response('not stubbed', { status: 502 });
  }) as typeof fetch;

  setProviders(null);
  setLlmProvider({ name: 'none', available: false, complete: async () => '' });

  const { result } = await runAnalysis(ADDRESS);

  // Synthetic history so the panels that need more than one analysis render.
  const now = Date.now();
  const history = [0.32, 0.28, 0.21, 0.14, 0.05].map((agoDays, index) => ({
    at: new Date(now - agoDays * 86_400_000).toISOString(),
    score: Number((result.score.total + [-11, -6, 4, -2, -5][index]).toFixed(1)),
    decision: index % 3 === 0 ? 'AVOID' : ('WATCH' as const),
  }));

  const payload = {
    ...result,
    id: '00000000-0000-4000-8000-000000000000',
    persisted: true,
    shareable: true,
    history,
    delta: buildDelta(
      {
        id: 'prev',
        decision: 'WATCH',
        score: result.score.total - 5,
        confidence: result.confidence - 4,
        createdAt: new Date(now - 3 * 3_600_000).toISOString(),
        priceUsd: (result.market?.priceUsd ?? 1) * 0.86,
        liquidityUsd: (result.market?.liquidityUsd ?? 1) * 1.12,
      },
      {
        decision: result.decision,
        score: result.score.total,
        priceUsd: result.market?.priceUsd ?? null,
        liquidityUsd: result.market?.liquidityUsd ?? null,
      },
      now,
    ),
  };

  writeFileSync('preview.json', JSON.stringify(payload, null, 2));
  console.error(`preview.json written — ${payload.decision} ${payload.score.total.toFixed(1)}`);
}

void main();
