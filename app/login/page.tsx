'use client';

import { useEffect, useState } from 'react';
import { getBrowserSupabase, isAuthConfigured } from '@/lib/supabase/browser';

/**
 * Magic-link sign-in (spec §21: keep it simple).
 * No passwords to store, no reset flow to build, no session plumbing beyond
 * what the Supabase client already does.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setSessionEmail(data.user?.email ?? null));
  }, []);

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    setStatus('sending');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/app` },
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }
    setStatus('sent');
  }

  async function signOut() {
    await getBrowserSupabase()?.auth.signOut();
    setSessionEmail(null);
  }

  if (!isAuthConfigured()) {
    return (
      <div className="card mx-auto max-w-md text-sm text-slate-400">
        <h1 className="text-lg font-semibold text-slate-100">Sign-in is not configured</h1>
        <p className="mt-2">
          Add <code className="font-mono text-slate-300">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code className="font-mono text-slate-300">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable
          accounts. Analysis works without an account, at a lower daily limit.
        </p>
      </div>
    );
  }

  if (sessionEmail) {
    return (
      <div className="card mx-auto max-w-md">
        <h1 className="text-lg font-semibold text-slate-100">Signed in</h1>
        <p className="mt-1 text-sm text-slate-400">{sessionEmail}</p>
        <button type="button" onClick={signOut} className="btn-ghost mt-4">
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="card mx-auto max-w-md">
      <h1 className="text-lg font-semibold text-slate-100">Sign in</h1>
      <p className="mt-1 text-sm text-slate-500">
        We email you a link. No password, and higher daily limits than anonymous use.
      </p>

      {status === 'sent' ? (
        <p className="mt-4 text-sm text-signal-buy">
          Check {email} for your sign-in link.
        </p>
      ) : (
        <form onSubmit={sendLink} className="mt-4 space-y-3">
          <input
            type="email"
            required
            className="input font-sans"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email address"
          />
          <button type="submit" className="btn-primary w-full" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : 'Send magic link'}
          </button>
          {status === 'error' && <p className="text-sm text-signal-avoid">{message}</p>}
        </form>
      )}
    </div>
  );
}
