import { MODEL } from '@/lib/scoring/weights';
import type { DerivedMetrics, EvidenceItem, RiskFlag, ScoreResult } from '@/lib/types/domain';

/**
 * Builds the closed set of facts the model is allowed to talk about.
 *
 * This is the mechanism behind spec §4. The model never sees raw JSON it could
 * mis-read into a new number — it sees finished sentences, each already true by
 * construction because the sentence text came from the same function that
 * produced the score. Its job is selection and phrasing, nothing else.
 */

const SIGNALS_BY_KEY = new Map(
  MODEL.flatMap((category) => category.signals.map((signal) => [signal.key, signal] as const)),
);

/** How far a sub-score sits from neutral, normalised to 0..1. */
function magnitudeOf(score: number): number {
  return Math.min(1, Math.abs(score - 50) / 50);
}

export function buildEvidence(
  score: ScoreResult,
  flags: RiskFlag[],
  metrics: DerivedMetrics,
): EvidenceItem[] {
  const items: EvidenceItem[] = [];

  for (const category of score.categories) {
    for (const contribution of category.contributions) {
      if (contribution.value === null) continue;

      const signal = SIGNALS_BY_KEY.get(contribution.key);
      if (!signal) continue;

      const text = signal.describe(contribution.value);
      if (!text) continue;

      items.push({
        id: `sig:${contribution.key}`,
        text,
        polarity:
          contribution.score >= 62 ? 'positive' : contribution.score <= 38 ? 'negative' : 'neutral',
        // Weight the importance by how much this signal actually moves the total.
        magnitude: magnitudeOf(contribution.score) * contribution.weight * category.weight * 4,
      });
    }
  }

  for (const flag of flags) {
    items.push({
      id: `risk:${flag.code}`,
      text: flag.detail,
      polarity: 'negative',
      magnitude:
        flag.severity === 'critical' ? 1 : flag.severity === 'high' ? 0.8 : flag.severity === 'medium' ? 0.5 : 0.3,
    });
  }

  if (metrics.tokenAgeMinutes !== null && metrics.tokenAgeMinutes > 30) {
    // Age already appears as a scored signal; only add the neutral framing fact
    // when it is not already the headline.
    items.push({
      id: 'ctx:age',
      text:
        metrics.tokenAgeMinutes < 1440
          ? `The pair is ${(metrics.tokenAgeMinutes / 60).toFixed(1)} hours old.`
          : `The pair is ${(metrics.tokenAgeMinutes / 1440).toFixed(1)} days old.`,
      polarity: 'neutral',
      magnitude: 0.2,
    });
  }

  // Deduplicate by rendered text — signals and risk rules can describe the same
  // underlying fact (LP lock appears in two categories by design).
  const seen = new Set<string>();
  const unique = items.filter((item) => {
    const key = item.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.sort((a, b) => b.magnitude - a.magnitude);
}

/** Deterministic pick used both for the fallback text and for prompt ordering. */
export function topReasons(evidence: EvidenceItem[], count: number): EvidenceItem[] {
  const positives = evidence.filter((e) => e.polarity === 'positive');
  const negatives = evidence.filter((e) => e.polarity === 'negative' && !e.id.startsWith('risk:'));
  const neutrals = evidence.filter((e) => e.polarity === 'neutral');

  // Lead with whichever side is stronger, then fill.
  const leading = (positives[0]?.magnitude ?? 0) >= (negatives[0]?.magnitude ?? 0)
    ? [...positives, ...negatives, ...neutrals]
    : [...negatives, ...positives, ...neutrals];

  return leading.slice(0, count);
}
