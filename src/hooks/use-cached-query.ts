'use client';

// src/hooks/use-cached-query.ts
//
// Hydrate-first offline reads:
//   1. Read IndexedDB immediately when the hook mounts
//   2. Show cached data with Cached/Stale badge
//   3. Attempt live fetch when online
//   4. Replace with live data on success
//
// Never presents "Server unavailable" when valid cached data exists.
// Financial data may use this for DISPLAY only — never for decisions.

import { useEffect, useState } from 'react';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { cacheRead, cacheWrite } from '@/lib/storage/cache';

export type DataFreshness = 'live' | 'cached' | 'stale' | 'refreshing' | 'unavailable';

export interface CachedQueryResult<T> {
  data: T | undefined;
  freshness: DataFreshness;
  cachedAt: string | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

export function useCachedQuery<T>(
  cacheKey: string,
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  options?: Pick<UseQueryOptions<T>, 'staleTime' | 'enabled'>
): CachedQueryResult<T> {
  const [hydrated, setHydrated] = useState<{ value: T; cachedAt: string; isStale: boolean } | null>(null);
  const [hydrateDone, setHydrateDone] = useState(false);

  // 1. Hydrate from IndexedDB immediately (before waiting for network error).
  useEffect(() => {
    let cancelled = false;
    setHydrateDone(false);
    setHydrated(null);
    cacheRead<T>(cacheKey).then((result) => {
      if (cancelled) return;
      if (result) setHydrated({ value: result.value, cachedAt: result.cachedAt, isStale: result.isStale });
      setHydrateDone(true);
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey]);

  const query = useQuery({
    queryKey,
    queryFn,
    staleTime: options?.staleTime,
    enabled: options?.enabled,
    retry: false,
  });

  // Persist every successful live fetch.
  useEffect(() => {
    if (query.data !== undefined) void cacheWrite(cacheKey, query.data);
  }, [cacheKey, query.data]);

  // Live data wins.
  if (query.data !== undefined) {
    return {
      data: query.data,
      freshness: query.isFetching ? 'refreshing' : 'live',
      cachedAt: null,
      isLoading: false,
      error: null,
      refetch: () => void query.refetch(),
    };
  }

  // Cached snapshot available — show it, never error UI.
  if (hydrated) {
    return {
      data: hydrated.value,
      freshness: query.isFetching ? 'refreshing' : hydrated.isStale ? 'stale' : 'cached',
      cachedAt: hydrated.cachedAt,
      isLoading: false,
      error: null,
      refetch: () => void query.refetch(),
    };
  }

  // Still checking IndexedDB or waiting on network with no cache yet.
  if (!hydrateDone || query.isLoading || query.isFetching) {
    return {
      data: undefined,
      freshness: 'unavailable',
      cachedAt: null,
      isLoading: true,
      error: null,
      refetch: () => void query.refetch(),
    };
  }

  // No cache and live failed.
  if (query.isError) {
    return {
      data: undefined,
      freshness: 'unavailable',
      cachedAt: null,
      isLoading: false,
      error: query.error,
      refetch: () => void query.refetch(),
    };
  }

  return {
    data: undefined,
    freshness: 'unavailable',
    cachedAt: null,
    isLoading: false,
    error: null,
    refetch: () => void query.refetch(),
  };
}
