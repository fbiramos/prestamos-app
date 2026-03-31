const CACHE_NAME = 'prestamos-cache-v58';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js?v=58',
  '/manifest.json?v=4',
  'https://cdn.tailwindcss.com',
  '/icons/icon-192x192.png?v=4',
  '/icons/icon-512x512.png?v=4'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Estrategia: Network First para navegaciones (index.html)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Guardamos la versión más reciente en la caché para la próxima vez
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, copy);
          });
          return response;
        })
        .catch(() => {
          // Si falla la red, buscamos en la caché
          return caches.match(event.request);
        })
    );
  } else {
    // Estrategia: Cache First para otros recursos (CSS, JS, imágenes)
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request);
        })
    );
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Asegura que el Service Worker tome el control inmediatamente
  );
});
