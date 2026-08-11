import Link from 'next/link';
import { Orb } from '@/components/Orb';
import { Reveal } from '@/components/Reveal';
import {
  Faq,
  FinalCta,
  HowItWorks,
  TheProblem,
  TheReceipt,
} from '@/components/landing/Sections';
import { formatPrice, getPlans } from '@/lib/config/plans';

/**
 * Landing page (spec §23). One message, one action, one honest example.
 * Every number in the example is a shape the real pipeline produces — it is
 * labelled as an illustration, and it is not a performance claim.
 */
export default function LandingPage() {
  const plans = getPlans();

  return (
    <div className="space-y-28 py-6 sm:py-12">
      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="text-center lg:text-left">
          <span className="pill animate-fade-up mx-auto w-fit lg:mx-0">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-buy" aria-hidden />
            Solana · read-only · no wallet connection
          </span>

          <h1
            className="animate-fade-up mt-6 text-[2.9rem] font-semibold leading-[1.02] tracking-tightest text-white sm:text-[4.4rem]"
            style={{ animationDelay: '60ms' }}
          >
            Should you buy
            <br />
            <span className="text-gradient animate-sweep">this coin?</span>
          </h1>

          <p
            className="animate-fade-up mx-auto mt-6 max-w-lg text-lg leading-relaxed text-slate-400 lg:mx-0"
            style={{ animationDelay: '140ms' }}
          >
            Paste a contract address. Get BUY, WATCH or AVOID in seconds — with the evidence
            behind it, and a public record of how the last calls turned out.
          </p>

          <div
            className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
            style={{ animationDelay: '220ms' }}
          >
            <Link href="/app" className="btn-primary">
              Analyze a token
            </Link>
            <Link href="/track-record" className="btn-ghost">
              See the track record
            </Link>
          </div>

          <p
            className="animate-fade-up mt-5 text-xs text-slate-600"
            style={{ animationDelay: '300ms' }}
          >
            Free to try · no wallet, no signature, no seed phrase — ever.
          </p>
        </div>

        <Orb className="animate-scale-in mx-auto w-[68%] max-w-[340px] lg:w-full lg:max-w-none" />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* The output                                                          */}
      {/* ------------------------------------------------------------------ */}
      <Reveal>
        <section>
          <p className="label text-center">What you get back</p>
          <div className="ring-gradient mx-auto mt-6 max-w-2xl overflow-hidden rounded-4xl">
            <div className="rounded-4xl bg-gradient-to-b from-ink-800/70 to-ink-950/70 p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-slate-400">
                  EXA
                </div>
                <div>
                  <p className="text-2xl font-semibold tracking-tightest text-white">$EXAMPLE</p>
                  <p className="text-sm text-slate-500">Example Coin</p>
                </div>
                <p className="tabular ml-auto font-mono text-xs text-slate-600">2.41s</p>
              </div>

              {/* Wraps on a narrow phone: at 390px the verdict and the ring
                  side by side push the word past the card edge. */}
              <div className="mt-7 flex flex-wrap items-center gap-5 sm:gap-6">
                <div className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center sm:h-[92px] sm:w-[92px]">
                  <div className="absolute inset-0 rounded-full bg-signal-watch/20 blur-xl" />
                  <div className="absolute inset-0 rounded-full border-[7px] border-white/[0.06]" />
                  <div className="absolute inset-0 rounded-full border-[7px] border-transparent border-r-signal-watch border-t-signal-watch [transform:rotate(-30deg)]" />
                  <span className="tabular relative font-mono text-2xl font-semibold text-white">
                    61
                  </span>
                </div>
                <div>
                  <p className="text-5xl font-bold leading-none tracking-tightest text-signal-watch drop-shadow-[0_0_34px_rgba(255,199,92,0.35)] sm:text-6xl">
                    WATCH
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Real momentum, real concentration risk.
                  </p>
                </div>
              </div>

              <div className="mt-7 border-t border-white/[0.07] pt-5">
                <p className="label">Why</p>
                <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-slate-200">
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-buy" />
                    Volume over the last 5 minutes is running at 2.4x the hourly pace.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-buy" />
                    Liquidity is 11.2% of market cap, and 96% of LP is burned.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-buy" />
                    1.62 buys for every sell over the last hour.
                  </li>
                </ul>
              </div>

              <div className="mt-5">
                <p className="label">Risk</p>
                <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-slate-300">
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-avoid" />
                    Top 10 holders control 38.4% of supply.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-avoid" />
                    The pair was created 41 minutes ago; there is no track record to judge.
                  </li>
                </ul>
              </div>

              <p className="mt-6 border-t border-white/[0.07] pt-4 text-xs text-slate-600">
                Illustration of the output format. Not a past result and not a prediction.
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      <TheProblem />

      <HowItWorks />

      <TheReceipt />

      {/* ------------------------------------------------------------------ */}
      {/* Pricing                                                             */}
      {/* ------------------------------------------------------------------ */}
      <Reveal>
        <section>
          <p className="label text-center">Pricing</p>
          <div className="mx-auto mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
            {Object.values(plans).map((plan) => (
              <div
                key={plan.id}
                className={`card hover-lift card-hover flex h-full flex-col ${
                  plan.id === 'pro' ? 'ring-gradient' : ''
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-semibold text-white">{plan.name}</h3>
                  <p className="text-sm font-medium text-iris-200">{formatPrice(plan)}</p>
                </div>
                <p className="tabular mt-1 font-mono text-xs text-slate-500">
                  {plan.analysesPerDay} analyses per day
                </p>
                <ul className="mt-5 space-y-2 text-sm text-slate-400">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5">
                      <span className="text-iris-300" aria-hidden>
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
                {plan.id !== 'pro' && (
                  <Link href="/app" className="btn-ghost mt-6 w-full text-center">
                    Start free
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <Faq />

      <FinalCta />

      {/* ------------------------------------------------------------------ */}
      {/* The disclaimer, given its own weight rather than hidden in a footer  */}
      {/* ------------------------------------------------------------------ */}
      <Reveal>
        <section className="mx-auto max-w-2xl rounded-3xl border border-white/[0.07] bg-white/[0.02] p-7">
          <p className="font-semibold text-white">What this is not</p>
          <p className="mt-2.5 text-sm leading-relaxed text-slate-400">
            ORB Signal does not predict prices and makes no claim about future performance. A BUY
            classification means the available signals scored well against our model right now — it
            is a research shortcut, not a guarantee. Memecoins routinely go to zero.
          </p>
        </section>
      </Reveal>
    </div>
  );
}
