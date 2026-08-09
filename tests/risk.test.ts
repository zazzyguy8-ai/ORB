import { describe, expect, it } from 'vitest';
import { classify } from '@/lib/decision/classify';
import { deriveMetrics } from '@/lib/metrics/derive';
import { evaluateRisk, unavailableChecks } from '@/lib/risk/rules';
import { scoreToken } from '@/lib/scoring/score';
import type { RiskFlag, ScoreResult } from '@/lib/types/domain';
import { collected, holderData, marketData, missing, ok, securityData, walletData, NOW } from './helpers';

function flagsFor(data = collected()) {
  const metrics = deriveMetrics(data, NOW);
  return { metrics, flags: evaluateRisk({ metrics, data }) };
}

describe('risk rules', () => {
  it('raises no critical flags on a clean token', () => {
    const { flags } = flagsFor();
    expect(flags.some((f) => f.veto)).toBe(false);
  });

  it('vetoes a live mint authority', () => {
    const { flags } = flagsFor(collected({ security: ok(securityData({ mintAuthorityEnabled: true })) }));
    const flag = flags.find((f) => f.code === 'MINT_AUTHORITY_ACTIVE')!;
    expect(flag.severity).toBe('critical');
    expect(flag.veto).toBe(true);
  });

  it('vetoes a live freeze authority', () => {
    const { flags } = flagsFor(collected({ security: ok(securityData({ freezeAuthorityEnabled: true })) }));
    expect(flags.some((f) => f.code === 'FREEZE_AUTHORITY_ACTIVE' && f.veto)).toBe(true);
  });

  it('vetoes a majority single holder', () => {
    const { flags } = flagsFor(
      collected({ holders: ok(holderData({ largestHolderPct: 0.61, top10Pct: 0.8 })) }),
    );
    expect(flags.some((f) => f.code === 'SINGLE_WALLET_MAJORITY' && f.veto)).toBe(true);
  });

  it('vetoes an effectively empty pool', () => {
    const { flags } = flagsFor(collected({ market: ok(marketData({ liquidityUsd: 900 })) }));
    expect(flags.some((f) => f.code === 'LIQUIDITY_TOO_THIN' && f.veto)).toBe(true);
  });

  it('flags unlocked LP without vetoing', () => {
    const { flags } = flagsFor(collected({ security: ok(securityData({ lpLockedOrBurnedPct: 0.1 })) }));
    const flag = flags.find((f) => f.code === 'LP_UNLOCKED')!;
    expect(flag.severity).toBe('high');
    expect(flag.veto).toBe(false);
  });

  it('scales holder concentration severity with the number', () => {
    const medium = flagsFor(collected({ holders: ok(holderData({ top10Pct: 0.4 })) })).flags;
    const high = flagsFor(collected({ holders: ok(holderData({ top10Pct: 0.55 })) })).flags;
    expect(medium.find((f) => f.code === 'HOLDER_CONCENTRATION')!.severity).toBe('medium');
    expect(high.find((f) => f.code === 'HOLDER_CONCENTRATION')!.severity).toBe('high');
  });

  it('detects bot-shaped churn', () => {
    const { flags } = flagsFor(
      collected({
        market: ok(
          marketData({
            liquidityUsd: 20_000,
            volumeUsd: { m5: 20_000, h1: 400_000, h6: 900_000, h24: 1_000_000 },
            txns: {
              m5: { buys: 900, sells: 900 },
              h1: { buys: 20_000, sells: 20_000 },
              h6: { buys: 40_000, sells: 40_000 },
              h24: { buys: 60_000, sells: 60_000 },
            },
          }),
        ),
      }),
    );
    expect(flags.some((f) => f.code === 'POSSIBLE_WASH_TRADING')).toBe(true);
  });

  it('does not invent flags for data it does not have', () => {
    const { flags } = flagsFor(
      collected({ security: missing(), holders: missing(), wallets: missing() }),
    );
    const codes = flags.map((f) => f.code);
    expect(codes).not.toContain('LP_UNLOCKED');
    expect(codes).not.toContain('HOLDER_CONCENTRATION');
    expect(codes).not.toContain('MINT_AUTHORITY_ACTIVE');
  });

  it('states which categories could not be checked', () => {
    const gaps = unavailableChecks(collected({ security: missing() }));
    expect(gaps).toContain('Security and developer analysis unavailable.');
    expect(gaps).toContain('Social momentum unavailable.');
  });

  it('sorts critical flags first', () => {
    const { flags } = flagsFor(
      collected({
        security: ok(securityData({ mintAuthorityEnabled: true, metadataMutable: true })),
      }),
    );
    expect(flags[0].severity).toBe('critical');
  });

  it('attaches the triggering value to every flag', () => {
    const { flags } = flagsFor(collected({ holders: ok(holderData({ top10Pct: 0.5 })) }));
    for (const flag of flags) {
      expect(flag.evidence.key).toBeTruthy();
      expect(flag.evidence.value).not.toBeUndefined();
    }
  });
});

describe('classification', () => {
  const score = (total: number, coverage = 0.9): ScoreResult => ({
    total,
    coverage,
    categories: [],
    version: 'test',
  });
  const flag = (severity: RiskFlag['severity'], veto = false): RiskFlag => ({
    code: `X_${severity}`,
    severity,
    title: 't',
    detail: 'd',
    evidence: { key: 'k', value: 1 },
    veto,
  });

  it('forces AVOID on any veto, however good the score', () => {
    const result = classify(score(95), [flag('critical', true)]);
    expect(result.decision).toBe('AVOID');
    expect(result.confidence).toBeGreaterThan(75);
  });

  it('returns BUY above the threshold with good coverage', () => {
    expect(classify(score(80), []).decision).toBe('BUY');
  });

  it('downgrades BUY to WATCH when coverage is too thin to justify it', () => {
    const result = classify(score(80, 0.3), []);
    expect(result.decision).toBe('WATCH');
    expect(result.rationale).toContain('coverage');
  });

  it('caps at WATCH when two high-severity flags compound', () => {
    const result = classify(score(85), [flag('high'), flag('high')]);
    expect(result.decision).toBe('WATCH');
    expect(result.rationale).toContain('high_flags');
  });

  it('returns AVOID below the watch band', () => {
    expect(classify(score(30), []).decision).toBe('AVOID');
  });

  it('is less confident near a band edge than in the middle of one', () => {
    const edge = classify(score(68.5), []).confidence;
    const middle = classify(score(90), []).confidence;
    expect(middle).toBeGreaterThan(edge);
  });

  it('never claims certainty', () => {
    for (const total of [0, 25, 50, 68, 75, 100]) {
      const c = classify(score(total, 1), []).confidence;
      expect(c).toBeLessThanOrEqual(92);
      expect(c).toBeGreaterThanOrEqual(25);
    }
  });

  it('produces a full pipeline decision for a real-shaped token', () => {
    const data = collected({ wallets: ok(walletData({ netFlowUsd: 9_000, uniqueBuyers: 8 })) });
    const metrics = deriveMetrics(data, NOW);
    const result = classify(scoreToken(metrics), evaluateRisk({ metrics, data }));
    expect(['BUY', 'WATCH', 'AVOID']).toContain(result.decision);
  });
});
