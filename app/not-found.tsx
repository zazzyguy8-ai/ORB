import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="font-mono text-6xl font-bold tracking-tightest text-ink-600">404</p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-100">Nothing here</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        That page does not exist. If you were looking for a token, paste its contract address
        instead.
      </p>
      <Link href="/app" className="btn-primary mt-7">
        Analyze a token
      </Link>
    </div>
  );
}
