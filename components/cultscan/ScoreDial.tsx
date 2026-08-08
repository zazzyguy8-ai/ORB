'use client'

/**
 * The score, as a ring.
 *
 * This element is the product's most-screenshotted surface, so it is built to
 * read at thumbnail size: one number, one band label, one colour that carries
 * the verdict before anything is read.
 */

function toneFor(score: number): { stroke: string; text: string } {
  if (score >= 76) return { stroke: '#3DFF9E', text: 'text-cs-green' }
  if (score >= 56) return { stroke: '#3DFF9E', text: 'text-cs-green' }
  if (score >= 31) return { stroke: '#FFB03A', text: 'text-cs-amber' }
  return { stroke: '#FF4D4D', text: 'text-cs-red' }
}

export default function ScoreDial({
  score,
  band,
  size = 168,
}: {
  score: number
  band: string
  size?: number
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  const tone = toneFor(clamped)

  const stroke = 6
  const radius = size / 2 - stroke
  const circumference = 2 * Math.PI * radius
  const filled = (clamped / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1C2427"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={tone.stroke}
            strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={`${filled} ${circumference - filled}`}
            style={{ transition: 'stroke-dasharray 900ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-mono text-5xl font-light tabular-nums ${tone.text}`}>
            {clamped}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-cs-dim mt-1">
            cult score
          </span>
        </div>
      </div>
      <p
        className={`font-mono text-[11px] uppercase tracking-[0.3em] text-center ${tone.text}`}
      >
        {band}
      </p>
    </div>
  )
}
