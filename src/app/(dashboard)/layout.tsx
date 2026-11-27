import type { Metadata } from 'next';
import { RequireSession } from '@/features/auth/require-session';
import { AppShell } from '@/components/layout/app-shell';

export const metadata: Metadata = {
  title: 'Workspace',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireSession>
      <AppShell>{children}</AppShell>
    </RequireSession>
  );
}
