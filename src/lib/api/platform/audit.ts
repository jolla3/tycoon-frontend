import { apiClient, type QueryValue } from '../client';
import type { PageResult, PlatformAuditRow } from './types';

export const platformAuditApi = {
  list: (query: { page?: number; limit?: number; action?: string; clientId?: string } = {}) =>
    apiClient.get<PageResult<PlatformAuditRow>>('/platform/audit', query as Record<string, QueryValue>),
};
