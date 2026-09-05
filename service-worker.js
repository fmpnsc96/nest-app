// Bump this on every deploy that changes cached files, so old caches get cleared
// and clients pick up the new version instead of a stale cached copy.
const CACHE_VERSION = 'nest-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for navigation/HTML so users get the latest app shell when
// online, falling back to cache when offline. Cache-first for static assets.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Never cache Firebase/Firestore/Auth network calls — those must always be live.
  if (req.url.includes('firestore.googleapis.com') || req.url.includes('googleapis.com') || req.url.includes('gstatic.com/firebasejs')) {
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const resClone = res.clone();
      caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
      return res;
    }).catch(() => cached))
  );
});
