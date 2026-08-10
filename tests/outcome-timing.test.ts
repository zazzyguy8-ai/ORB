import { beforeEach, describe, expect, it } from 'vitest';
import { isStale, toleranceSeconds } from '@/lib/outcomes/tracker';
import { resetKickState, shouldKick } from '@/lib/outcomes/kick';

const MIN = 60_000;

describe('checkpoint staleness', () => {
  it('records a checkpoint priced close to its due time', () => {
    const due = 1_000_000_000;
    expect(isStale('m5', due, due)).toBe(false);
    expect(isStale('m5', due, due + 119_000)).toBe(false);
  });

  it('drops a +5m checkpoint that is hours late instead of backdating it', () => {
    // The failure this guards against: an instance sleeps, wakes at +4h, and
    // writes a 4-hour price into a row labelled "+5 min".
    const due = 1_000_000_000;
    expect(isStale('m5', due, due + 4 * 60 * MIN)).toBe(true);
  });

  it('scales the allowance with the horizon', () => {
    // Two minutes is a different thing at +5m than at +24h.
    expect(toleranceSeconds('m5')).toBeLessThan(toleranceSeconds('h1'));
    expect(toleranceSeconds('h1')).toBeLessThan(toleranceSeconds('h24'));

    const due = 1_000_000_000;
    const tenMinutesLate = due + 10 * MIN;
    expect(isStale('m5', due, tenMinutesLate)).toBe(true);
    expect(isStale('h24', due, tenMinutesLate)).toBe(false);
  });

  it('gives an unknown checkpoint the tightest allowance rather than a free pass', () => {
    expect(toleranceSeconds('nonsense')).toBe(toleranceSeconds('m5'));
  });

  it('is never stale before it is due', () => {
    const due = 1_000_000_000;
    expect(isStale('m5', due, due - 60 * MIN)).toBe(false);
  });
});

describe('opportunistic tracker kick', () => {
  beforeEach(() => resetKickState());

  it('runs when nothing has run recently', () => {
    expect(shouldKick(10 * MIN, 0, false)).toBe(true);
  });

  it('does not run twice inside the throttle window', () => {
    const now = 10 * MIN;
    expect(shouldKick(now, now - 30_000, false)).toBe(false);
    expect(shouldKick(now, now - 61_000, false)).toBe(true);
  });

  it('never overlaps a run already in flight', () => {
    // Overlapping runs would double the provider calls for the same rows.
    expect(shouldKick(10 * MIN, 0, true)).toBe(false);
  });
});
