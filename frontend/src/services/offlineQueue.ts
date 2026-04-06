import type { RatingRequest, OfflineRating } from '../types';

const DB_NAME = 'shokTaksiDB';
const STORE_NAME = 'offlineRatings';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'localId' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function saveOfflineRating(rating: RatingRequest): Promise<string> {
  const localId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : String(Date.now());

  const entry: OfflineRating = {
    ...rating,
    localId,
    savedAt: Date.now(),
    synced: false,
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(entry);
    req.onsuccess = () => resolve(localId);
    req.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}

export async function getPendingRatings(): Promise<OfflineRating[]> {
  const all = await getAllRatings();
  return all.filter((r) => !r.synced);
}

export async function getAllRatings(): Promise<OfflineRating[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = (e) => resolve((e.target as IDBRequest<OfflineRating[]>).result);
    req.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}

export async function markSynced(localId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(localId);

    getReq.onsuccess = (e) => {
      const record = (e.target as IDBRequest<OfflineRating>).result;
      if (!record) {
        resolve();
        return;
      }
      record.synced = true;
      const putReq = store.put(record);
      putReq.onsuccess = () => resolve();
      putReq.onerror = (err) => reject((err.target as IDBRequest).error);
    };

    getReq.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}

export async function removeRating(localId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(localId);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}

export async function triggerBackgroundSync(): Promise<void> {
  if (
    'serviceWorker' in navigator &&
    'SyncManager' in window
  ) {
    try {
      const registration = await navigator.serviceWorker.ready;
      // @ts-expect-error — Background Sync API types may not be available
      await registration.sync.register('sync-ratings');
    } catch {
      // Background Sync not supported or failed — silently ignore
    }
  }
}
