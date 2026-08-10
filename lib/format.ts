/**
 * Display formatting, shared by server and client components.
 *
 * Every one of these takes `number | null` and renders an em dash for null
 * rather than a zero. "We could not measure this" and "this is zero" look
 * identical once they are both drawn as 0, and conflating them is exactly the
 * failure this product exists to avoid.
 *
 * Kept out of the component files so server components can call them: exports
 * of a `'use client'` module are client references and cannot run on the server.
 */

export function formatUsd(value: number | null): string {
  if (value === null) return '—';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value > 0) return `$${value.toPrecision(3)}`;
  return '$0';
}

export function formatPct(value: number | null, digits = 1): string {
  return value === null ? '—' : `${(value * 100).toFixed(digits)}%`;
}

export function formatCount(value: number | null): string {
  return value === null ? '—' : Math.round(value).toLocaleString('en-US');
}

export function changeClass(value: number | null): string {
  if (value === null) return 'text-slate-500';
  if (value > 0) return 'text-signal-buy';
  if (value < 0) return 'text-signal-avoid';
  return 'text-slate-400';
}

export function formatChange(value: number | null): string {
  if (value === null) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}
