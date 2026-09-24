'use client';

// src/features/auth/require-session.tsx
//
// Client-side redirect for UX only. The real boundary is the backend's
// `authenticate` middleware — every API call still fails with 401 if the
// session cookie is missing/expired, regardless of what this component does.
//
// Distinguishes two very different situations that both used to redirect
// to /login identically: genuinely not authenticated (401) vs. the app
// couldn't even reach the backend to find out (network/CORS/server error).
// Silently sending someone to a login form when the real problem is "the
// server is unreachable" is misleading — they'll just fail to log in too.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography, Button, Alert } from '@mui/material';
import { useSession } from './session-context';
import { ServerUnavailable } from '@/components/feedback/server-unavailable';
import { permissions } from '@/lib/permissions/permissions';

export function RequireSession({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, hasConnectionProblem, offlineShellMarker, refetch } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !hasConnectionProblem) router.replace('/login');
  }, [isLoading, isAuthenticated, hasConnectionProblem, router]);

  // SUPER_ADMIN should use the platform area, not the landlord shell.
  useEffect(() => {
    if (user && permissions.canAccessPlatform(user.role)) {
      router.replace('/platform');
    }
  }, [user, router]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  // Offline with a prior session marker: do not pretend server auth is valid.
  if (hasConnectionProblem && offlineShellMarker) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2, p: 3, maxWidth: 480, mx: 'auto' }}>
        <Alert severity="warning" sx={{ width: '100%' }}>
          You previously signed in as {offlineShellMarker.name} ({offlineShellMarker.email}). The server cannot be reached, so this session cannot be confirmed.
        </Alert>
        <Typography color="text.secondary" align="center">
          Re-authentication requires an internet connection. Previously synchronized information may still be available on pages you already opened.
        </Typography>
        <Button variant="contained" onClick={refetch}>
          Retry connection
        </Button>
        <Button variant="text" onClick={() => router.replace('/login')}>
          Go to sign in
        </Button>
      </Box>
    );
  }

  if (hasConnectionProblem) {
    return <ServerUnavailable variant="network" onRetry={refetch} />;
  }

  if (!isAuthenticated) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return <>{children}</>;
}
