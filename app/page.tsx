'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CultScan, VibeCheck, TokenInput } from '@/lib/cultscan'
import type { VideoPack, PostPack, LaunchPack } from '@/lib/arsenal'
import { TIERS, type TierId } from '@/lib/products'
import ScoreDial from '@/components/cultscan/ScoreDial'
import ScanReport from '@/components/cultscan/ScanReport'
import { VideoScripts, Posts, Launch } from '@/components/cultscan/ArsenalView'
import PayPanel, { type DeploymentConfig } from '@/components/cultscan/PayPanel'
import { Panel, CopyButton, Spinner, ErrorNote } from '@/components/cultscan/ui'

/**
 * Everything the buyer sees, in one route.
 *
 * State lives in localStorage rather than on a server: there is no account to
 * create before a first sale, and a buyer who closes the tab still has their
 * report when they come back. The unlock token expires in six hours; the
 * generated output does not, because it is theirs.
 */

const STORE = {
  input: 'cultscan:input',
  token: 'cultscan:token',
  tier: 'cultscan:tier',
  vibe: 'cultscan:vibe',
  scan: 'cultscan:scan',
  videos: 'cultscan:videos',
  posts: 'cultscan:posts',
  launch: 'cultscan:launch',
} as const

function load<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function save(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private-mode or quota. The session still works, it just will not survive a reload.
  }
}

const EMPTY_INPUT: TokenInput = { ticker: '', name: '', pitch: '', chain: '' }

type ArsenalTab = 'videos' | 'posts' | 'launch'

export default function CultScanPage() {
  const [config, setConfig] = useState<DeploymentConfig | null>(null)
  const [input, setInput] = useState<TokenInput>(EMPTY_INPUT)

  const [vibe, setVibe] = useState<VibeCheck | null>(null)
  const [scan, setScan] = useState<CultScan | null>(null)
  const [videos, setVideos] = useState<VideoPack | null>(null)
  const [posts, setPosts] = useState<PostPack | null>(null)
  const [launch, setLaunch] = useState<LaunchPack | null>(null)

  const [token, setToken] = useState('')
  const [tier, setTier] = useState<TierId | null>(null)

  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<ArsenalTab>('videos')

  /* ------------------------------ boot ------------------------------ */

  useEffect(() => {
    setInput(load<TokenInput>(STORE.input) ?? EMPTY_INPUT)
    setVibe(load<VibeCheck>(STORE.vibe))
    setScan(load<CultScan>(STORE.scan))
    setVideos(load<VideoPack>(STORE.videos))
    setPosts(load<PostPack>(STORE.posts))
    setLaunch(load<LaunchPack>(STORE.launch))

    const storedToken = load<string>(STORE.token)
    const storedTier = load<TierId>(STORE.tier)
    if (storedToken) setToken(storedToken)
    if (storedTier) setTier(storedTier)

    fetch('/api/config')
      .then((response) => response.json())
      .then((data: DeploymentConfig) => setConfig(data))
      .catch(() =>
        setConfig({ scanning: false, card: false, usdc: false, receiveAddress: null })
      )
  }, [])

  const acceptUnlock = useCallback((newToken: string, newTier: TierId) => {
    setToken(newToken)
    setTier(newTier)
    save(STORE.token, newToken)
    save(STORE.tier, newTier)
    setError('')
  }, [])

  /* --------------------- return leg from Stripe --------------------- */

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('cancelled')) {
      window.history.replaceState({}, '', '/')
      return
    }
    const sessionId = params.get('session_id')
    if (!params.get('paid') || !sessionId) return

    // Clear the receipt out of the URL before anything else, so a shared link
    // or a screenshot does not carry it.
    window.history.replaceState({}, '', '/')

    setBusy('confirming payment')
    fetch('/api/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'stripe', sessionId }),
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'Could not confirm payment.')
        acceptUnlock(data.token, data.tier)
      })
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : 'Could not confirm payment.')
      )
      .finally(() => setBusy(''))
  }, [acceptUnlock])

  /* ---------------------------- actions ----------------------------- */

  function updateInput(patch: Partial<TokenInput>) {
    const next = { ...input, ...patch }
    setInput(next)
    save(STORE.input, next)
  }

  async function post<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? 'Request failed.')
    return data as T
  }

  async function runVibe() {
    setBusy('reading the narrative')
    setError('')
    try {
      const result = await post<VibeCheck>('/api/cultscan/vibe', input)
      setVibe(result)
      save(STORE.vibe, result)
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'The scan failed.')
    } finally {
      setBusy('')
    }
  }

  async function runScan() {
    setBusy('running the full scan')
    setError('')
    try {
      const result = await post<CultScan>('/api/cultscan/scan', { ...input, token })
      setScan(result)
      save(STORE.scan, result)
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'The scan failed.')
    } finally {
      setBusy('')
    }
  }

  /** Give the arsenal the scan's conclusions so the copy matches the audit. */
  function arsenalContext(): string | undefined {
    if (!scan) return undefined
    return [
      `Verdict: ${scan.verdict}`,
      `Cult score: ${scan.cultScore} (${scan.scoreBand})`,
      `Thesis: ${scan.narrative.thesis}`,
      `Audience: ${scan.narrative.whoBuys}`,
      `Meme surface: ${scan.tickerMemetics.memeSurface}`,
      `Fatal flaw to write around: ${scan.fatalFlaw.flaw}`,
    ].join('\n')
  }

  async function runArsenal() {
    setError('')
    const context = arsenalContext()
    const steps: { part: ArsenalTab; label: string }[] = [
      { part: 'videos', label: 'writing the video scripts' },
      { part: 'posts', label: 'writing the posts and memes' },
      { part: 'launch', label: 'writing the launch copy and calendar' },
    ]

    try {
      for (const step of steps) {
        setBusy(step.label)
        const result = await post<VideoPack | PostPack | LaunchPack>(
          '/api/cultscan/arsenal',
          { ...input, token, part: step.part, context }
        )
        if (step.part === 'videos') {
          setVideos(result as VideoPack)
          save(STORE.videos, result)
        } else if (step.part === 'posts') {
          setPosts(result as PostPack)
          save(STORE.posts, result)
        } else {
          setLaunch(result as LaunchPack)
          save(STORE.launch, result)
        }
      }
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Generation failed.')
    } finally {
      setBusy('')
    }
  }

  function startOver() {
    Object.values(STORE).forEach((key) => {
      if (key === STORE.token || key === STORE.tier) return // keep the entitlement
      try {
        window.localStorage.removeItem(key)
      } catch {
        /* ignore */
      }
    })
    setInput(EMPTY_INPUT)
    setVibe(null)
    setScan(null)
    setVideos(null)
    setPosts(null)
    setLaunch(null)
    setError('')
  }

  /* ------------------------------ view ------------------------------ */

  const canSubmit = input.ticker.trim().length > 0 && input.pitch.trim().length >= 20
  const unlocked = Boolean(token && tier)
  const hasArsenalTier = tier ? TIERS[tier].arsenal : false

  return (
    <main className="relative z-10 min-h-screen bg-cs-bg px-4 py-10 text-cs-text sm:px-6 sm:py-14">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-3">
          <h1 className="font-mono text-2xl tracking-[0.25em] text-cs-green sm:text-3xl">
            CULTSCAN
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-cs-dim">
            Every other tool checks the contract. That question is solved. This one
            scores the thing people actually decide on — whether the story survives a
            group chat, a red candle, and week two.
          </p>
        </header>

        {config && !config.scanning && (
          <ErrorNote message="ANTHROPIC_API_KEY is not set on this deployment, so nothing can be scanned yet." />
        )}

        {/* Input */}
        <Panel title="the token">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                value={input.ticker}
                onChange={(event) => updateInput({ ticker: event.target.value })}
                placeholder="TICKER"
                className="border border-cs-line bg-black/40 px-3 py-2 font-mono text-sm uppercase text-cs-text outline-none placeholder:text-cs-dim/60 focus:border-cs-green/50"
              />
              <input
                value={input.name}
                onChange={(event) => updateInput({ name: event.target.value })}
                placeholder="name (optional)"
                className="border border-cs-line bg-black/40 px-3 py-2 font-mono text-sm text-cs-text outline-none placeholder:text-cs-dim/60 focus:border-cs-green/50"
              />
              <input
                value={input.chain ?? ''}
                onChange={(event) => updateInput({ chain: event.target.value })}
                placeholder="chain (optional)"
                className="border border-cs-line bg-black/40 px-3 py-2 font-mono text-sm text-cs-text outline-none placeholder:text-cs-dim/60 focus:border-cs-green/50"
              />
            </div>
            <textarea
              value={input.pitch}
              onChange={(event) => updateInput({ pitch: event.target.value })}
              rows={6}
              placeholder="The pitch. The lore, the meme, the thesis, the reason anyone should care. Paste the whole thing — the more you give it, the sharper the read."
              className="w-full resize-y border border-cs-line bg-black/40 px-3 py-2 text-sm leading-relaxed text-cs-text outline-none placeholder:text-cs-dim/60 focus:border-cs-green/50"
            />
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={runVibe}
                disabled={!canSubmit || Boolean(busy) || !config?.scanning}
                className="border border-cs-green/50 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.3em] text-cs-green transition-colors hover:bg-cs-green/10 disabled:opacity-30"
              >
                free vibe check
              </button>
              {unlocked && (
                <button
                  type="button"
                  onClick={runScan}
                  disabled={!canSubmit || Boolean(busy)}
                  className="border border-cs-green/60 bg-cs-green/10 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.3em] text-cs-green transition-colors hover:bg-cs-green/20 disabled:opacity-30"
                >
                  run full scan
                </button>
              )}
              {(vibe || scan) && (
                <button
                  type="button"
                  onClick={startOver}
                  className="font-mono text-[10px] uppercase tracking-[0.2em] text-cs-dim hover:text-cs-text"
                >
                  new token
                </button>
              )}
            </div>
            {busy && <Spinner label={busy} />}
            {error && <ErrorNote message={error} />}
          </div>
        </Panel>

        {/* Free result */}
        {vibe && !scan && (
          <Panel accent>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
              <ScoreDial score={vibe.cultScore} band={vibe.scoreBand} size={140} />
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <p className="text-lg leading-snug">{vibe.verdict}</p>
                <p className="text-sm leading-relaxed text-cs-text">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cs-green">
                    strongest:{' '}
                  </span>
                  {vibe.strongestThing}
                </p>
                <p className="text-sm leading-relaxed text-cs-text">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cs-red">
                    weakest:{' '}
                  </span>
                  {vibe.weakestThing}
                </p>
                <div className="flex items-center justify-center gap-3 sm:justify-start">
                  <p className="font-mono text-xs text-cs-dim">
                    &ldquo;{vibe.oneLineForTwitter}&rdquo;
                  </p>
                  <CopyButton text={vibe.oneLineForTwitter} />
                </div>
              </div>
            </div>
          </Panel>
        )}

        {/* Paywall */}
        {!unlocked && config && (
          <PayPanel config={config} onUnlocked={acceptUnlock} />
        )}

        {/* Unlocked, nothing generated yet */}
        {unlocked && !scan && (
          <Panel accent>
            <p className="text-sm leading-relaxed text-cs-text">
              {TIERS[tier as TierId].name} unlocked. Fill in the token above and hit{' '}
              <span className="font-mono text-cs-green">run full scan</span>.
            </p>
          </Panel>
        )}

        {/* The report */}
        {scan && <ScanReport scan={scan} ticker={input.ticker || 'TOKEN'} />}

        {/* Arsenal */}
        {scan && unlocked && hasArsenalTier && (
          <Panel title="content arsenal" accent>
            {!videos && !posts && !launch ? (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-cs-dim">
                  Six faceless video scripts, fifteen posts, six meme concepts, the
                  launch copy and a seven-day calendar — all written around the scan
                  above, including its fatal flaw.
                </p>
                <button
                  type="button"
                  onClick={runArsenal}
                  disabled={Boolean(busy)}
                  className="border border-cs-green/60 bg-cs-green/10 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.3em] text-cs-green transition-colors hover:bg-cs-green/20 disabled:opacity-30"
                >
                  build the arsenal
                </button>
                {busy && <Spinner label={busy} />}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(['videos', 'posts', 'launch'] as ArsenalTab[]).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setTab(name)}
                    className={`border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] transition-colors ${
                      tab === name
                        ? 'border-cs-green/60 bg-cs-green/10 text-cs-green'
                        : 'border-cs-line text-cs-dim hover:text-cs-text'
                    }`}
                  >
                    {name}
                  </button>
                ))}
                {busy && (
                  <div className="w-full pt-2">
                    <Spinner label={busy} />
                  </div>
                )}
              </div>
            )}
          </Panel>
        )}

        {tab === 'videos' && videos && <VideoScripts pack={videos} />}
        {tab === 'posts' && posts && <Posts pack={posts} />}
        {tab === 'launch' && launch && <Launch pack={launch} />}

        {/* Upsell for scan-tier buyers */}
        {scan && unlocked && !hasArsenalTier && config && (
          <PayPanel config={config} onUnlocked={acceptUnlock} />
        )}

        <footer className="border-t border-cs-line pt-5 font-mono text-[10px] leading-relaxed text-cs-dim">
          CULTSCAN analyses language, not chain state. Nothing here is financial advice,
          nothing here is a price prediction, and no output should be treated as a
          reason to buy anything. Do your own on-chain checks.
        </footer>
      </div>
    </main>
  )
}
