import { getDb } from '@/lib/db/client';

/**
 * Is outcome tracking actually running?
 *
 * The tracker is background work that no user ever waits on, so it can stop
 * dead without anything on screen changing — the track record simply stays
 * empty, which looks identical to "not enough calls yet". This turns that
 * silence into a number.
 */

export type OutcomeStatus = 'pending' | 'recorded' | 'failed' | 'stale';

const STATUSES: OutcomeStatus[] = ['pending', 'recorded', 'failed', 'stale'];

export interface OutcomeProbe {
  configured: boolean;
  counts: Record<OutcomeStatus, number>;
  /** Checkpoints that are due right now and have not been priced yet. */
  overdue: number;
  error: string | null;
}

export async function probeOutcomes(nowMs: number = Date.now()): Promise<OutcomeProbe> {
  const empty: Record<OutcomeStatus, number> = { pending: 0, recorded: 0, failed: 0, stale: 0 };
  const db = getDb();
  if (!db) return { configured: false, counts: empty, overdue: 0, error: null };

  try {
    const counts = { ...empty };
    let error: string | null = null;

    await Promise.all(
      STATUSES.map(async (status) => {
        const { count, error: statusError } = await db
          .from('analysis_outcomes')
          .select('*', { count: 'exact', head: true })
          .eq('status', status);

        if (statusError) {
          // One shared error line: every status fails the same way when the
          // table is missing or the column constraint has not been migrated.
          error ??= statusError.message;
          return;
        }
        counts[status] = count ?? 0;
      }),
    );

    const { count: overdue } = await db
      .from('analysis_outcomes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lte('due_at', new Date(nowMs).toISOString());

    return { configured: true, counts, overdue: overdue ?? 0, error };
  } catch (err) {
    return {
      configured: true,
      counts: empty,
      overdue: 0,
      error: err instanceof Error ? err.message : 'Unknown error.',
    };
  }
}

/**
 * Verdict lines, ordered by how much they should worry the reader.
 *
 * The distinction that matters: overdue checkpoints mean the worker is not
 * running at all, while stale ones mean it runs but arrives too late. They have
 * different fixes, so they are never collapsed into one "tracking is broken".
 */
export function buildOutcomeVerdict(probe: OutcomeProbe): string[] {
  if (!probe.configured) return [];
  if (probe.error) return [`outcomes: not readable — ${probe.error}`];

  const verdict: string[] = [];
  const { pending, recorded, stale, failed } = probe.counts;
  const total = pending + recorded + stale + failed;

  if (total === 0) return verdict;

  if (probe.overdue > 0) {
    verdict.push(
      `outcomes: ${probe.overdue} checkpoint(s) are due and unpriced — the tracker is not keeping up. It runs on analysis traffic; point a scheduler at POST /api/cron/snapshots to cover quiet periods.`,
    );
  }

  // Stale only matters as a proportion: a handful is normal on a free instance
  // that sleeps, most of them means the schedule is not being met at all.
  if (stale > 0 && stale >= recorded) {
    verdict.push(
      `outcomes: ${stale} checkpoint(s) went stale against ${recorded} recorded — most calls are never being measured on time, so the track record is built on a biased remainder.`,
    );
  }

  return verdict;
}
