import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/config/site';

/**
 * Analysis permalinks are public and worth indexing; everything under /api is
 * machinery, and /history renders a user's own feed, which has no business in
 * a search index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/history', '/login'] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
