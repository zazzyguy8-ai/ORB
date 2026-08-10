'use client';

import { useState } from 'react';
import {
  CheckRow,
  Meter,
  PressureBar,
  changeClass,
  formatChange,
  formatCount,
  formatPct,
  formatUsd,
  scoreText,
} from '@/components/analysis/primitives';
import type { AnalysisResult } from '@/lib/types/domain';

type Tab = 'security' | 'holders' | 'trading' | 'model' | 'pipeline';

const TABS: { id: Tab; label: string }[] = [
  { id: 'security', label: 'Security' },
  { id: 'holders', label: 'Holders' },
  { id: 'trading', label: 'Trading' },
  { id: 'model', label: 'Model' },
  { id: 'pipeline', label: 'Pipeline' },
];

/**
 * Everything behind the verdict, one tab at a time.
 *
 * Tabs rather than one long scroll: the spec is explicit that the decision must
 * dominate and the first screen must not be a wall of numbers. A trader who
 * wants the audit gets all of it; one who wants the answer never scrolls past
 * the card above.
 */
export function DeepDive({ result }: { result: AnalysisResult }) {
  const [tab, setTab] = useState<Tab>('security');

  return (
    <section className="card animate-fade-up" style={{ animationDelay: '240ms' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="label">Full analysis</p>
        <div className="flex flex-wrap gap-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.id
                  ? 'bg-ink-700 text-slate-100'
                  : 'text-slate-500 hover:bg-ink-800 hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {tab === 'security' && <SecurityPanel result={result} />}
        {tab === 'holders' && <HoldersPanel result={result} />}
        {tab === 'trading' && <TradingPanel result={result} />}
        {tab === 'model' && <ModelPanel result={result} />}
        {tab === 'pipeline' && <PipelinePanel result={result} />}
      </div>
    </section>
  );
}

function Unavailable({ what }: { what: string }) {
  return (
    <p className="rounded-lg border border-ink-700 bg-ink-900/40 px-4 py-6 text-center text-sm text-slate-500">
      {what} unavailable for this token.
    </p>
  );
}

function SecurityPanel({ result }: { result: AnalysisResult }) {
  const s = result.security;
  if (!s) return <Unavailable what="Security data" />;

  const lp = s.lpLockedOrBurnedPct;
  const creator = s.creatorBalancePct;

  return (
    <div className="space-y-5">
      <ul className="divide-y divide-ink-700/60">
        <CheckRow
          label="Mint authority revoked"
          state={s.mintAuthorityEnabled === null ? 'unknown' : s.mintAuthorityEnabled ? 'fail' : 'pass'}
          detail={
            s.mintAuthorityEnabled === null
              ? 'Not reported by the security provider.'
              : s.mintAuthorityEnabled
                ? 'Live — the creator can mint unlimited new supply at any time.'
                : 'Revoked — supply cannot be inflated.'
          }
        />
        <CheckRow
          label="Freeze authority revoked"
          state={
            s.freezeAuthorityEnabled === null ? 'unknown' : s.freezeAuthorityEnabled ? 'fail' : 'pass'
          }
          detail={
            s.freezeAuthorityEnabled === null
              ? 'Not reported by the security provider.'
              : s.freezeAuthorityEnabled
                ? 'Live — token accounts can be frozen, which can stop you selling.'
                : 'Revoked — your balance cannot be frozen.'
          }
        />
        <CheckRow
          label="Liquidity locked or burned"
          state={lp === null ? 'unknown' : lp >= 0.9 ? 'pass' : lp >= 0.5 ? 'warn' : 'fail'}
          detail={
            lp === null
              ? 'LP holder distribution not reported.'
              : `${formatPct(lp)} of LP tokens are locked or burned.`
          }
        />
        <CheckRow
          label="Metadata immutable"
          state={s.metadataMutable === null ? 'unknown' : s.metadataMutable ? 'warn' : 'pass'}
          detail={
            s.metadataMutable === null
              ? 'Not reported.'
              : s.metadataMutable
                ? 'Name, symbol and image can still be changed by the update authority.'
                : 'Name, symbol and image are frozen.'
          }
        />
        <CheckRow
          label="No transfer fee"
          state={
            s.transferFeeBps === null ? 'unknown' : s.transferFeeBps > 0 ? 'warn' : 'pass'
          }
          detail={
            s.transferFeeBps === null
              ? 'Not reported.'
              : s.transferFeeBps > 0
                ? `Every transfer is taxed ${(s.transferFeeBps / 100).toFixed(2)}%.`
                : 'Transfers are untaxed.'
          }
        />
        <CheckRow
          label="No transfer hook"
          state={
            s.transferHookPresent === null ? 'unknown' : s.transferHookPresent ? 'warn' : 'pass'
          }
          detail={
            s.transferHookPresent === null
              ? 'Not reported.'
              : s.transferHookPresent
                ? 'Transfers run custom program logic, which can restrict selling.'
                : 'Transfers use the standard token program path.'
          }
        />
      </ul>

      <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-4">
        <p className="label">Creator</p>
        {s.creatorAddress ? (
          <>
            <p className="mt-1.5 break-all font-mono text-xs text-slate-400">{s.creatorAddress}</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-sm text-slate-300">Holds</span>
              <span
                className={`tabular font-mono text-sm font-semibold ${
                  creator === null
                    ? 'text-slate-500'
                    : creator >= 0.15
                      ? 'text-signal-avoid'
                      : creator >= 0.05
                        ? 'text-signal-watch'
                        : 'text-signal-buy'
                }`}
              >
                {formatPct(creator)}
              </span>
              <span className="text-sm text-slate-500">of supply</span>
            </div>
          </>
        ) : (
          // Spec §7: never pretend certainty about the developer.
          <p className="mt-1.5 text-sm text-slate-500">Developer analysis unavailable.</p>
        )}
      </div>
    </div>
  );
}

function HoldersPanel({ result }: { result: AnalysisResult }) {
  const h = result.holders;
  if (!h) return <Unavailable what="Holder data" />;

  const top = h.topHolders.slice(0, 10);
  const largest = Math.max(...top.map((t) => t.pct), 0.0001);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Figure label="Holders" value={formatCount(h.holderCount)} />
        <Figure label="Top 10" value={formatPct(h.top10Pct)} />
        <Figure label="Top 20" value={formatPct(h.top20Pct)} />
        <Figure label="Largest" value={formatPct(h.largestHolderPct)} />
      </div>

      {h.top10Pct !== null && (
        <div>
          <div className="flex items-baseline justify-between">
            <p className="label">Supply distribution</p>
            <p className="tabular text-xs text-slate-500">
              top 10 hold {formatPct(h.top10Pct)}, everyone else{' '}
              {formatPct(1 - h.top10Pct)}
            </p>
          </div>
          <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-ink-700">
            <div
              className={
                h.top10Pct >= 0.45
                  ? 'bg-signal-avoid'
                  : h.top10Pct >= 0.3
                    ? 'bg-signal-watch'
                    : 'bg-signal-buy'
              }
              style={{ width: `${Math.min(100, h.top10Pct * 100)}%` }}
            />
          </div>
        </div>
      )}

      {top.length > 0 && (
        <div>
          <p className="label">Largest holders</p>
          <ul className="mt-2 space-y-1.5">
            {top.map((holder, i) => (
              <li key={holder.address + i} className="flex items-center gap-3">
                <span className="tabular w-5 shrink-0 text-right font-mono text-[11px] text-slate-600">
                  {i + 1}
                </span>
                <span className="w-28 shrink-0 truncate font-mono text-xs text-slate-500">
                  {holder.address.slice(0, 4)}…{holder.address.slice(-4)}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
                  <span
                    className="block h-full rounded-full bg-slate-500"
                    style={{ width: `${(holder.pct / largest) * 100}%` }}
                  />
                </span>
                <span className="tabular w-14 shrink-0 text-right font-mono text-xs text-slate-300">
                  {formatPct(holder.pct, 2)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
            {h.poolAccountsExcluded
              ? 'AMM pool vaults were identified and excluded — these are real holders.'
              : 'Pool vaults could not be identified, so one of these entries may be a liquidity pool rather than a holder.'}
          </p>
        </div>
      )}
    </div>
  );
}

function TradingPanel({ result }: { result: AnalysisResult }) {
  const m = result.market;
  if (!m) return <Unavailable what="Market data" />;

  const windows = [
    { key: 'm5' as const, label: '5 min' },
    { key: 'h1' as const, label: '1 hour' },
    { key: 'h6' as const, label: '6 hours' },
    { key: 'h24' as const, label: '24 hours' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="label">Buy / sell pressure</p>
        <div className="mt-3 space-y-3.5">
          {windows.map((w) => {
            const { buys, sells } = m.txns[w.key];
            return (
              <div key={w.key}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-400">{w.label}</span>
                  <span className="tabular font-mono text-slate-500">
                    <span className="text-signal-buy">{formatCount(buys)}</span>
                    {' / '}
                    <span className="text-signal-avoid">{formatCount(sells)}</span>
                  </span>
                </div>
                <div className="mt-1.5">
                  <PressureBar buys={buys} sells={sells} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="label">Price and volume by window</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[26rem] text-sm">
            <thead>
              <tr className="border-b border-ink-700 text-left">
                <th className="pb-2 font-medium text-slate-500">Window</th>
                <th className="pb-2 text-right font-medium text-slate-500">Price</th>
                <th className="pb-2 text-right font-medium text-slate-500">Volume</th>
                <th className="pb-2 text-right font-medium text-slate-500">Trades</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700/50">
              {windows.map((w) => {
                const { buys, sells } = m.txns[w.key];
                const trades = buys !== null && sells !== null ? buys + sells : null;
                const change = m.priceChangePct[w.key];
                return (
                  <tr key={w.key}>
                    <td className="py-2 text-slate-300">{w.label}</td>
                    <td
                      className={`tabular py-2 text-right font-mono ${changeClass(change)}`}
                    >
                      {formatChange(change)}
                    </td>
                    <td className="tabular py-2 text-right font-mono text-slate-300">
                      {formatUsd(m.volumeUsd[w.key])}
                    </td>
                    <td className="tabular py-2 text-right font-mono text-slate-400">
                      {formatCount(trades)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Figure label="Pool liquidity" value={formatUsd(m.liquidityUsd)} />
        <Figure
          label="All pairs"
          value={m.pairCount === null ? '—' : `${m.pairCount} · ${formatUsd(m.totalLiquidityUsd)}`}
        />
        <Figure label="Avg trade (1h)" value={formatUsd(result.metrics.avgTradeSizeUsd1h)} />
        <Figure label="Primary DEX" value={m.dex ?? '—'} />
      </div>

      {result.wallets ? (
        <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="label">Large-wallet flow</p>
            <p className="text-[11px] text-slate-600">
              last {result.wallets.windowMinutes} min · trades over $
              {result.wallets.largeTradeThresholdUsd.toLocaleString('en-US')}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Figure label="Buyers" value={formatCount(result.wallets.uniqueBuyers)} />
            <Figure label="Sellers" value={formatCount(result.wallets.uniqueSellers)} />
            <Figure
              label="Net flow"
              value={formatUsd(result.wallets.netFlowUsd)}
              valueClass={changeClass(result.wallets.netFlowUsd)}
            />
          </div>
          {/* Spec §6: measurable size, never an unearned "smart money" claim. */}
          <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
            Wallets are classified by trade size only. We do not claim to know whether these wallets
            have been right before.
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-ink-700 bg-ink-900/40 px-4 py-3 text-xs text-slate-500">
          Wallet activity unavailable — this deployment has no wallet data provider configured, so
          the category is excluded from the score rather than guessed.
        </p>
      )}
    </div>
  );
}

function ModelPanel({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-4">
      {result.score.categories.map((category) => (
        <div key={category.category}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium capitalize text-slate-300">{category.category}</span>
            <span className={`tabular font-mono text-xs ${scoreText(category.score)}`}>
              {category.score === null ? 'not measured' : `${category.score.toFixed(0)}/100`}
            </span>
          </div>
          <Meter value={category.score} className="mt-1.5" />
          <ul className="mt-2 space-y-1">
            {category.contributions.map((c) => (
              <li key={c.key} className="flex items-baseline justify-between gap-4 text-xs">
                <span className={c.value === null ? 'text-slate-600' : 'text-slate-500'}>
                  {c.label}
                </span>
                <span className="tabular shrink-0 font-mono text-slate-500">
                  {c.value === null ? (
                    'no data'
                  ) : (
                    <>
                      {Math.abs(c.value) >= 1000
                        ? Math.round(c.value).toLocaleString('en-US')
                        : c.value.toFixed(2)}
                      <span className={`ml-2 ${scoreText(c.score)}`}>{c.score.toFixed(0)}</span>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="border-t border-ink-700/60 pt-3 text-[11px] leading-relaxed text-slate-600">
        Scoring model {result.score.version}. Categories with no data are removed from the weighted
        average rather than scored zero, so a missing provider lowers coverage instead of the score.
      </p>
    </div>
  );
}

function PipelinePanel({ result }: { result: AnalysisResult }) {
  const stages = [
    { label: 'Data collection', ms: result.timings.collectMs },
    { label: 'Metrics, scoring, risk', ms: result.timings.computeMs },
    { label: 'AI explanation', ms: result.timings.aiMs },
  ];
  const max = Math.max(...stages.map((s) => s.ms), 1);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-baseline justify-between">
          <p className="label">Where the time went</p>
          <p className="tabular font-mono text-xs text-slate-400">{result.timings.totalMs}ms total</p>
        </div>
        <div className="mt-3 space-y-2.5">
          {stages.map((stage) => (
            <div key={stage.label}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400">{stage.label}</span>
                <span className="tabular font-mono text-slate-500">{stage.ms}ms</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-700">
                <div
                  className="h-full rounded-full bg-sky-500/70"
                  style={{ width: `${(stage.ms / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="label">Data sources</p>
        <ul className="mt-2 space-y-1.5">
          {Object.entries(result.availability).map(([key, status]) => (
            <li key={key} className="flex items-center justify-between text-xs">
              <span className="capitalize text-slate-400">{key}</span>
              <span className="flex items-center gap-2">
                <span className="tabular font-mono text-slate-600">
                  {result.timings.providers[key]}ms
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                    status === 'ok'
                      ? 'bg-signal-buy/15 text-signal-buy'
                      : status === 'error'
                        ? 'bg-signal-avoid/15 text-signal-avoid'
                        : 'bg-ink-700 text-slate-500'
                  }`}
                >
                  {status}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-ink-700/60 pt-3 text-[11px] leading-relaxed text-slate-600">
        <p>
          Explanation source: {result.explanation.source}
          {result.explanation.fallbackReason ? ` — ${result.explanation.fallbackReason}` : ''}
        </p>
        <p className="mt-1 break-all">Contract: {result.address}</p>
      </div>
    </div>
  );
}

function Figure({
  label,
  value,
  valueClass = 'text-slate-200',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/50 px-3 py-2.5">
      <p className="label">{label}</p>
      <p className={`tabular mt-1 font-mono text-sm font-medium ${valueClass}`}>{value}</p>
    </div>
  );
}
