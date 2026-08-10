'use client';

import { useState } from 'react';
import type { AnalysisResult } from '@/lib/types/domain';

/**
 * Actions on a finished analysis.
 *
 * Copying the contract is the one every trader does next — they are going to
 * paste it into a DEX. Doing it here saves a round trip through a block
 * explorer and keeps them on the page.
 */
export function ResultActions({ result }: { result: AnalysisResult }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied((current) => (current === label ? null : current)), 1600);
    } catch {
      // Clipboard access can be denied; failing silently is better than an
      // error dialog for something this incidental.
    }
  }

  const links = [
    { label: 'DexScreener', url: `https://dexscreener.com/solana/${result.address}` },
    { label: 'Solscan', url: `https://solscan.io/token/${result.address}` },
    { label: 'Jupiter', url: `https://jup.ag/swap/SOL-${result.address}` },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="pill" onClick={() => copy('address', result.address)}>
        {copied === 'address' ? '✓ Copied' : 'Copy contract'}
      </button>

      {result.id && result.shareable ? (
        <>
          <button
            type="button"
            className="pill"
            onClick={() => copy('link', `${window.location.origin}/a/${result.id}`)}
          >
            {copied === 'link' ? '✓ Copied' : 'Copy share link'}
          </button>
          {/* The permalink is the saved call, so it is worth opening: it keeps
              filling in with the +5m…+24h outcomes long after this tab is gone. */}
          <a href={`/a/${result.id}`} target="_blank" rel="noopener" className="pill">
            Open saved result
            <span aria-hidden className="text-slate-600">
              ↗
            </span>
          </a>
        </>
      ) : (
        <button
          type="button"
          className="pill"
          onClick={() => copy('link', `${window.location.origin}/app?address=${result.address}`)}
        >
          {copied === 'link' ? '✓ Copied' : 'Copy link'}
        </button>
      )}

      <span className="mx-1 h-4 w-px bg-ink-700" aria-hidden />

      {links.map((link) => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="pill"
        >
          {link.label}
          <span aria-hidden className="text-slate-600">
            ↗
          </span>
        </a>
      ))}
    </div>
  );
}
