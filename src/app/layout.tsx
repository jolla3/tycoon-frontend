import type { Metadata } from 'next';
import { Providers } from './providers';
import { ServiceWorkerRegistration } from '@/components/offline/service-worker-registration';
import { appConfig } from '@/config/app';
import './globals.css';

export const metadata: Metadata = {
  title: appConfig.name,
  description: appConfig.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <ServiceWorkerRegistration />
          {children}
        </Providers>
      </body>
    </html>
  );
}
