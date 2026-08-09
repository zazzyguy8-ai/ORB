import { afterEach, describe, expect, it } from 'vitest';
import { setLlmProvider } from '@/lib/ai/anthropic';
import { runAnalysis } from '@/lib/pipeline/analyze';
import { setProviders } from '@/lib/providers/registry';
import type { CryptoDataProviders } from '@/lib/providers/types';
import { checkIpLimit, resetLimiter } from '@/lib/ratelimit/limiter';
import { formatPrice, getPlan, getPlans } from '@/lib/config/plans';
import { collected, marketData, missing, ok, securityData } from './helpers';

/** Provider set backed by fixtures, with an artificial delay to prove parallelism. */
function stubProviders(over: Partial<Record<keyof CryptoDataProviders, unknown>> = {}, delayMs = 0) {
  const data = collected();
  const delay = <T>(value: T) =>
    new Promise<T>((resolve) => setTimeout(() => resolve(value), delayMs));

  return {
    market: {
      name: 'stub-market',
      available: true,
      getMarketData: () => delay(data.market),
      ...(over.market ?? {}),
    },
    security: {
      name: 'stub-security',
      available: true,
      getSecurityData: () => delay(data.security),
      ...(over.security ?? {}),
    },
    holders: {
      name: 'stub-holders',
      available: true,
      getHolderData: () => delay(data.holders),
      ...(over.holders ?? {}),
    },
    wallets: {
      name: 'stub-wallets',
      available: true,
      getWalletData: () => delay(data.wallets),
      ...(over.wallets ?? {}),
    },
    social: {
      name: 'stub-social',
      available: false,
      getSocialData: () => delay(data.social),
      ...(over.social ?? {}),
    },
  } as unknown as CryptoDataProviders;
}

afterEach(() => {
  setProviders(null);
  setLlmProvider(null);
  resetLimiter();
});

describe('analysis pipeline', () => {
  it('returns a complete, decisive result', async () => {
    setProviders(stubProviders());
    setLlmProvider({ name: 'none', available: false, complete: async () => '' });

    const { result } = await runAnalysis('Fixture1111111111111111111111111111111111111');

    expect(['BUY', 'WATCH', 'AVOID']).toContain(result.decision);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.symbol).toBe('FIX');
    expect(result.explanation.reasons.length).toBeGreaterThan(0);
    expect(result.score.categories.length).toBeGreaterThan(0);
    expect(result.timings.totalMs).toBeGreaterThanOrEqual(0);
    expect(result.availability.social).toBe('unavailable');
  });

  it('collects providers in parallel, not in series', async () => {
    // Five providers at 80ms each: serial would be ~400ms, parallel ~80ms.
    setProviders(stubProviders({}, 80));
    setLlmProvider({ name: 'none', available: false, complete: async () => '' });

    const started = Date.now();
    const { result } = await runAnalysis('Fixture1111111111111111111111111111111111111');
    const elapsed = Date.now() - started;

    expect(elapsed).toBeLessThan(300);
    expect(result.timings.collectMs).toBeLessThan(300);
  });

  it('survives a provider that throws instead of returning a result', async () => {
    setProviders(
      stubProviders({
        holders: {
          getHolderData: async () => {
            throw new Error('boom');
          },
        },
      }),
    );
    setLlmProvider({ name: 'none', available: false, complete: async () => '' });

    // A provider that throws outright is a bug in that provider; the pipeline
    // still has to produce a labelled result rather than a 500.
    const { result } = await runAnalysis('Fixture1111111111111111111111111111111111111');
    expect(result.availability.holders).toBe('error');
    expect(result.decision).toBeTruthy();
    expect(result.metrics.top10Pct).toBeNull();
  });

  it('degrades to market-only data without inventing anything', async () => {
    setProviders(
      stubProviders({
        security: { getSecurityData: async () => missing() },
        holders: { getHolderData: async () => missing() },
        wallets: { getWalletData: async () => missing() },
      }),
    );
    setLlmProvider({ name: 'none', available: false, complete: async () => '' });

    const { result } = await runAnalysis('Fixture1111111111111111111111111111111111111');

    expect(result.metrics.top10Pct).toBeNull();
    expect(result.metrics.lpLockedOrBurnedPct).toBeNull();
    expect(result.unavailable).toContain('Holder distribution unavailable.');
    expect(result.score.coverage).toBeLessThan(0.7);
    // Thin coverage must not be dressed up as a BUY.
    expect(result.decision).not.toBe('BUY');
  });

  it('marks the analysis unusable when the market provider fails', async () => {
    setProviders(stubProviders({ market: { getMarketData: async () => missing() } }));
    setLlmProvider({ name: 'none', available: false, complete: async () => '' });

    const { result } = await runAnalysis('Fixture1111111111111111111111111111111111111');
    expect(result.availability.market).toBe('unavailable');
  });

  it('avoids a token with a live mint authority regardless of momentum', async () => {
    setProviders(
      stubProviders({
        market: {
          getMarketData: async () =>
            ok(marketData({ volumeUsd: { m5: 90_000, h1: 200_000, h6: 300_000, h24: 400_000 } })),
        },
        security: { getSecurityData: async () => ok(securityData({ mintAuthorityEnabled: true })) },
      }),
    );
    setLlmProvider({ name: 'none', available: false, complete: async () => '' });

    const { result } = await runAnalysis('Fixture1111111111111111111111111111111111111');
    expect(result.decision).toBe('AVOID');
    expect(result.riskFlags[0].code).toBe('MINT_AUTHORITY_ACTIVE');
  });

  it('returns the raw provider bundle for persistence', async () => {
    setProviders(stubProviders());
    setLlmProvider({ name: 'none', available: false, complete: async () => '' });

    const { collected: bundle } = await runAnalysis('Fixture1111111111111111111111111111111111111');
    expect(bundle.market.status).toBe('ok');
  });
});

describe('rate limiting', () => {
  it('allows up to the daily cap then blocks', () => {
    for (let i = 0; i < 3; i++) {
      expect(checkIpLimit('1.2.3.4', 3).allowed).toBe(true);
    }
    const blocked = checkIpLimit('1.2.3.4', 3);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toContain('Daily limit');
  });

  it('blocks a burst inside one minute', () => {
    for (let i = 0; i < 10; i++) checkIpLimit('5.6.7.8', 1000);
    const blocked = checkIpLimit('5.6.7.8', 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks IPs independently', () => {
    for (let i = 0; i < 3; i++) checkIpLimit('9.9.9.9', 3);
    expect(checkIpLimit('8.8.8.8', 3).allowed).toBe(true);
  });
});

describe('plans', () => {
  it('never hardcodes a price outside the plan config', () => {
    const plans = getPlans();
    expect(plans.free.priceCents).toBe(0);
    expect(plans.pro.priceCents).toBeGreaterThan(0);
    expect(formatPrice(plans.pro)).toMatch(/^€\d/);
    expect(formatPrice(plans.free)).toBe('Free');
  });

  it('falls back to the free plan for unknown ids', () => {
    expect(getPlan('nonsense').id).toBe('free');
    expect(getPlan(null).id).toBe('free');
  });
});
