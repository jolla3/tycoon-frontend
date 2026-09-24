'use client';

// UX gate for /platform/* — backend authorize('SUPER_ADMIN') is the real boundary.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import { useSession } from './session-context';
import { permissions } from '@/lib/permissions/permissions';
import { ServerUnavailable } from '@/components/feedback/server-unavailable';

export function RequirePlatform({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, hasConnectionProblem, refetch } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !hasConnectionProblem) router.replace('/login');
  }, [isLoading, isAuthenticated, hasConnectionProblem, router]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (hasConnectionProblem) {
    return <ServerUnavailable variant="network" onRetry={refetch} />;
  }

  if (!isAuthenticated || !user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!permissions.canAccessPlatform(user.role)) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2, p: 3 }}>
        <Typography variant="h6">Access denied</Typography>
        <Typography color="text.secondary" align="center">
          Platform administration is only available to platform administrators.
        </Typography>
        <Button variant="contained" onClick={() => router.replace('/dashboard')}>
          Go to dashboard
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}
