import { formatElapsed, type AnalysisDelta } from '@/lib/decision/delta';

const ARROW = { up: '↑', down: '↓', flat: '→', unknown: '·' } as const;

const DIRECTION_CLASS = {
  up: 'text-signal-buy',
  down: 'text-signal-avoid',
  flat: 'text-slate-400',
  unknown: 'text-slate-600',
} as const;

/**
 * "Since you last looked."
 *
 * A live data feed can tell anyone what a token looks like right now. Only our
 * stored history knows what this model said about it two hours ago, so this is
 * the panel that cannot be replicated by pointing a browser at DexScreener.
 *
 * Rendered only when the token has actually been analysed before — an empty
 * comparison is worse than none.
 */
export function DeltaBanner({ delta }: { delta: AnalysisDelta }) {
  const accent = delta.decisionChanged
    ? delta.scoreDelta > 0
      ? 'border-signal-buy/35 bg-signal-buy/[0.06]'
      : 'border-signal-avoid/35 bg-signal-avoid/[0.06]'
    : 'border-ink-700 bg-ink-900/50';

  return (
    <section
      className={`animate-fade-up rounded-2xl border px-5 py-4 ${accent}`}
      style={{ animationDelay: '140ms' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-3">
          <span className="label">Since last analysis</span>
          {delta.decisionChanged && (
            <span className="flex items-center gap-1.5 font-mono text-sm font-bold">
              <span className="text-slate-500">{delta.previousDecision}</span>
              <span className="text-slate-600" aria-hidden>
                →
              </span>
              <span
                className={delta.scoreDelta > 0 ? 'text-signal-buy' : 'text-signal-avoid'}
              >
                {delta.currentDecision}
              </span>
            </span>
          )}
        </div>
        <span className="tabular text-xs text-slate-600">
          {formatElapsed(delta.minutesSince)}
        </span>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-slate-300">{delta.summary}</p>

      <dl className="mt-3.5 grid grid-cols-3 gap-3 border-t border-ink-700/60 pt-3">
        {delta.lines.map((line) => (
          <div key={line.label}>
            <dt className="label">{line.label}</dt>
            <dd
              className={`tabular mt-1 flex items-baseline gap-1.5 font-mono text-sm font-medium ${DIRECTION_CLASS[line.direction]}`}
            >
              <span aria-hidden>{ARROW[line.direction]}</span>
              {line.changePct === null ? (
                'no data'
              ) : (
                <>
                  {line.changePct > 0 ? '+' : ''}
                  {line.changePct.toFixed(1)}
                  {line.label === 'Score' ? ' pts' : '%'}
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
