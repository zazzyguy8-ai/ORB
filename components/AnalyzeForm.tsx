'use client';

import { useEffect, useRef, useState } from 'react';
import { DecisionCard } from '@/components/DecisionCard';
import { FullAnalysis } from '@/components/FullAnalysis';
import { RiskFlags } from '@/components/RiskFlags';
import { validateSolanaAddress } from '@/lib/chains/solana';
import { getAccessToken } from '@/lib/supabase/browser';
import type { AnalysisResult } from '@/lib/types/domain';

const STAGES = [
  'Collecting market, security and holder data…',
  'Computing metrics and risk flags…',
  'Writing the summary…',
];

export function AnalyzeForm({ initialAddress = '' }: { initialAddress?: string }) {
  const [address, setAddress] = useState(initialAddress);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  async function analyze(event: React.FormEvent) {
    event.preventDefault();

    // Validate before spending a request — same validator the API uses.
    const validation = validateSolanaAddress(address);
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid address.');
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
        setError(payload.error ?? 'Analysis failed.');
        return;
      }

      setResult(payload as AnalysisResult);
    } catch {
      setError('Could not reach the analysis service.');
    } finally {
      timers.current.forEach(clearTimeout);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={analyze} className="flex flex-col gap-2.5 sm:flex-row">
        <input
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

      {loading && <LoadingState stage={stage} />}

      {error && (
        <div
          role="alert"
          className="animate-fade-up rounded-xl border border-signal-avoid/40 bg-signal-avoid/[0.08] px-4 py-3.5 text-sm text-slate-200"
        >
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <DecisionCard result={result} />
          <RiskFlags flags={result.riskFlags} unavailable={result.unavailable} />
          <FullAnalysis result={result} />
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
