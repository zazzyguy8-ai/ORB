import type { Metadata, Viewport } from 'next';
import { siteUrl } from '@/lib/config/site';
import Link from 'next/link';
import { display, mono } from '@/app/fonts';
import './globals.css';

const DESCRIPTION =
  'Paste a Solana memecoin contract and get BUY / WATCH / AVOID with the evidence behind it, in seconds.';

export const metadata: Metadata = {
  // Absolute URLs for the social card: several crawlers drop a relative one,
  // which would quietly undo the per-analysis OG images.
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'ORB Signal — Paste a token. Get the signal.',
    template: '%s — ORB Signal',
  },
  description: DESCRIPTION,
  applicationName: 'ORB Signal',
  // The link gets pasted into group chats; without these the unfurl is blank.
  openGraph: {
    title: 'ORB Signal — Paste a token. Get the signal.',
    description: DESCRIPTION,
    type: 'website',
    siteName: 'ORB Signal',
  },
  twitter: { card: 'summary_large_image', title: 'ORB Signal', description: DESCRIPTION },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#06070a',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b border-ink-800/80 bg-ink-950/70 backdrop-blur-md">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3.5">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-[15px] font-bold tracking-tight text-slate-100"
            >
              <span className="relative flex h-2.5 w-2.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal-buy opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-signal-buy" />
              </span>
              <span className="sm:hidden">ORB</span>
              <span className="hidden sm:inline">ORB Signal</span>
            </Link>
            {/* Scrolls rather than wraps on a narrow phone: a nav that reflows
                onto two lines pushes the whole page down on every screen. */}
            <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto sm:gap-1">
              <NavLink href="/app">Analyze</NavLink>
              <NavLink href="/track-record">Track record</NavLink>
              <NavLink href="/history">History</NavLink>
              <NavLink href="/login">Sign in</NavLink>
            </div>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">{children}</main>

        <footer className="mt-16 border-t border-ink-800/80">
          <div className="mx-auto max-w-5xl space-y-2 px-5 py-7 text-xs leading-relaxed text-slate-600">
            <p>
              Research and decision support only. Not financial advice. Memecoin trading is
              extremely risky and you can lose everything you put in.
            </p>
            <p>
              Read-only: ORB Signal never executes transactions, never asks for a seed phrase, and
              never connects a wallet.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="whitespace-nowrap rounded-lg px-2 py-1.5 text-[13px] text-slate-400 transition-colors hover:bg-ink-800 hover:text-slate-100 sm:px-3 sm:text-sm"
    >
      {children}
    </Link>
  );
}
