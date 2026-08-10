import { describe, expect, it } from 'vitest';
import { buildDelta, formatElapsed, type PreviousAnalysis } from '@/lib/decision/delta';

const NOW = 1_760_000_000_000;

const previous = (over: Partial<PreviousAnalysis> = {}): PreviousAnalysis => ({
  id: 'prev',
  decision: 'WATCH',
  score: 58,
  confidence: 61,
  createdAt: new Date(NOW - 2 * 60 * 60 * 1000).toISOString(),
  priceUsd: 0.0001,
  liquidityUsd: 50_000,
  ...over,
});

describe('buildDelta', () => {
  it('leads with the decision change, which is the headline', () => {
    const delta = buildDelta(
      previous(),
      { decision: 'BUY', score: 71, priceUsd: 0.00012, liquidityUsd: 67_000 },
      NOW,
    );

    expect(delta.decisionChanged).toBe(true);
    expect(delta.summary).toContain('WATCH to BUY');
    expect(delta.summary).toContain('more positive');
    expect(delta.scoreDelta).toBeCloseTo(13, 5);
  });

  it('describes a downgrade as the model becoming less positive', () => {
    const delta = buildDelta(
      previous({ decision: 'BUY', score: 74 }),
      { decision: 'AVOID', score: 30, priceUsd: 0.00005, liquidityUsd: 8_000 },
      NOW,
    );
    expect(delta.summary).toContain('BUY to AVOID');
    expect(delta.summary).toContain('less positive');
  });

  it('computes percentage moves for price and liquidity', () => {
    const delta = buildDelta(
      previous(),
      { decision: 'WATCH', score: 58, priceUsd: 0.00015, liquidityUsd: 25_000 },
      NOW,
    );

    const price = delta.lines.find((l) => l.label === 'Price')!;
    const liquidity = delta.lines.find((l) => l.label === 'Liquidity')!;
    expect(price.changePct).toBeCloseTo(50, 5);
    expect(price.direction).toBe('up');
    expect(liquidity.changePct).toBeCloseTo(-50, 5);
    expect(liquidity.direction).toBe('down');
  });

  it('calls a sub-1% move flat rather than a change', () => {
    // A live market always moves a little; reporting 0.3% as "up" is noise.
    const delta = buildDelta(
      previous(),
      { decision: 'WATCH', score: 58.4, priceUsd: 0.0001003, liquidityUsd: 50_100 },
      NOW,
    );
    for (const line of delta.lines) expect(line.direction).toBe('flat');
    expect(delta.summary).toContain('essentially unchanged');
  });

  it('marks a comparison as unknown rather than zero when a side is missing', () => {
    const delta = buildDelta(
      previous({ priceUsd: null }),
      { decision: 'WATCH', score: 58, priceUsd: 0.0001, liquidityUsd: null },
      NOW,
    );
    expect(delta.lines.find((l) => l.label === 'Price')!.direction).toBe('unknown');
    expect(delta.lines.find((l) => l.label === 'Liquidity')!.changePct).toBeNull();
  });

  it('never divides by a zero baseline', () => {
    const delta = buildDelta(
      previous({ priceUsd: 0, liquidityUsd: 0 }),
      { decision: 'WATCH', score: 58, priceUsd: 5, liquidityUsd: 5 },
      NOW,
    );
    expect(delta.lines.every((l) => l.changePct === null || Number.isFinite(l.changePct))).toBe(
      true,
    );
  });

  it('reports a same-label score move without claiming the decision changed', () => {
    const delta = buildDelta(
      previous(),
      { decision: 'WATCH', score: 66, priceUsd: 0.0001, liquidityUsd: 50_000 },
      NOW,
    );
    expect(delta.decisionChanged).toBe(false);
    expect(delta.summary).toContain('Still WATCH');
    expect(delta.summary).toContain('rose');
  });

  it('does not produce a negative elapsed time for a clock skew', () => {
    const delta = buildDelta(
      previous({ createdAt: new Date(NOW + 60_000).toISOString() }),
      { decision: 'WATCH', score: 58, priceUsd: 0.0001, liquidityUsd: 50_000 },
      NOW,
    );
    expect(delta.minutesSince).toBe(0);
  });
});

describe('formatElapsed', () => {
  it('scales the unit to the magnitude', () => {
    expect(formatElapsed(0.4)).toBe('just now');
    expect(formatElapsed(35)).toBe('35 min ago');
    expect(formatElapsed(150)).toBe('2.5 h ago');
    expect(formatElapsed(3000)).toBe('2 d ago');
  });
});
