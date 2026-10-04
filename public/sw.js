const version = 'dev';
const buildFiles = [];
const cacheName = `stockfish-survival-${version}`;
const pieces = ['K', 'Q', 'R', 'B', 'N', 'P'].flatMap((type) => [`/pieces/w${type}.svg`, `/pieces/b${type}.svg`]);
const precache = [
  '/',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/stockfish/stockfish-19-lite-single.js',
  '/stockfish/stockfish-19-lite-single.wasm',
  ...pieces,
  ...buildFiles,
];
const cacheFirstFolders = ['/assets/', '/stockfish/', '/icons/', '/pieces/'];
const cacheFirstFiles = ['/favicon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) => Promise.all(precache.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function fromCacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function fromNetworkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put('/', response.clone());
    }
    return response;
  } catch {
    return (await caches.match('/')) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/ws' || url.pathname.startsWith('/ws/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fromNetworkFirst(request));
  } else if (
    cacheFirstFolders.some((folder) => url.pathname.startsWith(folder)) ||
    cacheFirstFiles.includes(url.pathname)
  ) {
    event.respondWith(fromCacheFirst(request));
  }
});
