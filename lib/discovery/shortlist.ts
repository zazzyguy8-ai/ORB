import type { AnalysisResult } from '@/lib/types/domain';

/**
 * The bar a scanned token has to clear to be shown to anyone.
 *
 * The honest framing matters more than the thresholds. This cannot find tokens
 * that "will not rug" — nothing can, and any tool claiming otherwise is lying.
 * What it can do is insist on things that are *already true and measurable*:
 *
 *   - it has survived a while, so the instant rugs are gone
 *   - there is real liquidity, and enough of it relative to the valuation
 *     that the price is not a rounding error
 *   - the contract cannot be inflated or frozen out from under a holder
 *   - supply is not sitting in three wallets
 *   - and we actually measured enough of it to have an opinion
 *
 * Everything here is a filter on the present. The scanner surfaces survivors
 * that currently score well; it does not predict, and the wording everywhere it
 * is displayed has to keep saying so.
 *
 * Deliberately strict. A shortlist that shows twenty tokens a day is a feed,
 * and a feed is noise; the value is in how much it throws away.
 */

export const SHORTLIST_RULES = {
  /** Under an hour old, the pair has not survived anything yet. */
  minAgeMinutes: 60,
  /** Beyond a few days, "newly discovered" stops being the reason to look. */
  maxAgeMinutes: 60 * 24 * 14,
  minLiquidityUsd: 15_000,
  /** Liquidity as a share of market cap. Thin float against a big number is the classic exit trap. */
  minLiquidityToMcap: 0.02,
  maxTop10Pct: 0.5,
  /** Below this, the model measured too little of the token to have an opinion. */
  minCoverage: 0.6,
  /** A WATCH has to be a strong one; a BUY qualifies on the label alone. */
  minScoreForWatch: 60,
} as const;

export interface ShortlistVerdict {
  passed: boolean;
  /** Human-readable reasons it failed, in the order they were checked. */
  failures: string[];
}

/** Formats a rule failure the same way everywhere it might be displayed. */
function fail(reason: string): string {
  return reason;
}

export function evaluateForShortlist(result: AnalysisResult): ShortlistVerdict {
  const failures: string[] = [];
  const m = result.metrics;

  // A veto is structural — live mint authority, a provider-flagged scam. It is
  // never overridden by a good score, here or anywhere else in the product.
  if (result.riskFlags.some((flag) => flag.veto)) {
    failures.push(fail('a disqualifying risk flag is present'));
  }

  if (result.decision === 'AVOID') {
    failures.push(fail('the model rated it AVOID'));
  } else if (result.decision === 'WATCH' && result.score.total < SHORTLIST_RULES.minScoreForWatch) {
    failures.push(
      fail(`WATCH scoring ${result.score.total.toFixed(0)}, below ${SHORTLIST_RULES.minScoreForWatch}`),
    );
  }

  // Null is a failure, not a pass. "We could not measure the age" is not the
  // same as "it is old enough", and only one of them belongs on a shortlist.
  if (m.tokenAgeMinutes === null || m.tokenAgeMinutes < SHORTLIST_RULES.minAgeMinutes) {
    failures.push(fail('younger than an hour, or age unknown'));
  } else if (m.tokenAgeMinutes > SHORTLIST_RULES.maxAgeMinutes) {
    failures.push(fail('older than two weeks — not a discovery'));
  }

  if (m.liquidityUsd === null || m.liquidityUsd < SHORTLIST_RULES.minLiquidityUsd) {
    failures.push(fail('liquidity below the floor, or unknown'));
  }

  if (
    m.liquidityToMcapRatio === null ||
    m.liquidityToMcapRatio < SHORTLIST_RULES.minLiquidityToMcap
  ) {
    failures.push(fail('liquidity too thin against market cap'));
  }

  if (m.top10Pct === null || m.top10Pct > SHORTLIST_RULES.maxTop10Pct) {
    failures.push(fail('supply too concentrated, or concentration unknown'));
  }

  if (result.score.coverage < SHORTLIST_RULES.minCoverage) {
    failures.push(fail('too little data to judge it'));
  }

  return { passed: failures.length === 0, failures };
}

/**
 * Ranking for the shortlist. Score first, then liquidity as the tie-break —
 * between two equally-scored tokens the deeper pool is the one a person can
 * actually act on.
 */
export function rankShortlist<T extends { score: number; liquidityUsd: number | null }>(
  entries: T[],
): T[] {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0);
  });
}
