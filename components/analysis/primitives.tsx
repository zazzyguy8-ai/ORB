'use client';

import { useEffect, useState } from 'react';

/**
 * Small display primitives shared by the analysis panels.
 *
 * All of them take `number | null` and render "no data" explicitly rather than
 * drawing a zero-length bar. A bar at zero and a bar we could not measure look
 * identical on screen, and conflating them is exactly the failure this product
 * exists to avoid.
 */

export function scoreColor(score: number | null): string {
  if (score === null) return 'bg-ink-600';
  if (score >= 65) return 'bg-signal-buy';
  if (score >= 45) return 'bg-signal-watch';
  return 'bg-signal-avoid';
}

export function scoreText(score: number | null): string {
  if (score === null) return 'text-slate-500';
  if (score >= 65) return 'text-signal-buy';
  if (score >= 45) return 'text-signal-watch';
  return 'text-signal-avoid';
}

/**
 * Horizontal 0..100 bar that sweeps out from zero on mount.
 *
 * Starting at zero and transitioning makes a screenful of bars resolve in a
 * single motion, which reads as one result arriving rather than as a static
 * table that was always there.
 */
export function Meter({ value, className = '' }: { value: number | null; className?: string }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (value === null) return;
    const id = requestAnimationFrame(() => setWidth(Math.max(2, Math.min(100, value))));
    return () => cancelAnimationFrame(id);
  }, [value]);

  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-ink-700 ${className}`}>
      {value !== null && (
        <div
          className={`h-full rounded-full transition-[width] duration-[900ms] ease-out ${scoreColor(value)}`}
          style={{ width: `${width}%` }}
        />
      )}
    </div>
  );
}

/**
 * Two-sided bar for buys vs sells. The split point is the story, so the divider
 * at 50% is drawn explicitly — without it a 55/45 split reads as "mostly buys".
 */
export function PressureBar({ buys, sells }: { buys: number | null; sells: number | null }) {
  if (buys === null || sells === null || buys + sells === 0) {
    return <div className="h-2 rounded-full bg-ink-700" />;
  }

  const total = buys + sells;
  const buyPct = (buys / total) * 100;

  return (
    <div className="relative h-2 overflow-hidden rounded-full bg-signal-avoid/70">
      <div
        className="h-full bg-signal-buy transition-[width] duration-700 ease-out"
        style={{ width: `${buyPct}%` }}
      />
      <div className="absolute inset-y-0 left-1/2 w-px bg-ink-950/60" aria-hidden />
    </div>
  );
}

/** Pass / fail / unknown row for the security audit. */
export function CheckRow({
  label,
  state,
  detail,
}: {
  label: string;
  state: 'pass' | 'fail' | 'warn' | 'unknown';
  detail: string;
}) {
  const marks = {
    pass: { icon: '✓', className: 'text-signal-buy border-signal-buy/40 bg-signal-buy/10' },
    fail: { icon: '✕', className: 'text-signal-avoid border-signal-avoid/40 bg-signal-avoid/10' },
    warn: { icon: '!', className: 'text-signal-watch border-signal-watch/40 bg-signal-watch/10' },
    unknown: { icon: '?', className: 'text-slate-500 border-white/10 bg-white/[0.05]' },
  }[state];

  return (
    <li className="flex items-start gap-3 py-2.5">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold ${marks.className}`}
        aria-hidden
      >
        {marks.icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="text-xs leading-relaxed text-slate-500">{detail}</p>
      </div>
    </li>
  );
}

// Re-exported so the existing panels keep importing from one place; the
// implementations live in lib/format so server components can use them too.
export { formatUsd, formatPct, formatCount, changeClass, formatChange } from '@/lib/format';
