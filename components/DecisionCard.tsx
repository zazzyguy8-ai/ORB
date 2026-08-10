import { ScoreRing } from '@/components/ScoreRing';
import { TokenIdentity } from '@/components/TokenIdentity';
import type { AnalysisResult, Decision } from '@/lib/types/domain';

const DECISION_STYLES: Record<
  Decision,
  { text: string; border: string; wash: string; glow: string; note: string }
> = {
  BUY: {
    text: 'text-signal-buy',
    border: 'border-signal-buy/30',
    wash: 'from-signal-buy/[0.08]',
    glow: 'drop-shadow-[0_0_28px_rgba(46,232,138,0.28)]',
    note: 'Signals are positive and risk sits inside the model’s tolerance. Still a high-risk trade.',
  },
  WATCH: {
    text: 'text-signal-watch',
    border: 'border-signal-watch/30',
    wash: 'from-signal-watch/[0.08]',
    glow: 'drop-shadow-[0_0_28px_rgba(255,192,67,0.24)]',
    note: 'Interesting, but the evidence is incomplete, conflicting, or the risk is elevated.',
  },
  AVOID: {
    text: 'text-signal-avoid',
    border: 'border-signal-avoid/30',
    wash: 'from-signal-avoid/[0.08]',
    glow: 'drop-shadow-[0_0_28px_rgba(255,90,82,0.24)]',
    note: 'Major red flags, or poor risk/reward on the available evidence.',
  },
};

function formatUsd(value: number | null): string {
  if (value === null) return '—';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value > 0) return `$${value.toPrecision(3)}`;
  return '$0';
}

function formatAge(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  if (minutes < 43200) return `${(minutes / 1440).toFixed(0)}d`;
  return `${(minutes / 43200).toFixed(1)}mo`;
}

function formatPct(value: number | null): { text: string; className: string } {
  if (value === null) return { text: '—', className: 'text-slate-500' };
  const sign = value > 0 ? '+' : '';
  return {
    text: `${sign}${value.toFixed(1)}%`,
    className:
      value > 0 ? 'text-signal-buy' : value < 0 ? 'text-signal-avoid' : 'text-slate-400',
  };
}

export function DecisionCard({ result }: { result: AnalysisResult }) {
  const style = DECISION_STYLES[result.decision];
  const change1h = formatPct(result.metrics.priceChange1h);

  return (
    <section
      className={`animate-scale-in relative overflow-hidden rounded-2xl border ${style.border}
                  bg-gradient-to-b ${style.wash} to-transparent`}
    >
      <div className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <TokenIdentity
            name={result.name}
            symbol={result.symbol}
            address={result.address}
            profile={result.market?.profile ?? null}
          />
          <div className="text-right">
            <p className="label">Analysis time</p>
            <p className="tabular mt-1 font-mono text-sm text-slate-400">
              {(result.timings.totalMs / 1000).toFixed(2)}s
            </p>
          </div>
        </div>

        {/* The verdict. Everything above is context; this is the product. */}
        <div className="mt-7 flex items-center gap-6">
          <ScoreRing value={result.confidence} decision={result.decision} />
          <div className="min-w-0">
            <p
              className={`text-6xl font-black leading-none tracking-tightest sm:text-7xl ${style.text} ${style.glow}`}
            >
              {result.decision}
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">{style.note}</p>
          </div>
        </div>

        <div className="mt-7 border-t border-ink-700/70 pt-5">
          <p className="label">Why</p>
          <ul className="mt-2.5 space-y-2">
            {result.explanation.reasons.map((reason, i) => (
              <li
                key={i}
                className="animate-fade-up flex gap-3 text-[15px] leading-relaxed text-slate-200"
                style={{ animationDelay: `${120 + i * 70}ms` }}
              >
                <span
                  className={`mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full ${style.text} bg-current`}
                  aria-hidden
                />
                {reason}
              </li>
            ))}
            {result.explanation.reasons.length === 0 && (
              <li className="text-sm text-slate-500">Data unavailable.</li>
            )}
          </ul>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px border-t border-ink-700/70 bg-ink-700/40 sm:grid-cols-5">
        <Stat label="Price" value={formatUsd(result.market?.priceUsd ?? null)} />
        <Stat label="1h" value={change1h.text} valueClass={change1h.className} />
        <Stat label="Liquidity" value={formatUsd(result.metrics.liquidityUsd)} />
        <Stat label="Market cap" value={formatUsd(result.metrics.marketCapUsd)} />
        <Stat label="Pair age" value={formatAge(result.metrics.tokenAgeMinutes)} />
      </dl>
    </section>
  );
}

function Stat({
  label,
  value,
  valueClass = 'text-slate-200',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-ink-900/80 px-4 py-3.5">
      <dt className="label">{label}</dt>
      <dd className={`tabular mt-1 font-mono text-sm font-medium ${valueClass}`}>{value}</dd>
    </div>
  );
}
