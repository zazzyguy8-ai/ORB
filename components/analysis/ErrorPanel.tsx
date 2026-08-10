'use client';

import Link from 'next/link';

export type AnalysisErrorKind = 'limit' | 'notfound' | 'provider' | 'invalid' | 'unknown';

export interface AnalysisError {
  kind: AnalysisErrorKind;
  message: string;
  /** The address that was attempted, when there was a valid one. */
  address: string | null;
}

/** Maps an HTTP status onto the kind of problem the user actually has. */
export function errorKindFromStatus(status: number): AnalysisErrorKind {
  if (status === 429) return 'limit';
  if (status === 404) return 'notfound';
  if (status === 503) return 'provider';
  if (status === 400) return 'invalid';
  return 'unknown';
}

/**
 * A failed analysis, with the next move attached.
 *
 * A red bar and nothing else is a dead end, and these are not interchangeable
 * failures: hitting the daily limit is the moment a user is most willing to
 * sign in, a token with no pair is worth checking on a block explorer, and a
 * provider outage simply needs the same request again. Each state offers the
 * action that actually applies to it and nothing else.
 */
export function ErrorPanel({ error, onRetry }: { error: AnalysisError; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="animate-fade-up rounded-xl border border-signal-avoid/40 bg-signal-avoid/[0.07] px-4 py-4"
    >
      <p className="text-sm leading-relaxed text-slate-200">{error.message}</p>

      {error.kind === 'limit' && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link href="/login" className="btn-primary px-4 py-2 text-xs">
            SIGN IN
          </Link>
          <span className="text-xs text-slate-500">
            Signing in raises the daily limit and keeps your history across devices.
          </span>
        </div>
      )}

      {error.kind === 'notfound' && error.address && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Check the address:</span>
          <a
            href={`https://solscan.io/token/${error.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="pill"
          >
            Solscan ↗
          </a>
          <a
            href={`https://dexscreener.com/solana/${error.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="pill"
          >
            DexScreener ↗
          </a>
        </div>
      )}

      {(error.kind === 'provider' || error.kind === 'unknown') && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={onRetry} className="btn-ghost px-4 py-2 text-xs">
            Try again
          </button>
          <span className="text-xs text-slate-500">
            Nothing was charged against your daily limit — a failed analysis is refunded.
          </span>
        </div>
      )}
    </div>
  );
}
