import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'ORB Signal — Paste a token. Get the signal.',
  description:
    'Paste a Solana memecoin contract and get BUY / WATCH / AVOID with the evidence behind it, in seconds.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-ink-800">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400" aria-hidden />
              ORB Signal
            </Link>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <Link href="/app" className="transition hover:text-slate-100">
                Analyze
              </Link>
              <Link href="/history" className="transition hover:text-slate-100">
                History
              </Link>
              <Link href="/login" className="transition hover:text-slate-100">
                Sign in
              </Link>
            </div>
          </nav>
        </header>

        <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>

        <footer className="mt-16 border-t border-ink-800">
          <div className="mx-auto max-w-5xl space-y-2 px-5 py-6 text-xs text-slate-500">
            <p>
              Research and decision support only. Not financial advice. Memecoin trading is
              extremely risky and you can lose everything you put in.
            </p>
            <p>
              ORB Signal is read-only: it never executes transactions, never asks for a seed phrase,
              and never connects a wallet.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
