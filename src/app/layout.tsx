import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import { ServiceWorkerRegistration } from '@/components/offline/service-worker-registration';
import { appConfig } from '@/config/app';
import { canonicalUrlForPath, getSiteOrigin } from '@/lib/seo/site';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#00B4D8',
};

const siteOrigin = getSiteOrigin();
const homeCanonical = canonicalUrlForPath('/', siteOrigin);
const socialImage = canonicalUrlForPath('/social-card', siteOrigin);

export const metadata: Metadata = {
  ...(siteOrigin ? { metadataBase: siteOrigin } : {}),
  title: {
    default: 'Rental & Property Management Software | JOMUGIT',
    template: '%s | JOMUGIT',
  },
  description:
    'Manage rental estates, houses, tenants, rent collection, payment tracking and reporting in one property operations workspace.',
  applicationName: appConfig.name,
  creator: appConfig.companyBrandName,
  publisher: appConfig.legalCompanyName,
  ...(homeCanonical ? { alternates: { canonical: homeCanonical } } : {}),
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    siteName: appConfig.companyBrandName,
    title: 'Rental & Property Management Software | JOMUGIT',
    description:
      'Manage rental estates, houses, tenants, rent collection, payment tracking and reporting in one property operations workspace.',
    ...(homeCanonical ? { url: homeCanonical } : {}),
    ...(socialImage
      ? {
          images: [{
            url: socialImage,
            width: 1200,
            height: 630,
            alt: 'Rental and property management software published by JOMUGIT',
          }],
        }
      : {}),
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rental & Property Management Software | JOMUGIT',
    description:
      'Manage rental estates, houses, tenants, rent collection, payment tracking and reporting in one property operations workspace.',
    ...(socialImage ? { images: [socialImage] } : {}),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-KE">
      <body>
        <Providers>
          <ServiceWorkerRegistration />
          {children}
        </Providers>
      </body>
    </html>
  );
}
