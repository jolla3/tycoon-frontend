'use client';

// Registers the application-shell service worker once in production.
// Development intentionally skips registration to avoid confusing stale SW
// caches during local iteration.

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Primary target is production. In development, unregister any leftover
    // workers so hot-reload is not fighting a cached shell.
    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
      return;
    }

    let cancelled = false;
    void navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        if (cancelled) return;
        // Prefer the latest worker when a new one is waiting.
        if (reg.waiting) reg.waiting.postMessage?.({ type: 'SKIP_WAITING' });
      })
      .catch(() => {
        // Registration failure must not break the app.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
