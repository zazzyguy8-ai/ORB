import { describe, expect, it } from 'vitest';
import { deriveMetrics } from '@/lib/metrics/derive';
import { collected, marketData, missing, ok, NOW } from './helpers';

describe('deriveMetrics', () => {
  it('computes the ratios the model depends on', () => {
    const m = deriveMetrics(collected(), NOW);

    expect(m.tokenAgeMinutes).toBeCloseTo(360, 5);
    expect(m.liquidityTurnover1h).toBeCloseTo(24_000 / 62_000, 6);
    expect(m.liquidityToMcapRatio).toBeCloseTo(62_000 / 415_000, 6);
    expect(m.buySellRatio1h).toBeCloseTo(320 / 198, 6);
    expect(m.txCount1h).toBe(518);
    expect(m.avgTradeSizeUsd1h).toBeCloseTo(24_000 / 518, 6);
    // 4800 * 12 / 24000 = 2.4x the hourly pace
    expect(m.volumeAcceleration).toBeCloseTo(2.4, 6);
    expect(m.volumeTrend6h).toBeCloseTo(1.5, 6);
    expect(m.largeWalletFlowRatio).toBeCloseTo(4_000 / 24_000, 6);
  });

  it('propagates missing data as null instead of zero', () => {
    const m = deriveMetrics(
      collected({ holders: missing(), security: missing(), wallets: missing() }),
      NOW,
    );

    expect(m.top10Pct).toBeNull();
    expect(m.holderCount).toBeNull();
    expect(m.creatorBalancePct).toBeNull();
    expect(m.lpLockedOrBurnedPct).toBeNull();
    expect(m.largeWalletNetFlowUsd).toBeNull();
    expect(m.largeWalletFlowRatio).toBeNull();
    // Market-derived values survive.
    expect(m.liquidityTurnover1h).not.toBeNull();
  });

  it('never divides by zero', () => {
    const m = deriveMetrics(
      collected({
        market: ok(
          marketData({
            liquidityUsd: 0,
            marketCapUsd: 0,
            fdvUsd: null,
            volumeUsd: { m5: 0, h1: 0, h6: 0, h24: 0 },
            txns: {
              m5: { buys: 0, sells: 0 },
              h1: { buys: 0, sells: 0 },
              h6: { buys: 0, sells: 0 },
              h24: { buys: 0, sells: 0 },
            },
          }),
        ),
      }),
      NOW,
    );

    expect(m.liquidityTurnover1h).toBeNull();
    expect(m.liquidityToMcapRatio).toBeNull();
    expect(m.volumeAcceleration).toBeNull();
    expect(m.avgTradeSizeUsd1h).toBeNull();
    // 0 buys / max(1, 0 sells) is a real answer, not a division error.
    expect(m.buySellRatio1h).toBe(0);
  });

  it('is deterministic for a fixed clock', () => {
    const a = deriveMetrics(collected(), NOW);
    const b = deriveMetrics(collected(), NOW);
    expect(a).toEqual(b);
  });

  it('returns an all-null shape when every provider failed', () => {
    const m = deriveMetrics(
      { market: missing(), security: missing(), holders: missing(), wallets: missing(), social: missing() },
      NOW,
    );
    expect(Object.values(m).every((v) => v === null)).toBe(true);
  });
});
