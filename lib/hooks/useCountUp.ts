'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from 0 to its value on mount.
 *
 * The point is not decoration: a confidence figure that lands instantly reads
 * as a static label, while one that runs up reads as something that was just
 * computed — which it was. Eased out so it decelerates into the final value
 * rather than snapping.
 *
 * Respects prefers-reduced-motion by jumping straight to the target.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced || durationMs <= 0) {
      setValue(target);
      return;
    }

    const started = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / durationMs);
      // easeOutCubic — decelerates into the final value.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
  }, [target, durationMs]);

  return value;
}
