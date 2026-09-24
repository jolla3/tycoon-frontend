'use client';

import { estatesApi, visibleTo } from '@/lib/api/estates';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useSession } from '@/features/auth/session-context';
import { identityKeyFromUser } from '@/lib/session/local-session-marker';

export function useVisibleEstates() {
  const { user } = useSession();
  const identity = user ? identityKeyFromUser(user) : 'anon';
  const query = useCachedQuery(`${identity}:estates:list`, ['estates', identity], () => estatesApi.list(), {
    enabled: Boolean(user),
  });
  const estates = query.data ? visibleTo(query.data, user?.estateIds) : undefined;
  return { ...query, estates };
}
