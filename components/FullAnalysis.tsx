'use client';

import { useState } from 'react';
import type { AnalysisResult, CategoryScore } from '@/lib/types/domain';

const CATEGORY_LABELS: Record<string, string> = {
  momentum: 'Momentum',
  liquidity: 'Liquidity',
  holders: 'Holder health',
  wallets: 'Wallet activity',
  developer: 'Developer risk',
  trading: 'Trading activity',
  security: 'Security / rug risk',
};

function scoreColor(score: number | null): string {
  if (score === null) return 'bg-ink-600';
  if (score >= 65) return 'bg-signal-buy';
  if (score >= 45) return 'bg-signal-watch';
  return 'bg-signal-avoid';
}

function formatValue(value: number | null): string {
  if (value === null) return 'no data';
  if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString('en-US');
  if (Math.abs(value) >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

/**
 * Everything the decision was built from, collapsed by default.
 * The spec is explicit that the verdict must dominate — this exists for the
 * trader who wants to audit it, not for the first three seconds.
 */
export function FullAnalysis({ result }: { result: AnalysisResult }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-slate-200">Full analysis</span>
        <span className="text-xs text-slate-500">
          score {result.score.total.toFixed(1)}/100 · {(result.score.coverage * 100).toFixed(0)}% data
          coverage {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="mt-5 space-y-6">
          <div className="space-y-3">
            {result.score.categories.map((category) => (
              <CategoryRow key={category.category} category={category} />
            ))}
          </div>

          <div className="border-t border-ink-700 pt-4">
            <p className="label">Pipeline</p>
            <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-xs text-slate-400 sm:grid-cols-4">
              <span>total {result.timings.totalMs}ms</span>
              <span>collect {result.timings.collectMs}ms</span>
              <span>compute {result.timings.computeMs}ms</span>
              <span>ai {result.timings.aiMs}ms</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-xs text-slate-500 sm:grid-cols-5">
              {Object.entries(result.timings.providers).map(([key, ms]) => (
                <span key={key}>
                  {key} {ms}ms · {result.availability[key as keyof typeof result.availability]}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Explanation source: {result.explanation.source}
              {result.explanation.fallbackReason ? ` (${result.explanation.fallbackReason})` : ''} ·
              model {result.score.version}
            </p>
          </div>

          <div className="border-t border-ink-700 pt-4">
            <p className="label">Contract</p>
            <p className="mt-1 break-all font-mono text-xs text-slate-400">{result.address}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function CategoryRow({ category }: { category: CategoryScore }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-slate-300">{CATEGORY_LABELS[category.category] ?? category.category}</span>
        <span className="font-mono text-xs text-slate-400">
          {category.score === null ? 'no data' : `${category.score.toFixed(0)}/100`}
          {category.coverage < 1 && category.coverage > 0
            ? ` · ${(category.coverage * 100).toFixed(0)}% covered`
            : ''}
        </span>
      </div>

      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-700">
        <div
          className={`h-full rounded-full ${scoreColor(category.score)}`}
          style={{ width: `${category.score ?? 0}%` }}
        />
      </div>

      <ul className="mt-1.5 space-y-0.5">
        {category.contributions.map((contribution) => (
          <li
            key={contribution.key}
            className="flex justify-between gap-4 text-xs text-slate-500"
          >
            <span>{contribution.label}</span>
            <span className="shrink-0 font-mono">
              {formatValue(contribution.value)}
              {contribution.value !== null ? ` → ${contribution.score.toFixed(0)}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
