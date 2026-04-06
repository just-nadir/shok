// Feature: shok-taxi-driver-rating, Property 4: Tasodifiy baholashlar oflayn saqlanganda yo'qolmaydi va sinxronizatsiyadan so'ng navbatdan o'chiriladi

/**
 * Validates: Requirements 5.3, 8.4
 *
 * Xossa 4: Har qanday oflayn rejimda saqlangan baholash uchun, aloqa tiklangandan so'ng
 * u serverga yuborilishi va mahalliy navbatdan o'chirilishi kerak —
 * natijada baholash yo'qolmasligi kerak.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import type { RatingRequest, OfflineRating } from '../types';

// ---------------------------------------------------------------------------
// In-memory IndexedDB mock
// ---------------------------------------------------------------------------

type Store = Map<string, OfflineRating>;

function createFakeIDB() {
  const store: Store = new Map();
  let idCounter = 0;

  const fakeObjectStore = {
    add(record: OfflineRating) {
      const req = {} as IDBRequest;
      setTimeout(() => {
        store.set(record.localId, record);
        (req as any).result = record.localId;
        if ((req as any).onsuccess) (req as any).onsuccess({ target: req });
      }, 0);
      return req;
    },
    put(record: OfflineRating) {
      const req = {} as IDBRequest;
      setTimeout(() => {
        store.set(record.localId, record);
        (req as any).result = record.localId;
        if ((req as any).onsuccess) (req as any).onsuccess({ target: req });
      }, 0);
      return req;
    },
    get(key: string) {
      const req = {} as IDBRequest;
      setTimeout(() => {
        (req as any).result = store.get(key) ?? undefined;
        if ((req as any).onsuccess) (req as any).onsuccess({ target: req });
      }, 0);
      return req;
    },
    getAll() {
      const req = {} as IDBRequest;
      setTimeout(() => {
        (req as any).result = Array.from(store.values());
        if ((req as any).onsuccess) (req as any).onsuccess({ target: req });
      }, 0);
      return req;
    },
    delete(key: string) {
      const req = {} as IDBRequest;
      setTimeout(() => {
        store.delete(key);
        if ((req as any).onsuccess) (req as any).onsuccess({ target: req });
      }, 0);
      return req;
    },
  };

  const fakeTransaction = {
    objectStore(_name: string) {
      return fakeObjectStore;
    },
  };

  const fakeDB = {
    objectStoreNames: { contains: () => true },
    transaction(_store: string, _mode: string) {
      return fakeTransaction;
    },
  };

  const fakeOpenRequest = {} as IDBOpenDBRequest;
  setTimeout(() => {
    (fakeOpenRequest as any).result = fakeDB;
    if ((fakeOpenRequest as any).onsuccess)
      (fakeOpenRequest as any).onsuccess({ target: fakeOpenRequest });
  }, 0);

  const fakeIndexedDB = {
    open(_name: string, _version: number) {
      // Return a fresh request that resolves to the same fakeDB
      const req = {} as IDBOpenDBRequest;
      setTimeout(() => {
        (req as any).result = fakeDB;
        if ((req as any).onsuccess) (req as any).onsuccess({ target: req });
      }, 0);
      return req;
    },
    _store: store, // expose for test resets
  };

  return { fakeIndexedDB, store };
}

// ---------------------------------------------------------------------------
// Setup: stub global indexedDB before each test
// ---------------------------------------------------------------------------

let inMemoryStore: Store;

beforeEach(() => {
  const { fakeIndexedDB, store } = createFakeIDB();
  inMemoryStore = store;
  vi.stubGlobal('indexedDB', fakeIndexedDB);
  // Ensure crypto.randomUUID is available
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    let counter = 0;
    vi.stubGlobal('crypto', {
      randomUUID: () => `test-uuid-${++counter}-${Date.now()}`,
    });
  }
});

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocking globals
// ---------------------------------------------------------------------------

// We import dynamically so the mock is in place when the module initialises.
async function getQueue() {
  // Re-import to pick up the stubbed indexedDB each time
  const mod = await import('./offlineQueue?t=' + Date.now());
  return mod;
}

// ---------------------------------------------------------------------------
// fast-check generators
// ---------------------------------------------------------------------------

const categoryArb = fc.option(fc.constantFrom('good', 'average', 'bad' as const), {
  nil: undefined,
});

const ratingRequestArb = fc.record<RatingRequest>({
  driverQrCode: fc.string({ minLength: 1, maxLength: 64 }),
  phone: fc.string({ minLength: 7, maxLength: 20 }),
  overallRating: fc.integer({ min: 1, max: 5 }) as fc.Arbitrary<1 | 2 | 3 | 4 | 5>,
  cleanliness: categoryArb as fc.Arbitrary<'good' | 'average' | 'bad' | undefined>,
  politeness: categoryArb as fc.Arbitrary<'good' | 'average' | 'bad' | undefined>,
  drivingStyle: categoryArb as fc.Arbitrary<'good' | 'average' | 'bad' | undefined>,
  punctuality: categoryArb as fc.Arbitrary<'good' | 'average' | 'bad' | undefined>,
  comment: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }) as fc.Arbitrary<
    string | undefined
  >,
});

const ratingsArrayArb = fc.array(ratingRequestArb, { minLength: 1, maxLength: 20 });

// ---------------------------------------------------------------------------
// Property-based test
// ---------------------------------------------------------------------------

describe('offlineQueue — Xossa 4: Oflayn baholash sinxronizatsiyasi', () => {
  it(
    "Tasodifiy baholashlar oflayn saqlanganda yo'qolmaydi va sinxronizatsiyadan so'ng navbatdan o'chiriladi",
    async () => {
      await fc.assert(
        fc.asyncProperty(ratingsArrayArb, async (ratings) => {
          // Reset the in-memory store before each property run
          inMemoryStore.clear();

          const {
            saveOfflineRating,
            getPendingRatings,
            getAllRatings,
            removeRating,
          } = await getQueue();

          // Step 1: Save each rating offline, collect localIds
          const localIds: string[] = [];
          for (const rating of ratings) {
            const localId = await saveOfflineRating(rating);
            localIds.push(localId);
          }

          // Step 2: Verify none are lost — all saved ratings are present
          const pending = await getPendingRatings();
          const pendingIds = new Set(pending.map((r) => r.localId));

          for (const id of localIds) {
            if (!pendingIds.has(id)) return false; // rating was lost
          }

          // Also verify count matches (no duplicates or extras from this run)
          if (pending.length !== ratings.length) return false;

          // Step 3: Remove each rating (simulate post-sync cleanup)
          for (const id of localIds) {
            await removeRating(id);
          }

          // Step 4: Verify queue is empty after removal
          const remaining = await getAllRatings();
          return remaining.length === 0;
        }),
        { numRuns: 100 }
      );
    },
    30_000 // generous timeout for 100 async iterations
  );
});
