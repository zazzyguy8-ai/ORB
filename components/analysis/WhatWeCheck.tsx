import Link from 'next/link';

/**
 * The pre-analysis panel.
 *
 * Before the first paste, this page is an input box on an empty screen, which
 * says nothing about what happens next or why the answer should be believed.
 * This is the space that would otherwise be blank, spent on the two things a
 * first-time visitor actually needs: what gets checked, and what stops the
 * output from being made up.
 *
 * Every line here describes something the pipeline genuinely does — no feature
 * is listed that the deployment cannot perform.
 */

const CHECKS = [
  {
    title: 'Contract & authorities',
    body: 'Mint and freeze authority, metadata mutability, transfer hooks and fees, LP burned or locked.',
  },
  {
    title: 'Holder concentration',
    body: 'Top 10 and top 20 share of supply and the largest single holder, with pool vaults excluded so the numbers mean what they say.',
  },
  {
    title: 'Liquidity & market shape',
    body: 'Liquidity against market cap, hourly turnover, pair age and how much depth actually exists to sell into.',
  },
  {
    title: 'Momentum & pressure',
    body: 'Volume acceleration over 5 minutes and 1 hour, price acceleration, and buy versus sell counts.',
  },
];

export function WhatWeCheck() {
  return (
    <div className="space-y-4">
      <section>
        <p className="label">What gets checked, every time</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {CHECKS.map((check, index) => (
            <div
              key={check.title}
              className="animate-fade-up card hover-lift py-4"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <p className="text-sm font-semibold text-slate-100">{check.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{check.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="label">Why the answer is checkable</p>
        <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-400">
          <li className="flex gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-buy" aria-hidden />
            <span>
              <span className="text-slate-200">Every number is computed before the AI runs.</span>{' '}
              The model may only cite figures the pipeline already produced — an explanation
              containing anything else is rejected and the deterministic one is shown instead.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-watch" aria-hidden />
            <span>
              <span className="text-slate-200">Missing data is shown as missing.</span> A provider
              that cannot answer lowers the coverage figure instead of quietly scoring zero, so a
              gap in the data never looks like a finding.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" aria-hidden />
            <span>
              <span className="text-slate-200">Every call is scored afterwards.</span> The price is
              recorded at +5m, +15m, +1h, +6h and +24h, and the results are published on the{' '}
              <Link
                href="/track-record"
                className="text-slate-300 underline underline-offset-2 hover:text-slate-100"
              >
                track record
              </Link>{' '}
              whether they flatter the model or not.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
