import { apiClient, type QueryValue } from './client';

export interface HouseTypeBillingLine {
  chargeType: 'RENT' | 'WATER' | 'ELECTRICITY' | 'OTHER';
  description?: string;
  amountCents: number;
  dueDay?: number;
}

export interface HouseType {
  _id: string;
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

export interface CreateHouseTypeInput {
  name: string;
  description?: string;
  defaultRentCents?: number;
  defaultDueDay?: number;
  defaultBilling?: HouseTypeBillingLine[];
  isActive?: boolean;
}

export interface HouseTypeWorkspace {
  houseType: HouseType;
  period: string;
  metrics: {
    houseCount: number;
    occupiedHouses: number;
    vacantHouses: number;
    tenantCount: number;
    occupancyRatePercent: number | null;
    billedCents: number;
    collectedCents: number;
    outstandingCents: number;
    openOutstandingCents: number;
    collectionRatePercent: number | null;
  };
  houses: Array<{
    _id: string;
    houseNumber: string;
    estateId: string;
    status: string;
    monthlyRent: number;
    tenant: { _id: string; name: string; phone?: string; status?: string } | null;
    periodBilledCents: number;
    periodPaidCents: number;
    periodOutstandingCents: number;
  }>;
}

export const houseTypesApi = {
  list: (includeInactive = false) =>
    apiClient.get<HouseType[]>('/house-types', includeInactive ? { includeInactive: true } : undefined),
  get: (id: string) => apiClient.get<HouseType>(`/house-types/${id}`),
  workspace: (id: string, query?: { estateId?: string }) =>
    apiClient.get<HouseTypeWorkspace>(
      `/house-types/${id}/workspace`,
      query as Record<string, QueryValue> | undefined
    ),
  create: (input: CreateHouseTypeInput) => apiClient.post<HouseType>('/house-types', input),
  update: (id: string, input: Partial<CreateHouseTypeInput>) =>
    apiClient.patch<HouseType>(`/house-types/${id}`, input),
  deactivate: (id: string) => apiClient.post<HouseType>(`/house-types/${id}/deactivate`),
};
