'use client'

import { useState } from 'react'
import { TIER_LIST, formatPrice, type TierId } from '@/lib/products'
import { Panel, CopyButton, Spinner, ErrorNote } from './ui'

export interface DeploymentConfig {
  scanning: boolean
  card: boolean
  usdc: boolean
  receiveAddress: string | null
}

export default function PayPanel({
  config,
  onUnlocked,
}: {
  config: DeploymentConfig
  onUnlocked: (token: string, tier: TierId) => void
}) {
  const [selected, setSelected] = useState<TierId>('arsenal')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [signature, setSignature] = useState('')

  const tier = TIER_LIST.find((entry) => entry.id === selected) ?? TIER_LIST[0]

  async function payByCard() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selected }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Checkout failed.')
      window.location.href = data.url
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Checkout failed.')
      setBusy(false)
    }
  }

  async function redeemSignature() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'solana', signature: signature.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not verify that transaction.')
      onUnlocked(data.token, data.tier)
    } catch (caught: unknown) {
      setError(
        caught instanceof Error ? caught.message : 'Could not verify that transaction.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title="unlock the full read" accent>
      <div className="grid gap-3 sm:grid-cols-2">
        {TIER_LIST.map((entry) => {
          const active = entry.id === selected
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSelected(entry.id)}
              className={`border p-4 text-left transition-colors ${
                active
                  ? 'border-cs-green/60 bg-cs-green/5'
                  : 'border-cs-line hover:border-cs-dim/50'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-xs uppercase tracking-[0.25em] text-cs-text">
                  {entry.name}
                </span>
                <span
                  className={`font-mono text-lg ${active ? 'text-cs-green' : 'text-cs-dim'}`}
                >
                  {formatPrice(entry)}
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-cs-dim">
                or {entry.usdcDisplay}
              </p>
              <p className="mt-2 text-sm leading-snug text-cs-dim">{entry.tagline}</p>
              <ul className="mt-3 space-y-1.5">
                {entry.includes.map((line, index) => (
                  <li key={index} className="flex gap-2 text-[13px] leading-snug text-cs-text">
                    <span className="text-cs-green">→</span>
                    {line}
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      <div className="mt-5 space-y-4">
        {config.card && (
          <button
            type="button"
            onClick={payByCard}
            disabled={busy}
            className="w-full border border-cs-green/60 bg-cs-green/10 py-3 font-mono text-xs uppercase tracking-[0.3em] text-cs-green transition-colors hover:bg-cs-green/20 disabled:opacity-40"
          >
            {busy ? 'opening checkout…' : `pay ${formatPrice(tier)} by card`}
          </button>
        )}

        {config.usdc && config.receiveAddress && (
          <div className="border border-cs-line p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cs-dim">
              or send {tier.usdcDisplay} — usdc on solana
            </p>
            <div className="mt-2 flex items-start justify-between gap-3">
              <code className="break-all font-mono text-[11px] leading-relaxed text-cs-green">
                {config.receiveAddress}
              </code>
              <CopyButton text={config.receiveAddress} label="copy address" />
            </div>
            <p className="mt-3 font-mono text-[10px] leading-relaxed text-cs-dim">
              Send from any wallet, then paste the transaction signature below. Send at
              least {tier.usdcDisplay} — anything covering {TIER_LIST[1].usdcDisplay}{' '}
              unlocks the full arsenal automatically.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={signature}
                onChange={(event) => setSignature(event.target.value)}
                placeholder="transaction signature"
                spellCheck={false}
                className="flex-1 border border-cs-line bg-black/40 px-3 py-2 font-mono text-xs text-cs-text outline-none placeholder:text-cs-dim/60 focus:border-cs-green/50"
              />
              <button
                type="button"
                onClick={redeemSignature}
                disabled={busy || signature.trim().length < 64}
                className="border border-cs-green/50 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-cs-green transition-colors hover:bg-cs-green/10 disabled:opacity-30"
              >
                {busy ? 'checking chain…' : 'redeem'}
              </button>
            </div>
          </div>
        )}

        {!config.card && !config.usdc && (
          <ErrorNote message="No payment method is configured on this deployment yet. Set STRIPE_SECRET_KEY, or SOLANA_RECEIVE_ADDRESS with the claim store, and redeploy." />
        )}

        {busy && <Spinner label="working" />}
        {error && <ErrorNote message={error} />}
      </div>
    </Panel>
  )
}
