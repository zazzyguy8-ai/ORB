'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getAccessToken } from '@/lib/supabase/browser';
import type { HistoryRow } from '@/lib/db/repo';

type Filter = 'ALL' | 'BUY' | 'WATCH' | 'AVOID';

const DECISION_STYLE: Record<string, { text: string; dot: string; border: string }> = {
  BUY: { text: 'text-signal-buy', dot: 'bg-signal-buy', border: 'border-l-signal-buy' },
  WATCH: { text: 'text-signal-watch', dot: 'bg-signal-watch', border: 'border-l-signal-watch' },
  AVOID: { text: 'text-signal-avoid', dot: 'bg-signal-avoid', border: 'border-l-signal-avoid' },
};

/**
 * Analysis history (spec §13).
 *
 * The point of storing every call is to be able to look back at them, so this
 * is built to be read: the decision leads each row, the distribution across
 * decisions is summarised above, and any row re-runs with one click. It is also
 * the surface where outcome tracking will eventually show what each call was
 * actually worth.
 */
export default function HistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'disabled'>('loading');
  const [filter, setFilter] = useState<Filter>('ALL');

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      const res = await fetch('/api/history', {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const payload = await res.json();
      if (payload.persistence === 'disabled') {
        setState('disabled');
        return;
      }
      setRows(payload.analyses ?? []);
      setState('ready');
    })().catch(() => setState('disabled'));
  }, []);

  const counts = useMemo(() => {
    const base: Record<string, number> = { BUY: 0, WATCH: 0, AVOID: 0 };
    for (const row of rows) base[row.decision] = (base[row.decision] ?? 0) + 1;
    return base;
  }, [rows]);

  const visible = filter === 'ALL' ? rows : rows.filter((r) => r.decision === filter);

  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="text-3xl font-bold tracking-tightest text-slate-50">Recent analyses</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Every analysis is stored with the metrics behind it, so its outcome can be measured later.
        </p>
      </div>

      {state === 'loading' && (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[68px] rounded-xl" />
          ))}
        </div>
      )}

      {state === 'disabled' && (
        <div className="card text-sm leading-relaxed text-slate-400">
          History is unavailable — this deployment has no database configured. Add the Supabase
          environment variables from{' '}
          <code className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-xs text-slate-300">
            .env.example
          </code>{' '}
          and run the migration in{' '}
          <code className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-xs text-slate-300">
            supabase/migrations
          </code>
          .
        </div>
      )}

      {state === 'ready' && rows.length === 0 && (
        <div className="card py-12 text-center">
          <p className="text-sm text-slate-400">Nothing analyzed yet.</p>
          <Link href="/app" className="btn-primary mt-5 inline-block">
            Run your first analysis
          </Link>
        </div>
      )}

      {state === 'ready' && rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {(['ALL', 'BUY', 'WATCH', 'AVOID'] as Filter[]).map((f) => {
                const active = filter === f;
                const count = f === 'ALL' ? rows.length : (counts[f] ?? 0);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
                      active
                        ? 'bg-ink-700 text-slate-100'
                        : 'text-slate-500 hover:bg-ink-800 hover:text-slate-300'
                    }`}
                  >
                    {f}
                    <span className="tabular ml-1.5 font-mono text-[11px] text-slate-500">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="tabular text-xs text-slate-600">
              {visible.length} shown · newest first
            </p>
          </div>

          <ul className="space-y-2">
            {visible.map((row, i) => {
              const style = DECISION_STYLE[row.decision] ?? DECISION_STYLE.WATCH;
              return (
                <li
                  key={row.id}
                  className={`animate-fade-up card hover-lift border-l-2 py-3.5 ${style.border}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="flex items-baseline gap-2 text-sm font-semibold text-slate-100">
                          {row.symbol ? `$${row.symbol}` : `${row.address.slice(0, 6)}…`}
                          <span className="text-xs font-normal text-slate-600">
                            {new Date(row.createdAt).toLocaleString()}
                          </span>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {row.reasons[0] ?? 'No reason recorded.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-4">
                      <div className="text-right">
                        <p className="tabular font-mono text-xs text-slate-500">
                          {row.score.toFixed(0)}
                          <span className="text-slate-700">/100</span>
                        </p>
                        <p className="tabular font-mono text-[11px] text-slate-600">
                          {row.confidence} conf
                        </p>
                      </div>
                      <span className={`w-16 text-right text-sm font-bold ${style.text}`}>
                        {row.decision}
                      </span>
                      <Link
                        href={`/app?address=${row.address}`}
                        className="pill"
                        aria-label={`Re-run analysis for ${row.symbol ?? row.address}`}
                      >
                        Re-run
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Sets the expectation before the data exists, rather than shipping an
              empty column that looks broken. */}
          <p className="border-t border-ink-800 pt-4 text-xs leading-relaxed text-slate-600">
            Price checkpoints at +5m, +15m, +1h, +6h and +24h are recorded for every analysis. Once
            enough have matured, this page will show what each call was actually worth.
          </p>
        </>
      )}
    </div>
  );
}
