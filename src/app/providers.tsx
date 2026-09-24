'use client';

import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from '@/theme/theme';
import { AppQueryProvider } from '@/lib/query/provider';
import { SessionProvider } from '@/features/auth/session-context';
import { PeriodProvider } from '@/features/dashboard/period-context';
import { NotificationProvider } from '@/features/notifications/notification-context';
import { AppErrorBoundary } from '@/components/feedback/app-error-boundary';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppErrorBoundary>
      <AppQueryProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SessionProvider>
            <PeriodProvider>
              <NotificationProvider>{children}</NotificationProvider>
            </PeriodProvider>
          </SessionProvider>
        </ThemeProvider>
      </AppQueryProvider>
    </AppErrorBoundary>
  );
}
