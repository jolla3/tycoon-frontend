import { apiClient, type QueryValue } from '../client';
import type { EntitlementInventoryFilters, EntitlementInventoryRow, PageResult } from './types';

export const entitlementsApi = {
  inventory: (filters: EntitlementInventoryFilters = {}) =>
    apiClient.get<PageResult<EntitlementInventoryRow>>('/platform/entitlement-inventory', filters as Record<string, QueryValue>),
};
