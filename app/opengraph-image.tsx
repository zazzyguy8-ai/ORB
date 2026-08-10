import { ImageResponse } from 'next/og';

/**
 * Social preview card.
 *
 * This product gets shared as a link — a trader pastes a call into a group
 * chat. Without this the unfurl is a blank rectangle, which reads as an
 * abandoned side project no matter how good the page behind it is.
 *
 * Rendered at build/request time by next/og using system fonts, so it costs no
 * extra asset and cannot drift from the copy on the page.
 */
export const runtime = 'nodejs';
export const alt = 'ORB Signal — paste a token, get the signal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
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
          // Satori supports only the simple radial-gradient form — the
          // `<size> at <position>` syntax the browser accepts fails to parse here.
          backgroundImage:
            'radial-gradient(circle at 12% 0%, rgba(46,232,138,0.20), transparent 55%), radial-gradient(circle at 92% 12%, rgba(56,132,255,0.18), transparent 55%)',
          padding: 72,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 20, height: 20, borderRadius: 999, background: '#2ee88a' }} />
          <div style={{ fontSize: 30, color: '#94a3b8', letterSpacing: -0.5 }}>ORB Signal</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              color: '#f8fafc',
              letterSpacing: -3.5,
              lineHeight: 1.05,
            }}
          >
            Paste a token.
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              color: '#2ee88a',
              letterSpacing: -3.5,
              lineHeight: 1.05,
            }}
          >
            Get the signal.
          </div>
          <div style={{ marginTop: 28, fontSize: 30, color: '#94a3b8', maxWidth: 900 }}>
            BUY / WATCH / AVOID with the evidence behind it — in seconds, not five browser tabs.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          {['BUY', 'WATCH', 'AVOID'].map((label, i) => (
            <div
              key={label}
              style={{
                display: 'flex',
                padding: '10px 22px',
                borderRadius: 999,
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 1,
                color: ['#2ee88a', '#ffc043', '#ff5a52'][i],
                border: `2px solid ${['#2ee88a', '#ffc043', '#ff5a52'][i]}55`,
                background: `${['#2ee88a', '#ffc043', '#ff5a52'][i]}14`,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
