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

/** estateId cannot be changed after creation. */
export interface UpdateHouseInput {
  houseNumber?: string;
  monthlyRent?: number;
  dueDay?: number;
  paymentReferences?: string[];
  status?: 'occupied' | 'vacant';
  isActive?: boolean;
  houseTypeId?: string | null;
}

export type ChargeType = 'RENT' | 'WATER' | 'ELECTRICITY' | 'OTHER';

export interface HouseBillingConfig {
  _id: string;
  houseId?: string;
  chargeType: ChargeType;
  description?: string;
  amountCents: number;
  dueDay?: number;
  frequency?: string;
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

/** Input to upsert. The backend assigns _id. */
export type HouseBillingConfigInput = Omit<HouseBillingConfig, '_id' | 'houseId'>;

/**
 * Charge-based totals (sum of open RentCharge balances). This is NOT a ledger
 * balance and says nothing about who owes it; do not present it as the
 * current occupant's liability.
 */
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
  update: (id: string, updates: UpdateHouseInput) => apiClient.patch<House>(`/houses/${id}`, updates),
  listBillingConfig: (houseId: string) =>
    apiClient.get<HouseBillingConfig[]>(`/houses/${houseId}/billing-config`),
  upsertBillingConfig: (houseId: string, input: HouseBillingConfigInput) =>
    apiClient.put<HouseBillingConfig>(`/houses/${houseId}/billing-config`, input),
  /** Deactivates one config by its _id. */
  deactivateBillingConfig: (houseId: string, configId: string) =>
    apiClient.post<HouseBillingConfig>(`/houses/${houseId}/billing-config/${configId}/deactivate`),
};
