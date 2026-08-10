import type { Metadata } from 'next';
import Link from 'next/link';
import {
  fetchRecentResolvedCalls,
  fetchTrackRecord,
  type CheckpointStat,
  type ResolvedCall,
  type TrackRecord,
} from '@/lib/outcomes/scoreboard';

export const metadata: Metadata = {
  title: 'Track record',
  description:
    'What every BUY, WATCH and AVOID was actually worth at 5 minutes, 15 minutes, 1 hour, 6 hours and 24 hours.',
};

// Recomputed at most every five minutes: the numbers move slowly and the query
// scans every recorded outcome.
export const revalidate = 300;

const DECISION_STYLE = {
  BUY: { text: 'text-signal-buy', border: 'border-signal-buy/30', bg: 'bg-signal-buy/[0.05]' },
  WATCH: {
    text: 'text-signal-watch',
    border: 'border-signal-watch/30',
    bg: 'bg-signal-watch/[0.05]',
  },
  AVOID: {
    text: 'text-signal-avoid',
    border: 'border-signal-avoid/30',
    bg: 'bg-signal-avoid/[0.05]',
  },
} as const;

/**
 * The scoreboard.
 *
 * Anyone can publish a signal; almost nobody publishes what their signals were
 * worth afterwards. This page exists because the model is only worth trusting
 * if it can be checked, and it is deliberately built so a bad month shows up
 * here as plainly as a good one.
 */
export default async function TrackRecordPage() {
  const [record, calls] = await Promise.all([fetchTrackRecord(), fetchRecentResolvedCalls()]);

  return (
    <div className="space-y-6 py-2">
      <header>
        <h1 className="text-3xl font-bold tracking-tightest text-slate-50">Track record</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
          Every analysis schedules five price checkpoints at the moment it is made. Nothing on this
          page is chosen after the fact — the calls below were recorded before their outcomes
          existed.
        </p>
      </header>

      {record === null ? (
        <NotConfigured />
      ) : record.totalOutcomes === 0 ? (
        <Empty />
      ) : (
        <Scoreboard record={record} />
      )}

      {calls.length > 0 && <RecentCalls calls={calls} />}

      <Methodology />
    </div>
  );
}

function Scoreboard({ record }: { record: TrackRecord }) {
  const graded = record.decisions.filter((d) => d.headlineHitRate !== null);

  return (
    <div className="space-y-5">
      {!record.hasPublishableCell && (
        <div className="card border-signal-watch/25 bg-signal-watch/[0.04] text-sm leading-relaxed text-slate-300">
          <span className="font-semibold text-slate-100">Collecting.</span> {record.totalOutcomes}{' '}
          outcome{record.totalOutcomes === 1 ? '' : 's'} recorded so far. Results are published per
          cell once it reaches {record.minSamples} — a median built on a handful of tokens looks
          authoritative and tells you nothing, so it stays hidden until it means something.
        </div>
      )}

      {graded.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {graded.map((decision) => {
            const style = DECISION_STYLE[decision.decision];
            return (
              <div
                key={decision.decision}
                className={`animate-fade-up card ${style.border} ${style.bg}`}
              >
                <p className="label">{decision.decision} · called right at 24 h</p>
                <p className={`tabular mt-2 font-mono text-4xl font-bold ${style.text}`}>
                  {(decision.headlineHitRate! * 100).toFixed(0)}
                  <span className="text-xl text-slate-600">%</span>
                </p>
                <p className="mt-1.5 text-xs text-slate-500">
                  {decision.decision === 'BUY'
                    ? 'Share of BUY calls that were above their entry price 24 hours later.'
                    : 'Share of AVOID calls that were not above their price 24 hours later.'}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-700/70">
              <th className="label px-5 py-3 text-left font-semibold">Decision</th>
              {record.decisions[0].checkpoints.map((c) => (
                <th key={c.checkpoint} className="label px-3 py-3 text-right font-semibold">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {record.decisions.map((decision) => (
              <tr
                key={decision.decision}
                className="border-b border-ink-800/70 last:border-0 hover:bg-ink-800/25"
              >
                <th className="px-5 py-3.5 text-left">
                  <span
                    className={`font-mono text-sm font-bold ${DECISION_STYLE[decision.decision].text}`}
                  >
                    {decision.decision}
                  </span>
                  <span className="tabular ml-2 font-mono text-[11px] text-slate-600">
                    n={decision.samples}
                  </span>
                </th>
                {decision.checkpoints.map((stat) => (
                  <td key={stat.checkpoint} className="px-3 py-3.5 text-right align-middle">
                    <Cell stat={stat} minSamples={record.minSamples} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="tabular text-xs text-slate-600">
        Median price change from the moment of the call · {record.totalOutcomes} recorded outcomes ·
        updated {new Date(record.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

/**
 * One cell. Below the threshold it shows the sample count rather than a dash:
 * "9 / 20" says the number is coming, a dash says something is broken.
 */
function Cell({ stat, minSamples }: { stat: CheckpointStat; minSamples: number }) {
  if (stat.medianReturnPct === null) {
    return (
      <span className="tabular font-mono text-[11px] text-slate-700">
        {stat.samples}/{minSamples}
      </span>
    );
  }

  const value = stat.medianReturnPct;
  const tone = value > 0 ? 'text-signal-buy' : value < 0 ? 'text-signal-avoid' : 'text-slate-400';

  return (
    <span className="inline-flex flex-col items-end">
      <span className={`tabular font-mono text-sm font-semibold ${tone}`}>
        {value > 0 ? '+' : ''}
        {value.toFixed(1)}%
      </span>
      <span className="tabular font-mono text-[10px] text-slate-600">
        {(stat.positiveRate! * 100).toFixed(0)}% up · n={stat.samples}
      </span>
    </span>
  );
}

/**
 * Individual calls, newest first.
 *
 * Not subject to the sample-size gate, because a single call is a receipt
 * rather than a statistic: it claims nothing about the next one. It is what
 * makes the page useful on day two instead of in a month, and every row links
 * to the analysis it came from so the claim can be checked.
 */
function RecentCalls({ calls }: { calls: ResolvedCall[] }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="label">Recent calls, individually</p>
        <p className="text-xs text-slate-600">
          Single calls, not a sample — each links to the analysis behind it.
        </p>
      </div>

      <ul className="space-y-2">
        {calls.map((call, index) => {
          const style = DECISION_STYLE[call.decision];
          return (
            <li
              key={call.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
            >
              <Link
                href={`/a/${call.id}`}
                className={`card hover-lift flex flex-wrap items-center gap-x-4 gap-y-2 border-l-2 py-3 ${style.border}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline gap-2 text-sm font-semibold text-slate-100">
                    <span className={`font-mono ${style.text}`}>{call.decision}</span>
                    {call.symbol ? `$${call.symbol}` : `${call.address.slice(0, 6)}…`}
                    <span className="tabular font-mono text-[11px] font-normal text-slate-600">
                      {call.score.toFixed(0)}/100
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {new Date(call.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex shrink-0 gap-3">
                  {(['m5', 'h1', 'h24'] as const).map((checkpoint) => {
                    const value = call.returns[checkpoint];
                    return (
                      <div key={checkpoint} className="w-16 text-right">
                        <p className="label">
                          {checkpoint === 'm5' ? '5m' : checkpoint === 'h1' ? '1h' : '24h'}
                        </p>
                        <p
                          className={`tabular font-mono text-sm ${
                            value === undefined
                              ? 'text-slate-700'
                              : value > 0
                                ? 'text-signal-buy'
                                : value < 0
                                  ? 'text-signal-avoid'
                                  : 'text-slate-400'
                          }`}
                        >
                          {value === undefined
                            ? '—'
                            : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Empty() {
  return (
    <div className="card py-12 text-center">
      <p className="text-sm text-slate-400">No outcomes recorded yet.</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-600">
        Checkpoints are scheduled the moment an analysis is made; the earliest resolves five minutes
        later. Run an analysis and this page fills itself in.
      </p>
      <Link href="/app" className="btn-primary mt-5 inline-block">
        Run an analysis
      </Link>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="card text-sm leading-relaxed text-slate-400">
      Outcome tracking is unavailable — this deployment has no database configured, so no
      checkpoints are being recorded.
    </div>
  );
}

function Methodology() {
  return (
    <section className="card max-w-3xl space-y-3 text-xs leading-relaxed text-slate-500">
      <p className="label text-slate-400">How to read this</p>
      <ul className="space-y-2">
        <li>
          <span className="text-slate-300">Median, not average.</span> One token that runs 40x would
          pull an average into fantasy while the typical call went nowhere. The median describes the
          call in the middle.
        </li>
        <li>
          <span className="text-slate-300">WATCH has no hit rate.</span> BUY claims the price goes
          up and AVOID claims it does not — both can be wrong. WATCH claims neither, so grading it
          would invent a prediction the model never made.
        </li>
        <li>
          <span className="text-slate-300">Late checkpoints are dropped, not backdated.</span> A
          price fetched hours after a “+5 min” checkpoint was due is a different measurement
          wearing the wrong label, so it is discarded instead of counted.
        </li>
        <li>
          <span className="text-slate-300">Prices are mid-market, not fills.</span> A real trade
          pays slippage, priority fees and the spread. Treat every number here as better than what
          you would have got.
        </li>
        <li>
          <span className="text-slate-300">The sample is what users pasted.</span> These are not
          randomly drawn tokens; they are the ones people were already interested in. That is a real
          selection bias and it is not corrected for.
        </li>
        <li>
          <span className="text-slate-300">Past outcomes are not a forecast.</span> Memecoins are
          extremely risky and this is research tooling, not advice.
        </li>
      </ul>
    </section>
  );
}
