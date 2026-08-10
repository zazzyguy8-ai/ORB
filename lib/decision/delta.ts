import type { Decision } from '@/lib/types/domain';

/**
 * What changed since the last time this token was analysed.
 *
 * This is the one thing a stored history buys that a live data feed cannot:
 * DexScreener can tell you what a token looks like now, but only we know what
 * our model said about it two hours ago and whether the picture has improved.
 * "WATCH 58 → BUY 71, liquidity up 34%" is a different product from a snapshot.
 *
 * Pure and deterministic — the DB row goes in, a rendered comparison comes out.
 */

export interface PreviousAnalysis {
  id: string;
  decision: Decision;
  score: number;
  confidence: number;
  createdAt: string;
  priceUsd: number | null;
  liquidityUsd: number | null;
}

export interface DeltaLine {
  label: string;
  /** Signed percentage change, or null when one side is unknown. */
  changePct: number | null;
  direction: 'up' | 'down' | 'flat' | 'unknown';
}

export interface AnalysisDelta {
  previousDecision: Decision;
  currentDecision: Decision;
  /** True when the label itself moved — the headline of any comparison. */
  decisionChanged: boolean;
  /** Positive when the model got more positive. */
  scoreDelta: number;
  minutesSince: number;
  lines: DeltaLine[];
  /** One-sentence summary, safe to render verbatim. */
  summary: string;
}

const DECISION_RANK: Record<Decision, number> = { AVOID: 0, WATCH: 1, BUY: 2 };

function pctChange(from: number | null, to: number | null): DeltaLine['changePct'] {
  if (from === null || to === null || from === 0) return null;
  return ((to - from) / Math.abs(from)) * 100;
}

function direction(changePct: number | null): DeltaLine['direction'] {
  if (changePct === null) return 'unknown';
  // Sub-1% moves are noise on a live market; calling them a change is worse
  // than calling them flat.
  if (Math.abs(changePct) < 1) return 'flat';
  return changePct > 0 ? 'up' : 'down';
}

export function buildDelta(
  previous: PreviousAnalysis,
  current: {
    decision: Decision;
    score: number;
    priceUsd: number | null;
    liquidityUsd: number | null;
  },
  nowMs: number = Date.now(),
): AnalysisDelta {
  const minutesSince = Math.max(
    0,
    (nowMs - new Date(previous.createdAt).getTime()) / 60_000,
  );

  const priceChange = pctChange(previous.priceUsd, current.priceUsd);
  const liquidityChange = pctChange(previous.liquidityUsd, current.liquidityUsd);
  const scoreDelta = current.score - previous.score;

  const lines: DeltaLine[] = [
    { label: 'Price', changePct: priceChange, direction: direction(priceChange) },
    { label: 'Liquidity', changePct: liquidityChange, direction: direction(liquidityChange) },
    {
      label: 'Score',
      changePct: scoreDelta,
      direction: Math.abs(scoreDelta) < 1 ? 'flat' : scoreDelta > 0 ? 'up' : 'down',
    },
  ];

  const decisionChanged = previous.decision !== current.decision;

  return {
    previousDecision: previous.decision,
    currentDecision: current.decision,
    decisionChanged,
    scoreDelta,
    minutesSince,
    lines,
    summary: summarise(previous.decision, current.decision, scoreDelta, minutesSince),
  };
}

export function formatElapsed(minutes: number): string {
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)} h ago`;
  return `${Math.round(minutes / 1440)} d ago`;
}

function summarise(
  previous: Decision,
  current: Decision,
  scoreDelta: number,
  minutes: number,
): string {
  const when = formatElapsed(minutes);

  if (previous !== current) {
    const improved = DECISION_RANK[current] > DECISION_RANK[previous];
    return `Changed from ${previous} to ${current} since ${when} — the model became ${
      improved ? 'more' : 'less'
    } positive.`;
  }

  if (Math.abs(scoreDelta) < 1) {
    return `Still ${current}, essentially unchanged since ${when}.`;
  }

  return `Still ${current}, but the score ${scoreDelta > 0 ? 'rose' : 'fell'} ${Math.abs(
    scoreDelta,
  ).toFixed(1)} points since ${when}.`;
}
