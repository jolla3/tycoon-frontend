// src/lib/sync/sync-queue.ts
//
// The ONE sync queue. Only operations explicitly whitelisted as safe offline
// (today: update-profile). Financial mutations never go through this queue.
//
// - Idempotency via operationId (dedupe on enqueue)
// - Exponential backoff via nextAttemptAt
// - permanently-failed terminal state; only retryItem / retryAllFailed escape
// - Identity-scoped: clearQueueForOtherIdentities on login switch

import { getDb, type SyncQueueItem } from '../storage/db';
import { ApiError } from '../api/client';

const MAX_ATTEMPTS = 5;

type QueueExecutor = (payload: unknown) => Promise<void>;
const executors = new Map<SyncQueueItem['operation'], QueueExecutor>();

export function registerQueueExecutor(operation: SyncQueueItem['operation'], executor: QueueExecutor) {
  executors.set(operation, executor);
}

function backoffMs(attempts: number): number {
  // 2s, 4s, 8s, 16s, 32s (capped)
  return Math.min(32_000, 1000 * Math.pow(2, Math.max(1, attempts)));
}

export async function enqueue(
  item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'status' | 'attempts' | 'nextAttemptAt'> & {
    operationId: string;
  }
): Promise<SyncQueueItem> {
  const db = await getDb();
  const existing = (await db.getAll('sync-queue')) as SyncQueueItem[];
  const duplicate = existing.find(
    (e) => e.operationId === item.operationId && e.status !== 'permanently-failed'
  );
  if (duplicate) return duplicate;

  const queued: SyncQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'pending',
    attempts: 0,
  };
  await db.put('sync-queue', queued);
  return queued;
}

export async function listQueue(): Promise<SyncQueueItem[]> {
  const db = await getDb();
  return db.getAll('sync-queue');
}

export async function pendingCount(): Promise<number> {
  const items = await listQueue();
  return items.filter((i) => i.status === 'pending' || i.status === 'syncing' || i.status === 'failed').length;
}

export async function permanentlyFailedCount(): Promise<number> {
  const items = await listQueue();
  return items.filter((i) => i.status === 'permanently-failed').length;
}

async function updateItem(item: SyncQueueItem) {
  const db = await getDb();
  await db.put('sync-queue', item);
}

async function removeItem(id: string) {
  const db = await getDb();
  await db.delete('sync-queue', id);
}

/** Drop queue entries that do not belong to the current identity. */
export async function clearQueueExceptIdentity(identityKey: string | null): Promise<void> {
  const items = await listQueue();
  const db = await getDb();
  for (const item of items) {
    if (!identityKey || item.identityKey !== identityKey) {
      await db.delete('sync-queue', item.id);
    }
  }
}

export async function clearEntireQueue(): Promise<void> {
  const db = await getDb();
  await db.clear('sync-queue');
}

export type SyncQueueOutcome = { processed: number; succeeded: number; failed: number; permanentlyFailed: number };

export async function processQueue(): Promise<SyncQueueOutcome> {
  const items = await listQueue();
  const outcome: SyncQueueOutcome = { processed: 0, succeeded: 0, failed: 0, permanentlyFailed: 0 };
  const now = Date.now();

  for (const item of items) {
    if (item.status === 'syncing' || item.status === 'permanently-failed') continue;
    if (item.nextAttemptAt && new Date(item.nextAttemptAt).getTime() > now) continue;

    const executor = executors.get(item.operation);
    if (!executor) continue;

    outcome.processed += 1;
    await updateItem({ ...item, status: 'syncing' });

    try {
      await executor(item.payload);
      await removeItem(item.id);
      outcome.succeeded += 1;
    } catch (err) {
      const attempts = item.attempts + 1;
      const isPermanent = attempts >= MAX_ATTEMPTS;
      await updateItem({
        ...item,
        status: isPermanent ? 'permanently-failed' : 'failed',
        attempts,
        lastError: err instanceof ApiError ? err.message : 'Synchronization failed.',
        nextAttemptAt: isPermanent ? undefined : new Date(Date.now() + backoffMs(attempts)).toISOString(),
      });
      if (isPermanent) outcome.permanentlyFailed += 1;
      else outcome.failed += 1;
    }
  }

  return outcome;
}

export async function retryItem(id: string): Promise<void> {
  const items = await listQueue();
  const item = items.find((i) => i.id === id);
  if (!item) return;
  await updateItem({ ...item, status: 'pending', attempts: 0, lastError: undefined, nextAttemptAt: undefined });
}

export async function retryAllFailed(): Promise<void> {
  const items = await listQueue();
  const db = await getDb();
  for (const item of items) {
    if (item.status === 'permanently-failed' || item.status === 'failed') {
      await db.put('sync-queue', {
        ...item,
        status: 'pending',
        attempts: item.status === 'permanently-failed' ? 0 : item.attempts,
        lastError: undefined,
        nextAttemptAt: undefined,
      });
    }
  }
}

export async function discardItem(id: string): Promise<void> {
  await removeItem(id);
}
