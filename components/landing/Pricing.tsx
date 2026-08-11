'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatPrice, type Plan } from '@/lib/config/plans';

/**
 * Pricing.
 *
 * The version this replaces listed six Pro features of which exactly one was
 * built, next to a price nobody could pay. That is the most expensive kind of
 * dishonesty a small product can commit: the people who would have paid are
 * precisely the ones who notice.
 *
 * So the card now separates what the plan *does* from what it is *intended to
 * do*, and says plainly that it cannot be bought yet — with the reason, which
 * is a better argument for the product than the plan was.
 */
export function Pricing({ plans }: { plans: Plan[] }) {
  return (
    <section>
      <p className="label text-center">Pricing</p>
      <div className="mx-auto mt-6 grid max-w-2xl items-start gap-4 sm:grid-cols-2">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`card flex h-full flex-col ${plan.available ? 'card-hover hover-lift' : 'ring-gradient'}`}
          >
            <div className="flex items-baseline justify-between gap-3">
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

            {plan.planned.length > 0 && (
              <div className="mt-5 border-t border-white/[0.07] pt-4">
                <p className="label">Planned, not built yet</p>
                <ul className="mt-2.5 space-y-1.5 text-sm text-slate-600">
                  {plan.planned.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <span aria-hidden>○</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6">
              {plan.available ? (
                <Link href="/app" className="btn-ghost block w-full text-center">
                  Start free
                </Link>
              ) : (
                <Waitlist />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

type State = 'idle' | 'sending' | 'done' | 'error';

function Waitlist() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState('sending');
    setMessage(null);

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setMessage(payload.error ?? 'Could not save that.');
        setState('error');
        return;
      }

      setState('done');
    } catch {
      setMessage('Could not reach the server.');
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <p className="rounded-2xl border border-signal-buy/25 bg-signal-buy/[0.05] px-4 py-3 text-sm text-slate-200">
        Noted. You will hear from me once, when it exists.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <p className="text-xs leading-relaxed text-slate-500">
        Not available yet — the track record needs to be worth charging for first. Leave an address
        and I will tell you when it is. One email, nothing else, ever.
      </p>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        aria-label="Email for the Pro waiting list"
        className="input py-3 font-sans"
        disabled={state === 'sending'}
      />
      <button type="submit" className="btn-primary w-full py-3" disabled={state === 'sending'}>
        {state === 'sending' ? 'Saving…' : 'Notify me'}
      </button>
      {message && <p className="text-xs text-signal-avoid">{message}</p>}
    </form>
  );
}
