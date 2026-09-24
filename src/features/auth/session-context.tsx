'use client';

// src/features/auth/session-context.tsx
//
// Wraps GET /auth/me (session-authoritative). No password, cookie, or token
// is stored by application code. On identity change: wipe React Query cache,
// IndexedDB data cache, and sync-queue entries that belong to another user.

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { registerSyncExecutors } from '@/lib/sync/register-executors';
import { cacheInvalidateAll } from '@/lib/storage/cache';
import { clearEntireQueue, clearQueueExceptIdentity } from '@/lib/sync/sync-queue';
import {
  clearLocalSessionMarker,
  identityKeyFromUser,
  readLocalSessionMarker,
  writeLocalSessionMarker,
} from '@/lib/session/local-session-marker';
import type { CurrentUser } from '@/types/api';

interface SessionContextValue {
  user: CurrentUser | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasConnectionProblem: boolean;
  /** Non-sensitive marker left after a prior successful online login (for offline shell UX only). */
  offlineShellMarker: ReturnType<typeof readLocalSessionMarker>;
  refetch: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);
  const offlineShellMarker = typeof window !== 'undefined' ? readLocalSessionMarker() : null;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['session', 'me'],
    queryFn: () => authApi.me(),
    retry: false,
    staleTime: 60_000,
    throwOnError: false,
  });

  useEffect(() => {
    registerSyncExecutors();
  }, []);

  // Identity change: clear all prior-user caches so User B never sees User A data.
  useEffect(() => {
    const currentUserId = data ? identityKeyFromUser(data) : null;
    if (previousUserId.current !== undefined && previousUserId.current !== currentUserId) {
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'session' });
      void cacheInvalidateAll();
      if (currentUserId) {
        void clearQueueExceptIdentity(currentUserId);
      } else {
        void clearEntireQueue();
        clearLocalSessionMarker();
      }
    }
    previousUserId.current = currentUserId;

    if (data) {
      writeLocalSessionMarker({
        identityKey: identityKeyFromUser(data),
        role: data.role,
        name: data.name,
        email: data.email,
        clientId: data.clientId ?? null,
        markedAt: new Date().toISOString(),
      });
    }
  }, [data, queryClient]);

  const value: SessionContextValue = {
    user: data,
    isLoading,
    isAuthenticated: Boolean(data),
    hasConnectionProblem: Boolean(error) && !(error instanceof ApiError && error.status === 401),
    offlineShellMarker,
    refetch: () => void refetch(),
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}

export function useInvalidateSession() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['session', 'me'] });
}
