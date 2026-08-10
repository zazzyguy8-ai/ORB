import { getDb } from '@/lib/db/client';
import { CHECKPOINTS, type CheckpointKey } from '@/lib/db/repo';

/**
 * The public scoreboard (spec §14).
 *
 * Every analysis schedules five checkpoints; the tracker fills them in. This
 * module turns those rows into the one number a stranger actually cares about:
 * did the calls work?
 *
 * Three rules keep it honest, and they are the whole point of the feature:
 *
 *  1. A cell is published only once it has MIN_SAMPLES outcomes behind it.
 *     Three data points make a median that looks authoritative and means
 *     nothing, and the first person to check it would be the one misled.
 *  2. WATCH has no hit rate. BUY says "up", AVOID says "not up" — those are
 *     falsifiable. WATCH says "I don't know yet", and grading it either way
 *     would be inventing a claim the model never made.
 *  3. The median leads, not the average. One token that ran 40x would drag an
 *     average into fantasy while the typical call went nowhere.
 */

export const MIN_SAMPLES = 20;

export const DECISIONS = ['BUY', 'WATCH', 'AVOID'] as const;
export type Decision = (typeof DECISIONS)[number];

const CHECKPOINT_LABEL: Record<CheckpointKey, string> = {
  m5: '5 min',
  m15: '15 min',
  h1: '1 h',
  h6: '6 h',
  h24: '24 h',
};

export interface OutcomeRow {
  decision: Decision;
  checkpoint: CheckpointKey;
  returnPct: number;
}

export interface CheckpointStat {
  checkpoint: CheckpointKey;
  label: string;
  samples: number;
  /** Null until `samples >= MIN_SAMPLES` — see rule 1. */
  medianReturnPct: number | null;
  avgReturnPct: number | null;
  /** Share of outcomes with a positive return, 0–1. */
  positiveRate: number | null;
  /** Share of outcomes where the call was right. Null for WATCH — see rule 2. */
  hitRate: number | null;
}

export interface DecisionStat {
  decision: Decision;
  samples: number;
  checkpoints: CheckpointStat[];
  /** Headline hit rate at 24h, the checkpoint a trader is actually judged on. */
  headlineHitRate: number | null;
}

export interface TrackRecord {
  totalOutcomes: number;
  /** True once at least one cell has cleared MIN_SAMPLES. */
  hasPublishableCell: boolean;
  minSamples: number;
  decisions: DecisionStat[];
  generatedAt: string;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Was the call right? BUY claims the price goes up; AVOID claims it does not.
 * A flat token vindicates AVOID and does not vindicate BUY, so the boundary
 * sits at exactly zero and belongs to AVOID.
 */
function wasRight(decision: Decision, returnPct: number): boolean | null {
  if (decision === 'BUY') return returnPct > 0;
  if (decision === 'AVOID') return returnPct <= 0;
  return null;
}

/** Pure aggregation — the DB read is separate so this stays testable. */
export function summarizeOutcomes(rows: OutcomeRow[], nowMs: number = Date.now()): TrackRecord {
  const buckets = new Map<string, number[]>();
  for (const row of rows) {
    if (!Number.isFinite(row.returnPct)) continue;
    const key = `${row.decision}|${row.checkpoint}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(row.returnPct);
    else buckets.set(key, [row.returnPct]);
  }

  let hasPublishableCell = false;
  let totalOutcomes = 0;

  const decisions = DECISIONS.map((decision) => {
    let samples = 0;

    const checkpoints = CHECKPOINTS.map(({ key }) => {
      const values = buckets.get(`${decision}|${key}`) ?? [];
      samples += values.length;

      const stat: CheckpointStat = {
        checkpoint: key,
        label: CHECKPOINT_LABEL[key],
        samples: values.length,
        medianReturnPct: null,
        avgReturnPct: null,
        positiveRate: null,
        hitRate: null,
      };

      if (values.length >= MIN_SAMPLES) {
        hasPublishableCell = true;
        stat.medianReturnPct = median(values);
        stat.avgReturnPct = values.reduce((sum, v) => sum + v, 0) / values.length;
        stat.positiveRate = values.filter((v) => v > 0).length / values.length;

        const hits = values.filter((v) => wasRight(decision, v) === true).length;
        stat.hitRate = wasRight(decision, 0) === null ? null : hits / values.length;
      }

      return stat;
    });

    totalOutcomes += samples;

    return {
      decision,
      samples,
      checkpoints,
      headlineHitRate: checkpoints.find((c) => c.checkpoint === 'h24')?.hitRate ?? null,
    };
  });

  return {
    totalOutcomes,
    hasPublishableCell,
    minSamples: MIN_SAMPLES,
    decisions,
    generatedAt: new Date(nowMs).toISOString(),
  };
}

export interface ResolvedCall {
  id: string;
  address: string;
  symbol: string | null;
  decision: Decision;
  score: number;
  createdAt: string;
  /** Recorded returns by checkpoint; absent keys are still pending. */
  returns: Partial<Record<CheckpointKey, number>>;
}

/**
 * Individual calls whose checkpoints have started resolving, newest first.
 *
 * Deliberately separate from the aggregate: a single call is a receipt, not a
 * statistic, so it can be shown from the very first one without the sample-size
 * gate. What it must not do is masquerade as performance — the page frames it
 * as "recent calls", and the reader can see the count for themselves.
 *
 * Only ownerless analyses appear: a signed-in user's research is theirs.
 */
export async function fetchRecentResolvedCalls(limit = 12): Promise<ResolvedCall[]> {
  const db = getDb();
  if (!db) return [];

  try {
    const { data, error } = await db
      .from('analyses')
      .select(
        'id,address,decision,score,created_at,tokens(symbol),analysis_outcomes(checkpoint,status,return_pct)',
      )
      .is('user_id', null)
      .order('created_at', { ascending: false })
      .limit(limit * 4);

    if (error || !data) return [];

    const calls: ResolvedCall[] = [];

    for (const row of data as any[]) {
      const outcomes = Array.isArray(row.analysis_outcomes) ? row.analysis_outcomes : [];
      const returns: Partial<Record<CheckpointKey, number>> = {};

      for (const outcome of outcomes) {
        if (outcome.status !== 'recorded' || outcome.return_pct === null) continue;
        returns[outcome.checkpoint as CheckpointKey] = Number(outcome.return_pct);
      }

      // Nothing has resolved yet: there is no outcome to show, and listing it
      // would be a row of dashes pretending to be a result.
      if (Object.keys(returns).length === 0) continue;
      if (!DECISIONS.includes(row.decision)) continue;

      calls.push({
        id: row.id,
        address: row.address,
        symbol: row.tokens?.symbol ?? null,
        decision: row.decision,
        score: Number(row.score),
        createdAt: row.created_at,
        returns,
      });

      if (calls.length >= limit) break;
    }

    return calls;
  } catch {
    return [];
  }
}

const MAX_ROWS = 5000;

/**
 * Reads recorded outcomes and summarises them. Returns null when there is no
 * database — the caller renders that as "not configured", which is a different
 * statement from "no results yet" and must not be conflated with it.
 */
export async function fetchTrackRecord(): Promise<TrackRecord | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const { data, error } = await db
      .from('analysis_outcomes')
      .select('checkpoint,return_pct,analyses(decision)')
      .eq('status', 'recorded')
      .not('return_pct', 'is', null)
      .order('recorded_at', { ascending: false })
      .limit(MAX_ROWS);

    if (error || !data) return null;

    const rows: OutcomeRow[] = [];
    for (const row of data as any[]) {
      const decision = row.analyses?.decision;
      if (!DECISIONS.includes(decision)) continue;
      rows.push({
        decision,
        checkpoint: row.checkpoint as CheckpointKey,
        returnPct: Number(row.return_pct),
      });
    }

    return summarizeOutcomes(rows);
  } catch {
    return null;
  }
}
