import { JetBrains_Mono, Space_Grotesk } from 'next/font/google';

/**
 * Two faces, chosen against the reference set for this category (Axiom, Photon,
 * GMGN, BullX) rather than from a general web palette.
 *
 * Space Grotesk carries the interface: a geometric grotesque with enough
 * character to not read as default-SaaS, and tight enough at display sizes to
 * make the verdict feel deliberate. Explicitly not Inter or Roboto, which is
 * what every dashboard already looks like.
 *
 * JetBrains Mono carries every figure. Traders scan columns of numbers, and its
 * tabular figures mean digits never shift width as values update — a price
 * ticking from 9 to 10 should not nudge the column.
 *
 * Self-hosted at build time by next/font, so no third-party request at runtime
 * and no layout shift while a webfont loads.
 */
export const display = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

export const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});
