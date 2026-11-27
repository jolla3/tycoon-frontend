import type { MetadataRoute } from 'next';
import { appConfig } from '@/config/app';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appConfig.name,
    short_name: appConfig.shortName,
    description: appConfig.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F4F6F8',
    theme_color: '#00B4D8',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
