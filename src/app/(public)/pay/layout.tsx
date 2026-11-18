import type { Metadata } from 'next';
import { appConfig } from '@/config/app';

// The link token travels in the URL fragment. Keep the page out of search
// indexes and never leak the address through the Referer header.
export const metadata: Metadata = {
  title: `Send your M-PESA message · ${appConfig.name}`,
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
