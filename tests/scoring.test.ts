import { describe, expect, it } from 'vitest';
import { deriveMetrics } from '@/lib/metrics/derive';
import { interpolate, scoreToken } from '@/lib/scoring/score';
import { MODEL } from '@/lib/scoring/weights';
import { collected, holderData, missing, ok, securityData, NOW } from './helpers';

describe('interpolate', () => {
  const curve = [
    { at: 0, score: 0 },
    { at: 10, score: 100 },
    { at: 20, score: 50 },
  ];

  it('clamps outside the curve', () => {
    expect(interpolate(curve, -5)).toBe(0);
    expect(interpolate(curve, 999)).toBe(50);
  });

  it('interpolates linearly between points, including down-slopes', () => {
    expect(interpolate(curve, 5)).toBe(50);
    expect(interpolate(curve, 15)).toBe(75);
  });

  it('hits breakpoints exactly', () => {
    expect(interpolate(curve, 10)).toBe(100);
  });
});

describe('model definition', () => {
  it('has unique signal keys, so historical joins stay unambiguous', () => {
    const keys = MODEL.flatMap((c) => c.signals.map((s) => s.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has ascending breakpoints in every signal', () => {
    for (const category of MODEL) {
      for (const signal of category.signals) {
        const ats = signal.breakpoints.map((b) => b.at);
        expect(ats, `${signal.key} breakpoints must ascend`).toEqual([...ats].sort((a, b) => a - b));
        for (const bp of signal.breakpoints) {
          expect(bp.score).toBeGreaterThanOrEqual(0);
          expect(bp.score).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('has category weights that sum to 1', () => {
    const total = MODEL.reduce((sum, c) => sum + c.weight, 0);
    expect(total).toBeCloseTo(1, 6);
  });
});

describe('scoreToken', () => {
  it('produces a score and full coverage on complete data', () => {
    const score = scoreToken(deriveMetrics(collected(), NOW));
    expect(score.total).toBeGreaterThan(0);
    expect(score.total).toBeLessThanOrEqual(100);
    expect(score.coverage).toBeGreaterThan(0.9);
    expect(score.version).toBeTruthy();
  });

  it('does not punish a token for our missing providers', () => {
    const full = scoreToken(deriveMetrics(collected(), NOW));
    const withoutWallets = scoreToken(deriveMetrics(collected({ wallets: missing() }), NOW));

    // Wallet data was mildly positive here, so dropping it moves the score a
    // little — but nowhere near as much as scoring the category zero would.
    expect(withoutWallets.total).toBeGreaterThan(full.total - 8);
    expect(withoutWallets.coverage).toBeLessThan(full.coverage);

    const wallets = withoutWallets.categories.find((c) => c.category === 'wallets')!;
    expect(wallets.score).toBeNull();
    expect(wallets.coverage).toBe(0);
  });

  it('reports zero coverage and a zero total when nothing is known', () => {
    const score = scoreToken(
      deriveMetrics(
        { market: missing(), security: missing(), holders: missing(), wallets: missing(), social: missing() },
        NOW,
      ),
    );
    expect(score.coverage).toBe(0);
    expect(score.total).toBe(0);
  });

  it('scores a concentrated, unlocked token below a clean one', () => {
    const clean = scoreToken(deriveMetrics(collected(), NOW));
    const nasty = scoreToken(
      deriveMetrics(
        collected({
          holders: ok(holderData({ top10Pct: 0.62, largestHolderPct: 0.3, holderCount: 45 })),
          security: ok(securityData({ lpLockedOrBurnedPct: 0, creatorBalancePct: 0.2 })),
        }),
        NOW,
      ),
    );
    expect(nasty.total).toBeLessThan(clean.total - 15);
  });

  it('keeps every contribution auditable', () => {
    const score = scoreToken(deriveMetrics(collected(), NOW));
    for (const category of score.categories) {
      for (const contribution of category.contributions) {
        expect(contribution.key).toBeTruthy();
        if (contribution.value !== null) {
          expect(contribution.score).toBeGreaterThanOrEqual(0);
          expect(contribution.score).toBeLessThanOrEqual(100);
        }
      }
    }
  });
});
