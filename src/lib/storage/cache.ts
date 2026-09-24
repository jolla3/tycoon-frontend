// src/lib/storage/cache.ts
//
// Generic cache helpers on top of the `cache` IndexedDB store (db.ts).
// This is deliberately separate from TanStack Query's in-memory cache:
// TanStack Query cache dies on reload; this is what lets a page show
// "last known" data across a full page refresh while offline, clearly
// labeled as cached rather than live (section 2 of this pass).

import { getDb, type CacheRecord } from './db';

/** After this long, cached data is still shown but flagged stale — never silently treated as current. */
const STALE_AFTER_MS = 5 * 60 * 1000;

export interface CacheReadResult<T> {
  value: T;
  cachedAt: string;
  isStale: boolean;
}

export async function cacheWrite<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDb();
    const record: CacheRecord = { key, value, cachedAt: new Date().toISOString() };
    await db.put('cache', record);
  } catch {
    // Offline cache is a convenience, not a requirement — never let a
    // failed cache write break the actual feature it's supporting.
  }
}

export async function cacheRead<T>(key: string): Promise<CacheReadResult<T> | null> {
  try {
    const db = await getDb();
    const record = (await db.get('cache', key)) as CacheRecord | undefined;
    if (!record) return null;
    const cachedAt = new Date(record.cachedAt).getTime();
    return {
      value: record.value as T,
      cachedAt: record.cachedAt,
      isStale: Date.now() - cachedAt > STALE_AFTER_MS,
    };
  } catch {
    return null;
  }
}

export async function cacheInvalidate(key: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete('cache', key);
  } catch {
    // no-op — nothing to invalidate if storage isn't available
  }
}

export async function cacheInvalidateAll(): Promise<void> {
  try {
    const db = await getDb();
    await db.clear('cache');
  } catch {
    // no-op
  }
}
