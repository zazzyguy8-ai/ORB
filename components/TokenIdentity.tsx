'use client';

import { useState } from 'react';
import type { TokenProfile } from '@/lib/types/domain';

const SOCIAL_LABELS: Record<string, string> = {
  twitter: 'X',
  x: 'X',
  telegram: 'Telegram',
  discord: 'Discord',
  tiktok: 'TikTok',
  instagram: 'Instagram',
};

/**
 * Logo, name, ticker and official links.
 *
 * Deliberately cosmetic. It answers "did I paste the right address?" and
 * nothing else — none of it is evidence, and none of it moves the score. A
 * polished logo is not a safety signal, so it is styled as identity, never as
 * endorsement.
 */
export function TokenIdentity({
  name,
  symbol,
  address,
  profile,
}: {
  name: string | null;
  symbol: string | null;
  address: string;
  profile: TokenProfile | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = profile?.imageUrl && !imageFailed;
  const initials = (symbol ?? name ?? '?').slice(0, 3).toUpperCase();

  const links = [
    ...(profile?.websites ?? []).map((w) => ({ label: w.label, url: w.url })),
    ...(profile?.socials ?? []).map((s) => ({
      label: SOCIAL_LABELS[s.type] ?? s.type,
      url: s.url,
    })),
  ];

  return (
    <div className="flex items-start gap-4">
      {showImage ? (
        <img
          src={profile!.imageUrl!}
          alt=""
          width={56}
          height={56}
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="h-14 w-14 shrink-0 rounded-full border border-ink-600 bg-ink-800 object-cover"
        />
      ) : (
        // A missing logo is normal for a token minted minutes ago — show the
        // ticker rather than a broken-image icon.
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-ink-600 bg-ink-800 text-sm font-bold tracking-tight text-slate-500">
          {initials}
        </div>
      )}

      <div className="min-w-0">
        <h2 className="truncate text-2xl font-bold tracking-tightest text-slate-50">
          {symbol ? `$${symbol}` : 'Unknown ticker'}
        </h2>
        <p className="truncate text-sm text-slate-400">{name ?? 'Unnamed token'}</p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="pill font-mono" title={address}>
            {address.slice(0, 4)}…{address.slice(-4)}
          </span>
          {links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              // noreferrer as well as noopener: these URLs come from a third
              // party and should not receive our referrer.
              rel="noopener noreferrer nofollow"
              className="pill"
            >
              {link.label}
              <span aria-hidden className="text-slate-600">
                ↗
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
