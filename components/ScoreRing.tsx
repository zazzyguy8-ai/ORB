import type { Decision } from '@/lib/types/domain';

const STROKE: Record<Decision, string> = {
  BUY: 'stroke-signal-buy',
  WATCH: 'stroke-signal-watch',
  AVOID: 'stroke-signal-avoid',
};

/**
 * Confidence as a ring.
 *
 * A bare "78/100" makes the reader do arithmetic to know whether that is a lot.
 * An arc is read pre-attentively — you know roughly where it sits before you
 * read the number. The number stays, because the exact value matters too.
 */
export function ScoreRing({
  value,
  decision,
  size = 92,
}: {
  value: number;
  decision: Decision;
  size?: number;
}) {
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-ink-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          className={`${STROKE[decision]} transition-[stroke-dashoffset] duration-[900ms] ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular text-2xl font-bold leading-none text-slate-100">
          {Math.round(clamped)}
        </span>
        <span className="mt-0.5 text-[9px] uppercase tracking-widest text-slate-500">conf</span>
      </div>
    </div>
  );
}
