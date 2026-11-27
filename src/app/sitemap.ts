import type { MetadataRoute } from 'next';
import { canonicalUrlForPath, getSiteOrigin } from '@/lib/seo/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteOrigin = getSiteOrigin();
  if (!siteOrigin) return [];

  const publicPages = [
    { path: '/', changeFrequency: 'weekly' as const, priority: 1 },
    { path: '/privacy', changeFrequency: 'yearly' as const, priority: 0.3 },
    { path: '/terms', changeFrequency: 'yearly' as const, priority: 0.3 },
  ];

  return publicPages.flatMap(({ path, changeFrequency, priority }) => {
    const url = canonicalUrlForPath(path, siteOrigin);
    return url ? [{ url, changeFrequency, priority }] : [];
  });
}
