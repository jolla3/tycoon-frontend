import type { MetadataRoute } from 'next';
import { getSiteOrigin } from '@/lib/seo/site';

export default function robots(): MetadataRoute.Robots {
  const siteOrigin = getSiteOrigin();

  return {
    // Keep noindex routes crawlable so search engines can retrieve their
    // page-level robots metadata. This file is not an access-control layer.
    rules: {
      userAgent: '*',
      allow: '/',
    },
    ...(siteOrigin ? { sitemap: new URL('/sitemap.xml', siteOrigin).toString() } : {}),
  };
}
