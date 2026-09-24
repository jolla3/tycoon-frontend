import { apiClient } from './client';
import type { Estate } from '@/types/api';

export interface EstateMetrics {
  houseCount: number;
  occupiedHouses: number;
  vacantHouses: number;
  unclassifiedHouses?: number;
  tenantCount: number;
  houseTypeCount?: number;
  period?: string;
  billedCents: number;
  collectedCents: number;
  outstandingCents: number;
  openOutstandingCents?: number;
  collectionRatePercent: number | null;
}

export interface EstateWithMetrics extends Estate {
  metrics?: EstateMetrics;
}

export interface EstateHouseTypeRow {
  houseTypeId: string | null;
  name: string;
  houseCount: number;
  occupied: number;
  vacant: number;
  billedCents: number;
  collectedCents: number;
  outstandingCents: number;
}

export interface EstateWorkspace {
  estate: Estate & { address?: string; currency?: string; defaultDueDay?: number };
  period: string;
  metrics: {
    houseCount: number;
    occupiedHouses: number;
    vacantHouses: number;
    unclassifiedHouses?: number;
    tenantCount: number;
    currentPeriodBilledCents: number;
    currentPeriodCollectedCents: number;
    currentPeriodOutstandingCents: number;
    openOutstandingCents: number;
    collectionRatePercent?: number | null;
  };
  byHouseType?: EstateHouseTypeRow[];
}

export const estatesApi = {
  list: () => apiClient.get<EstateWithMetrics[]>('/estates'),
  get: (id: string) => apiClient.get<Estate>(`/estates/${id}`),
  workspace: (id: string) => apiClient.get<EstateWorkspace>(`/estates/${id}/workspace`),
  create: (input: { name: string; address?: string; currency?: string; timezone?: string }) =>
    apiClient.post<Estate>('/estates', input),
  update: (id: string, input: { name?: string; address?: string; defaultDueDay?: number; isActive?: boolean }) =>
    apiClient.patch<Estate>(`/estates/${id}`, input),
};

export function visibleTo(
  estates: EstateWithMetrics[],
  allowedEstateIds: string[] | undefined
): EstateWithMetrics[] {
  if (!allowedEstateIds || allowedEstateIds.length === 0) return estates;
  const allowed = new Set(allowedEstateIds);
  return estates.filter((e) => allowed.has(e._id));
}
