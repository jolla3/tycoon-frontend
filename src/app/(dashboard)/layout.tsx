import { RequireSession } from '@/features/auth/require-session';
import { AppShell } from '@/components/layout/app-shell';

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireSession>
      <AppShell>{children}</AppShell>
    </RequireSession>
  );
}
