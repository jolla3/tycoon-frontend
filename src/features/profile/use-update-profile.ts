'use client';

// src/features/profile/use-update-profile.ts
//
// Section 5 of this pass: the ONE genuinely safe offline-capable mutation.
// Online: calls the backend directly and only reports success once the
// backend confirms it. Offline/degraded: queues it via the sync queue and
// reports "Saved locally — pending sync", never "Saved."
// Compare with features/transactions (assignment) and features/banking
// (connect/sync), which explicitly refuse to run at all while offline —
// this is the deliberate exception, not the pattern to copy for financial actions.

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { profileApi, type UpdateProfileInput } from '@/lib/api/profile';
import { ApiError } from '@/lib/api/client';
import { enqueue } from '@/lib/sync/sync-queue';
import { useConnectivity } from '@/lib/sync/connectivity';

export type ProfileSaveState = 'idle' | 'saving' | 'confirmed' | 'queued' | 'error';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const connectivity = useConnectivity();
  const [state, setState] = useState<ProfileSaveState>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function save(input: UpdateProfileInput) {
    setState('saving');
    setMessage(null);

    const canReachServer = connectivity.state === 'online' || connectivity.state === 'syncing' || connectivity.state === 'sync-error';

    const operationId = `update-profile:${JSON.stringify(input)}`;

    if (!canReachServer) {
      await enqueue({ operation: 'update-profile', operationId, entity: 'profile', payload: input });
      setState('queued');
      setMessage("Saved on this device. It will sync automatically once you're back online.");
      return;
    }

    try {
      await profileApi.update(input);
      setState('confirmed');
      setMessage('Profile updated.');
      queryClient.invalidateQueries({ queryKey: ['session', 'me'] });
    } catch (err) {
      if (err instanceof ApiError && err.kind === 'network') {
        // We thought we were online but the request itself failed — fall
        // back to queueing rather than losing the edit.
        await enqueue({ operation: 'update-profile', operationId, entity: 'profile', payload: input });
        setState('queued');
        setMessage('Unable to reach the server right now. Saved on this device and will sync automatically.');
        return;
      }
      setState('error');
      setMessage(err instanceof ApiError ? err.message : 'Unable to update profile.');
    }
  }

  return { save, state, message };
}
