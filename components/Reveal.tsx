'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Reveals its children when they scroll into view.
 *
 * A landing page that animates everything on load has finished performing
 * before the reader arrives at the third section. Tying the motion to the
 * scroll position means each section introduces itself as it is reached.
 *
 * Starts visible and only hides once the observer is attached, so the content
 * is never invisible to a reader without JavaScript — and it unobserves after
 * firing, because a section that re-animates every time it passes the viewport
 * is a distraction rather than a flourish.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'hidden' | 'shown'>('idle');

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setState('shown');
      return;
    }

    setState('hidden');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setState('shown');
        observer.disconnect();
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
        state === 'hidden' ? 'translate-y-8 opacity-0' : 'translate-y-0 opacity-100'
      } ${className}`}
      style={{ transitionDelay: state === 'shown' ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  );
}
