/**
 * The mark: a hooded figure holding a rising chart.
 *
 * Drawn as inline SVG rather than shipped as an image, for three reasons that
 * all matter on a phone: it is about a kilobyte, it costs no network request at
 * any size, and it stays sharp on every display instead of needing a 1x/2x/3x
 * set. It is also the only way the mark can inherit colour and sit inside a
 * gradient without a second asset.
 *
 * Deliberately filter-free. A drop-shadow or feGaussianBlur on an element that
 * appears in the sticky header would be re-rasterised on every scroll frame;
 * the glow here is painted geometry (a radial gradient behind the eyes), which
 * costs nothing after the first paint.
 *
 * To swap in a raster original instead, drop it at `public/logo.png` and
 * replace the <svg> below — everything else takes its size from the caller.
 */
export function Logo({
  className = '',
  title,
}: {
  className?: string;
  /** Set only where the mark is the sole label; otherwise it is decorative. */
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id="orb-cloak" x1="18" y1="4" x2="48" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="34%" stopColor="#7c4df0" />
          <stop offset="100%" stopColor="#3b16c9" />
        </linearGradient>
        <linearGradient id="orb-bars" x1="36" y1="52" x2="50" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8b6bf5" />
          <stop offset="100%" stopColor="#e9e3ff" />
        </linearGradient>
        <radialGradient id="orb-eyeglow">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#c4b5fd" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="orb-hood" x1="20" y1="6" x2="40" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Cloak. One silhouette: a hood that folds to a point at the crown, and
          a hem torn into three tails that trail left, as if it is moving. */}
      <path
        d="M35.5 3.4c10.8.6 17.6 9 17.6 20.4 0 5.6-.7 10.7-2 15.1-1.3 4.4-3.5 8-6.5 10.6-1.9 1.7-3.9 2.2-5.6 1.3-1.3 2.7-3.4 4.6-6 5.4-1.9.6-3.3-.2-3.9-2 -.3-.8-.4-1.7-.3-2.7-3 3.6-6.8 6-11 7-1.6.4-2.3-.4-1.7-2 .7-2 2-4 3.6-5.8-3.4 2.3-7.1 3.6-10.8 3.7-1.7 0-2.1-1-1-2.4 1.9-2.4 4.5-4.6 7.4-6.3-1.7.3-3.3.3-4.7 0-1.4-.4-1.5-1.5-.3-2.6 1.9-1.6 4.3-2.9 6.9-3.7-2.3-4.7-3.5-10.3-3.5-16.6C13.7 12 21.3 3.4 32 3.4h3.5z"
        fill="url(#orb-cloak)"
      />

      {/* Light along the folded crown, where the fabric catches it. */}
      <path
        d="M33.9 3.4C23.2 3.4 15.6 12 15.6 22.8c0 1.4.1 2.8.2 4.1-1.3-3.3-2-6.8-2-10.2 0-7.4 5.6-13.3 13.5-13.3h6.6z"
        fill="url(#orb-hood)"
      />

      {/* The void inside the hood. Nothing lives here but the eyes — that empty
          face is the whole character of the mark. */}
      <ellipse cx="34.5" cy="26" rx="13.2" ry="13.8" transform="rotate(-6 34.5 26)" fill="#07050d" />

      {/* Eye glow, painted rather than filtered: a filter here would be
          re-rasterised every time the mark moves or scrolls. */}
      <ellipse cx="34.5" cy="26" rx="13" ry="7.5" fill="url(#orb-eyeglow)" />

      {/* Eyes: narrow, angled inward and down. A blank face reads as intent
          rather than as a hole entirely because of that angle. */}
      <path
        d="M26.6 21.4c3.2.5 5.9 2.2 7.3 4.5-1.9 1.9-4.9 2.2-7 .8-1.9-1.3-2.4-3.6-.3-5.3z"
        fill="#fff"
      />
      <path
        d="M42.4 21.4c-3.2.5-5.9 2.2-7.3 4.5 1.9 1.9 4.9 2.2 7 .8 1.9-1.3 2.4-3.6.3-5.3z"
        fill="#fff"
      />

      {/* The chart it is holding: three bars, rising. The product in one glyph —
          the figure is not hiding the numbers, it is carrying them. */}
      <g fill="url(#orb-bars)">
        <rect x="36.8" y="44.2" width="3.4" height="7.4" rx="1.3" />
        <rect x="41.8" y="40.4" width="3.4" height="11.2" rx="1.3" />
        <rect x="46.8" y="35.4" width="3.4" height="16.2" rx="1.3" />
      </g>
    </svg>
  );
}
