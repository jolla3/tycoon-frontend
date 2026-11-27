import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Send your M-PESA message',
  description: 'Submit the M-PESA confirmation message requested by your property manager.',
  // One-time-link route: never expose it in search results or snippets.
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
