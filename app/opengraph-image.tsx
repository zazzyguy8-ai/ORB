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
          background: '#07050d',
          // Satori supports only the simple radial-gradient form — the
          // `<size> at <position>` syntax the browser accepts fails to parse here.
          backgroundImage:
            'radial-gradient(circle at 12% 0%, rgba(135,103,240,0.38), transparent 58%), radial-gradient(circle at 92% 12%, rgba(69,215,245,0.22), transparent 58%)',
          padding: 72,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <svg width="54" height="54" viewBox="0 0 64 64">
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
              color: '#b7a5fd',
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
