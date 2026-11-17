import { apiClient, type QueryValue } from '../client';
import type {
  BankingIntegrationFilters,
  BankingIntegrationRow,
  MpesaIntegrationFilters,
  MpesaIntegrationRow,
  PageResult,
} from './types';

/** Both endpoints are read-only monitoring. No mutation belongs here. */
export const integrationsApi = {
  banking: (filters: BankingIntegrationFilters = {}) =>
    apiClient.get<PageResult<BankingIntegrationRow>>('/platform/integrations/banking', filters as Record<string, QueryValue>),
  mpesa: (filters: MpesaIntegrationFilters = {}) =>
    apiClient.get<PageResult<MpesaIntegrationRow>>('/platform/integrations/mpesa', filters as Record<string, QueryValue>),
};
