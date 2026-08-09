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
    timers.current = [
      setTimeout(() => setStage(1), 900),
      setTimeout(() => setStage(2), 2000),
    ];

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
    <div className="space-y-6">
      <form onSubmit={analyze} className="flex flex-col gap-3 sm:flex-row">
        <input
          className="input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Paste a Solana token contract address"
          spellCheck={false}
          autoComplete="off"
          aria-label="Token contract address"
          disabled={loading}
        />
        <button type="submit" className="btn-primary whitespace-nowrap" disabled={loading}>
          {loading ? 'ANALYZING…' : 'ANALYZE'}
        </button>
      </form>

      {loading && (
        <p className="animate-pulse-soft font-mono text-xs text-slate-500">{STAGES[stage]}</p>
      )}

      {error && (
        <div className="rounded-lg border border-signal-avoid/40 bg-signal-avoid/10 px-4 py-3 text-sm text-slate-200">
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
