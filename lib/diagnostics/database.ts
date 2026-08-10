import { isSupabaseConfigured } from '@/lib/config/env';
import { getDb } from '@/lib/db/client';

/**
 * Schema probe.
 *
 * The persistence layer is deliberately best-effort: a database failure must
 * degrade history and outcome tracking rather than break the analysis a user is
 * waiting on. The cost of that choice is that a missing table looks exactly
 * like an empty one — `/api/history` returns `[]` either way. This probe is
 * where that ambiguity gets resolved, so "I ran the migration" can be verified
 * instead of assumed.
 */

/** Every table the app writes to, plus the evaluation view. */
export const EXPECTED_TABLES = [
  'users',
  'tokens',
  'analyses',
  'analysis_metrics',
  'risk_flags',
  'wallet_events',
  'price_snapshots',
  'analysis_outcomes',
  'decision_performance',
] as const;

/**
 * Columns added by later migrations, each standing in for its whole migration.
 *
 * A table probe cannot see these: `analysis_outcomes` exists perfectly well
 * without them, so a half-migrated database looks healthy right up until the
 * writes that need the column start failing silently in best-effort code.
 */
export const EXPECTED_COLUMNS = [
  {
    migration: '0002_outcome_staleness',
    table: 'analysis_outcomes',
    column: 'late_by_seconds',
    consequence:
      'late checkpoints are recorded under their original label instead of being marked stale',
  },
] as const;

export interface MigrationProbe {
  migration: string;
  applied: boolean;
  error: string | null;
  consequence: string;
}

export interface TableProbe {
  table: string;
  ok: boolean;
  /** Row count when the table is readable — cheap, fetched head-only. */
  rows: number | null;
  error: string | null;
}

export interface DatabaseProbe {
  configured: boolean;
  host: string | null;
  latencyMs: number;
  tables: TableProbe[];
  migrations: MigrationProbe[];
}

/** Missing-relation errors, so a missing table reads differently to a broken one. */
function isMissingRelation(message: string): boolean {
  return /does not exist|could not find the table|schema cache/i.test(message);
}

/**
 * PostgrestError carries its detail across four optional fields, and a transport
 * failure arrives with all of them empty — which would render as "not readable —"
 * with nothing after the dash. Always produce something a human can act on.
 */
export function describeDbError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Unknown database error.';

  const e = error as { message?: string; details?: string; hint?: string; code?: string };
  const parts = [e.message, e.details, e.hint].filter(
    (part): part is string => typeof part === 'string' && part.trim().length > 0,
  );

  if (parts.length === 0) {
    return e.code
      ? `no detail returned (code ${e.code})`
      : 'no response from the database host — check the URL, the key, and network egress';
  }

  return [...parts, e.code ? `(code ${e.code})` : null].filter(Boolean).join(' ');
}

export async function probeDatabase(): Promise<DatabaseProbe> {
  const started = Date.now();

  if (!isSupabaseConfigured()) {
  return { configured: false, host: null, latencyMs: 0, tables: [], migrations: [] };
  }

  const db = getDb()!;
  let host: string | null = null;
  try {
    host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;
  } catch {
    host = 'invalid-url';
  }

  const tables = await Promise.all(
    EXPECTED_TABLES.map(async (table): Promise<TableProbe> => {
      try {
        // head:true fetches the count without transferring any rows.
        const { count, error } = await db
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) return { table, ok: false, rows: null, error: describeDbError(error) };
        return { table, ok: true, rows: count ?? 0, error: null };
      } catch (err) {
        return {
          table,
          ok: false,
          rows: null,
          error: err instanceof Error ? err.message : 'Unknown error.',
        };
      }
    }),
  );

  const missingTables = new Set(tables.filter((t) => !t.ok).map((t) => t.table));

  const migrations = await Promise.all(
    EXPECTED_COLUMNS.map(async (expected): Promise<MigrationProbe> => {
      // A missing table already produces its own verdict line; probing a column
      // on it would only repeat the same problem in different words.
      if (missingTables.has(expected.table)) {
        return {
          migration: expected.migration,
          applied: false,
          error: `${expected.table} is not readable`,
          consequence: expected.consequence,
        };
      }

      try {
        const { error } = await db
          .from(expected.table)
          .select(expected.column, { count: 'exact', head: true });

        return {
          migration: expected.migration,
          applied: !error,
          error: error ? describeDbError(error) : null,
          consequence: expected.consequence,
        };
      } catch (err) {
        return {
          migration: expected.migration,
          applied: false,
          error: err instanceof Error ? err.message : 'Unknown error.',
          consequence: expected.consequence,
        };
      }
    }),
  );

  return { configured: true, host, latencyMs: Date.now() - started, tables, migrations };
}

export function buildDatabaseVerdict(probe: DatabaseProbe): string[] {
  if (!probe.configured) {
    return [
      'database: not configured. History, outcome tracking and accounts are disabled; analysis still works.',
    ];
  }

  const failed = probe.tables.filter((t) => !t.ok);
  if (failed.length === 0) return migrationVerdict(probe);

  // Every table failing the same way is one problem, not nine — almost always
  // the host being unreachable or the key being wrong. Say it once.
  const distinctErrors = new Set(failed.map((t) => t.error ?? ''));
  if (failed.length === probe.tables.length && distinctErrors.size === 1) {
    const only = failed[0].error ?? 'unknown error';
    return isMissingRelation(only)
      ? [
          'database: reachable but NO tables exist. Run supabase/migrations/0001_init.sql in the Supabase SQL editor.',
        ]
      : [`database: no table is readable — ${only}`];
  }

  const missing = failed.filter((t) => isMissingRelation(t.error ?? ''));
  const broken = failed.filter((t) => !isMissingRelation(t.error ?? ''));
  const verdict: string[] = [];

  if (missing.length === probe.tables.length) {
    verdict.push(
      'database: reachable but NO tables exist. Run supabase/migrations/0001_init.sql in the Supabase SQL editor.',
    );
  } else if (missing.length > 0) {
    verdict.push(
      `database: ${missing.length} table(s) missing (${missing.map((t) => t.table).join(', ')}). The migration was applied partially — re-run supabase/migrations/0001_init.sql.`,
    );
  }

  for (const table of broken) {
    verdict.push(`database: \`${table.table}\` is not readable — ${table.error}`);
  }

  verdict.push(...migrationVerdict(probe));

  return verdict;
}

/**
 * Half-applied migrations, named with their consequence.
 *
 * Reported separately from the table checks because the failure mode is the
 * opposite one: nothing is broken, everything reads fine, and the damage shows
 * up later as data that is quietly wrong.
 */
export function migrationVerdict(probe: DatabaseProbe): string[] {
  return probe.migrations
    .filter((migration) => !migration.applied)
    .map(
      (migration) =>
        `database: migration ${migration.migration} has not been applied — ${migration.consequence}. Run supabase/migrations/${migration.migration}.sql in the Supabase SQL editor.`,
    );
}
