// src/lib/sync/register-executors.ts
//
// Section 5 of this pass: profile update is the one genuinely safe
// offline-capable mutation, proving the sync architecture end-to-end.
// Registered once at app startup (see app/providers.tsx). Deliberately
// the ONLY registered executor — financial mutations must never gain one.
import { registerQueueExecutor } from './sync-queue';
import { profileApi, type UpdateProfileInput } from '@/lib/api/profile';

let registered = false;

export function registerSyncExecutors() {
  if (registered) return;
  registered = true;
  registerQueueExecutor('update-profile', async (payload) => {
    await profileApi.update(payload as UpdateProfileInput);
  });
}
