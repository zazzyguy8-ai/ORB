'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/supabase/browser';
import type { HistoryRow } from '@/lib/db/repo';

const DECISION_COLORS: Record<string, string> = {
  BUY: 'text-signal-buy',
  WATCH: 'text-signal-watch',
  AVOID: 'text-signal-avoid',
};

export default function HistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'disabled'>('loading');

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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Recent analyses</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every analysis is stored with its metrics so its outcome can be measured later.
        </p>
      </div>

      {state === 'loading' && <p className="text-sm text-slate-500">Loading…</p>}

      {state === 'disabled' && (
        <div className="card text-sm text-slate-400">
          History is unavailable — this deployment has no database configured. Add the Supabase
          environment variables from <code className="font-mono text-slate-300">.env.example</code>{' '}
          and run the migration in{' '}
          <code className="font-mono text-slate-300">supabase/migrations</code>.
        </div>
      )}

      {state === 'ready' && rows.length === 0 && (
        <div className="card text-sm text-slate-400">
          Nothing analyzed yet.{' '}
          <Link href="/app" className="text-slate-200 underline">
            Run your first analysis.
          </Link>
        </div>
      )}

      {state === 'ready' && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="card flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200">
                  {row.symbol ? `$${row.symbol}` : row.address.slice(0, 8) + '…'}
                  <span className="ml-2 text-xs text-slate-600">
                    {new Date(row.createdAt).toLocaleString()}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {row.reasons[0] ?? 'No reason recorded.'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-slate-500">
                  {row.score.toFixed(0)}/100
                </span>
                <span className={`text-sm font-bold ${DECISION_COLORS[row.decision] ?? ''}`}>
                  {row.decision}
                </span>
                <Link
                  href={`/app?address=${row.address}`}
                  className="text-xs text-slate-400 underline"
                >
                  re-run
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
