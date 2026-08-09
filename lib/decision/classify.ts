import { clamp } from '@/lib/scoring/score';
import { DECISION_THRESHOLDS } from '@/lib/scoring/weights';
import type { Decision, RiskFlag, ScoreResult } from '@/lib/types/domain';

export interface Classification {
  decision: Decision;
  /**
   * 0..100. This is confidence in the *classification*, driven by data coverage
   * and how far the score sits from a band edge. It is explicitly not a
   * probability that the price will rise.
   */
  confidence: number;
  /** Machine-readable reason the classifier landed where it did. */
  rationale: string;
}

export function classify(score: ScoreResult, flags: RiskFlag[]): Classification {
  const vetoes = flags.filter((f) => f.veto);
  if (vetoes.length > 0) {
    return {
      decision: 'AVOID',
      // A veto is a structural fact, not a blend — high confidence in the
      // classification, independent of how the rest of the model scored.
      confidence: Math.round(clamp(80 + vetoes.length * 5, 0, 95)),
      rationale: `veto:${vetoes.map((v) => v.code).join(',')}`,
    };
  }

  const highs = flags.filter((f) => f.severity === 'high').length;

  // Two or more high-severity flags cap the outcome at WATCH regardless of
  // momentum: individually survivable problems compound.
  const cappedToWatch = highs >= 2;

  let decision: Decision;
  let rationale: string;

  if (score.total >= DECISION_THRESHOLDS.buy && !cappedToWatch) {
    if (score.coverage < DECISION_THRESHOLDS.minCoverageForBuy) {
      decision = 'WATCH';
      rationale = `score_${score.total.toFixed(1)}_but_coverage_${score.coverage.toFixed(2)}`;
    } else {
      decision = 'BUY';
      rationale = `score_${score.total.toFixed(1)}`;
    }
  } else if (score.total >= DECISION_THRESHOLDS.watch) {
    decision = 'WATCH';
    rationale = cappedToWatch
      ? `capped_by_${highs}_high_flags`
      : `score_${score.total.toFixed(1)}`;
  } else {
    decision = 'AVOID';
    rationale = `score_${score.total.toFixed(1)}`;
  }

  return { decision, confidence: computeConfidence(score, flags, decision), rationale };
}

/**
 * Confidence = how much we trust this label, built from three factors:
 *   - coverage: how much of the model actually had data behind it
 *   - decisiveness: distance from the nearest band edge
 *   - contradiction: high-severity flags sitting under a positive label
 */
export function computeConfidence(
  score: ScoreResult,
  flags: RiskFlag[],
  decision: Decision,
): number {
  const coverageFactor = clamp(score.coverage, 0, 1);

  const edges = [DECISION_THRESHOLDS.watch, DECISION_THRESHOLDS.buy];
  const distance = Math.min(...edges.map((edge) => Math.abs(score.total - edge)));
  // 20 points from a band edge is as decisive as it gets.
  const decisiveness = clamp(distance / 20, 0, 1);

  const highs = flags.filter((f) => f.severity === 'high').length;
  const contradiction = decision === 'BUY' ? highs * 0.12 : decision === 'WATCH' ? highs * 0.04 : 0;

  const raw = 0.5 * coverageFactor + 0.5 * decisiveness - contradiction;

  // Floor of 25: a classification we publish is never presented as a coin flip
  // with no information, and a ceiling of 92 keeps us from implying certainty.
  return Math.round(clamp(25 + raw * 70, 25, 92));
}
