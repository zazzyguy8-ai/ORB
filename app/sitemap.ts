import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/config/site';

/**
 * Only the stable pages. Analysis permalinks are deliberately absent: there
 * will eventually be a great many of them, most about tokens that no longer
 * trade, and listing those would be padding rather than discovery.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/app`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/track-record`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
  ];
}
