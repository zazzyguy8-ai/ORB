import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { formatUsd } from '@/lib/format';
import { unstable_noStore as noStore } from 'next/cache';
import { lookupSharedAnalysis, type SharedAnalysis, type SharedOutcome } from '@/lib/db/repo';

export const revalidate = 60;

// The metadata pass and the page body both need the row; cache() makes that one
// query per request instead of two.
const load = cache(lookupSharedAnalysis);

const CHECKPOINT_LABEL: Record<string, string> = {
  m5: '+5 min',
  m15: '+15 min',
  h1: '+1 h',
  h6: '+6 h',
  h24: '+24 h',
};

const DECISION_STYLE: Record<string, { text: string; border: string; glow: string }> = {
  BUY: {
    text: 'text-signal-buy',
    border: 'border-signal-buy/30',
    glow: 'drop-shadow-[0_0_28px_rgba(46,232,138,0.24)]',
  },
  WATCH: {
    text: 'text-signal-watch',
    border: 'border-signal-watch/30',
    glow: 'drop-shadow-[0_0_28px_rgba(255,192,67,0.24)]',
  },
  AVOID: {
    text: 'text-signal-avoid',
    border: 'border-signal-avoid/30',
    glow: 'drop-shadow-[0_0_28px_rgba(255,86,86,0.24)]',
  },
};

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const found = await load(params.id);
  if (found.status !== 'ok') return { title: 'Analysis not found', robots: { index: false } };
  const analysis = found.analysis;

  const name = analysis.symbol ? `$${analysis.symbol}` : analysis.address.slice(0, 6);
  const title = `${analysis.decision} · ${name}`;
  const description = analysis.reasons[0] ?? `Scored ${analysis.score.toFixed(0)}/100 by ORB Signal.`;

  return {
    title,
    description,
    openGraph: { title: `${title} — ORB Signal`, description, type: 'article' },
    twitter: { card: 'summary_large_image', title: `${title} — ORB Signal`, description },
  };
}

/**
 * A permalink for one stored call.
 *
 * The page a live data feed cannot produce: it shows what the model said at a
 * fixed moment, and — as the checkpoints resolve — what that call turned out to
 * be worth. It is a receipt, so nothing on it is recomputed on read.
 */
export default async function SharedAnalysisPage({ params }: { params: { id: string } }) {
  const found = await load(params.id);

  if (found.status === 'error') {
    // Never cache a failure as a Not Found: the render is reused for a minute,
    // so one database hiccup would tell every visitor to a perfectly valid
    // share link that the analysis does not exist.
    noStore();
    return <Unavailable />;
  }

  if (found.status === 'missing') notFound();
  const analysis = found.analysis;

  const style = DECISION_STYLE[analysis.decision] ?? DECISION_STYLE.WATCH;
  const name = analysis.symbol ? `$${analysis.symbol}` : `${analysis.address.slice(0, 8)}…`;

  return (
    <div className="space-y-5 py-2">
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <span className="pill">Saved analysis</span>
        <time dateTime={analysis.createdAt}>{new Date(analysis.createdAt).toLocaleString()}</time>
      </div>

      <section className={`card ${style.border} animate-fade-up p-6 sm:p-8`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tightest text-slate-50">{name}</h1>
            {analysis.name && <p className="text-sm text-slate-500">{analysis.name}</p>}
          </div>
          <div className="text-right">
            <p className={`text-5xl font-black leading-none tracking-tightest ${style.text} ${style.glow}`}>
              {analysis.decision}
            </p>
            <p className="tabular mt-2 font-mono text-xs text-slate-500">
              score {analysis.score.toFixed(0)}/100 · confidence {analysis.confidence.toFixed(0)} ·
              coverage {(analysis.coverage * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-white/[0.07] pt-4">
          <Stat label="Price at call" value={formatUsd(analysis.priceUsd)} />
          <Stat label="Market cap" value={formatUsd(analysis.marketCapUsd)} />
          <Stat label="Liquidity" value={formatUsd(analysis.liquidityUsd)} />
        </dl>

        {analysis.reasons.length > 0 && (
          <div className="mt-6">
            <p className="label">Why</p>
            <ul className="mt-2.5 space-y-2 text-[15px] leading-relaxed text-slate-200">
              {analysis.reasons.map((reason) => (
                <li key={reason}>• {reason}</li>
              ))}
            </ul>
          </div>
        )}

        {analysis.riskNotes.length > 0 && (
          <div className="mt-5">
            <p className="label">Risk</p>
            <ul className="mt-2.5 space-y-2 text-[15px] leading-relaxed text-slate-300">
              {analysis.riskNotes.map((note) => (
                <li key={note}>• {note}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <OutcomeTimeline analysis={analysis} />

      {analysis.riskFlags.length > 0 && (
        <section className="card">
          <p className="label">Risk flags at the time of the call</p>
          <ul className="mt-3 space-y-2.5">
            {analysis.riskFlags.map((flag) => (
              <li key={flag.code} className="flex gap-3 text-sm">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    flag.severity === 'critical' || flag.veto
                      ? 'bg-signal-avoid'
                      : flag.severity === 'high'
                        ? 'bg-signal-watch'
                        : 'bg-slate-600'
                  }`}
                  aria-hidden
                />
                <span>
                  <span className="font-medium text-slate-200">{flag.title}</span>
                  <span className="ml-2 text-slate-500">{flag.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/app?address=${analysis.address}`} className="btn-primary">
          Re-analyze now
        </Link>
        <a
          href={`https://dexscreener.com/solana/${analysis.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost"
        >
          Open chart ↗
        </a>
      </div>

      <p className="text-xs leading-relaxed text-slate-600">
        This is a snapshot of one analysis, not a recommendation and not a prediction. Re-analyzing
        will produce a different result as the market moves.
      </p>
    </div>
  );
}

function Unavailable() {
  return (
    <div className="card py-12 text-center">
      <p className="text-sm text-slate-300">This analysis could not be loaded right now.</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-600">
        The link is fine — our storage did not answer. Reloading in a moment usually resolves it.
      </p>
      <Link href="/app" className="btn-ghost mt-5 inline-block">
        Analyze a token instead
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="tabular mt-1 font-mono text-sm text-slate-200">{value}</dd>
    </div>
  );
}

/**
 * What the call was worth afterwards.
 *
 * A pending checkpoint says "pending" rather than 0% — the difference between
 * "no move" and "not measured yet" is the whole credibility of the panel.
 */
function OutcomeTimeline({ analysis }: { analysis: SharedAnalysis }) {
  const recorded = analysis.outcomes.filter((o) => o.status === 'recorded');

  return (
    <section className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="label">What happened next</p>
        <p className="text-xs text-slate-600">
          {recorded.length === 0
            ? 'Measured against the price at the moment of the call.'
            : `${recorded.length} of ${analysis.outcomes.length} checkpoints recorded`}
        </p>
      </div>

      {analysis.outcomes.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No checkpoints were scheduled for this analysis.
        </p>
      ) : (
        <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {analysis.outcomes.map((outcome) => (
            <Checkpoint key={outcome.checkpoint} outcome={outcome} />
          ))}
        </ol>
      )}
    </section>
  );
}

function Checkpoint({ outcome }: { outcome: SharedOutcome }) {
  const pending = outcome.status !== 'recorded' || outcome.returnPct === null;
  const value = outcome.returnPct;
  const tone =
    pending || value === null
      ? 'text-slate-700'
      : value > 0
        ? 'text-signal-buy'
        : value < 0
          ? 'text-signal-avoid'
          : 'text-slate-400';

  return (
    <li className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3 py-3">
      <p className="label">{CHECKPOINT_LABEL[outcome.checkpoint] ?? outcome.checkpoint}</p>
      <p className={`tabular mt-1.5 font-mono text-lg font-semibold ${tone}`}>
        {pending || value === null ? (
          <span className="text-sm font-normal text-slate-600">
            {outcome.status === 'failed' ? 'no price' : 'pending'}
          </span>
        ) : (
          <>
            {value > 0 ? '+' : ''}
            {value.toFixed(1)}%
          </>
        )}
      </p>
      {outcome.priceUsd !== null && (
        <p className="tabular mt-0.5 font-mono text-[10px] text-slate-600">
          {formatUsd(outcome.priceUsd)}
        </p>
      )}
    </li>
  );
}
