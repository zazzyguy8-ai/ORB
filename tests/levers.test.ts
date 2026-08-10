import { describe, expect, it } from 'vitest';
import { bandGap, findLevers } from '@/lib/scoring/levers';
import { scoreToken } from '@/lib/scoring/score';
import type { DerivedMetrics } from '@/lib/types/domain';

/** A metrics object with everything absent; cases fill in only what they test. */
function metrics(over: Partial<DerivedMetrics> = {}): DerivedMetrics {
  const base = Object.fromEntries(
    (
      [
        'tokenAgeMinutes',
        'liquidityUsd',
        'marketCapUsd',
        'volume1hUsd',
        'volume24hUsd',
        'liquidityTurnover1h',
        'liquidityToMcapRatio',
        'volumeAcceleration',
        'volumeTrend6h',
        'buySellRatio1h',
        'buySellRatio5m',
        'txCount1h',
        'txCount24h',
        'avgTradeSizeUsd1h',
        'priceChange5m',
        'priceChange1h',
        'priceChange6h',
        'priceChange24h',
        'priceAcceleration',
        'volumePriceDivergence',
        'holderCount',
        'top10Pct',
        'top20Pct',
        'largestHolderPct',
        'creatorBalancePct',
        'lpLockedOrBurnedPct',
        'largeWalletNetFlowUsd',
        'largeWalletBuyers',
        'largeWalletSellers',
        'largeWalletFlowRatio',
      ] as (keyof DerivedMetrics)[]
    ).map((key) => [key, null]),
  ) as unknown as DerivedMetrics;

  return { ...base, ...over };
}

describe('findLevers', () => {
  it('names the signal that is costing the most, first', () => {
    // Concentration is terrible, LP burn is perfect; the drag must be the
    // former even though both are in the same category.
    const score = scoreToken(metrics({ top10Pct: 0.85, lpLockedOrBurnedPct: 1 }));
    const levers = findLevers(score);

    expect(levers.length).toBeGreaterThan(0);
    expect(levers[0].key).toContain('top10');
    expect(levers[0].pointsAvailable).toBeGreaterThan(0);
  });

  it('ranks strictly by points given up, largest first', () => {
    const score = scoreToken(
      metrics({ top10Pct: 0.8, liquidityToMcapRatio: 0.005, priceAcceleration: -10 }),
    );
    const levers = findLevers(score, 5);

    for (let i = 1; i < levers.length; i++) {
      expect(levers[i - 1].pointsAvailable).toBeGreaterThanOrEqual(levers[i].pointsAvailable);
    }
  });

  it('never lists a signal that had no data', () => {
    // A missing signal is renormalised out of the score, so it is not a drag —
    // claiming otherwise would blame the token for our provider gap.
    const score = scoreToken(metrics({ top10Pct: 0.85 }));
    const levers = findLevers(score, 20);

    for (const lever of levers) expect(lever.value).not.toBeNull();
    expect(levers.every((l) => !l.key.includes('lp_'))).toBe(true);
  });

  it('leaves a signal alone once it is already at its best', () => {
    const score = scoreToken(metrics({ lpLockedOrBurnedPct: 1 }));
    expect(findLevers(score, 20).some((l) => l.key.includes('lp'))).toBe(false);
  });

  it('quantifies the drag as points on the published total', () => {
    // The claim on screen is "worth N points", so it has to match what the
    // score would actually become.
    const bad = scoreToken(metrics({ top10Pct: 0.85, lpLockedOrBurnedPct: 1 }));
    const lever = findLevers(bad)[0];

    const fixed = scoreToken(metrics({ top10Pct: 0, lpLockedOrBurnedPct: 1 }));
    expect(fixed.total - bad.total).toBeGreaterThanOrEqual(lever.pointsAvailable - 0.01);
  });

  it('offers a target value phrased by the model, not a bare number', () => {
    const score = scoreToken(metrics({ top10Pct: 0.85, lpLockedOrBurnedPct: 1 }));
    const target = findLevers(score)[0].target;

    expect(target).not.toBeNull();
    expect(target!.score).toBeGreaterThan(0);
    expect(target!.description.length).toBeGreaterThan(10);
  });

  it('returns nothing to fix when there is nothing scored', () => {
    expect(findLevers(scoreToken(metrics()))).toEqual([]);
  });
});

describe('bandGap', () => {
  const at = (total: number) => ({ ...scoreToken(metrics()), total });

  it('reports the distance to the next label up', () => {
    const gap = bandGap(at(60), 'WATCH');
    expect(gap.nextDecision).toBe('BUY');
    expect(gap.pointsNeeded).toBeCloseTo(8, 5);
  });

  it('measures an AVOID against WATCH, not against BUY', () => {
    const gap = bandGap(at(30), 'AVOID');
    expect(gap.nextDecision).toBe('WATCH');
    expect(gap.pointsNeeded).toBeCloseTo(15, 5);
  });

  it('says risk is the blocker when the score already clears the threshold', () => {
    // A high-scoring WATCH is capped by flags or coverage; quoting "0 points to
    // BUY" would suggest the score is the problem when it is not.
    const gap = bandGap(at(75), 'WATCH');
    expect(gap.blockedByRisk).toBe(true);
    expect(gap.pointsNeeded).toBe(0);
  });

  it('has nothing to say about a BUY', () => {
    expect(bandGap(at(80), 'BUY')).toEqual({
      nextDecision: null,
      pointsNeeded: null,
      blockedByRisk: false,
    });
  });
});
