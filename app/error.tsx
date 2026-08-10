'use client';

import { useEffect } from 'react';

/**
 * Route-level error boundary. Shows the digest rather than the raw message:
 * the digest is what appears in server logs, so a user can quote something
 * actionable without us leaking internals into the page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="font-mono text-5xl font-bold tracking-tightest text-signal-avoid/40">error</p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-100">
        Something broke on our side
      </h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        The analysis pipeline is designed to degrade rather than fail, so this is unexpected.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-slate-600">reference: {error.digest}</p>
      )}
      <button type="button" onClick={reset} className="btn-primary mt-7">
        Try again
      </button>
    </div>
  );
}
