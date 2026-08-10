import type { RiskFlag, Severity } from '@/lib/types/domain';

const SEVERITY_STYLES: Record<Severity, { chip: string; row: string }> = {
  critical: {
    chip: 'bg-signal-avoid text-ink-950',
    row: 'border-signal-avoid/40 bg-signal-avoid/[0.07]',
  },
  high: {
    chip: 'bg-orange-500 text-ink-950',
    row: 'border-orange-500/35 bg-orange-500/[0.06]',
  },
  medium: {
    chip: 'bg-signal-watch text-ink-950',
    row: 'border-signal-watch/35 bg-signal-watch/[0.06]',
  },
  low: {
    chip: 'bg-ink-600 text-slate-300',
    row: 'border-ink-600 bg-ink-800/40',
  },
};

export function RiskFlags({ flags, unavailable }: { flags: RiskFlag[]; unavailable: string[] }) {
  return (
    <section className="card animate-fade-up" style={{ animationDelay: '160ms' }}>
      <div className="flex items-baseline justify-between">
        <p className="label">Risk flags</p>
        {flags.length > 0 && (
          <span className="tabular text-xs text-slate-500">{flags.length} triggered</span>
        )}
      </div>

      {flags.length === 0 ? (
        <p className="mt-2.5 text-sm text-slate-400">
          No risk rules triggered on the data we could collect.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {flags.map((flag) => {
            const style = SEVERITY_STYLES[flag.severity];
            return (
              <li key={flag.code} className={`rounded-xl border px-4 py-3 ${style.row}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${style.chip}`}
                  >
                    {flag.severity}
                  </span>
                  <span className="text-sm font-semibold text-slate-100">{flag.title}</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{flag.detail}</p>
              </li>
            );
          })}
        </ul>
      )}

      {unavailable.length > 0 && (
        <div className="mt-4 border-t border-ink-700/70 pt-3.5">
          {/* An unchecked category is stated as unchecked, never as clean. */}
          <p className="label">Not checked</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {unavailable.map((gap) => (
              <li key={gap} className="pill hover:border-ink-600 hover:text-slate-400">
                {gap.replace(/\.$/, '')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
