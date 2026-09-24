/* public/sw.js — Application-shell offline support.
 *
 * Caches navigations and static assets for previously visited pages so a
 * full reload while offline can still open the app shell.
 *
 * NEVER caches API responses (especially authenticated / financial data).
 * That belongs in IndexedDB via the app's cache layer.
 * NEVER caches POST/PATCH/PUT/DELETE responses.
 */

const SHELL_CACHE = 'pm-shell-v1';
const OFFLINE_URL = '/offline.html';

const PRECACHE = [OFFLINE_URL, '/', '/login'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  // Backend API and health checks must never be cached by the SW.
  if (url.pathname.startsWith('/api/')) return true;
  if (url.pathname === '/health') return true;
  // Absolute API host (cross-origin) — still network-only
  if (url.hostname !== self.location.hostname) return true;
  return false;
}

function isMutation(request) {
  return request.method !== 'GET' && request.method !== 'HEAD';
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image') ||
    /\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|svg|ico|webp)$/i.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    // Mutations: network only, never cache the response.
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (isApiRequest(url) || isMutation(request)) {
    return; // network-only for API
  }

  // Navigations: network-first, fall back to cache, then offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return offline || new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // Static assets: cache-first
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
});
