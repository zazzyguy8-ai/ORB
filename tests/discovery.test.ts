import { describe, expect, it } from 'vitest';
import { toCandidates } from '@/lib/providers/discovery/dexscreener';
import {
  SHORTLIST_RULES,
  evaluateForShortlist,
  rankShortlist,
} from '@/lib/discovery/shortlist';
import type { AnalysisResult, DerivedMetrics } from '@/lib/types/domain';

const SOLANA_MINT = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const WIF = 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm';
const WRAPPED_SOL = 'So11111111111111111111111111111111111111112';

describe('toCandidates', () => {
  it('keeps solana tokens and drops every other chain', () => {
    const candidates = toCandidates(
      [
        { chainId: 'solana', tokenAddress: SOLANA_MINT },
        { chainId: 'ethereum', tokenAddress: '0x0000000000000000000000000000000000000001' },
        { chainId: 'base', tokenAddress: '0x0000000000000000000000000000000000000002' },
      ],
      'profiles',
    );

    expect(candidates).toEqual([{ address: SOLANA_MINT, source: 'profiles' }]);
  });

  it('drops quote assets, which appear in these feeds and mean nothing here', () => {
    const candidates = toCandidates(
      [
        { chainId: 'solana', tokenAddress: WRAPPED_SOL },
        { chainId: 'solana', tokenAddress: SOLANA_MINT },
      ],
      'boosts',
    );

    expect(candidates.map((c) => c.address)).toEqual([SOLANA_MINT]);
  });

  it('drops anything that is not a valid mint', () => {
    expect(
      toCandidates(
        [
          { chainId: 'solana', tokenAddress: 'not-an-address' },
          { chainId: 'solana' },
          { chainId: 'solana', tokenAddress: '' },
        ],
        'profiles',
      ),
    ).toEqual([]);
  });

  it('deduplicates within a feed', () => {
    const candidates = toCandidates(
      [
        { chainId: 'solana', tokenAddress: SOLANA_MINT },
        { chainId: 'solana', tokenAddress: SOLANA_MINT },
        { chainId: 'solana', tokenAddress: WIF },
      ],
      'profiles',
    );
    expect(candidates).toHaveLength(2);
  });

  it('survives a response that is not a list at all', () => {
    // These endpoints are undocumented enough to change shape without notice,
    // and a scan must degrade rather than throw.
    expect(toCandidates(null, 'profiles')).toEqual([]);
    expect(toCandidates({ error: 'rate limited' }, 'profiles')).toEqual([]);
    expect(toCandidates('nope', 'boosts')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

function metrics(over: Partial<DerivedMetrics>): DerivedMetrics {
  return {
    tokenAgeMinutes: 60 * 24,
    liquidityUsd: 80_000,
    marketCapUsd: 900_000,
    liquidityToMcapRatio: 0.09,
    top10Pct: 0.2,
    ...over,
  } as DerivedMetrics;
}

function analysis(over: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    decision: 'BUY',
    score: { total: 74, coverage: 0.9, categories: [], version: 'test' },
    riskFlags: [],
    metrics: metrics({}),
    ...over,
  } as unknown as AnalysisResult;
}

describe('evaluateForShortlist', () => {
  it('passes a token that clears every rule', () => {
    expect(evaluateForShortlist(analysis()).passed).toBe(true);
  });

  it('never shortlists a vetoed token, however well it scores', () => {
    // A veto is structural — live mint authority, a flagged contract. A high
    // score must not be able to buy its way past one.
    const verdict = evaluateForShortlist(
      analysis({
        score: { total: 95, coverage: 1, categories: [], version: 'test' },
        riskFlags: [{ veto: true }] as unknown as AnalysisResult['riskFlags'],
      }),
    );

    expect(verdict.passed).toBe(false);
    expect(verdict.failures.join(' ')).toContain('disqualifying');
  });

  it('rejects AVOID outright and weak WATCH on score', () => {
    expect(evaluateForShortlist(analysis({ decision: 'AVOID' })).passed).toBe(false);

    const weakWatch = analysis({
      decision: 'WATCH',
      score: { total: SHORTLIST_RULES.minScoreForWatch - 1, coverage: 0.9, categories: [], version: 'test' },
    });
    expect(evaluateForShortlist(weakWatch).passed).toBe(false);

    const strongWatch = analysis({
      decision: 'WATCH',
      score: { total: SHORTLIST_RULES.minScoreForWatch, coverage: 0.9, categories: [], version: 'test' },
    });
    expect(evaluateForShortlist(strongWatch).passed).toBe(true);
  });

  it('requires the token to have survived its first hour', () => {
    expect(evaluateForShortlist(analysis({ metrics: metrics({ tokenAgeMinutes: 12 }) })).passed).toBe(
      false,
    );
  });

  it('treats an unmeasured value as a failure, not as a pass', () => {
    // The whole point: "we could not measure the age" and "it is old enough"
    // are different statements, and only one of them belongs on a shortlist.
    for (const gap of [
      { tokenAgeMinutes: null },
      { liquidityUsd: null },
      { liquidityToMcapRatio: null },
      { top10Pct: null },
    ]) {
      expect(evaluateForShortlist(analysis({ metrics: metrics(gap) })).passed).toBe(false);
    }
  });

  it('rejects thin liquidity both absolutely and against market cap', () => {
    expect(
      evaluateForShortlist(analysis({ metrics: metrics({ liquidityUsd: 4_000 }) })).passed,
    ).toBe(false);
    expect(
      evaluateForShortlist(analysis({ metrics: metrics({ liquidityToMcapRatio: 0.004 }) })).passed,
    ).toBe(false);
  });

  it('rejects supply sitting in a handful of wallets', () => {
    expect(evaluateForShortlist(analysis({ metrics: metrics({ top10Pct: 0.85 }) })).passed).toBe(
      false,
    );
  });

  it('will not shortlist something it barely measured', () => {
    const thin = analysis({
      score: { total: 80, coverage: SHORTLIST_RULES.minCoverage - 0.05, categories: [], version: 'test' },
    });
    expect(evaluateForShortlist(thin).passed).toBe(false);
  });

  it('reports every reason it failed, not just the first', () => {
    const bad = analysis({
      decision: 'AVOID',
      metrics: metrics({ tokenAgeMinutes: 5, liquidityUsd: 100 }),
    });
    expect(evaluateForShortlist(bad).failures.length).toBeGreaterThan(2);
  });
});

describe('rankShortlist', () => {
  it('ranks by score, then by the pool a person could actually trade against', () => {
    const ranked = rankShortlist([
      { score: 70, liquidityUsd: 10_000 },
      { score: 82, liquidityUsd: 20_000 },
      { score: 70, liquidityUsd: 90_000 },
    ]);

    expect(ranked.map((entry) => entry.score)).toEqual([82, 70, 70]);
    expect(ranked[1].liquidityUsd).toBe(90_000);
  });

  it('does not mutate the input', () => {
    const input = [{ score: 1, liquidityUsd: 1 }, { score: 9, liquidityUsd: 9 }];
    rankShortlist(input);
    expect(input[0].score).toBe(1);
  });
});
