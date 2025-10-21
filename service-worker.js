const CACHE_NAME = 'taskhero-app-v1';
const FILES_TO_CACHE = [
  '/TaskHero/',
  '/TaskHero/index.html',
  '/TaskHero/style.css',
  '/TaskHero/script.js',
  '/TaskHero/icon-192.png',
  '/TaskHero/icon-512.png',
  '/TaskHero/noise.png'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  evt.respondWith(
    caches.match(evt.request).then((response) => {
      return response || fetch(evt.request);
    })
  );
});
