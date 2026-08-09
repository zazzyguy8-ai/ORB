import { describe, expect, it } from 'vitest';
import {
  buildDatabaseVerdict,
  describeDbError,
  EXPECTED_TABLES,
  type DatabaseProbe,
  type TableProbe,
} from '@/lib/diagnostics/database';

const table = (over: Partial<TableProbe> = {}): TableProbe => ({
  table: 'analyses',
  ok: true,
  rows: 0,
  error: null,
  ...over,
});

const probe = (tables: TableProbe[]): DatabaseProbe => ({
  configured: true,
  host: 'project.supabase.co',
  latencyMs: 40,
  tables,
});

const allHealthy = () => EXPECTED_TABLES.map((name) => table({ table: name }));

describe('buildDatabaseVerdict', () => {
  it('is silent when every table is readable', () => {
    expect(buildDatabaseVerdict(probe(allHealthy()))).toEqual([]);
  });

  it('distinguishes an empty table from a missing one', () => {
    // Zero rows is the normal state before the first analysis — not a problem.
    const empty = allHealthy().map((t) => ({ ...t, rows: 0 }));
    expect(buildDatabaseVerdict(probe(empty))).toEqual([]);
  });

  it('names the migration when nothing exists at all', () => {
    const missing = EXPECTED_TABLES.map((name) =>
      table({ table: name, ok: false, rows: null, error: `relation "${name}" does not exist` }),
    );
    const verdict = buildDatabaseVerdict(probe(missing));
    expect(verdict).toHaveLength(1);
    expect(verdict[0]).toContain('NO tables exist');
    expect(verdict[0]).toContain('0001_init.sql');
  });

  it('catches a partially applied migration and lists what is missing', () => {
    const tables = allHealthy();
    tables[3] = table({
      table: 'analysis_metrics',
      ok: false,
      rows: null,
      error: 'relation "analysis_metrics" does not exist',
    });
    const verdict = buildDatabaseVerdict(probe(tables));
    expect(verdict[0]).toContain('applied partially');
    expect(verdict[0]).toContain('analysis_metrics');
  });

  it('reports a permission failure separately from a missing table', () => {
    const tables = allHealthy();
    tables[0] = table({
      table: 'users',
      ok: false,
      rows: null,
      error: 'permission denied for table users',
    });
    const verdict = buildDatabaseVerdict(probe(tables));
    expect(verdict[0]).toContain('not readable');
    expect(verdict[0]).toContain('permission denied');
    expect(verdict[0]).not.toContain('migration');
  });

  it('states plainly when persistence is simply not configured', () => {
    const verdict = buildDatabaseVerdict({
      configured: false,
      host: null,
      latencyMs: 0,
      tables: [],
    });
    expect(verdict[0]).toContain('not configured');
    expect(verdict[0]).toContain('analysis still works');
  });

  it('covers every table the persistence layer writes to', () => {
    // Guards against adding a table to the schema and forgetting the probe.
    for (const name of [
      'users',
      'tokens',
      'analyses',
      'analysis_metrics',
      'risk_flags',
      'wallet_events',
      'price_snapshots',
      'analysis_outcomes',
    ]) {
      expect(EXPECTED_TABLES).toContain(name);
    }
  });
});

describe('describeDbError', () => {
  it('joins the fields PostgrestError actually populates', () => {
    expect(
      describeDbError({ message: 'permission denied', details: 'for table users', code: '42501' }),
    ).toBe('permission denied for table users (code 42501)');
  });

  it('never renders an empty explanation for a transport failure', () => {
    // supabase-js surfaces a failed fetch as an error object with no message.
    const described = describeDbError({ message: '', details: '', hint: '', code: '' });
    expect(described.length).toBeGreaterThan(20);
    expect(described).toContain('no response from the database host');
  });

  it('falls back to the code when that is all there is', () => {
    expect(describeDbError({ code: 'PGRST301' })).toContain('PGRST301');
  });

  it('handles a non-object', () => {
    expect(describeDbError(null)).toBe('Unknown database error.');
  });
});

describe('verdict noise', () => {
  it('collapses an identical failure across every table into one line', () => {
    const tables = EXPECTED_TABLES.map((name) =>
      table({ table: name, ok: false, rows: null, error: 'no response from the database host' }),
    );
    const verdict = buildDatabaseVerdict(probe(tables));
    expect(verdict).toHaveLength(1);
    expect(verdict[0]).toContain('no table is readable');
  });

  it('still lists tables individually when the failures differ', () => {
    const tables = allHealthy();
    tables[0] = table({ table: 'users', ok: false, rows: null, error: 'permission denied' });
    tables[1] = table({ table: 'tokens', ok: false, rows: null, error: 'relation does not exist' });
    expect(buildDatabaseVerdict(probe(tables)).length).toBeGreaterThan(1);
  });
});
