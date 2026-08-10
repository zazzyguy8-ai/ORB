/**
 * The hero object.
 *
 * A landing page for a product whose output is a single word needs something to
 * look at that is not a screenshot of a form. This is the product's own name
 * made literal: a sphere lit from the upper left, ringed by two slowly rotating
 * orbits, with the three decision colours as points on them.
 *
 * Pure CSS and SVG — no image to load, no library, and it scales to any size
 * without a second asset. Every animation here is decorative and stops entirely
 * under prefers-reduced-motion.
 */
export function Orb({ className = '' }: { className?: string }) {
  return (
    <div className={`relative aspect-square ${className}`} aria-hidden>
      {/* Ambient bloom, well outside the sphere so the edge stays soft. */}
      <div className="absolute inset-[-30%] rounded-full bg-[radial-gradient(circle,rgba(135,103,240,0.4),transparent_62%)] blur-2xl" />

      {/* Orbits. Counter-rotating, each tilted, so the pair reads as depth
          rather than as two circles. */}
      <div className="absolute inset-[4%] animate-spin-slow [transform:rotateX(72deg)]">
        <div className="h-full w-full rounded-full border border-iris-300/25" />
        <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-signal-buy shadow-[0_0_14px_rgba(60,235,159,0.9)]" />
      </div>
      <div
        className="absolute inset-[14%] animate-spin-slow [animation-direction:reverse] [animation-duration:34s] [transform:rotateX(66deg)_rotateZ(28deg)]"
      >
        <div className="h-full w-full rounded-full border border-aqua-300/20" />
        <div className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-signal-watch shadow-[0_0_12px_rgba(255,199,92,0.9)]" />
      </div>

      {/* The sphere. The inner shadow does the shaping: a light from the upper
          left, a terminator, and a faint bounce along the lower right edge. */}
      <div className="absolute inset-[22%] animate-float rounded-full bg-[radial-gradient(circle_at_32%_26%,#cfc4ff_0%,#8767f0_38%,#432c8c_68%,#1a1233_100%)] shadow-[inset_-10px_-16px_40px_rgba(0,0,0,0.55),inset_8px_10px_28px_rgba(232,226,255,0.28),0_30px_70px_-20px_rgba(90,60,189,0.9)]">
        {/* Specular highlight. */}
        <div className="absolute left-[22%] top-[16%] h-[22%] w-[30%] rounded-full bg-white/50 blur-md" />
        {/* Meridian, to give the surface a sense of curvature. */}
        <div className="absolute inset-0 overflow-hidden rounded-full opacity-40">
          <div className="absolute left-1/2 top-[-10%] h-[120%] w-[60%] -translate-x-1/2 rounded-[50%] border-x border-white/20" />
          <div className="absolute left-[-10%] top-1/2 h-[55%] w-[120%] -translate-y-1/2 rounded-[50%] border-y border-white/15" />
        </div>
      </div>
    </div>
  );
}
