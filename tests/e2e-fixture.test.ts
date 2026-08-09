import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import dexscreenerFixture from './fixtures/dexscreener.json';
import goplusFixture from './fixtures/goplus.json';
import { setLlmProvider } from '@/lib/ai/anthropic';
import { cacheClear } from '@/lib/cache/memory';
import { runAnalysis } from '@/lib/pipeline/analyze';
import { setProviders } from '@/lib/providers/registry';

/**
 * Full pipeline through the REAL providers, with only the network faked.
 *
 * This is the closest thing to an integration test available offline, and it is
 * the test that would catch a field-name mistake in the DexScreener or GoPlus
 * mapping — the exact class of bug that cannot be verified from a build
 * environment whose egress policy blocks those hosts.
 */
const MINT = 'Fixture1111111111111111111111111111111111111';
const REAL_ADDRESS = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';

/** Retargets the fixtures at whichever mint the test asks for. */
function fixturesFor(address: string) {
  const ds = JSON.parse(JSON.stringify(dexscreenerFixture));
  for (const pair of ds.pairs) {
    if (pair.baseToken?.address === MINT) pair.baseToken.address = address;
  }
  const gp = JSON.parse(JSON.stringify(goplusFixture));
  gp.result[address] = gp.result[MINT];
  delete gp.result[MINT];
  return { ds, gp };
}

const TOTAL_SUPPLY = 1_000_000_000_000_000; // raw units

function rpcBatchResponse(body: any[]) {
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
      const owners: Record<string, string> = {
        // Raydium authority — must be excluded from holder concentration.
        PoolVault: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
        AcctA: 'OwnerA',
        AcctB: 'OwnerB',
        AcctC: 'OwnerC',
      };
      return {
        id,
        result: {
          value: (call.params[0] as string[]).map((account) => ({
            data: { parsed: { info: { owner: owners[account] } } },
          })),
        },
      };
    }
    return { id, result: null };
  });
}

function installFetchMock(address: string, opts: { goplusFails?: boolean } = {}) {
  const { ds, gp } = fixturesFor(address);

  const mock = vi.fn(async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input.url;

    if (url.includes('api.dexscreener.com')) {
      return new Response(JSON.stringify(ds), { status: 200 });
    }
    if (url.includes('gopluslabs.io')) {
      if (opts.goplusFails) return new Response('rate limited', { status: 429 });
      return new Response(JSON.stringify(gp), { status: 200 });
    }
    if (url.includes('api.mainnet-beta.solana.com') || url.includes('rpc')) {
      const body = JSON.parse(init.body);
      return new Response(JSON.stringify(rpcBatchResponse(body)), { status: 200 });
    }
    throw new Error(`Unexpected request to ${url}`);
  });

  vi.stubGlobal('fetch', mock);
  return mock;
}

beforeEach(() => {
  setProviders(null);
  cacheClear();
  setLlmProvider({ name: 'none', available: false, complete: async () => '' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  setLlmProvider(null);
  cacheClear();
});

describe('end-to-end through the real providers', () => {
  it('turns an address into a decision with evidence', async () => {
    installFetchMock(REAL_ADDRESS);

    const { result } = await runAnalysis(REAL_ADDRESS);

    expect(result.availability.market).toBe('ok');
    expect(result.availability.security).toBe('ok');
    expect(result.availability.holders).toBe('ok');
    expect(result.symbol).toBe('FIX');
    expect(result.market?.liquidityUsd).toBe(62_000);

    // Holder concentration must exclude the 40% Raydium vault.
    expect(result.metrics.largestHolderPct).toBeCloseTo(0.04, 4);
    expect(result.metrics.top10Pct).toBeCloseTo(0.09, 4);
    // Holder count came from GoPlus, concentration from chain — the composite worked.
    expect(result.metrics.holderCount).toBe(1840);
    expect(result.metrics.lpLockedOrBurnedPct).toBeCloseTo(0.97, 4);

    expect(['BUY', 'WATCH', 'AVOID']).toContain(result.decision);
    expect(result.explanation.reasons.length).toBeGreaterThan(0);
    expect(result.score.coverage).toBeGreaterThan(0.6);
  });

  it('degrades cleanly when a provider rate-limits us', async () => {
    installFetchMock(REAL_ADDRESS, { goplusFails: true });

    const { result } = await runAnalysis(REAL_ADDRESS);

    expect(result.availability.security).toBe('error');
    expect(result.metrics.lpLockedOrBurnedPct).toBeNull();
    expect(result.unavailable).toContain('Security and developer analysis unavailable.');
    // Chain-derived holder data survives the GoPlus outage.
    expect(result.metrics.largestHolderPct).not.toBeNull();
    expect(result.metrics.holderCount).toBeNull();
    expect(result.decision).toBeTruthy();
  });

  it('issues one request per upstream, not one per consumer', async () => {
    const mock = installFetchMock(REAL_ADDRESS);
    await runAnalysis(REAL_ADDRESS);

    const goplusCalls = mock.mock.calls.filter(([url]) =>
      String(url).includes('gopluslabs.io'),
    );
    // Security and holders both need GoPlus; the shared cache collapses them.
    expect(goplusCalls).toHaveLength(1);
  });

  it('serves a repeated analysis from cache', async () => {
    const mock = installFetchMock(REAL_ADDRESS);

    await runAnalysis(REAL_ADDRESS);
    const afterFirst = mock.mock.calls.length;
    await runAnalysis(REAL_ADDRESS);

    expect(mock.mock.calls.length).toBe(afterFirst);
  });
});
