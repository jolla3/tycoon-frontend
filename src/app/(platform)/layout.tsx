import type { Metadata } from 'next';
import { RequirePlatform } from '@/features/auth/require-platform';
import { PlatformShell } from '@/features/platform/platform-shell';

export const metadata: Metadata = {
  title: 'Platform Console',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PlatformGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequirePlatform>
      <PlatformShell>{children}</PlatformShell>
    </RequirePlatform>
  );
}
