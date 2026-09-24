import { apiClient, type QueryValue } from './client';
import type { House, Paginated } from '@/types/api';

export interface HouseListQuery {
  status?: string;
  search?: string;
  estateId?: string;
  houseTypeId?: string;
  page?: number;
  limit?: number;
}

export interface CreateHouseInput {
  estateId: string;
  houseNumber: string;
  monthlyRent?: number;
  dueDay?: number;
  houseTypeId?: string;
  paymentReferences?: string[];
}

export type ChargeType = 'RENT' | 'WATER' | 'ELECTRICITY' | 'OTHER';

export interface HouseBillingConfig {
  _id?: string;
  houseId?: string;
  chargeType: ChargeType;
  description?: string;
  amountCents: number;
  dueDay?: number;
  isActive?: boolean;
  effectiveFrom?: string;
}

export interface HouseBalance {
  billedCents: number;
  paidCents: number;
  outstandingCents: number;
  currentPeriodOutstandingCents: number;
  period: string;
}

export interface HouseDetail extends House {
  estate?: { _id: string; name: string; address?: string } | null;
  houseType?: { _id: string; name: string } | null;
  tenant?: { _id: string; name: string; phone?: string; status?: string } | null;
  balance?: HouseBalance;
  billingConfigs?: HouseBillingConfig[];
  activity?: Array<{
    _id?: string;
    action: string;
    resource?: string;
    description?: string;
    createdAt?: string;
  }>;
}

export const housesApi = {
  list: (query: HouseListQuery = {}) =>
    apiClient.get<Paginated<HouseDetail>>('/houses', query as Record<string, QueryValue>),
  get: (id: string) => apiClient.get<HouseDetail>(`/houses/${id}`),
  create: (input: CreateHouseInput) => apiClient.post<House>('/houses', input),
  update: (
    id: string,
    updates: Partial<CreateHouseInput> & { status?: string; isActive?: boolean; houseTypeId?: string | null }
  ) => apiClient.patch<House>(`/houses/${id}`, updates),
  listBillingConfig: (houseId: string) =>
    apiClient.get<HouseBillingConfig[]>(`/houses/${houseId}/billing-config`),
  upsertBillingConfig: (houseId: string, input: Omit<HouseBillingConfig, '_id' | 'houseId'>) =>
    apiClient.put<HouseBillingConfig>(`/houses/${houseId}/billing-config`, input),
  deactivateBillingConfig: (houseId: string, chargeType: ChargeType) =>
    apiClient.post<HouseBillingConfig>(`/houses/${houseId}/billing-config/${chargeType}/deactivate`),
};
