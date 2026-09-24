// src/lib/storage/db.ts
//
// One IndexedDB database for the whole app (section 20). Two stores:
// `cache` for read-only snapshots of safe-to-cache data, `sync-queue` for
// pending writes that are safe to attempt offline. Financial mutations
// (payment assignment, bank connect/sync) never go through `sync-queue` —
// see features/*/…-mutation hooks, which check connectivity and simply
// refuse to run while offline instead of queuing.

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'property-management-offline';
const DB_VERSION = 1;

export interface CacheRecord {
  key: string;
  value: unknown;
  cachedAt: string;
}

export interface SyncQueueItem {
  id: string;
  /** Idempotency / dedupe key for this logical operation (stable across retries). */
  operationId: string;
  /** Identity that enqueued this item — discarded when another user logs in. */
  identityKey?: string;
  operation: 'update-profile'; // extend as more safe offline writes are added — never financial
  entity: string;
  payload: unknown;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed' | 'permanently-failed';
  attempts: number;
  lastError?: string;
  /** Earliest time this item may be auto-retried (exponential backoff). */
  nextAttemptAt?: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDb(): Promise<IDBPDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this environment'));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('sync-queue')) db.createObjectStore('sync-queue', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}
