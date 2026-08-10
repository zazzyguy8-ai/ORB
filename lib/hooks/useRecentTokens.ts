'use client';

import { useCallback, useEffect, useState } from 'react';

export interface RecentToken {
  address: string;
  symbol: string | null;
  decision: string;
  at: number;
}

const KEY = 'orb.recent-tokens';
const MAX = 6;

/**
 * Recently analysed tokens, in the browser.
 *
 * Deliberately localStorage rather than the account: a trader checks the same
 * few contracts repeatedly within a session, and making that one click should
 * not require signing in. The server-side history remains the durable record —
 * this is a convenience cache, and losing it costs nothing.
 */
export function useRecentTokens() {
  const [recent, setRecent] = useState<RecentToken[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRecent(
          parsed
            .filter(
              (item): item is RecentToken =>
                typeof item?.address === 'string' && typeof item?.at === 'number',
            )
            .slice(0, MAX),
        );
      }
    } catch {
      // Corrupt or unavailable storage (private mode, quota) is not worth an
      // error path — the feature is purely additive.
    }
  }, []);

  const remember = useCallback((token: RecentToken) => {
    setRecent((current) => {
      const next = [token, ...current.filter((t) => t.address !== token.address)].slice(0, MAX);
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Ignore — see above.
      }
      return next;
    });
  }, []);

  return { recent, remember };
}
