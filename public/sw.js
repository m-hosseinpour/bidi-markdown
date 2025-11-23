/**
 * Service Worker for NotesHub PWA
 * Provides offline functionality for the GitHub-powered markdown note-taking app.
 */
const CACHE_NAME = 'noteshub-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/src/markdown/renderer.js'
];

// Install event - cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate event - take control of clients
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// Fetch event - handle requests with cache-first strategy
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available, otherwise fetch
        return response || fetch(event.request);
      })
  );
});

// Background sync for pending changes when online
self.addEventListener('sync', event => {
  if (event.tag === 'sync-notes') {
    event.waitUntil(syncPendingChanges());
  }
});

async function syncPendingChanges() {
  // Implementation will be added when GitHub integration is implemented
  console.log('Syncing pending changes...');
}