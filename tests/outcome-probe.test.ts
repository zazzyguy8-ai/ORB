import { describe, expect, it } from 'vitest';
import { buildOutcomeVerdict, type OutcomeProbe } from '@/lib/diagnostics/outcomes';

const probe = (over: Partial<OutcomeProbe> = {}): OutcomeProbe => ({
  configured: true,
  counts: { pending: 0, recorded: 0, failed: 0, stale: 0 },
  overdue: 0,
  error: null,
  ...over,
});

describe('buildOutcomeVerdict', () => {
  it('is silent when tracking is keeping up', () => {
    expect(
      buildOutcomeVerdict(probe({ counts: { pending: 12, recorded: 40, failed: 1, stale: 2 } })),
    ).toEqual([]);
  });

  it('says nothing at all before the first analysis', () => {
    // An empty table is not a fault; it is a deployment nobody has used yet.
    expect(buildOutcomeVerdict(probe())).toEqual([]);
  });

  it('reports overdue checkpoints as the worker not running', () => {
    const verdict = buildOutcomeVerdict(
      probe({ counts: { pending: 30, recorded: 0, failed: 0, stale: 0 }, overdue: 25 }),
    );

    expect(verdict[0]).toContain('25');
    expect(verdict[0]).toContain('due and unpriced');
    expect(verdict[0]).toContain('/api/cron/snapshots');
  });

  it('separates "arrives too late" from "never runs"', () => {
    // Both are broken tracking, but one is fixed with a scheduler and the other
    // with a faster one; a single message would send the reader the wrong way.
    const verdict = buildOutcomeVerdict(
      probe({ counts: { pending: 4, recorded: 3, failed: 0, stale: 40 } }),
    );

    expect(verdict).toHaveLength(1);
    expect(verdict[0]).toContain('stale');
    expect(verdict[0]).toContain('biased remainder');
  });

  it('tolerates a minority of stale checkpoints', () => {
    // A free instance sleeps; losing a few is expected and is not a fault to
    // report every time somebody opens the diagnostics endpoint.
    expect(
      buildOutcomeVerdict(probe({ counts: { pending: 5, recorded: 50, failed: 2, stale: 6 } })),
    ).toEqual([]);
  });

  it('reports an unreadable table instead of implying zero outcomes', () => {
    const verdict = buildOutcomeVerdict(probe({ error: 'permission denied' }));
    expect(verdict[0]).toContain('not readable');
    expect(verdict[0]).toContain('permission denied');
  });

  it('says nothing when there is no database at all', () => {
    // That case already has its own verdict line from the database probe.
    expect(buildOutcomeVerdict(probe({ configured: false }))).toEqual([]);
  });
});
