import { DECISION_THRESHOLDS, MODEL } from '@/lib/scoring/weights';
import { clamp } from '@/lib/scoring/score';
import type { CategoryScore, Decision, ScoreCategory, ScoreResult } from '@/lib/types/domain';

/**
 * What is holding this score back.
 *
 * A number and a label tell a trader where a token stands; they do not tell
 * them what would have to be true for it to stand somewhere else. This module
 * answers that from the model itself: for every signal that had data, it
 * recomputes the whole score as if that one signal were at its best, and
 * reports the difference.
 *
 * Nothing here predicts or recommends. "Liquidity is the biggest drag, worth
 * 6.2 points" is a statement about our own weighting, not about the token's
 * future — which is exactly why it can be published without inventing anything.
 */

export interface LeverTarget {
  /** Metric value at the nearest breakpoint that scores better than today. */
  value: number;
  score: number;
  /** The model's own sentence for that value, so units are never guessed. */
  description: string;
}

export interface Lever {
  key: string;
  label: string;
  category: ScoreCategory;
  value: number;
  score: number;
  bestScore: number;
  /** Points of the 0..100 total this signal currently gives up. */
  pointsAvailable: number;
  description: string;
  target: LeverTarget | null;
}

/** Below this a lever is a rounding difference, not something worth naming. */
const MIN_POINTS = 0.3;

const SIGNALS = new Map(
  MODEL.flatMap((category) =>
    category.signals.map((signal) => [signal.key, { signal, category: category.category }] as const),
  ),
);

/**
 * Category score with one signal's sub-score replaced.
 *
 * Recomputed rather than adjusted arithmetically: the renormalisation for
 * missing data means a signal's effective weight depends on which of its
 * siblings had data, and re-deriving that by hand is how a scoring bug gets in.
 */
function categoryScoreWith(
  category: CategoryScore,
  overrideKey: string | null,
  overrideScore: number,
): number | null {
  let weighted = 0;
  let available = 0;

  for (const contribution of category.contributions) {
    if (contribution.value === null) continue;
    const score = contribution.key === overrideKey ? overrideScore : contribution.score;
    weighted += score * contribution.weight;
    available += contribution.weight;
  }

  return available > 0 ? weighted / available : null;
}

/** Total score with one signal's sub-score replaced. Mirrors scoreToken(). */
function totalWith(
  categories: CategoryScore[],
  overrideKey: string | null,
  overrideScore: number,
): number {
  let weighted = 0;
  let available = 0;

  for (const category of categories) {
    const score = categoryScoreWith(category, overrideKey, overrideScore);
    if (score === null) continue;
    const effectiveWeight = category.weight * category.coverage;
    weighted += score * effectiveWeight;
    available += effectiveWeight;
  }

  return available > 0 ? clamp(weighted / available, 0, 100) : 0;
}

/**
 * The nearest value that would score better.
 *
 * Curves are not monotonic — volume acceleration peaks and then falls again,
 * because a vertical spike is as often a top as a start — so "better" is the
 * closest breakpoint above the current sub-score, not simply a larger value.
 */
function nearestBetter(
  key: string,
  value: number,
  score: number,
): LeverTarget | null {
  const entry = SIGNALS.get(key);
  if (!entry) return null;

  let best: LeverTarget | null = null;
  let bestDistance = Infinity;

  for (const point of entry.signal.breakpoints) {
    if (point.score <= score + 0.5) continue;
    const distance = Math.abs(point.at - value);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { value: point.at, score: point.score, description: entry.signal.describe(point.at) };
    }
  }

  return best;
}

/**
 * Signals ranked by how much of the total they are costing, largest first.
 * Signals with no data are excluded: they are not dragging the score down, they
 * simply are not in it (see the renormalisation in scoreToken).
 */
export function findLevers(score: ScoreResult, limit = 3): Lever[] {
  const baseline = totalWith(score.categories, null, 0);
  const levers: Lever[] = [];

  for (const category of score.categories) {
    for (const contribution of category.contributions) {
      if (contribution.value === null) continue;

      const entry = SIGNALS.get(contribution.key);
      if (!entry) continue;

      const bestScore = Math.max(...entry.signal.breakpoints.map((point) => point.score));
      if (bestScore <= contribution.score) continue;

      const pointsAvailable = totalWith(score.categories, contribution.key, bestScore) - baseline;
      if (pointsAvailable < MIN_POINTS) continue;

      levers.push({
        key: contribution.key,
        label: contribution.label,
        category: category.category,
        value: contribution.value,
        score: contribution.score,
        bestScore,
        pointsAvailable,
        description: entry.signal.describe(contribution.value),
        target: nearestBetter(contribution.key, contribution.value, contribution.score),
      });
    }
  }

  return levers.sort((a, b) => b.pointsAvailable - a.pointsAvailable).slice(0, limit);
}

export interface BandGap {
  /** The label above the current one, or null when already at the top. */
  nextDecision: Decision | null;
  /** Points of total score still needed to reach it. */
  pointsNeeded: number | null;
  /**
   * True when the score already clears the threshold and something else — a
   * veto, stacked high-severity flags, thin coverage — is holding the label
   * down. Naming that is more useful than a points figure that is already met.
   */
  blockedByRisk: boolean;
}

/** How far this token is from the next label up. */
export function bandGap(score: ScoreResult, decision: Decision): BandGap {
  if (decision === 'BUY') return { nextDecision: null, pointsNeeded: null, blockedByRisk: false };

  const target = decision === 'AVOID' ? DECISION_THRESHOLDS.watch : DECISION_THRESHOLDS.buy;
  const nextDecision: Decision = decision === 'AVOID' ? 'WATCH' : 'BUY';
  const gap = target - score.total;

  return {
    nextDecision,
    pointsNeeded: gap > 0 ? gap : 0,
    blockedByRisk: gap <= 0,
  };
}
