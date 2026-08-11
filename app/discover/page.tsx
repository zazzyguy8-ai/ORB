import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/config/env';
import { listDiscoveries, type DiscoveryRow } from '@/lib/db/repo';
import { SHORTLIST_RULES } from '@/lib/discovery/shortlist';
import { formatUsd } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Scanner',
  description:
    'Tokens the scanner found and could not disqualify — survivors that currently score well, with the reasons.',
};

export const revalidate = 120;

const DECISION_STYLE: Record<string, { text: string; border: string }> = {
  BUY: { text: 'text-signal-buy', border: 'border-l-signal-buy' },
  WATCH: { text: 'text-signal-watch', border: 'border-l-signal-watch' },
  AVOID: { text: 'text-signal-avoid', border: 'border-l-signal-avoid' },
};

/**
 * The scanner feed.
 *
 * The framing on this page is load-bearing and deliberately unexciting. It is
 * not "coins that will pump" and it is not a signal group — it is the list of
 * tokens that came through the public listing feeds and could not be
 * disqualified by checks that are all statements about the present.
 *
 * Which is why the empty state and the caveats get as much room as the rows: a
 * page like this is the easiest place in the whole product to accidentally
 * promise something.
 */
export default async function DiscoverPage() {
  const configured = isSupabaseConfigured();
  const rows = configured ? await listDiscoveries() : [];
  if (configured && rows.length === 0) noStore();

  return (
    <div className="space-y-6 py-2">
      <header>
        <h1 className="text-3xl font-semibold tracking-tightest text-white">Scanner</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Every few hours this walks the public token listings, runs the same analysis you would
          get by pasting an address, and keeps only what it cannot disqualify. Most of what it looks
          at does not survive — that is the useful part.
        </p>
      </header>

      <section className="card border-signal-watch/25 bg-signal-watch/[0.04]">
        <p className="text-sm leading-relaxed text-slate-300">
          <span className="font-semibold text-white">Read this first.</span> Nothing here is a
          prediction, and no tool can tell you a token will not rug. Every check below is a
          statement about right now: it has survived at least an hour, the pool is real, the
          contract cannot be inflated or frozen, and supply is not sitting in a few wallets. A token
          can pass all of that and still go to zero an hour later.
        </p>
      </section>

      {!configured ? (
        <div className="card text-sm leading-relaxed text-slate-400">
          The scanner is unavailable — this deployment has no database configured, so there is
          nowhere to record what it finds.
        </div>
      ) : rows.length === 0 ? (
        <Empty />
      ) : (
        <>
          <ul className="space-y-2">
            {rows.map((row, index) => (
              <Row key={row.id} row={row} index={index} />
            ))}
          </ul>
          <Bar />
        </>
      )}
    </div>
  );
}

function Row({ row, index }: { row: DiscoveryRow; index: number }) {
  const style = DECISION_STYLE[row.decision] ?? DECISION_STYLE.WATCH;

  return (
    <li
      className="animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
    >
      <div className={`card card-hover border-l-2 ${style.border}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="flex items-baseline gap-2.5 text-sm font-semibold text-white">
            <span className={`font-mono ${style.text}`}>{row.decision}</span>
            {row.symbol ? `$${row.symbol}` : `${row.address.slice(0, 6)}…`}
            <span className="tabular font-mono text-[11px] font-normal text-slate-500">
              {row.score.toFixed(0)}/100
            </span>
          </p>
          <p className="tabular font-mono text-[11px] text-slate-600">
            {formatUsd(row.marketCapUsd)} mcap · {formatUsd(row.liquidityUsd)} liq ·{' '}
            {row.ageMinutes === null
              ? 'age unknown'
              : row.ageMinutes < 1440
                ? `${Math.round(row.ageMinutes / 60)}h old`
                : `${Math.round(row.ageMinutes / 1440)}d old`}
          </p>
        </div>

        {row.reasons.length > 0 && (
          <ul className="mt-2.5 space-y-1.5">
            {row.reasons.map((reason) => (
              <li key={reason} className="flex gap-2.5 text-xs leading-relaxed text-slate-400">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-iris-300/60" aria-hidden />
                {reason}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-3">
          {row.analysisId && (
            <Link href={`/a/${row.analysisId}`} className="pill">
              The analysis
            </Link>
          )}
          <Link href={`/app?address=${row.address}`} className="pill">
            Re-analyze now
          </Link>
          <a
            href={`https://dexscreener.com/solana/${row.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="pill"
          >
            Chart ↗
          </a>
          <span className="tabular ml-auto font-mono text-[10px] text-slate-700">
            found {new Date(row.foundAt).toLocaleString()} · via {row.source}
          </span>
        </div>
      </div>
    </li>
  );
}

function Empty() {
  return (
    <div className="card py-12 text-center">
      <p className="text-sm text-slate-300">Nothing has cleared the bar yet.</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
        That is the expected state most of the time. The scanner runs on a schedule and throws away
        almost everything it looks at; an empty list means it looked and found nothing worth
        showing, which is more useful than a list padded to look busy.
      </p>
      <Link href="/app" className="btn-ghost mt-6 inline-block">
        Analyze something yourself
      </Link>
    </div>
  );
}

function Bar() {
  const rules = [
    `At least ${SHORTLIST_RULES.minAgeMinutes} minutes old — the instant rugs are already gone`,
    `At least ${formatUsd(SHORTLIST_RULES.minLiquidityUsd)} of liquidity, and at least ${(SHORTLIST_RULES.minLiquidityToMcap * 100).toFixed(0)}% of market cap`,
    `Top 10 holders under ${(SHORTLIST_RULES.maxTop10Pct * 100).toFixed(0)}% of supply`,
    'No disqualifying flag — live mint authority, freeze authority, or a flagged contract',
    `Enough data measured to have an opinion at all (${(SHORTLIST_RULES.minCoverage * 100).toFixed(0)}% coverage)`,
    `Rated BUY, or WATCH scoring at least ${SHORTLIST_RULES.minScoreForWatch}`,
  ];

  return (
    <section className="card">
      <p className="label">What it takes to appear here</p>
      <ul className="mt-3 space-y-2">
        {rules.map((rule) => (
          <li key={rule} className="flex gap-3 text-sm leading-relaxed text-slate-400">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-buy" aria-hidden />
            {rule}
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-white/[0.07] pt-3 text-xs leading-relaxed text-slate-600">
        A missing measurement counts as a failure, not a pass — “we could not check the holder
        distribution” and “the distribution is fine” are different things, and only one of them
        belongs on a shortlist. The listing feeds are also not a random sample of the chain: they
        are tokens whose teams filled in a profile or paid for a boost, so this is the same
        scepticism applied to what is already being pushed at everyone.
      </p>
    </section>
  );
}
