import { apiClient, type QueryValue } from './client';
import type { ChargeSlice } from '@/types/financial';

export interface HouseTypeBillingLine {
  chargeType: 'RENT' | 'WATER' | 'ELECTRICITY' | 'OTHER';
  description?: string;
  amountCents: number;
  dueDay?: number;
}

export interface HouseType {
  _id: string;
  estateId: string;
  name: string;
  description?: string;
  defaultRentCents: number;
  defaultDueDay?: number;
  defaultBilling?: HouseTypeBillingLine[];
  isActive: boolean;
  houseCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * BLOCKED BY BACKEND: the create route's validator currently omits `estateId`
 * and strips it, while the service requires it, so creation fails until the
 * backend schema accepts it. The frontend sends it because the contract
 * requires it; it must not be dropped client-side to hide the defect.
 */
export interface CreateHouseTypeInput {
  estateId: string;
  name: string;
  description?: string;
  defaultRentCents?: number;
  defaultDueDay?: number;
  defaultBilling?: HouseTypeBillingLine[];
  isActive?: boolean;
}

/**
 * Plan fields (rent, due day, billing lines) create a NEW plan version starting
 * at `effectiveFromPeriod` (YYYY-MM); history is never rewritten. Send them only
 * when the plan actually changed. `effectiveFromPeriod` is invalid without them.
 */
export interface UpdateHouseTypeInput extends Partial<Omit<CreateHouseTypeInput, 'estateId'>> {
  effectiveFromPeriod?: string;
  changeReason?: string;
}

export interface HouseTypeWorkspaceTenant {
  _id: string;
  name: string;
  phone?: string;
  status?: string;
}

/**
 * Tenancy-aware sections. Current, historical, unattributed legacy and orphaned
 * charges are separate on purpose and must never be summed into "the occupant's
 * debt". `allHouseHistory` and the flat metrics are explicitly house-wide history.
 */
export interface HouseTypeWorkspace {
  houseType: HouseType;
  period: string;
  metrics: {
    houseCount: number;
    occupiedHouses: number;
    vacantHouses: number;
    /** Houses with exactly one active tenancy. */
    tenantCount: number;
    currentTenancy: ChargeSlice;
    historicalTenancies: ChargeSlice;
    unattributedLegacy: ChargeSlice;
    orphanedTenancy: ChargeSlice;
    allHouseHistory: ChargeSlice;
    /** Same figures as allHouseHistory, kept by the backend for compatibility. */
    billedCents: number;
    collectedCents: number;
    outstandingCents: number;
    openOutstandingCents: number;
    collectionRatePercent: number | null;
    currentTenancyCollectionRatePercent: number | null;
    /** Houses with more than one simultaneously active tenancy. Their current slice is withheld. */
    ambiguousCurrentOccupancyHouses: number;
  };
  houses: Array<{
    _id: string;
    houseNumber: string;
    estateId: string;
    status: string;
    billingSource: string;
    currentTenancy: { _id: string; tenant: HouseTypeWorkspaceTenant | null; financials: ChargeSlice } | null;
    currentOccupancyConflict: boolean;
    historicalTenancyFinancials: ChargeSlice;
    unattributedLegacyFinancials: ChargeSlice;
    orphanedTenancyFinancials: ChargeSlice;
  }>;
}

export const houseTypesApi = {
  /** estateId narrows server-side. Include it in every cache key. */
  list: (query: { estateId?: string; includeInactive?: boolean } = {}) =>
    apiClient.get<HouseType[]>('/house-types', { estateId: query.estateId, includeInactive: query.includeInactive ? true : undefined }),
  get: (id: string) => apiClient.get<HouseType>(`/house-types/${id}`),
  workspace: (id: string, query?: { estateId?: string }) =>
    apiClient.get<HouseTypeWorkspace>(
      `/house-types/${id}/workspace`,
      query as Record<string, QueryValue> | undefined
    ),
  create: (input: CreateHouseTypeInput) => apiClient.post<HouseType>('/house-types', input),
  update: (id: string, input: UpdateHouseTypeInput) =>
    apiClient.patch<HouseType>(`/house-types/${id}`, input),
  deactivate: (id: string) => apiClient.post<HouseType>(`/house-types/${id}/deactivate`),
};
