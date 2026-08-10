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
          background: '#06070a',
          backgroundImage: `radial-gradient(circle at 88% 8%, ${accent}2e, transparent 55%), radial-gradient(circle at 6% 96%, rgba(56,132,255,0.16), transparent 55%)`,
          padding: 68,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 18, height: 18, borderRadius: 999, background: '#2ee88a' }} />
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
