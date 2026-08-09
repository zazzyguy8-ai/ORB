import { describe, expect, it } from 'vitest';
import { buildVerdict, fieldCoverage, type HostProbe, type ParseProbe } from '@/lib/diagnostics/probe';
import { marketData } from './helpers';

const host = (over: Partial<HostProbe> = {}): HostProbe => ({
  name: 'dexscreener',
  url: 'https://api.dexscreener.com/...',
  ok: true,
  status: 200,
  latencyMs: 120,
  bytes: 4096,
  error: null,
  ...over,
});

const probe = (over: Partial<ParseProbe> = {}): ParseProbe => ({
  provider: 'market',
  source: 'dexscreener',
  status: 'ok',
  latencyMs: 120,
  reason: null,
  populated: 20,
  total: 22,
  missing: [],
  ...over,
});

describe('fieldCoverage', () => {
  it('flattens nested objects to leaf paths', () => {
    const coverage = fieldCoverage(marketData());
    expect(coverage['priceUsd']).toBe(true);
    expect(coverage['volumeUsd.h1']).toBe(true);
    expect(coverage['txns.m5.buys']).toBe(true);
  });

  it('marks nulls as absent', () => {
    const coverage = fieldCoverage(marketData({ marketCapUsd: null, pairCreatedAtMs: null }));
    expect(coverage['marketCapUsd']).toBe(false);
    expect(coverage['pairCreatedAtMs']).toBe(false);
    expect(coverage['priceUsd']).toBe(true);
  });

  it('treats an empty array as absent and a filled one as present', () => {
    expect(fieldCoverage({ topHolders: [] })['topHolders']).toBe(false);
    expect(fieldCoverage({ topHolders: [{ address: 'a', pct: 1 }] })['topHolders']).toBe(true);
  });

  it('returns nothing for a non-object', () => {
    expect(fieldCoverage(null)).toEqual({});
    expect(fieldCoverage('text')).toEqual({});
  });
});

describe('buildVerdict', () => {
  it('is silent when everything is healthy', () => {
    expect(buildVerdict([host()], [probe()])).toEqual([]);
  });

  it('names the changed-shape case explicitly — the silent failure we care about', () => {
    const verdict = buildVerdict([host()], [probe({ populated: 0, total: 22 })]);
    expect(verdict).toHaveLength(1);
    expect(verdict[0]).toContain('EVERY field is null');
    expect(verdict[0]).toContain('response shape');
  });

  it('flags partial coverage and names the missing fields', () => {
    const verdict = buildVerdict(
      [host()],
      [probe({ populated: 4, total: 22, missing: ['priceUsd', 'liquidityUsd'] })],
    );
    expect(verdict[0]).toContain('4/22');
    expect(verdict[0]).toContain('priceUsd');
  });

  it('distinguishes unreachable from rate-limited', () => {
    const unreachable = buildVerdict(
      [host({ ok: false, status: null, error: 'Provider timed out.' })],
      [],
    );
    expect(unreachable[0]).toContain('unreachable');
    expect(unreachable[0]).toContain('egress');

    const limited = buildVerdict([host({ ok: false, status: 429 })], []);
    expect(limited[0]).toContain('429');
    expect(limited[0]).toContain('Rate limited');
  });

  it('quotes the upstream body, which usually is the actual answer', () => {
    const verdict = buildVerdict(
      [
        host({
          ok: false,
          status: 403,
          error: 'Host not in allowlist: api.dexscreener.com. Add this host to your egress settings.',
        }),
      ],
      [],
    );
    expect(verdict[0]).toContain('allowlist');
    expect(verdict[0]).toContain('egress');
  });

  it('truncates a long upstream body instead of pasting a whole HTML page', () => {
    const verdict = buildVerdict([host({ ok: false, status: 500, error: 'x'.repeat(5000) })], []);
    expect(verdict[0].length).toBeLessThan(300);
  });

  it('does not complain about a provider that is unavailable by configuration', () => {
    // No HELIUS_API_KEY is a deployment choice, not a defect.
    const verdict = buildVerdict(
      [host()],
      [probe({ provider: 'wallets', status: 'unavailable', reason: 'needs key', total: 0, populated: 0 })],
    );
    expect(verdict).toEqual([]);
  });

  it('reports a provider whose request errored', () => {
    const verdict = buildVerdict([host()], [probe({ status: 'error', reason: 'Provider responded 500.' })]);
    expect(verdict[0]).toContain('request failed');
    expect(verdict[0]).toContain('500');
  });

  it('orders host problems before parse problems', () => {
    const verdict = buildVerdict(
      [host({ name: 'goplus', ok: false, status: 503 })],
      [probe({ populated: 0, total: 22 })],
    );
    expect(verdict[0]).toContain('goplus');
    expect(verdict[1]).toContain('EVERY field is null');
  });
});
