import type { Metadata } from 'next';
import { canonicalAlternates } from '@/lib/seo/site';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to the rental and property management workspace.',
  robots: {
    index: false,
    follow: false,
  },
  ...canonicalAlternates('/login'),
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
