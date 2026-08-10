'use client';

import { useCountUp } from '@/lib/hooks/useCountUp';
import type { Decision } from '@/lib/types/domain';

const RING: Record<Decision, { stroke: string; glow: string }> = {
  BUY: { stroke: '#2ee88a', glow: 'rgba(46,232,138,0.55)' },
  WATCH: { stroke: '#ffc043', glow: 'rgba(255,192,67,0.5)' },
  AVOID: { stroke: '#ff5a52', glow: 'rgba(255,90,82,0.5)' },
};

/**
 * Confidence as a ring that draws itself.
 *
 * A bare "78/100" makes the reader do arithmetic to know whether that is a lot;
 * an arc is read pre-attentively. Drawing it rather than showing it finished
 * also carries the right message — this was computed just now, for this token.
 */
export function ScoreRing({
  value,
  decision,
  size = 104,
}: {
  value: number;
  decision: Decision;
  size?: number;
}) {
  const animated = useCountUp(value, 1000);
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, animated));
  const colors = RING[decision];

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-ink-700"
        />
        {/* Track tick marks — reads as a gauge rather than a progress bar. */}
        {Array.from({ length: 40 }).map((_, i) => {
          const angle = (i / 40) * 2 * Math.PI;
          const inner = radius - stroke / 2 - 4;
          const outer = radius - stroke / 2 - 1.5;
          return (
            <line
              key={i}
              x1={size / 2 + Math.cos(angle) * inner}
              y1={size / 2 + Math.sin(angle) * inner}
              x2={size / 2 + Math.cos(angle) * outer}
              y2={size / 2 + Math.sin(angle) * outer}
              stroke={i / 40 <= clamped / 100 ? colors.stroke : '#1c2130'}
              strokeWidth={1}
              opacity={i / 40 <= clamped / 100 ? 0.5 : 1}
            />
          );
        })}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          style={{ filter: `drop-shadow(0 0 8px ${colors.glow})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular font-mono text-[28px] font-bold leading-none text-slate-50">
          {Math.round(clamped)}
        </span>
        <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          conf
        </span>
      </div>
    </div>
  );
}
