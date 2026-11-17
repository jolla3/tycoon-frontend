import { apiClient, type QueryValue } from '../client';
import type { PageResult, PlatformUserRow } from './types';

export const platformUsersApi = {
  list: (query: { page?: number; limit?: number; role?: string; clientId?: string; isActive?: boolean } = {}) =>
    apiClient.get<PageResult<PlatformUserRow>>('/platform/users', query as Record<string, QueryValue>),
};
