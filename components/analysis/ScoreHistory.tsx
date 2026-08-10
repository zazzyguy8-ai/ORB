import type { Decision } from '@/lib/types/domain';

const DOT_COLOR: Record<Decision, string> = {
  BUY: '#2ee88a',
  WATCH: '#ffc043',
  AVOID: '#ff5a52',
};

export interface ScorePoint {
  at: string;
  score: number;
  decision: Decision;
}

/**
 * This model's score for this token over time.
 *
 * Everything else on the page can be reconstructed from public data by anyone
 * with the same API keys. This cannot: it is our own record of what we said,
 * and it is the difference between a calculator and a service with a memory.
 *
 * Drawn as a plain SVG rather than a chart library — three to twenty-four
 * points do not justify shipping one, and the y-axis is fixed to 0..100 so two
 * different tokens are visually comparable.
 */
export function ScoreHistory({
  history,
  current,
}: {
  history: ScorePoint[];
  current: ScorePoint;
}) {
  const points = [...history, current];
  // Two points is a line between two moments, not a history worth drawing.
  if (points.length < 3) return null;

  const width = 100;
  const height = 28;
  const step = width / (points.length - 1);

  const coords = points.map((point, index) => ({
    x: index * step,
    y: height - (Math.max(0, Math.min(100, point.score)) / 100) * height,
    point,
  }));

  const line = coords.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ');
  // Closing the polygon along the baseline turns the same points into an area,
  // which reads as a chart at this size where a hairline reads as a scratch.
  const area = `0,${height} ${line} ${width},${height}`;

  const first = points[0];
  const change = current.score - first.score;
  const span = elapsed(first.at, current.at);
  const trend = change > 1 ? '#2ee88a' : change < -1 ? '#ff5a52' : '#64748b';

  return (
    <section className="card animate-fade-up" style={{ animationDelay: '160ms' }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="label">Our score for this token over time</p>
        <p className="tabular font-mono text-xs text-slate-500">
          {points.length} analyses{span ? ` · ${span}` : ''}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <div className="relative flex-1">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="h-16 w-full"
            role="img"
            aria-label={`Score history: ${points.map((p) => p.score.toFixed(0)).join(', ')}`}
          >
            <defs>
              <linearGradient id="score-history-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={trend} stopOpacity="0.28" />
                <stop offset="100%" stopColor={trend} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Decision band edges, so a line crossing one means something. */}
            {[
              { at: 68, color: '#2ee88a' },
              { at: 45, color: '#ffc043' },
            ].map((band) => (
              <line
                key={band.at}
                x1="0"
                x2={width}
                y1={height - (band.at / 100) * height}
                y2={height - (band.at / 100) * height}
                stroke={band.color}
                strokeOpacity="0.2"
                strokeDasharray="2 2"
                strokeWidth="0.4"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            <polygon points={area} fill="url(#score-history-fill)" />
            <polyline
              points={line}
              fill="none"
              stroke={trend}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Markers live outside the SVG: the chart is stretched to fill its
              box, and anything drawn inside it stretches with it — circles
              included, which came out as ellipses. */}
          {coords.map((c, index) => (
            <span
              key={`${c.point.at}-${index}`}
              className="absolute -translate-x-1/2 translate-y-1/2 rounded-full"
              style={{
                left: `${(c.x / width) * 100}%`,
                bottom: `${(1 - c.y / height) * 100}%`,
                width: index === coords.length - 1 ? 8 : 5,
                height: index === coords.length - 1 ? 8 : 5,
                background: DOT_COLOR[c.point.decision],
                opacity: index === coords.length - 1 ? 1 : 0.65,
                boxShadow:
                  index === coords.length - 1
                    ? `0 0 0 3px ${DOT_COLOR[c.point.decision]}22`
                    : undefined,
              }}
              aria-hidden
            />
          ))}
        </div>

        <div className="shrink-0 text-right">
          <p
            className={`tabular font-mono text-lg font-semibold ${
              change > 1 ? 'text-signal-buy' : change < -1 ? 'text-signal-avoid' : 'text-slate-400'
            }`}
          >
            {change > 0 ? '+' : ''}
            {change.toFixed(1)}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-slate-600">pts since first</p>
        </div>
      </div>
    </section>
  );
}

function elapsed(fromIso: string, toIso: string): string | null {
  const minutes = (Date.parse(toIso) - Date.parse(fromIso)) / 60_000;
  if (!Number.isFinite(minutes) || minutes < 1) return null;
  if (minutes < 90) return `${Math.round(minutes)} min`;
  if (minutes < 60 * 48) return `${(minutes / 60).toFixed(1)} h`;
  return `${Math.round(minutes / 1440)} d`;
}
