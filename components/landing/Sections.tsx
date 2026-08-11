import Link from 'next/link';
import { Reveal } from '@/components/Reveal';

/**
 * The lower half of the landing page.
 *
 * The version this replaces was three paragraphs in three boxes, and it read
 * like every other tool's feature list. The problem with that shape is that
 * text describing a product is the weakest possible evidence for it: a stranger
 * has no reason to believe any of it.
 *
 * So each block below shows the thing instead of asserting it — the manual
 * work being replaced, the pipeline actually running, the receipt that exists
 * after the fact. Every visual here is drawn from the real interface.
 */

// ---------------------------------------------------------------------------
// The problem, stated as the work it removes
// ---------------------------------------------------------------------------

const MANUAL_STEPS = [
  { tool: 'DexScreener', task: 'price, liquidity, volume, pair age' },
  { tool: 'RugCheck', task: 'mint authority, freeze, LP lock' },
  { tool: 'Solscan', task: 'top holders, creator balance' },
  { tool: 'Birdeye', task: 'buy/sell pressure' },
  { tool: 'Your head', task: 'weigh all of it, in ninety seconds, at 3am' },
];

export function TheProblem() {
  return (
    <Reveal>
      <section className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <p className="label">The part nobody enjoys</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tightest text-white sm:text-4xl">
            Five tabs, ninety seconds,
            <br />
            and the candle is gone.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-400">
            Checking a memecoin properly is not hard, it is just slow — and it is slow at exactly
            the moment when being slow costs you the entry. The work below is the work this does
            for you, in parallel, in about two seconds.
          </p>
        </div>

        <ul className="space-y-2">
          {MANUAL_STEPS.map((step, index) => (
            <li
              key={step.tool}
              className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            >
              <span className="tabular w-6 shrink-0 font-mono text-xs text-slate-600">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="w-28 shrink-0 text-sm font-medium text-slate-200">{step.tool}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{step.task}</span>
              <span className="shrink-0 text-signal-avoid" aria-hidden>
                ✕
              </span>
            </li>
          ))}
          <li className="flex items-center gap-4 rounded-2xl border border-signal-buy/25 bg-signal-buy/[0.05] px-4 py-3.5">
            <span className="tabular w-6 shrink-0 font-mono text-xs text-signal-buy">→</span>
            <span className="w-28 shrink-0 text-sm font-semibold text-white">One paste</span>
            <span className="min-w-0 flex-1 text-xs text-slate-400">all of the above, at once</span>
            <span className="shrink-0 text-signal-buy" aria-hidden>
              ✓
            </span>
          </li>
        </ul>
      </section>
    </Reveal>
  );
}

// ---------------------------------------------------------------------------
// How it works, as three visible stages
// ---------------------------------------------------------------------------

const STAGES = [
  {
    step: '01',
    title: 'Collect',
    body: 'Four providers queried in parallel — market, contract security, holder distribution, on-chain supply. Whichever one is slowest sets the pace; a provider that fails is marked missing, not guessed.',
  },
  {
    step: '02',
    title: 'Score',
    body: 'Seven weighted categories, every signal a documented function of one measured value. Categories with no data drop out of the average instead of scoring zero.',
  },
  {
    step: '03',
    title: 'Explain',
    body: 'The AI is handed the finished numbers and may only cite them. If a single figure in its answer is not one we computed, the answer is thrown away and the deterministic one is shown.',
  },
];

export function HowItWorks() {
  return (
    <section>
      <Reveal>
        <p className="label text-center">How the answer is built</p>
      </Reveal>

      <div className="relative mt-8 grid gap-4 sm:grid-cols-3">
        {/* The thread the three stages hang from. Hidden on a phone, where the
            cards stack and a horizontal line would point at nothing. */}
        <div
          className="pointer-events-none absolute left-0 right-0 top-7 hidden h-px sm:block"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(183,165,253,0.35) 20%, rgba(124,231,255,0.35) 80%, transparent)',
          }}
          aria-hidden
        />

        {STAGES.map((stage, index) => (
          <Reveal key={stage.step} delay={index * 110}>
            <div className="relative flex h-full flex-col">
              <div className="relative mb-5 flex h-14 items-center">
                <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-iris-400/40 bg-ink-950 text-xs font-semibold text-iris-200">
                  {stage.step}
                </span>
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-white">{stage.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{stage.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// The receipt: what exists after the call, which is the actual differentiator
// ---------------------------------------------------------------------------

const CHECKPOINTS = [
  { label: '+5 min', value: '+20.0%', tone: 'text-signal-buy' },
  { label: '+15 min', value: '+3.1%', tone: 'text-signal-buy' },
  { label: '+1 h', value: '−16.6%', tone: 'text-signal-avoid' },
  { label: '+6 h', value: 'pending', tone: 'text-slate-600' },
  { label: '+24 h', value: 'pending', tone: 'text-slate-600' },
];

export function TheReceipt() {
  return (
    <Reveal>
      <section className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="order-2 lg:order-1">
          <div className="card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="label">What happened next</p>
              <p className="text-xs text-slate-600">3 of 5 recorded</p>
            </div>
            <ol className="mt-4 grid grid-cols-5 gap-2">
              {CHECKPOINTS.map((checkpoint) => (
                <li
                  key={checkpoint.label}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-2.5 text-center"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                    {checkpoint.label}
                  </p>
                  <p className={`tabular mt-1 font-mono text-xs font-semibold ${checkpoint.tone}`}>
                    {checkpoint.value}
                  </p>
                </li>
              ))}
            </ol>
            <p className="mt-4 border-t border-white/[0.07] pt-3 text-[11px] leading-relaxed text-slate-600">
              Illustration of the format. A checkpoint priced too late to mean what it says is
              dropped rather than backdated.
            </p>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <p className="label">The part almost nobody publishes</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tightest text-white sm:text-4xl">
            Every call gets a receipt.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-400">
            The moment a verdict is made, five price checkpoints are scheduled against it. Nothing
            is selected afterwards, because there is nothing left to select — the calls were on
            record before their outcomes existed.
          </p>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-slate-400">
            Which means the model can be wrong in public. That is the point of it.
          </p>
          <Link
            href="/track-record"
            className="mt-5 inline-block text-sm font-medium text-iris-300 transition-colors hover:text-iris-100"
          >
            See how the calls have done →
          </Link>
        </div>
      </section>
    </Reveal>
  );
}

// ---------------------------------------------------------------------------
// Questions a sceptical trader actually has
// ---------------------------------------------------------------------------

const FAQ = [
  {
    q: 'Does it connect to my wallet?',
    a: 'No, and it never will. There is no connect button, no signature request, and no seed phrase field anywhere in the product. It reads public chain and market data about a token you paste — it cannot move anything, because it never has permission to.',
  },
  {
    q: 'Is the AI making the decision?',
    a: 'No. The decision, the score and the risk flags are computed by a deterministic model before the AI is called at all. The model is handed the finished figures and asked to choose and phrase the strongest few. Anything it writes that contains a number we did not compute is rejected automatically.',
  },
  {
    q: 'What does BUY actually mean?',
    a: 'That the measurable signals scored above our threshold at that moment and nothing disqualifying was found. It is not a prediction and not advice. Memecoins routinely go to zero, including ones that score well.',
  },
  {
    q: 'Why should I trust the scores?',
    a: 'Ideally you should not, at first — you should check them. Every call is recorded with its outcome and published, so the scoreboard is the argument rather than anything written on this page. A cell there stays hidden until it has twenty outcomes behind it, so it cannot flatter itself with a small sample.',
  },
  {
    q: 'Which chains?',
    a: 'Solana only. Doing one chain properly beats doing four badly, and the holder-concentration work in particular depends on chain-specific details that do not transfer.',
  },
];

export function Faq() {
  return (
    <section>
      <Reveal>
        <p className="label text-center">Straight answers</p>
      </Reveal>
      <div className="mx-auto mt-6 max-w-2xl space-y-3">
        {FAQ.map((item, index) => (
          <Reveal key={item.q} delay={index * 60}>
            <details className="card group cursor-pointer py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex items-center justify-between gap-4 text-[15px] font-medium text-slate-100">
                {item.q}
                <span
                  className="shrink-0 text-iris-300 transition-transform duration-300 group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Closing ask
// ---------------------------------------------------------------------------

export function FinalCta() {
  return (
    <Reveal>
      <section className="ring-gradient relative overflow-hidden rounded-4xl px-6 py-14 text-center sm:px-10">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(70% 120% at 50% 0%, rgba(135,103,240,0.28), transparent 70%), linear-gradient(180deg, rgba(25,20,48,0.7), rgba(10,7,19,0.7))',
          }}
          aria-hidden
        />
        <h2 className="mx-auto max-w-xl text-3xl font-semibold tracking-tightest text-white sm:text-[2.6rem] sm:leading-[1.08]">
          Paste the address you were about to buy.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-slate-400">
          Ten free analyses a day. No wallet, no signup to try it, and an answer before you have
          finished opening the second tab.
        </p>
        <Link href="/app" className="btn-primary mt-8 inline-block">
          Analyze a token
        </Link>
      </section>
    </Reveal>
  );
}
