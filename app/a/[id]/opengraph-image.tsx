import { ImageResponse } from 'next/og';
import { getSharedAnalysis } from '@/lib/db/repo';
import { formatUsd } from '@/lib/format';

/**
 * Per-analysis social card.
 *
 * The share loop for this product is a trader dropping a call into a group
 * chat. A generic unfurl wastes that: the decision, the token and the score are
 * the message, and they should be legible before anyone clicks.
 *
 * Everything drawn here comes from the stored row — the card cannot claim
 * something the analysis did not say.
 */
export const runtime = 'nodejs';
export const alt = 'ORB Signal analysis';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const PALETTE: Record<string, string> = {
  BUY: '#2ee88a',
  WATCH: '#ffc043',
  AVOID: '#ff5a52',
};

export default async function AnalysisOgImage({ params }: { params: { id: string } }) {
  const analysis = await getSharedAnalysis(params.id);

  // A missing or private analysis still needs an image; fall back to the brand
  // card rather than serving a broken unfurl.
  const decision = analysis?.decision ?? 'ORB';
  const accent = PALETTE[decision] ?? '#94a3b8';
  const name = analysis
    ? analysis.symbol
      ? `$${analysis.symbol}`
      : `${analysis.address.slice(0, 6)}…${analysis.address.slice(-4)}`
    : 'ORB Signal';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#07050d',
          backgroundImage: `radial-gradient(circle at 88% 8%, ${accent}2e, transparent 55%), radial-gradient(circle at 6% 96%, rgba(56,132,255,0.16), transparent 55%)`,
          padding: 68,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <svg width="46" height="46" viewBox="0 0 64 64">
          <defs>
            <linearGradient id="c" x1="16" y1="6" x2="46" y2="58" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#b7a5fd" />
              <stop offset="34%" stopColor="#7c4df0" />
              <stop offset="100%" stopColor="#3b16c9" />
            </linearGradient>
            <linearGradient id="b" x1="34" y1="52" x2="50" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#9d85f9" />
              <stop offset="100%" stopColor="#f4f1ff" />
            </linearGradient>
          </defs>
          <path
            fill="url(#c)"
            d="M35.5 3.4c10.8.6 17.6 9 17.6 20.4 0 5.6-.7 10.7-2 15.1-1.3 4.4-3.5 8-6.5 10.6-1.9 1.7-3.9 2.2-5.6 1.3-1.3 2.7-3.4 4.6-6 5.4-1.9.6-3.3-.2-3.9-2-.3-.8-.4-1.7-.3-2.7-3 3.6-6.8 6-11 7-1.6.4-2.3-.4-1.7-2 .7-2 2-4 3.6-5.8-3.4 2.3-7.1 3.6-10.8 3.7-1.7 0-2.1-1-1-2.4 1.9-2.4 4.5-4.6 7.4-6.3-1.7.3-3.3.3-4.7 0-1.4-.4-1.5-1.5-.3-2.6 1.9-1.6 4.3-2.9 6.9-3.7-2.3-4.7-3.5-10.3-3.5-16.6C13.7 12 21.3 3.4 32 3.4h3.5z"
          />
          <ellipse cx="34.5" cy="26" rx="13.2" ry="13.8" fill="#07050d" />
          <path fill="#fff" d="M26.6 21.4c3.2.5 5.9 2.2 7.3 4.5-1.9 1.9-4.9 2.2-7 .8-1.9-1.3-2.4-3.6-.3-5.3z" />
          <path fill="#fff" d="M42.4 21.4c-3.2.5-5.9 2.2-7.3 4.5 1.9 1.9 4.9 2.2 7 .8 1.9-1.3 2.4-3.6.3-5.3z" />
          <g fill="url(#b)">
            <rect x="36.8" y="44.2" width="3.6" height="7.4" rx="1.3" />
            <rect x="41.9" y="40.4" width="3.6" height="11.2" rx="1.3" />
            <rect x="47" y="35.4" width="3.6" height="16.2" rx="1.3" />
          </g>
        </svg>
          <div style={{ fontSize: 27, color: '#94a3b8', letterSpacing: -0.5 }}>ORB Signal</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 44, color: '#e2e8f0', letterSpacing: -1.5 }}>{name}</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 28,
              marginTop: 6,
            }}
          >
            <div style={{ fontSize: 132, fontWeight: 700, color: accent, letterSpacing: -6, lineHeight: 1 }}>
              {decision}
            </div>
            {analysis && (
              <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 18 }}>
                <div style={{ fontSize: 40, color: '#f8fafc', letterSpacing: -1 }}>
                  {analysis.score.toFixed(0)}
                  <span style={{ color: '#475569' }}>/100</span>
                </div>
                <div style={{ fontSize: 22, color: '#64748b' }}>
                  confidence {analysis.confidence.toFixed(0)}
                </div>
              </div>
            )}
          </div>

          {analysis?.reasons[0] && (
            <div
              style={{
                marginTop: 22,
                fontSize: 28,
                lineHeight: 1.35,
                color: '#94a3b8',
                maxWidth: 1000,
              }}
            >
              {analysis.reasons[0].slice(0, 150)}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 24, color: '#475569' }}>
            {analysis
              ? `${formatUsd(analysis.marketCapUsd)} mcap · ${formatUsd(analysis.liquidityUsd)} liquidity`
              : 'Paste a token. Get the signal.'}
          </div>
          <div style={{ fontSize: 22, color: '#334155' }}>Not financial advice</div>
        </div>
      </div>
    ),
    size,
  );
}
