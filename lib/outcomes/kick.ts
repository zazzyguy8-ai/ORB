import { recordDueOutcomes } from '@/lib/outcomes/tracker';

/**
 * Opportunistic outcome tracking.
 *
 * The checkpoints only mean something if somebody prices them on time, and the
 * deployment this runs on has no minute-level scheduler on its free tier. So
 * every analysis request also nudges the tracker: traffic becomes the clock.
 *
 * This does not replace a real scheduler — a quiet hour still lets checkpoints
 * go stale, and they are then recorded as stale rather than silently backdated.
 * It makes outcome tracking work with no setup at all, and it keeps working
 * alongside a cron once one is pointed at /api/cron/snapshots.
 *
 * Two guards keep it honest about cost: at most one run per interval, and never
 * two at once. Both are per-instance, which is the right granularity — the
 * database work is idempotent, so a second instance duplicating a run is
 * wasteful but never wrong.
 */

const MIN_INTERVAL_MS = 60_000;

let lastRunAt = 0;
let running = false;

/** Pure form of the guard, so the throttle can be tested without timers. */
export function shouldKick(nowMs: number, lastRunAtMs: number, isRunning: boolean): boolean {
  if (isRunning) return false;
  return nowMs - lastRunAtMs >= MIN_INTERVAL_MS;
}

/**
 * Fire-and-forget. Never awaited by a request handler and never throws — a
 * failure here must not touch the analysis the user is waiting on.
 */
export function kickOutcomeTracker(nowMs: number = Date.now()): void {
  if (!shouldKick(nowMs, lastRunAt, running)) return;

  lastRunAt = nowMs;
  running = true;

  void recordDueOutcomes()
    .catch(() => {
      // Deliberately silent: the tracker is best-effort background work, and a
      // provider outage here is already visible in the outcome rows themselves.
    })
    .finally(() => {
      running = false;
    });
}

/** Test seam — resets the module-level guards between cases. */
export function resetKickState(): void {
  lastRunAt = 0;
  running = false;
}
