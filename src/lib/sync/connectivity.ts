'use client';

// src/lib/sync/connectivity.ts
//
// Section 6 of this pass: navigator.onLine only tells you the device has
// SOME network interface up — it says nothing about whether the backend
// is actually reachable (captive portals, VPN issues, the API being down
// while wifi is fine, etc). This combines both: browser online/offline
// events as the fast signal, plus a periodic real GET /health request as
// the ground truth, and folds in sync-queue state so "Syncing" /
// "Sync Error" are real states, not decoration.

import { useEffect, useRef, useState } from 'react';
import { getApiHealthUrl } from '@/lib/api/client';
import { pendingCount, permanentlyFailedCount, processQueue, retryAllFailed } from './sync-queue';

export type ConnectivityState = 'online' | 'offline' | 'degraded' | 'syncing' | 'sync-error';

const HEALTH_TIMEOUT_MS = 8_000;
const HEALTH_CHECK_INTERVAL_MS = 30_000;

async function pingHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(getApiHealthUrl(), {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
      // Health is public; omit cookies so a CSRF/session issue cannot mark the API "down".
      credentials: 'omit',
      mode: 'cors',
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export interface ConnectivityInfo {
  state: ConnectivityState;
  pendingSyncCount: number;
  permanentlyFailedCount: number;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  retrySync: () => void;
  retryFailed: () => void;
}

export function useConnectivity(): ConnectivityInfo {
  const [browserOnline, setBrowserOnline] = useState(true);
  const [reachable, setReachable] = useState(true);
  const [pending, setPending] = useState(0);
  const [permanentlyFailed, setPermanentlyFailed] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const mounted = useRef(true);
  const syncingRef = useRef(false);

  async function refreshCounts() {
    try {
      const [p, f] = await Promise.all([pendingCount(), permanentlyFailedCount()]);
      if (mounted.current) {
        setPending(p);
        setPermanentlyFailed(f);
      }
    } catch {
      // storage unavailable — treat as zero rather than blocking the UI
    }
  }

  async function runSync() {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const outcome = await processQueue();
      if (!mounted.current) return;
      if (outcome.failed > 0 || outcome.permanentlyFailed > 0) {
        setLastSyncError(
          outcome.permanentlyFailed > 0
            ? `${outcome.permanentlyFailed} change(s) could not be synchronized after several attempts.`
            : `${outcome.failed} change(s) could not be synchronized — will retry automatically.`
        );
      } else {
        setLastSyncError(null);
        if (outcome.processed > 0) setLastSyncedAt(new Date().toISOString());
      }
    } finally {
      syncingRef.current = false;
      if (mounted.current) setIsSyncing(false);
      await refreshCounts();
    }
  }

  /** "Retry now": resurrects permanently-failed items back to pending, THEN runs the queue — this is the one manual escape hatch out of the terminal state. */
  async function runRetryFailed() {
    await retryAllFailed();
    await runSync();
  }

  useEffect(() => {
    mounted.current = true;
    setBrowserOnline(navigator.onLine);
    void refreshCounts();

    const goOnline = () => {
      setBrowserOnline(true);
      pingHealth().then(setReachable);
    };
    const goOffline = () => setBrowserOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    const healthInterval = setInterval(async () => {
      if (!navigator.onLine) return;
      const ok = await pingHealth();
      if (mounted.current) setReachable(ok);
    }, HEALTH_CHECK_INTERVAL_MS);

    pingHealth().then(setReachable);

    return () => {
      mounted.current = false;
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(healthInterval);
    };
  }, []);

  // Whenever we regain real reachability, drain the queue automatically.
  useEffect(() => {
    if (browserOnline && reachable) void runSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserOnline, reachable]);

  let state: ConnectivityState;
  if (!browserOnline) state = 'offline';
  else if (!reachable) state = 'degraded'; // device thinks it's online, but the API isn't answering
  else if (isSyncing) state = 'syncing';
  else if (lastSyncError || permanentlyFailed > 0) state = 'sync-error';
  else state = 'online';

  return {
    state,
    pendingSyncCount: pending,
    permanentlyFailedCount: permanentlyFailed,
    lastSyncedAt,
    lastSyncError,
    retrySync: () => void runSync(),
    retryFailed: () => void runRetryFailed(),
  };
}
