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

  const path = coords.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ');
  const first = points[0];
  const change = current.score - first.score;
  const span = elapsed(first.at, current.at);

  return (
    <section className="card animate-fade-up" style={{ animationDelay: '160ms' }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="label">Our score for this token over time</p>
        <p className="tabular font-mono text-xs text-slate-500">
          {points.length} analyses{span ? ` · ${span}` : ''}
        </p>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-16 flex-1"
          role="img"
          aria-label={`Score history: ${points.map((p) => p.score.toFixed(0)).join(', ')}`}
        >
          {/* Decision band edges, so a line crossing them means something. */}
          <line
            x1="0"
            x2={width}
            y1={height - (68 / 100) * height}
            y2={height - (68 / 100) * height}
            stroke="#2ee88a"
            strokeOpacity="0.18"
            strokeWidth="0.4"
          />
          <line
            x1="0"
            x2={width}
            y1={height - (45 / 100) * height}
            y2={height - (45 / 100) * height}
            stroke="#ffc043"
            strokeOpacity="0.18"
            strokeWidth="0.4"
          />
          <polyline
            points={path}
            fill="none"
            stroke="#64748b"
            strokeWidth="0.8"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {coords.map((c, index) => (
            <circle
              key={`${c.point.at}-${index}`}
              cx={c.x}
              cy={c.y}
              r={index === coords.length - 1 ? 1.6 : 1}
              fill={DOT_COLOR[c.point.decision]}
              fillOpacity={index === coords.length - 1 ? 1 : 0.6}
            />
          ))}
        </svg>

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
