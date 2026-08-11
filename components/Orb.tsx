import { Logo } from '@/components/Logo';

/**
 * The hero object: the mark, presented.
 *
 * A landing page for a product whose output is a single word needs something to
 * look at that is not a screenshot of a form. The figure sits inside two slowly
 * counter-rotating orbits carrying the three decision colours, on a violet
 * bloom — brand and product motif in one object.
 *
 * Everything here is CSS and inline SVG: no image to load, no library, sharp at
 * any size. All of the motion is decorative and stops completely under
 * prefers-reduced-motion.
 */
export function Orb({ className = '' }: { className?: string }) {
  return (
    <div className={`relative aspect-square ${className}`} aria-hidden>
      {/* Ambient bloom. One large, cheap radial — no filter, so it is painted
          once and never recomputed. */}
      <div className="absolute inset-[-18%] rounded-full bg-[radial-gradient(circle,rgba(135,103,240,0.42),transparent_62%)]" />

      {/* Orbits, tilted and counter-rotating so the pair reads as depth rather
          than as two circles. Transform-only animation: the compositor handles
          it without a layout or paint pass. */}
      <div className="absolute inset-[2%] animate-spin-slow [transform:rotateX(74deg)]">
        <div className="h-full w-full rounded-full border border-iris-300/25" />
        <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-signal-buy shadow-[0_0_14px_rgba(60,235,159,0.9)]" />
      </div>
      <div className="absolute inset-[11%] animate-spin-slow [animation-direction:reverse] [animation-duration:34s] [transform:rotateX(68deg)_rotateZ(26deg)]">
        <div className="h-full w-full rounded-full border border-aqua-300/20" />
        <div className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-signal-watch shadow-[0_0_12px_rgba(255,199,92,0.9)]" />
      </div>

      {/* No filter on the floating element: a drop-shadow would be recomputed
          on every frame of the float. The bloom above does that job already. */}
      <Logo className="absolute inset-[20%] animate-float" />
    </div>
  );
}
