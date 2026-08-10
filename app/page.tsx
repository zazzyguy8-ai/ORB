import Link from 'next/link';
import { formatPrice, getPlans } from '@/lib/config/plans';

/**
 * Landing page (spec §23). One message, one action, one honest example.
 * Every number in the example is a shape the real pipeline produces — it is
 * labelled as an illustration, and it is not a performance claim.
 */
export default function LandingPage() {
  const plans = getPlans();

  return (
    <div className="space-y-24 py-8 sm:py-14">
      <section className="relative text-center">
        {/* Wide, soft glow behind the headline so the type sits in light rather
            than on a flat panel. Pointer-events off — it is pure atmosphere. */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-64 w-[42rem]
                     -translate-x-1/2 -translate-y-1/3 rounded-full
                     bg-[radial-gradient(closest-side,rgba(46,232,138,0.16),transparent)] blur-2xl"
          aria-hidden
        />
        <span className="pill mx-auto mb-6 w-fit">
          <span className="h-1.5 w-1.5 rounded-full bg-signal-buy" aria-hidden />
          Solana · read-only · no wallet connection
        </span>

        <h1 className="animate-fade-up mx-auto max-w-3xl text-[2.7rem] font-bold leading-[1.02] tracking-tightest text-slate-50 sm:text-[4.2rem]">
          AI memecoin analysis
          <br />
          <span className="bg-gradient-to-r from-signal-buy via-emerald-300 to-sky-400 bg-clip-text text-transparent">
            in seconds
          </span>
        </h1>

        <p
          className="animate-fade-up mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-400"
          style={{ animationDelay: '80ms' }}
        >
          Paste a token contract. Get BUY / WATCH / AVOID with the evidence behind it — instead of
          checking five tools by hand.
        </p>

        <div
          className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: '160ms' }}
        >
          <Link href="/app" className="btn-primary">
            TRY FREE
          </Link>
          <Link href="/track-record" className="btn-ghost">
            See the track record
          </Link>
        </div>
      </section>

      <section>
        <p className="label text-center">What you get back</p>
        <div className="mx-auto mt-5 max-w-2xl overflow-hidden rounded-2xl border border-signal-watch/25 bg-gradient-to-b from-signal-watch/[0.07] to-transparent">
          <div className="p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-ink-600 bg-ink-800 text-sm font-bold text-slate-500">
                EXA
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tightest text-slate-50">$EXAMPLE</p>
                <p className="text-sm text-slate-400">Example Coin</p>
              </div>
              <p className="ml-auto font-mono text-xs text-slate-500">2.41s</p>
            </div>

            <div className="mt-7 flex items-center gap-6">
              <div className="flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full border-[7px] border-ink-700 border-t-signal-watch border-r-signal-watch">
                <span className="tabular text-2xl font-bold text-slate-100">61</span>
              </div>
              <p className="text-6xl font-black leading-none tracking-tightest text-signal-watch drop-shadow-[0_0_28px_rgba(255,192,67,0.24)]">
                WATCH
              </p>
            </div>

            <div className="mt-7 border-t border-ink-700/70 pt-5">
              <p className="label">Why</p>
              <ul className="mt-2.5 space-y-2 text-[15px] leading-relaxed text-slate-200">
                <li>• Volume over the last 5 minutes is running at 2.4x the hourly pace.</li>
                <li>• Liquidity is 11.2% of market cap, and 96% of LP is burned.</li>
                <li>• 1.62 buys for every sell over the last hour.</li>
              </ul>
            </div>

            <div className="mt-5">
              <p className="label">Risk</p>
              <ul className="mt-2.5 space-y-2 text-[15px] leading-relaxed text-slate-300">
                <li>• Top 10 holders control 38.4% of supply.</li>
                <li>• The pair was created 41 minutes ago; there is no track record to judge.</li>
              </ul>
            </div>
          </div>
          <p className="border-t border-ink-700/70 bg-ink-900/60 px-6 py-3 text-xs text-slate-600 sm:px-8">
            Illustration of the output format. Not a past result and not a prediction.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Feature
          index="01"
          title="One paste, one answer"
          body="Market data, security checks, holder concentration and creator risk are collected in parallel and reduced to a single call."
        />
        <Feature
          index="02"
          title="The numbers are ours, not the model’s"
          body="Every metric is computed deterministically before the AI sees anything. The model selects and phrases evidence — it never invents a figure."
        />
        <Feature
          index="03"
          title="Scored against what happens next"
          body="Every analysis records the price at +5m, +15m, +1h, +6h and +24h, so the model can be measured instead of trusted."
          href="/track-record"
          cta="See the scoreboard"
        />
      </section>

      <section>
        <p className="label text-center">Pricing</p>
        <div className="mx-auto mt-5 grid max-w-2xl gap-4 sm:grid-cols-2">
          {Object.values(plans).map((plan) => (
            <div
              key={plan.id}
              className={`card ${plan.id === 'pro' ? 'border-slate-600/60 bg-ink-850/80' : ''}`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold text-slate-100">{plan.name}</h3>
                <p className="text-sm font-medium text-slate-200">{formatPrice(plan)}</p>
              </div>
              <p className="tabular mt-1 text-xs text-slate-500">
                {plan.analysesPerDay} analyses per day
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-slate-400">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-signal-buy" aria-hidden>
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-2xl rounded-2xl border border-ink-700/80 bg-ink-900/40 p-6">
        <p className="font-semibold text-slate-200">What this is not</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          ORB Signal does not predict prices and makes no claim about future performance. A BUY
          classification means the available signals scored well against our model right now — it
          is a research shortcut, not a guarantee. Memecoins routinely go to zero.
        </p>
      </section>
    </div>
  );
}

function Feature({
  index,
  title,
  body,
  href,
  cta,
}: {
  index: string;
  title: string;
  body: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="card hover-lift flex flex-col hover:border-ink-600">
      <span className="tabular font-mono text-xs text-slate-600">{index}</span>
      <h3 className="mt-2 font-semibold tracking-tight text-slate-100">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
      {href && cta && (
        <Link
          href={href}
          className="mt-3 text-sm font-medium text-signal-buy transition-colors hover:text-emerald-300"
        >
          {cta} →
        </Link>
      )}
    </div>
  );
}
