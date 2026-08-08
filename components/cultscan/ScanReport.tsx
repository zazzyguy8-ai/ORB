'use client'

import type { CultScan } from '@/lib/cultscan'
import ScoreDial from './ScoreDial'
import { Panel, Field, Severity, CopyButton } from './ui'

export default function ScanReport({
  scan,
  ticker,
}: {
  scan: CultScan
  ticker: string
}) {
  return (
    <div className="space-y-4">
      {/* Verdict — the screenshot */}
      <Panel accent>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
          <ScoreDial score={scan.cultScore} band={scan.scoreBand} />
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cs-dim">
              ${ticker} — verdict
            </p>
            <p className="text-lg leading-snug text-cs-text sm:text-xl">{scan.verdict}</p>
            <p className="text-sm leading-relaxed text-cs-dim">{scan.scoreReasoning}</p>
          </div>
        </div>
      </Panel>

      <Panel title="ticker memetics">
        <Field label="reads as">{scan.tickerMemetics.readsAs}</Field>
        <Field label="says out loud">{scan.tickerMemetics.saysOutLoud}</Field>
        <Field label="meme surface">{scan.tickerMemetics.memeSurface}</Field>
        <Field label="reply-guy test">{scan.tickerMemetics.replyGuyTest}</Field>
        <Field label="verdict">{scan.tickerMemetics.verdict}</Field>
      </Panel>

      <Panel title="the narrative">
        <Field label="thesis">{scan.narrative.thesis}</Field>
        <Field label="who buys">{scan.narrative.whoBuys}</Field>
        <Field label="what makes them sell">{scan.narrative.whatMakesThemSell}</Field>
        <Field label="ceiling">{scan.narrative.ceiling}</Field>
        <Field label="time to stale">{scan.narrative.timeToStale}</Field>
      </Panel>

      <Panel title="the fatal flaw">
        <Field label="flaw">{scan.fatalFlaw.flaw}</Field>
        <Field label="when it bites">{scan.fatalFlaw.whenItBites}</Field>
        <Field label="can it be fixed">{scan.fatalFlaw.canItBeFixed}</Field>
      </Panel>

      <Panel title="comparables">
        <div className="space-y-5">
          {scan.comparables.map((comparable, index) => (
            <div key={index} className="border-l border-cs-line pl-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-cs-green">
                {comparable.name}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-cs-text">
                {comparable.whyItRhymes}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-cs-dim">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                  breaks down:{' '}
                </span>
                {comparable.whereTheAnalogyBreaks}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="risk markers in the framing">
        {scan.riskMarkers.length === 0 ? (
          <p className="text-sm text-cs-dim">
            No manipulation patterns found in the pitch as written. That is about the
            language, not the contract — liquidity, holder distribution and mint
            authority still need an on-chain check.
          </p>
        ) : (
          <div className="space-y-4">
            {scan.riskMarkers.map((marker, index) => (
              <div key={index} className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-3">
                  <Severity level={marker.severity} />
                  <span className="text-sm text-cs-text">{marker.marker}</span>
                </div>
                <p className="text-sm leading-relaxed text-cs-dim">
                  {marker.whatItLooksLike}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="if you're launching this">
          <ol className="space-y-2.5">
            {scan.ifYouLaunchThis.map((item, index) => (
              <li key={index} className="flex gap-3 text-sm leading-relaxed text-cs-text">
                <span className="font-mono text-xs text-cs-green">{index + 1}</span>
                {item}
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="if you're buying this">
          <ol className="space-y-2.5">
            {scan.ifYouAreBuying.map((item, index) => (
              <li key={index} className="flex gap-3 text-sm leading-relaxed text-cs-text">
                <span className="font-mono text-xs text-cs-amber">{index + 1}</span>
                {item}
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <Panel title="the quotable">
        <div className="flex items-start justify-between gap-4">
          <p className="text-base leading-snug text-cs-text">
            &ldquo;{scan.oneLineForTwitter}&rdquo;
          </p>
          <CopyButton text={scan.oneLineForTwitter} />
        </div>
      </Panel>

      <p className="px-1 font-mono text-[10px] leading-relaxed text-cs-dim">
        CULTSCAN reads narrative, not chain state. It is not financial advice, it does
        not price anything, and it cannot see liquidity, holders or mint authority.
        Check those yourself before you touch anything.
      </p>
    </div>
  )
}
