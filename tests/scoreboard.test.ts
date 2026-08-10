import { describe, expect, it } from 'vitest';
import {
  MIN_SAMPLES,
  summarizeOutcomes,
  type Decision,
  type OutcomeRow,
} from '@/lib/outcomes/scoreboard';
import type { CheckpointKey } from '@/lib/db/repo';

const NOW = 1_760_000_000_000;

function rows(
  decision: Decision,
  checkpoint: CheckpointKey,
  returns: number[],
): OutcomeRow[] {
  return returns.map((returnPct) => ({ decision, checkpoint, returnPct }));
}

/** n outcomes of the same value — the quickest way to clear the gate. */
function repeat(
  decision: Decision,
  checkpoint: CheckpointKey,
  value: number,
  count = MIN_SAMPLES,
): OutcomeRow[] {
  return rows(decision, checkpoint, Array.from({ length: count }, () => value));
}

const cell = (record: ReturnType<typeof summarizeOutcomes>, d: Decision, c: CheckpointKey) =>
  record.decisions.find((x) => x.decision === d)!.checkpoints.find((x) => x.checkpoint === c)!;

describe('summarizeOutcomes', () => {
  it('publishes nothing until a cell has enough samples behind it', () => {
    const record = summarizeOutcomes(
      repeat('BUY', 'h24', 12, MIN_SAMPLES - 1),
      NOW,
    );

    const h24 = cell(record, 'BUY', 'h24');
    expect(h24.samples).toBe(MIN_SAMPLES - 1);
    expect(h24.medianReturnPct).toBeNull();
    expect(h24.hitRate).toBeNull();
    expect(record.hasPublishableCell).toBe(false);
    // The count itself is still reported — hiding it would look like hiding.
    expect(record.totalOutcomes).toBe(MIN_SAMPLES - 1);
  });

  it('publishes a cell the moment it reaches the threshold', () => {
    const record = summarizeOutcomes(repeat('BUY', 'h24', 12), NOW);
    expect(record.hasPublishableCell).toBe(true);
    expect(cell(record, 'BUY', 'h24').medianReturnPct).toBeCloseTo(12, 5);
  });

  it('reports the median, not the average, as the headline number', () => {
    // Nineteen flat calls and one 1000% moonshot: the average says +50%, which
    // describes no call that actually happened.
    const values = [...Array.from({ length: MIN_SAMPLES - 1 }, () => 0), 1000];
    const record = summarizeOutcomes(rows('BUY', 'h24', values), NOW);
    const h24 = cell(record, 'BUY', 'h24');

    expect(h24.medianReturnPct).toBeCloseTo(0, 5);
    expect(h24.avgReturnPct).toBeCloseTo(50, 5);
  });

  it('grades BUY on going up and AVOID on not going up', () => {
    const record = summarizeOutcomes(
      [
        ...repeat('BUY', 'h1', 5, MIN_SAMPLES / 2),
        ...repeat('BUY', 'h1', -5, MIN_SAMPLES / 2),
        ...repeat('AVOID', 'h1', -5, MIN_SAMPLES / 2),
        ...repeat('AVOID', 'h1', 5, MIN_SAMPLES / 2),
      ],
      NOW,
    );

    expect(cell(record, 'BUY', 'h1').hitRate).toBeCloseTo(0.5, 5);
    expect(cell(record, 'AVOID', 'h1').hitRate).toBeCloseTo(0.5, 5);
  });

  it('counts an exactly flat token for AVOID and against BUY', () => {
    const flatBuy = summarizeOutcomes(repeat('BUY', 'h1', 0), NOW);
    const flatAvoid = summarizeOutcomes(repeat('AVOID', 'h1', 0), NOW);

    expect(cell(flatBuy, 'BUY', 'h1').hitRate).toBe(0);
    expect(cell(flatAvoid, 'AVOID', 'h1').hitRate).toBe(1);
  });

  it('never assigns WATCH a hit rate, because WATCH claims no direction', () => {
    const record = summarizeOutcomes(repeat('WATCH', 'h24', 30), NOW);
    const h24 = cell(record, 'WATCH', 'h24');

    expect(h24.samples).toBe(MIN_SAMPLES);
    expect(h24.medianReturnPct).toBeCloseTo(30, 5);
    expect(h24.hitRate).toBeNull();
    expect(record.decisions.find((d) => d.decision === 'WATCH')!.headlineHitRate).toBeNull();
  });

  it('keeps decisions and checkpoints in separate buckets', () => {
    const record = summarizeOutcomes(
      [...repeat('BUY', 'm5', 1), ...repeat('BUY', 'h24', 50), ...repeat('AVOID', 'h24', -50)],
      NOW,
    );

    expect(cell(record, 'BUY', 'm5').medianReturnPct).toBeCloseTo(1, 5);
    expect(cell(record, 'BUY', 'h24').medianReturnPct).toBeCloseTo(50, 5);
    expect(cell(record, 'AVOID', 'h24').medianReturnPct).toBeCloseTo(-50, 5);
    expect(cell(record, 'WATCH', 'h24').samples).toBe(0);
  });

  it('takes the headline hit rate from 24h, not from whichever cell looks best', () => {
    const record = summarizeOutcomes(
      [...repeat('BUY', 'm5', 10), ...repeat('BUY', 'h24', -10)],
      NOW,
    );
    expect(cell(record, 'BUY', 'm5').hitRate).toBe(1);
    expect(record.decisions.find((d) => d.decision === 'BUY')!.headlineHitRate).toBe(0);
  });

  it('averages the two middle values on an even sample', () => {
    const values = [
      ...Array.from({ length: MIN_SAMPLES / 2 }, () => 10),
      ...Array.from({ length: MIN_SAMPLES / 2 }, () => 20),
    ];
    expect(cell(summarizeOutcomes(rows('BUY', 'h1', values), NOW), 'BUY', 'h1').medianReturnPct)
      .toBeCloseTo(15, 5);
  });

  it('drops non-finite returns rather than poisoning a median with them', () => {
    const record = summarizeOutcomes(
      [...repeat('BUY', 'h1', 5), ...rows('BUY', 'h1', [Number.NaN, Number.POSITIVE_INFINITY])],
      NOW,
    );
    const h1 = cell(record, 'BUY', 'h1');
    expect(h1.samples).toBe(MIN_SAMPLES);
    expect(h1.medianReturnPct).toBeCloseTo(5, 5);
  });

  it('returns a complete empty shape when nothing has been recorded', () => {
    const record = summarizeOutcomes([], NOW);
    expect(record.totalOutcomes).toBe(0);
    expect(record.hasPublishableCell).toBe(false);
    expect(record.decisions).toHaveLength(3);
    // Every checkpoint is still present, so the table renders its own skeleton.
    expect(record.decisions[0].checkpoints).toHaveLength(5);
    expect(record.generatedAt).toBe(new Date(NOW).toISOString());
  });
});
