import type { AnalysisResult, Decision } from '@/lib/types/domain';

const DECISION_STYLES: Record<Decision, { text: string; border: string; glow: string; note: string }> = {
  BUY: {
    text: 'text-signal-buy',
    border: 'border-signal-buy/40',
    glow: 'bg-signal-buy/[0.07]',
    note: 'Signals are positive and risk is within the model’s tolerance. Still a high-risk trade.',
  },
  WATCH: {
    text: 'text-signal-watch',
    border: 'border-signal-watch/40',
    glow: 'bg-signal-watch/[0.07]',
    note: 'Interesting, but the evidence is incomplete, conflicting, or the risk is elevated.',
  },
  AVOID: {
    text: 'text-signal-avoid',
    border: 'border-signal-avoid/40',
    glow: 'bg-signal-avoid/[0.07]',
    note: 'Major red flags or poor risk/reward on the available evidence.',
  },
};

function formatUsd(value: number | null): string {
  if (value === null) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toPrecision(3)}`;
}

function formatAge(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
}

export function DecisionCard({ result }: { result: AnalysisResult }) {
  const style = DECISION_STYLES[result.decision];

  return (
    <section className={`animate-fade-up rounded-2xl border ${style.border} ${style.glow} p-6 sm:p-8`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label">Token</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-100">
            {result.symbol ? `$${result.symbol}` : 'Unknown ticker'}
          </h2>
          <p className="text-sm text-slate-400">{result.name ?? 'Unnamed token'}</p>
        </div>
        <div className="text-right">
          <p className="label">Analysis time</p>
          <p className="mt-1 font-mono text-sm text-slate-300">
            {(result.timings.totalMs / 1000).toFixed(2)}s
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <p className={`text-6xl font-bold tracking-tight sm:text-7xl ${style.text}`}>
          {result.decision}
        </p>
        <p className="text-lg text-slate-300">
          <span className="font-semibold text-slate-100">{result.confidence}</span>
          <span className="text-slate-500">/100 confidence</span>
        </p>
      </div>
      <p className="mt-2 max-w-xl text-sm text-slate-400">{style.note}</p>

      <div className="mt-6">
        <p className="label">Why</p>
        <ul className="mt-2 space-y-1.5">
          {result.explanation.reasons.map((reason, i) => (
            <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-slate-200">
              <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-slate-500" aria-hidden />
              {reason}
            </li>
          ))}
          {result.explanation.reasons.length === 0 && (
            <li className="text-sm text-slate-500">Data unavailable.</li>
          )}
        </ul>
      </div>

      <dl className="mt-7 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-ink-700 pt-5 sm:grid-cols-4">
        <Stat label="Price" value={formatUsd(result.market?.priceUsd ?? null)} />
        <Stat label="Liquidity" value={formatUsd(result.metrics.liquidityUsd)} />
        <Stat label="Market cap" value={formatUsd(result.metrics.marketCapUsd)} />
        <Stat label="Pair age" value={formatAge(result.metrics.tokenAgeMinutes)} />
      </dl>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="mt-1 font-mono text-sm text-slate-200">{value}</dd>
    </div>
  );
}
