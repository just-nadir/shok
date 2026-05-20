// Service Worker for Shok Taksi PWA
// Implements: Cache-first strategy (Req 8.3) + Background Sync for offline ratings (Req 8.4)

const CACHE_NAME = 'shok-taksi-v2';
const SHELL_ASSETS = ['/index.html', '/manifest.json'];
const SYNC_TAG = 'sync-ratings';
const IDB_NAME = 'shokTaksiDB';
const IDB_STORE = 'offlineRatings';
const IDB_VERSION = 1;

// ── Install: cache the app shell ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first for static assets, network-first for API ───────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and API requests — let them go straight to network
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Faqat HTML fayllarni cache qilamiz, JS/CSS/assets emas
          if (
            response.ok &&
            response.type === 'basic' &&
            !url.pathname.startsWith('/api/') &&
            (url.pathname === '/' || url.pathname.endsWith('.html'))
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // For navigation requests fall back to the cached shell
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});

// ── Background Sync: flush pending offline ratings ────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncPendingRatings());
  }
});

/** Open (or create) the IndexedDB database */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'localId' });
      }
    };

    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

/** Read all unsynced ratings from IndexedDB */
function getPendingRatings(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.getAll();
    req.onsuccess = (e) => resolve(e.target.result.filter((r) => !r.synced));
    req.onerror = (e) => reject(e.target.error);
  });
}

/** Mark a rating as synced and remove it from IndexedDB */
function removeRating(db, localId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const req = store.delete(localId);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

/** POST a single rating to the server */
async function postRating(rating) {
  const { localId, savedAt, synced, ...payload } = rating; // strip local-only fields
  const response = await fetch('/api/ratings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Server error ${response.status}: ${err}`);
  }
  return response;
}

/** Sync all pending offline ratings */
async function syncPendingRatings() {
  const db = await openDB();
  const pending = await getPendingRatings(db);

  for (const rating of pending) {
    try {
      await postRating(rating);
      await removeRating(db, rating.localId);
    } catch (err) {
      // Leave the rating in IDB so the next sync attempt can retry
      console.error('[SW] Failed to sync rating', rating.localId, err);
    }
  }
}
