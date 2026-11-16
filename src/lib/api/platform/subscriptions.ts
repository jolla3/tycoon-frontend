import { apiClient, type QueryValue } from '../client';
import type { PageResult, PlatformSubscriptionRow } from './types';

export const platformSubscriptionsApi = {
  list: (query: { page?: number; limit?: number; status?: string } = {}) =>
    apiClient.get<PageResult<PlatformSubscriptionRow>>('/platform/subscriptions', query as Record<string, QueryValue>),
};
