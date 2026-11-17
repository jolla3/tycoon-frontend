// src/lib/api/mpesa-collection.ts — routes/mpesaCollection.routes.js (MPESA entitlement required)
//
// SUPER_ADMIN must name one explicit client via `clientId`; client users never
// send it (their client comes from the session).
//
// Not available from the backend and therefore not modelled here: canonical
// MpesaTransaction list/detail, merchant-profile management, manual Pull.
import { apiClient, type QueryValue } from './client';
import type { PaymentOrigin, PaymentStatus } from '@/types/api';

export type MpesaLinkStatus = 'ACTIVE' | 'REVOKED';

export interface MpesaLink {
  id: string;
  tenantId: string;
  estateId: string;
  status: MpesaLinkStatus;
  version: number;
  rotatedAt: string | null;
  revokedAt: string | null;
  /** True only when the link is ACTIVE and the estate has exactly one ACTIVE Till. */
  operational: boolean;
}

export interface IssuedMpesaLink {
  link: MpesaLink;
  /** Shown once. Never persisted by the backend in recoverable form. */
  token: string;
}

export type SubmissionState = 'RECEIVED' | 'UNSUPPORTED' | 'PARSED' | 'UNMATCHED' | 'MATCHED' | 'CONFLICTING' | 'MANUAL_REVIEW' | 'POSTED' | 'REJECTED';

export const REVIEW_REASON_CODES = ['DUPLICATE', 'WRONG_TENANT', 'NOT_A_RENT_PAYMENT', 'UNREADABLE', 'OTHER_DOCUMENTED'] as const;
export type ReviewReasonCode = (typeof REVIEW_REASON_CODES)[number];
export type ReviewAction = 'REJECT' | 'RETRY_MATCH';

export interface MpesaSubmission {
  _id: string;
  tenantId: string;
  estateId: string;
  state: SubmissionState;
  stateReason: string | null;
  /** Amount parsed from the submitted text. Unverified evidence, not a posted payment. */
  amountCents?: number | null;
  receiptNumber?: string | null;
  createdAt: string;
  mpesaTransactionId?: string | null;
}

export interface TenantAccountTenancy {
  tenancyId: string;
  houseId: string;
  status: 'ACTIVE' | 'CLOSED';
  startAt: string | null;
  endAt: string | null;
  /** Sum of open UNPAID/PARTIAL charges on this tenancy. */
  outstandingCents: number;
}

export interface TenantCollectionAccount {
  tenantId: string;
  estateId: string;
  activeTenancies: TenantAccountTenancy[];
  closedTenancyArrears: TenantAccountTenancy[];
  combinedOutstandingCents: number;
  /** Tenant credit is held separately and applied automatically. It is not netted into the figures above. */
  creditCents: number;
  link: { status: MpesaLinkStatus; version: number; rotatedAt: string | null; revokedAt: string | null } | null;
  pendingSubmissions: Array<{ id: string; state: SubmissionState; reason: string | null; amountCents: number | null; createdAt: string }>;
}

export interface TenantCollectionPayment {
  id: string;
  origin: PaymentOrigin;
  status: PaymentStatus;
  tenancyId: string | null;
  amountCents: number;
  paymentDate: string;
  receiptGroupId: string | null;
  allocations: Array<{ rentChargeId: string; tenancyId: string | null; amountCents: number; period: string; chargeType: string }>;
}

type Scope = { clientId?: string };
const q = (scope: Scope, extra: Record<string, QueryValue> = {}) => ({ ...extra, ...(scope.clientId ? { clientId: scope.clientId } : {}) });

export const mpesaCollectionApi = {
  /** Metadata only. The previous token cannot be recovered. Resolves to `link: null` when none exists. */
  inspectLink: (tenantId: string, scope: Scope = {}) =>
    apiClient.get<{ link: MpesaLink | null }>(`/mpesa-collection/tenants/${tenantId}/link`, q(scope)),
  /** Creates or rotates. Rotation invalidates the previous token. The response token is shown once. */
  issueLink: (tenantId: string, scope: Scope = {}) =>
    apiClient.post<IssuedMpesaLink>(`/mpesa-collection/tenants/${tenantId}/link${scope.clientId ? `?clientId=${encodeURIComponent(scope.clientId)}` : ''}`),
  revokeLink: (tenantId: string, scope: Scope = {}) =>
    apiClient.post<{ link: MpesaLink }>(`/mpesa-collection/tenants/${tenantId}/link/revoke${scope.clientId ? `?clientId=${encodeURIComponent(scope.clientId)}` : ''}`),
  account: (tenantId: string, scope: Scope = {}) =>
    apiClient.get<TenantCollectionAccount>(`/mpesa-collection/tenants/${tenantId}/account`, q(scope)),
  payments: (tenantId: string, scope: Scope = {}) =>
    apiClient.get<{ payments: TenantCollectionPayment[] }>(`/mpesa-collection/tenants/${tenantId}/payments`, q(scope)),
  listSubmissions: (query: { state?: SubmissionState; limit?: number } & Scope = {}) =>
    apiClient.get<{ submissions: MpesaSubmission[] }>('/mpesa-collection/submissions', q(query, { state: query.state, limit: query.limit })),
  resolveSubmission: (id: string, body: { action: ReviewAction; reasonCode: ReviewReasonCode }, scope: Scope = {}) =>
    apiClient.post<{ id: string; state: SubmissionState }>(`/mpesa-collection/submissions/${id}/resolve${scope.clientId ? `?clientId=${encodeURIComponent(scope.clientId)}` : ''}`, body),
};

/** `{origin}/pay#t={token}`. The origin is the configured frontend origin and must match the backend FRONTEND_URL. */
export function buildPayLink(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/pay#t=${token}`;
}
