import { RequirePlatform } from '@/features/auth/require-platform';
import { PlatformShell } from '@/features/platform/platform-shell';

export default function PlatformGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequirePlatform>
      <PlatformShell>{children}</PlatformShell>
    </RequirePlatform>
  );
}
