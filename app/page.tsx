import Link from 'next/link';
import { formatPrice, getPlans } from '@/lib/config/plans';

/**
 * Landing page (spec §23). One message, one action, one honest example.
 * The example below is explicitly labelled as an illustration, and every number
 * in it is a shape the real pipeline produces — not a performance claim.
 */
export default function LandingPage() {
  const plans = getPlans();

  return (
    <div className="space-y-20 py-6">
      <section className="text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-50 sm:text-5xl">
          AI memecoin analysis in seconds
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-400">
          Paste a token contract. Get BUY / WATCH / AVOID with the evidence behind it — instead of
          checking five tools by hand.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/app" className="btn-primary">
            TRY FREE
          </Link>
          <Link href="/history" className="btn-ghost">
            See recent analyses
          </Link>
        </div>

        <p className="mt-4 text-xs text-slate-600">
          Solana · read-only · no wallet connection, ever
        </p>
      </section>

      <section>
        <p className="label text-center">What you get back</p>
        <div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-ink-700 bg-ink-900/70 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">$EXAMPLE</p>
              <p className="mt-1 text-5xl font-bold text-signal-watch">WATCH</p>
              <p className="mt-1 text-sm text-slate-400">
                <span className="text-slate-200">61</span>/100 confidence
              </p>
            </div>
            <p className="font-mono text-xs text-slate-500">2.41s</p>
          </div>

          <div className="mt-5">
            <p className="label">Why</p>
            <ul className="mt-2 space-y-1.5 text-[15px] text-slate-200">
              <li>• Volume over the last 5 minutes is running at 2.4x the hourly pace.</li>
              <li>• Liquidity is 11.2% of market cap and 96% of LP is burned.</li>
              <li>• 1.62 buys for every sell over the last hour.</li>
            </ul>
          </div>

          <div className="mt-5">
            <p className="label">Risk</p>
            <ul className="mt-2 space-y-1.5 text-[15px] text-slate-300">
              <li>• Top 10 holders control 38.4% of supply.</li>
              <li>• The pair was created 41 minutes ago; there is no track record to judge.</li>
            </ul>
          </div>

          <p className="mt-5 border-t border-ink-700 pt-3 text-xs text-slate-600">
            Illustration of the output format. Not a past result and not a prediction.
          </p>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-3">
        <Feature
          title="One paste, one answer"
          body="Market data, security checks, holder concentration and creator risk are collected in parallel and reduced to a single call."
        />
        <Feature
          title="The numbers are ours, not the model's"
          body="Every metric is computed deterministically before the AI sees anything. The model selects and phrases evidence — it never invents a figure."
        />
        <Feature
          title="Scored against what happens next"
          body="Every analysis records the price at +5m, +15m, +1h, +6h and +24h, so the model can be measured instead of trusted."
        />
      </section>

      <section>
        <p className="label text-center">Pricing</p>
        <div className="mx-auto mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
          {Object.values(plans).map((plan) => (
            <div key={plan.id} className="card">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold text-slate-100">{plan.name}</h3>
                <p className="text-sm text-slate-300">{formatPrice(plan)}</p>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {plan.analysesPerDay} analyses per day
              </p>
              <ul className="mt-3 space-y-1 text-sm text-slate-400">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-2xl rounded-xl border border-ink-700 bg-ink-900/50 p-5 text-sm text-slate-400">
        <p className="font-semibold text-slate-300">What this is not</p>
        <p className="mt-2">
          ORB Signal does not predict prices and makes no claim about future performance. A BUY
          classification means the available signals scored well against our model right now — it is
          a research shortcut, not a guarantee. Memecoins routinely go to zero.
        </p>
      </section>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <h3 className="font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
    </div>
  );
}
