// src/lib/api/reports.ts — routes/report.routes.js
import { apiClient } from './client';
import type { ArrearsRow, BankTransactionsReport, DashboardSummary, RentSummary, Payment, SmsReport } from '@/types/api';

export interface BilledVsPaidReport {
  period?: string;
  byChargeType?: Record<string, { billedCents: number; paidCents: number; balanceCents: number }>;
  total?: { billedCents: number; paidCents: number; balanceCents: number };
  previousArrearsCents?: number;
  totalOutstandingIncludingArrearsCents?: number;
  billedCents?: number;
  paidCents?: number;
  outstandingCents?: number;
  [key: string]: unknown;
}

export interface PortfolioSlice {
  estateId?: string;
  houseTypeId?: string | null;
  name: string;
  houses: number;
  occupied: number;
  vacant: number;
  tenants?: number;
  billedCents: number;
  collectedCents: number;
}

export interface DashboardAlert {
  kind: string;
  count: number;
  label: string;
  href: string;
}

/** Extended dashboard payload (backward compatible with legacy fields). */
export interface PortfolioDashboard extends DashboardSummary {
  period?: string;
  portfolio?: {
    estateCount: number;
    houseCount: number;
    occupiedHouses: number;
    vacantHouses: number;
    occupancyRatePercent: number | null;
    tenantCount: number;
    houseTypeCount: number;
    unclassifiedHouses: number;
  };
  rent: DashboardSummary['rent'] & { collectionRatePercent?: number | null };
  bank: DashboardSummary['bank'] & { matched?: number; unmatchedAllTime?: number };
  byEstate?: PortfolioSlice[];
  byHouseType?: PortfolioSlice[];
  alerts?: DashboardAlert[];
  recentPayments?: Array<{
    _id: string;
    amountCents: number;
    paymentDate: string;
    houseId?: string;
    tenantId?: string;
    paymentReference?: string;
    period?: string;
  }>;
  tenantsWithOutstandingCount?: number;
}

export interface ManagementReport extends PortfolioDashboard {
  arrears?: ArrearsRow[];
  billedVsPaid?: BilledVsPaidReport;
}

export const reportsApi = {
  dashboard: (period?: string) => apiClient.get<PortfolioDashboard>('/reports/dashboard', { period }),
  management: (period?: string) => apiClient.get<ManagementReport>('/reports/management', { period }),
  monthly: (period?: string) => apiClient.get<RentSummary>('/reports/monthly', { period }),
  arrears: (period?: string) => apiClient.get<ArrearsRow[]>('/reports/arrears', { period }),
  payments: (limit?: number) => apiClient.get<Payment[]>('/reports/payments', { limit }),
  bankTransactions: (period?: string) => apiClient.get<BankTransactionsReport>('/reports/bank-transactions', { period }),
  sms: () => apiClient.get<SmsReport>('/reports/sms'),
  billedVsPaid: (period?: string) => apiClient.get<BilledVsPaidReport>('/reports/billed-vs-paid', { period }),
};
