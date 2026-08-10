'use client';

import { bandGap, findLevers } from '@/lib/scoring/levers';
import type { AnalysisResult } from '@/lib/types/domain';

/**
 * "What is holding this back."
 *
 * A score tells a trader where a token stands. This tells them what would have
 * to change for it to stand somewhere else — computed by re-running our own
 * weighting with one signal at its best, so every figure on screen is a fact
 * about the model rather than a guess about the token.
 *
 * The distinction matters enough to say on the panel itself: none of this is a
 * prediction that the signal will improve.
 */
export function Levers({ result }: { result: AnalysisResult }) {
  const levers = findLevers(result.score);
  const gap = bandGap(result.score, result.decision);

  if (levers.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="label">What is holding the score back</p>
        {gap.nextDecision && (
          <p className="tabular font-mono text-xs text-slate-500">
            {gap.blockedByRisk ? (
              <span className="text-signal-watch">
                score already clears {gap.nextDecision} — risk flags are the blocker
              </span>
            ) : (
              <>
                {gap.pointsNeeded!.toFixed(1)} pts from{' '}
                <span className="text-slate-300">{gap.nextDecision}</span>
              </>
            )}
          </p>
        )}
      </div>

      <ul className="space-y-2">
        {levers.map((lever, index) => (
          <li
            key={lever.key}
            className="animate-fade-up rounded-xl border border-ink-700/60 bg-ink-900/40 px-4 py-3"
            style={{ animationDelay: `${index * 45}ms` }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-slate-200">{lever.label}</span>
              <span className="tabular shrink-0 font-mono text-xs text-slate-500">
                <span className="text-signal-watch">+{lever.pointsAvailable.toFixed(1)}</span> pts
                available
              </span>
            </div>

            <p className="mt-1 text-xs leading-relaxed text-slate-500">{lever.description}</p>

            {lever.target && (
              <p className="mt-1.5 border-t border-ink-800/80 pt-1.5 text-xs leading-relaxed text-slate-600">
                <span className="text-slate-500">Would score {lever.target.score.toFixed(0)}:</span>{' '}
                {lever.target.description}
              </p>
            )}

            {/* Current vs best, as one bar: the filled part is what the signal
                scores now, the track is what the model would give at its best. */}
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-signal-watch/20">
              <div
                className="h-full rounded-full bg-slate-500 transition-[width] duration-700 ease-out"
                style={{ width: `${Math.max(2, (lever.score / lever.bestScore) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <p className="text-[11px] leading-relaxed text-slate-600">
        Points are what our own weighting would give if each signal reached its best value. Nothing
        here says it will — a token can sit at a poor value indefinitely, and a signal improving
        does not make the token safe.
      </p>
    </div>
  );
}
