import { JetBrains_Mono, Outfit } from 'next/font/google';

/**
 * Two faces, with opposite jobs.
 *
 * Outfit carries the interface. It is a geometric sans with rounded, open
 * shapes — friendly rather than technical, which is the point: this product
 * hands people a verdict about money, and a face that looks like a terminal
 * makes that feel colder than it needs to. It stays tight and confident at
 * display sizes, which is where the decision lives.
 *
 * JetBrains Mono carries every figure. Traders scan columns of numbers, and its
 * tabular figures mean digits never shift width as values update — a price
 * ticking from 9 to 10 should not nudge the column. The contrast between the
 * two is deliberate: prose is soft, evidence is machined.
 *
 * Self-hosted at build time by next/font, so no third-party request at runtime
 * and no layout shift while a webfont loads.
 */
export const display = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

export const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});
