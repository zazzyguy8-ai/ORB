import type { RiskFlag, Severity } from '@/lib/types/domain';

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: 'border-signal-avoid/50 bg-signal-avoid/10 text-signal-avoid',
  high: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
  medium: 'border-signal-watch/40 bg-signal-watch/10 text-signal-watch',
  low: 'border-ink-600 bg-ink-800 text-slate-400',
};

export function RiskFlags({ flags, unavailable }: { flags: RiskFlag[]; unavailable: string[] }) {
  if (flags.length === 0 && unavailable.length === 0) {
    return (
      <section className="card">
        <p className="label">Risk flags</p>
        <p className="mt-2 text-sm text-slate-400">
          No risk rules triggered on the data we could collect.
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <p className="label">Risk flags</p>

      <ul className="mt-3 space-y-2">
        {flags.map((flag) => (
          <li
            key={flag.code}
            className={`rounded-lg border px-3.5 py-2.5 ${SEVERITY_STYLES[flag.severity]}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {flag.severity}
              </span>
              <span className="text-sm font-semibold">{flag.title}</span>
            </div>
            <p className="mt-1 text-sm text-slate-300">{flag.detail}</p>
          </li>
        ))}
      </ul>

      {unavailable.length > 0 && (
        <div className="mt-4 border-t border-ink-700 pt-3">
          {/* Spec §4/§7: an unchecked category is stated as unchecked, never as clean. */}
          <p className="label">Not checked</p>
          <ul className="mt-1.5 space-y-1">
            {unavailable.map((gap) => (
              <li key={gap} className="text-sm text-slate-500">
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
