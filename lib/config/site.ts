/**
 * The deployment's own public URL.
 *
 * Needed for absolute URLs in metadata, robots and the sitemap — a relative OG
 * image is silently dropped by several crawlers, so the share card that took
 * work to build simply would not appear.
 *
 * Render injects RENDER_EXTERNAL_URL, so a normal deployment needs no
 * configuration; NEXT_PUBLIC_SITE_URL overrides it for a custom domain.
 */
const FALLBACK = 'http://localhost:3000';

export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.RENDER_EXTERNAL_URL ?? FALLBACK;

  const withScheme = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, '');
}

/** True when we are serving from a real origin rather than a dev fallback. */
export function isPublicDeployment(): boolean {
  return siteUrl() !== FALLBACK;
}
