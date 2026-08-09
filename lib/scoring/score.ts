import {
  MODEL,
  SCORING_VERSION,
  type Breakpoint,
  type SignalDefinition,
} from '@/lib/scoring/weights';
import type {
  CategoryScore,
  DerivedMetrics,
  ScoreResult,
  SignalContribution,
} from '@/lib/types/domain';

/** Piecewise-linear interpolation over the signal's curve. */
export function interpolate(breakpoints: Breakpoint[], value: number): number {
  if (breakpoints.length === 0) return 50;
  if (value <= breakpoints[0].at) return breakpoints[0].score;

  const last = breakpoints[breakpoints.length - 1];
  if (value >= last.at) return last.score;

  for (let i = 1; i < breakpoints.length; i++) {
    const prev = breakpoints[i - 1];
    const next = breakpoints[i];
    if (value <= next.at) {
      const span = next.at - prev.at;
      const t = span === 0 ? 0 : (value - prev.at) / span;
      return prev.score + t * (next.score - prev.score);
    }
  }

  return last.score;
}

function readMetric(metrics: DerivedMetrics, signal: SignalDefinition): number | null {
  if (signal.requires && !signal.requires(metrics)) return null;
  const raw = metrics[signal.metric];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

export function scoreToken(metrics: DerivedMetrics): ScoreResult {
  const categories: CategoryScore[] = MODEL.map((definition) => {
    const contributions: SignalContribution[] = [];
    let weighted = 0;
    let availableWeight = 0;
    const totalWeight = definition.signals.reduce((sum, s) => sum + s.weight, 0);

    for (const signal of definition.signals) {
      const value = readMetric(metrics, signal);
      if (value === null) {
        contributions.push({
          key: signal.key,
          label: signal.label,
          value: null,
          score: 0,
          weight: signal.weight,
        });
        continue;
      }

      const score = interpolate(signal.breakpoints, value);
      weighted += score * signal.weight;
      availableWeight += signal.weight;
      contributions.push({
        key: signal.key,
        label: signal.label,
        value,
        score,
        weight: signal.weight,
      });
    }

    // Renormalise inside the category: a signal with no data neither helps nor
    // hurts, it just stops counting. Scoring it 0 would punish tokens for our
    // provider gaps.
    return {
      category: definition.category,
      score: availableWeight > 0 ? weighted / availableWeight : null,
      coverage: totalWeight > 0 ? availableWeight / totalWeight : 0,
      weight: definition.weight,
      contributions,
    };
  });

  let weighted = 0;
  let availableWeight = 0;
  let coverageWeighted = 0;
  const modelWeight = MODEL.reduce((sum, c) => sum + c.weight, 0);

  for (const category of categories) {
    coverageWeighted += category.coverage * category.weight;
    if (category.score === null) continue;
    // A partially-covered category carries proportionally less of the total.
    const effectiveWeight = category.weight * category.coverage;
    weighted += category.score * effectiveWeight;
    availableWeight += effectiveWeight;
  }

  return {
    total: availableWeight > 0 ? clamp(weighted / availableWeight, 0, 100) : 0,
    coverage: modelWeight > 0 ? coverageWeighted / modelWeight : 0,
    categories,
    version: SCORING_VERSION,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
