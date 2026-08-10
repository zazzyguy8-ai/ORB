'use client';

import { useEffect, useRef, useState } from 'react';
import { DecisionCard } from '@/components/DecisionCard';
import { DeepDive } from '@/components/analysis/DeepDive';
import { DeltaBanner } from '@/components/analysis/DeltaBanner';
import { ScoreHistory } from '@/components/analysis/ScoreHistory';
import { WhatWeCheck } from '@/components/analysis/WhatWeCheck';
import {
  ErrorPanel,
  errorKindFromStatus,
  type AnalysisError,
} from '@/components/analysis/ErrorPanel';
import { ResultActions } from '@/components/analysis/ResultActions';
import { SignalGrid } from '@/components/analysis/SignalGrid';
import { RiskFlags } from '@/components/RiskFlags';
import { validateSolanaAddress } from '@/lib/chains/solana';
import { useRecentTokens } from '@/lib/hooks/useRecentTokens';
import { getAccessToken } from '@/lib/supabase/browser';
import type { AnalysisResult } from '@/lib/types/domain';

/**
 * Well-known, long-lived mints so a first-time visitor can see a real result
 * without owning a contract address. They are examples, not recommendations,
 * and the analysis they produce is the same live analysis as any other input.
 */
const EXAMPLES = [
  { label: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  { label: 'WIF', address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm' },
  { label: 'POPCAT', address: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr' },
];

const STAGES = [
  'Collecting market, security and holder data…',
  'Computing metrics and risk flags…',
  'Writing the summary…',
];

export function AnalyzeForm({ initialAddress = '' }: { initialAddress?: string }) {
  const [address, setAddress] = useState(initialAddress);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<AnalysisError | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { recent, remember } = useRecentTokens();

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // A trader arrives with the address already on the clipboard, so the input is
  // focused on mount and "/" refocuses it from anywhere on the page.
  useEffect(() => {
    inputRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      if (event.key === '/' && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function analyze(event: React.FormEvent, override?: string) {
    event.preventDefault();

    // Validate before spending a request — same validator the API uses.
    const validation = validateSolanaAddress(override ?? address);
    if (!validation.valid) {
      setError({
        kind: 'invalid',
        message: validation.error ?? 'Invalid address.',
        address: null,
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setStage(0);

    timers.current.forEach(clearTimeout);
    timers.current = [setTimeout(() => setStage(1), 1100), setTimeout(() => setStage(2), 2300)];

    try {
      const token = await getAccessToken();
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ address: validation.address }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError({
          kind: errorKindFromStatus(response.status),
          message: payload.error ?? 'Analysis failed.',
          address: validation.address,
        });
        return;
      }

      const analysis = payload as AnalysisResult;
      setResult(analysis);
      remember({
        address: analysis.address,
        symbol: analysis.symbol,
        decision: analysis.decision,
        at: Date.now(),
      });
    } catch {
      setError({
        kind: 'provider',
        message: 'Could not reach the analysis service.',
        address: validation.address,
      });
    } finally {
      timers.current.forEach(clearTimeout);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={analyze} className="flex flex-col gap-2.5 sm:flex-row">
        <input
          ref={inputRef}
          className="input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Paste a Solana token contract address"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          aria-label="Token contract address"
          disabled={loading}
        />
        <button type="submit" className="btn-primary whitespace-nowrap" disabled={loading}>
          {loading ? 'ANALYZING…' : 'ANALYZE'}
        </button>
      </form>

      {!loading && (
        <div className="flex flex-wrap items-center gap-2">
          {recent.length > 0 ? (
            <>
              <span className="text-xs text-slate-600">Recent:</span>
              {recent.map((token) => (
                <button
                  key={token.address}
                  type="button"
                  className="pill"
                  onClick={(e) => {
                    setAddress(token.address);
                    void analyze(e, token.address);
                  }}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      token.decision === 'BUY'
                        ? 'bg-signal-buy'
                        : token.decision === 'AVOID'
                          ? 'bg-signal-avoid'
                          : 'bg-signal-watch'
                    }`}
                    aria-hidden
                  />
                  {token.symbol ? `$${token.symbol}` : `${token.address.slice(0, 4)}…`}
                </button>
              ))}
            </>
          ) : (
            !result && (
              <>
                <span className="text-xs text-slate-600">Try one:</span>
                {EXAMPLES.map((example) => (
                  <button
                    key={example.address}
                    type="button"
                    className="pill"
                    onClick={(e) => {
                      setAddress(example.address);
                      void analyze(e, example.address);
                    }}
                  >
                    {example.label}
                  </button>
                ))}
              </>
            )
          )}
        </div>
      )}

      {error && (
        <ErrorPanel
          error={error}
          onRetry={() => {
            const event = { preventDefault() {} } as React.FormEvent;
            void analyze(event, error.address ?? address);
          }}
        />
      )}

      {/* Before the first analysis this page is an input box on an empty
          screen; the space is better spent saying what happens next. */}
      {!loading && !result && <WhatWeCheck />}

      {loading && <LoadingState stage={stage} />}

      {result && (
        <div className="space-y-4">
          <DecisionCard result={result} />
          <ResultActions result={result} />
          {result.delta && <DeltaBanner delta={result.delta} />}
          {result.history && result.history.length > 0 && (
            <ScoreHistory
              history={result.history}
              current={{
                at: result.createdAt,
                score: result.score.total,
                decision: result.decision,
              }}
            />
          )}
          <RiskFlags flags={result.riskFlags} unavailable={result.unavailable} />
          <SignalGrid score={result.score} />
          <DeepDive result={result} />
          {!result.persisted && (
            <p className="text-xs text-slate-600">
              This analysis was not saved — persistence is not configured on this deployment.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * A shaped placeholder rather than a spinner: it shows the result is coming and
 * roughly what it will look like, which makes a three-second wait feel shorter
 * than an unmarked one.
 */
function LoadingState({ stage }: { stage: number }) {
  return (
    <div className="animate-fade-up space-y-4">
      <div className="rounded-2xl border border-ink-700/80 bg-ink-900/60 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="skeleton h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <div className="skeleton h-6 w-32" />
            <div className="skeleton h-4 w-44" />
          </div>
        </div>
        <div className="mt-7 flex items-center gap-6">
          <div className="skeleton h-[92px] w-[92px] rounded-full" />
          <div className="space-y-3">
            <div className="skeleton h-14 w-52" />
            <div className="skeleton h-4 w-72" />
          </div>
        </div>
      </div>
      <p
        aria-live="polite"
        className="animate-pulse-soft text-center font-mono text-xs text-slate-500"
      >
        {STAGES[stage]}
      </p>
    </div>
  );
}
